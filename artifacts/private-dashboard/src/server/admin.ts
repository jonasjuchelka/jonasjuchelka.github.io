import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { currentSession, digest, token } from "./auth";
import { AccessError, authConfig, safeExternalUrl } from "./policy";
import { database } from "./db";
import { tools as toolsTable } from "./schema";

const id=z.string().uuid();
const name=z.string().trim().min(1).max(100);
const toolSchema=z.object({name,provider:name,description:z.string().max(2000),url:z.string().max(2000).transform(safeExternalUrl),
  access_type:z.enum(["own_account","team_seat","permitted_shared"]),instructions:z.string().max(4000),
  plan:z.string().trim().max(80).default(""),price:z.string().trim().max(160).default(""),details:z.string().max(8000).default(""),
  logo_url:z.string().trim().max(2000).default("").transform((v)=>v===""||(v.startsWith("/")&&!v.startsWith("//"))?v:safeExternalUrl(v))});
export async function adminGet() {
  await currentSession(false,true);
  const [users,groups,memberships,tools,grants,invitations]=await Promise.all([
    query("SELECT id,name,role,blocked FROM private_area.users ORDER BY name"),
    query("SELECT id,name FROM private_area.groups ORDER BY name"),
    query("SELECT user_id,group_id FROM private_area.memberships"),
    database().select().from(toolsTable).orderBy(toolsTable.name),query("SELECT * FROM private_area.grants"),
    query("SELECT id,name,expires_at,used_at FROM private_area.invitations ORDER BY expires_at DESC LIMIT 100"),
  ]);
  return {users,groups,memberships,tools,grants,invitations};
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
    if(entity==="invitations" && method==="POST" && !target) {
      const raw=token(); const uuid=randomUUID();
      await c.query("INSERT INTO private_area.invitations(id,token_hash,name,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[uuid,digest(raw),name.parse(body.name)]);
      response={url:`${authConfig().origin}${(process.env.BASE_PATH??"").replace(/\/$/,"")}/invite#token=${raw}`};
    } else if(entity==="invitations" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.invitations WHERE id=$1",[target]);
    } else if(entity==="users" && method==="PATCH" && target) {
      if(target===s.user_id) throw new AccessError(400,"Eigenes Administratorkonto nicht sperren.");
      const blocked=z.boolean().parse(body.blocked);
      await c.query("UPDATE private_area.users SET blocked=$2 WHERE id=$1",[target,blocked]);
      if(blocked) await c.query("DELETE FROM private_area.sessions WHERE user_id=$1",[target]);
    } else if(entity==="groups" && method==="POST" && !target) {
      await c.query("INSERT INTO private_area.groups(id,name) VALUES($1,$2)",[randomUUID(),name.parse(body.name)]);
    } else if(entity==="groups" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.groups WHERE id=$1",[target]);
    } else if(entity==="memberships" && !target && ["POST","DELETE"].includes(method)) {
      const user=id.parse(body.userId),group=id.parse(body.groupId);
      if(method==="POST") await c.query("INSERT INTO private_area.memberships(user_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[user,group]);
      else await c.query("DELETE FROM private_area.memberships WHERE user_id=$1 AND group_id=$2",[user,group]);
    } else if(entity==="tools" && ["POST","PATCH"].includes(method)) {
      const t=toolSchema.parse(body), values=[t.name,t.provider,t.description,t.url,t.access_type,t.instructions,t.plan,t.price,t.details,t.logo_url];
      if(method==="POST" && !target) await c.query("INSERT INTO private_area.tools(id,name,provider,description,url,access_type,instructions,plan,price,details,logo_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[randomUUID(),...values]);
      else if(method==="PATCH" && target) await c.query("UPDATE private_area.tools SET name=$2,provider=$3,description=$4,url=$5,access_type=$6,instructions=$7,plan=$8,price=$9,details=$10,logo_url=$11 WHERE id=$1",[target,...values]);
      else throw new AccessError(400,"Ungültiger Aufruf.");
    } else if(entity==="tools" && method==="DELETE" && target) {
      await c.query("DELETE FROM private_area.tools WHERE id=$1",[target]);
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
  return result;
}
