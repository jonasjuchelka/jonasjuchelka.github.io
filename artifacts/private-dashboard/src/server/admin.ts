import "server-only";
import { CATEGORY_IDS, categoryLabel } from "@/lib/categories";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { currentSession, digest, token } from "./auth";
import { AccessError, authConfig, safeExternalUrl } from "./policy";
import { database } from "./db";
import { tools as toolsTable } from "./schema";
import { inviteMail, newToolMail, sendBatch, sendMail, type AccessKind } from "./mail";
import { tombstoneUser } from "./people";
import { loginInput, mergeLogin, presentFields, seal, unseal, vaultConfigured, type Login } from "./vault";
const INVITE_MAIL_HOURS=48;
const emailSchema=z.string().trim().toLowerCase().email().max(254);
const id=z.string().uuid();
const name=z.string().trim().min(1).max(100);
const person=z.string().trim().min(1).max(60);
const inviteSchema=z.object({first_name:person,last_name:person,email:emailSchema,send_mail:z.boolean().default(true)});
const profileSchema=z.object({first_name:person,last_name:person,email:z.union([z.literal(""),emailSchema]).default("")});
const toolSchema=z.object({name,provider:name,description:z.string().max(2000),url:z.string().max(2000).transform(safeExternalUrl),
  access_type:z.enum(["own_account","team_seat","permitted_shared"]),instructions:z.string().max(4000),
  plan:z.string().trim().max(80).default(""),price:z.string().trim().max(160).default(""),details:z.string().max(8000).default(""),
  logo_url:z.string().trim().max(2000).default("").transform((v)=>v===""||(v.startsWith("/")&&!v.startsWith("//"))?v:safeExternalUrl(v)),
  category:z.string().trim().default("").refine((v)=>v===""||(CATEGORY_IDS as string[]).includes(v),"Unbekannte Kategorie")});
const fullName=(first:string,last:string)=>`${first} ${last}`.trim();
const appUrl=(path:string)=>`${authConfig().origin}${(process.env.BASE_PATH??"").replace(/\/$/,"")}${path}`;
const firstOf=(p:{first_name?:string;name?:string})=>p.first_name||String(p.name??"").split(" ")[0]||"du";

export async function adminGet() {
  await currentSession(false,true);
  const [users,groups,memberships,tools,grants,invitations]=await Promise.all([
    query(`SELECT id,name,first_name,last_name,email,role,blocked,deleted_at,created_at FROM private_area.users
      ORDER BY deleted_at NULLS FIRST, blocked, lower(name)`),
    query("SELECT id,name FROM private_area.groups ORDER BY name"),
    query("SELECT user_id,group_id FROM private_area.memberships"),
    database().select().from(toolsTable).orderBy(toolsTable.name),query("SELECT * FROM private_area.grants"),
    query(`SELECT i.id,i.name,i.first_name,i.last_name,i.email,i.role,i.expires_at,i.used_at,i.created_at,i.user_id,
        u.blocked AS user_blocked,u.deleted_at AS user_deleted_at
      FROM private_area.invitations i LEFT JOIN private_area.users u ON u.id=i.user_id
      ORDER BY coalesce(i.used_at,i.created_at) DESC LIMIT 200`),
  ]);
  // Only metadata: which login fields are stored, never the values.
  const [credentials,links,mails]=await Promise.all([
    query("SELECT tool_id,fields,updated_at FROM private_area.tool_credentials"),
    query(`SELECT l.id,l.tool_id,l.user_id,u.name AS user_name,t.name AS tool_name,l.created_at,l.expires_at,l.views,l.last_viewed_at,l.revoked_at
      FROM private_area.access_links l JOIN private_area.users u ON u.id=l.user_id JOIN private_area.tools t ON t.id=l.tool_id
      ORDER BY l.created_at DESC LIMIT 200`),
    query(`SELECT m.id,m.kind,m.ok,m.created_at,m.tool_name,coalesce(u.name,i.name,'–') AS recipient
      FROM private_area.mail_log m LEFT JOIN private_area.users u ON u.id=m.user_id LEFT JOIN private_area.invitations i ON i.id=m.invitation_id
      ORDER BY m.created_at DESC LIMIT 100`),
  ]);
  return {users,groups,memberships,tools,grants,invitations,credentials,links,mails,vaultReady:vaultConfigured()};
}

/** Mails everyone who can use the tool and is neither blocked nor deleted. Runs after the tool is committed. */
async function notifyNewTool(toolId:string) {
  const [t]=await query("SELECT id,name,provider,description,category,access_type,plan,price FROM private_area.tools WHERE id=$1",[toolId]);
  if(!t) return {notified:0,failed:0,without_email:0};
  const people=await query(`SELECT u.id,u.name,u.first_name,u.email FROM private_area.users u
    WHERE NOT u.blocked AND u.deleted_at IS NULL AND EXISTS (SELECT 1 FROM private_area.grants g WHERE g.tool_id=$1
      AND (g.user_id=u.id OR g.group_id IN (SELECT group_id FROM private_area.memberships m WHERE m.user_id=u.id)))`,[toolId]);
  const withMail=people.filter((p)=>p.email);
  const info={name:t.name,provider:t.provider,description:t.description,category:t.category?categoryLabel(t.category):"",
    access_type:t.access_type as AccessKind,plan:t.plan,price:t.price};
  const url=appUrl(`/tools?tool=${encodeURIComponent(toolId)}`);
  const results=withMail.length?await sendBatch(withMail.map((p)=>({to:String(p.email),mail:newToolMail(firstOf(p),info,url)})),`new-tool-${toolId}`):[];
  if(withMail.length) await query(`INSERT INTO private_area.mail_log(kind,user_id,tool_id,tool_name,ok)
    SELECT 'new_tool',x.uid,$1,$2,x.ok FROM unnest($3::uuid[],$4::boolean[]) AS x(uid,ok)`,[toolId,t.name,withMail.map((p)=>p.id),results]);
  const notified=results.filter(Boolean).length;
  return {notified,failed:results.length-notified,without_email:people.length-withMail.length};
}

export async function adminMutation(parts:string[],method:string,body:Record<string,unknown>) {
  const s=await currentSession(true,true);
  const [entity,target]=parts;
  if(target) id.parse(target);
  const result=await transaction(async c=>{
    // Serialize mutations against blocking/revocation of the acting administrator.
    const actor=await c.query(`SELECT u.id FROM private_area.users u JOIN private_area.sessions s ON s.user_id=u.id
      WHERE u.id=$1 AND u.role='admin' AND NOT u.blocked AND s.id=$2 AND s.expires_at>now()
      AND s.confirmed_at>now()-interval '5 minutes' FOR UPDATE OF u,s`,[s.user_id,s.id]);
    if(!actor.rowCount) throw new AccessError(403,"Berechtigung oder Bestätigung abgelaufen.");
    let response:Record<string,unknown>={ok:true};
    const lockUser=async()=>{
      const [u]=(await c.query("SELECT id,role,deleted_at FROM private_area.users WHERE id=$1 FOR UPDATE",[target])).rows;
      if(!u) throw new AccessError(404,"Nutzer nicht gefunden.");
      return u;
    };
    const emailTaken=async(email:string,exceptUser?:string)=>{
      const r=await c.query("SELECT name FROM private_area.users WHERE lower(email)=$1 AND deleted_at IS NULL AND id IS DISTINCT FROM $2",[email,exceptUser??null]);
      if(r.rowCount) throw new AccessError(409,`Diese E-Mail gehört schon zu ${r.rows[0].name}.`);
    };
    if(entity==="invitations" && method==="POST" && !target) {
      const inv=inviteSchema.parse(body);
      await emailTaken(inv.email);
      const raw=token(); const uuid=randomUUID();
      const hours=inv.send_mail?INVITE_MAIL_HOURS:1;
      await c.query(`INSERT INTO private_area.invitations(id,token_hash,name,first_name,last_name,email,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,now()+make_interval(hours=>$7))`,[uuid,digest(raw),fullName(inv.first_name,inv.last_name),inv.first_name,inv.last_name,inv.email,hours]);
      response={hours,invitationId:uuid,url:appUrl(`/invite#token=${raw}`)};
    } else if(entity==="invitations" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.invitations WHERE id=$1 AND used_at IS NULL",[target]);
    } else if(entity==="users" && method==="PATCH" && target) {
      const u=await lockUser();
      if(u.deleted_at) throw new AccessError(400,"Endgültig gelöschte Nutzer können nicht mehr geändert werden.");
      if(typeof body.blocked==="boolean") {
        // Temporary block: reversible, all sessions end immediately.
        if(target===s.user_id) throw new AccessError(400,"Eigenes Administratorkonto nicht sperren.");
        await c.query("UPDATE private_area.users SET blocked=$2 WHERE id=$1",[target,body.blocked]);
        if(body.blocked) {
          await c.query("DELETE FROM private_area.sessions WHERE user_id=$1",[target]);
          await c.query("UPDATE private_area.access_links SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[target]);
        }
      } else {
        const p=profileSchema.parse(body);
        if(p.email) await emailTaken(p.email,target);
        await c.query("UPDATE private_area.users SET first_name=$2,last_name=$3,name=$4,email=$5 WHERE id=$1",
          [target,p.first_name,p.last_name,fullName(p.first_name,p.last_name),p.email||null]);
      }
    } else if(entity==="users" && method==="DELETE" && target) {
      // Permanent: everything personal goes; only the name stays as "endgültig gelöscht".
      if(target===s.user_id) throw new AccessError(400,"Eigenes Konto nicht löschen.");
      const u=await lockUser();
      if(u.role==="admin") throw new AccessError(400,"Administratorkonten können hier nicht gelöscht werden.");
      if(!u.deleted_at) await tombstoneUser(c,target);
    } else if(entity==="groups" && method==="POST" && !target) {
      await c.query("INSERT INTO private_area.groups(id,name) VALUES($1,$2)",[randomUUID(),name.parse(body.name)]);
    } else if(entity==="groups" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.groups WHERE id=$1",[target]);
    } else if(entity==="memberships" && !target && ["POST","DELETE"].includes(method)) {
      const user=id.parse(body.userId),group=id.parse(body.groupId);
      if(method==="POST") await c.query(`INSERT INTO private_area.memberships(user_id,group_id)
        SELECT $1::uuid,$2::uuid WHERE EXISTS (SELECT 1 FROM private_area.users WHERE id=$1::uuid AND deleted_at IS NULL) ON CONFLICT DO NOTHING`,[user,group]);
      else await c.query("DELETE FROM private_area.memberships WHERE user_id=$1 AND group_id=$2",[user,group]);
    } else if(entity==="tools" && ["POST","PATCH"].includes(method)) {
      const t=toolSchema.parse(body), values=[t.name,t.provider,t.description,t.url,t.access_type,t.instructions,t.plan,t.price,t.details,t.logo_url,t.category];
      let toolId=target;
      if(method==="POST" && !target) { toolId=randomUUID(); await c.query("INSERT INTO private_area.tools(id,name,provider,description,url,access_type,instructions,plan,price,details,logo_url,category) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",[toolId,...values]); }
      else if(method==="PATCH" && target) await c.query("UPDATE private_area.tools SET name=$2,provider=$3,description=$4,url=$5,access_type=$6,instructions=$7,plan=$8,price=$9,details=$10,logo_url=$11,category=$12 WHERE id=$1",[target,...values]);
      else throw new AccessError(400,"Ungültiger Aufruf.");
      if(method==="POST" || t.access_type==="team_seat") {
        // Default: new tools are available to everyone (group "Freunde" holds all users).
        await c.query("INSERT INTO private_area.groups(id,name) VALUES(gen_random_uuid(),'Freunde') ON CONFLICT DO NOTHING");
        await c.query("INSERT INTO private_area.grants(id,tool_id,group_id) SELECT gen_random_uuid(),$1::uuid,id FROM private_area.groups WHERE name='Freunde' ON CONFLICT DO NOTHING",[toolId]);
      }
      response={ok:true,toolId};
    } else if(entity==="tools" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.tools WHERE id=$1",[target]);
    } else if(entity==="credentials" && method==="PATCH" && target) {
      const input=loginInput.parse(body);
      const [row]=(await c.query("SELECT secret_box FROM private_area.tool_credentials WHERE tool_id=$1",[target])).rows;
      const next=mergeLogin(row?JSON.parse(unseal(row.secret_box,target)) as Login:null,input);
      const fields=presentFields(next);
      if(fields.length===0) await c.query("DELETE FROM private_area.tool_credentials WHERE tool_id=$1",[target]);
      else await c.query(`INSERT INTO private_area.tool_credentials(tool_id,secret_box,fields,updated_at) VALUES($1,$2,$3,now())
        ON CONFLICT(tool_id) DO UPDATE SET secret_box=EXCLUDED.secret_box,fields=EXCLUDED.fields,updated_at=now()`,[target,seal(JSON.stringify(next),target),fields]);
      response={ok:true,fields};
    } else if(entity==="credentials" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.tool_credentials WHERE tool_id=$1",[target]);
      await c.query("UPDATE private_area.access_links SET revoked_at=now() WHERE tool_id=$1 AND revoked_at IS NULL",[target]);
    } else if(entity==="links" && method==="DELETE" && target) {
      await c.query("UPDATE private_area.access_links SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL",[target]);
    } else if(entity==="grants" && method==="POST" && !target) {
      const tool=id.parse(body.toolId), user=body.userId?id.parse(body.userId):null, group=body.groupId?id.parse(body.groupId):null;
      if(Boolean(user)===Boolean(group)) throw new AccessError(400,"Genau einen Nutzer oder eine Gruppe auswählen.");
      await c.query("INSERT INTO private_area.grants(id,tool_id,user_id,group_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",[randomUUID(),tool,user,group]);
    } else if(entity==="grants" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.grants WHERE id=$1",[target]);
    } else throw new AccessError(404,"Aktion nicht gefunden.");
    await c.query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)",[s.user_id,`${method}:${entity}`]);
    return response;
  });

  // Mails go out after the commit: a mail failure never rolls back the change.
  if(entity==="invitations" && method==="POST" && !target) {
    const inv=inviteSchema.parse(body);
    const r=result as {url:string;hours:number;invitationId:string};
    if(!inv.send_mail) return {url:r.url,hours:r.hours};
    const ok=await sendMail(inv.email,inviteMail(inv.first_name,r.url,r.hours));
    await query("INSERT INTO private_area.mail_log(kind,invitation_id,ok) VALUES('invite',$1,$2)",[r.invitationId,ok]);
    return {url:r.url,hours:r.hours,mailed:ok};
  }
  if(entity==="tools" && method==="POST" && !target && body.notify!==false) {
    return {...result,mail:await notifyNewTool(String((result as {toolId:string}).toolId))};
  }
  return result;
}
