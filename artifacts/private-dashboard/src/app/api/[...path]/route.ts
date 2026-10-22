import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query, transaction } from "../../../server/db";
import { AccessError, authConfig, checkOrigin } from "../../../server/policy";
import { currentSession, clearSession, rateLimit } from "../../../server/auth";
import { authenticationOptions, authenticationVerify, registrationOptions, registrationVerify } from "../../../server/webauthn";
import { adminGet, adminMutation } from "../../../server/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, max-age=0","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
async function handle(request:NextRequest, context:{params:Promise<{path:string[]}>}) {
  try {
    const {path}=await context.params, route=path.join("/"), method=request.method;
    if(route==="status" && method==="GET") {
      let configured=false; try { authConfig(); configured=true; } catch {}
      return NextResponse.json({configured},{headers});
    }
    const config=authConfig();
    let body:Record<string,unknown>={};
    if(method!=="GET") {
      checkOrigin(request.headers.get("origin"),config.origin);
      if(Number(request.headers.get("content-length")??0)>32_768) throw new AccessError(413,"Anfrage zu groß.");
      const raw=await request.text();
      if(raw.length>32_768) throw new AccessError(413,"Anfrage zu groß.");
      if(raw) { if(!request.headers.get("content-type")?.startsWith("application/json")) throw new AccessError(415,"JSON erwartet."); body=z.record(z.string(),z.unknown()).parse(JSON.parse(raw)); }
    }
    // Fixed bucket names avoid trusting spoofable forwarded IPs or unbounded keys.
    await rateLimit(["auth","invite"].includes(path[0]??"") ? path[0]! : "private");
    let result:unknown;
    if(route==="auth/options" && method==="POST") result=await authenticationOptions(body);
    else if(route==="auth/verify" && method==="POST") result=await authenticationVerify(body);
    else if(route==="invite/options" && method==="POST") result=await registrationOptions(body,true);
    else if(route==="invite/verify" && method==="POST") result=await registrationVerify(body,true);
    else if(route==="passkeys/options" && method==="POST") result=await registrationOptions(body,false);
    else if(route==="passkeys/verify" && method==="POST") result=await registrationVerify(body,false);
    else if(route==="logout" && method==="POST") {
      const s=await currentSession(); await query("DELETE FROM private_area.sessions WHERE id=$1",[s.id]); await clearSession(); result={ok:true};
    } else if(route==="account" && method==="GET") {
      const s=await currentSession();
      const [passkeys,sessions]=await Promise.all([
        query("SELECT id,name,created_at FROM private_area.passkeys WHERE user_id=$1 ORDER BY created_at",[s.user_id]),
        query("SELECT id,created_at,expires_at,(id=$2) AS current FROM private_area.sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC",[s.user_id,s.id]),
      ]);
      result={user:{id:s.user_id,name:s.name,role:s.role},passkeys,sessions};
    } else if(path[0]==="passkeys" && path.length===2 && ["PATCH","DELETE"].includes(method)) {
      const s=await currentSession(true);
      await transaction(async c=>{
        const user=await c.query(`SELECT u.id FROM private_area.users u JOIN private_area.sessions s ON s.user_id=u.id
          WHERE u.id=$1 AND NOT u.blocked AND s.id=$2 AND s.expires_at>now()
          AND s.confirmed_at>now()-interval '5 minutes' FOR UPDATE OF u,s`,[s.user_id,s.id]);
        if(!user.rowCount) throw new AccessError(403,"Konto gesperrt.");
        const keys=await c.query("SELECT id FROM private_area.passkeys WHERE user_id=$1",[s.user_id]);
        if(!keys.rows.some(k=>k.id===path[1])) throw new AccessError(404,"Passkey nicht gefunden.");
        if(method==="DELETE") {
          if(keys.rowCount!<=1) throw new AccessError(409,"Der letzte Passkey kann nicht entfernt werden.");
          await c.query("DELETE FROM private_area.passkeys WHERE id=$1 AND user_id=$2",[path[1],s.user_id]);
          await c.query("DELETE FROM private_area.sessions WHERE user_id=$1 AND id<>$2",[s.user_id,s.id]);
        } else await c.query("UPDATE private_area.passkeys SET name=$3 WHERE id=$1 AND user_id=$2",[path[1],s.user_id,z.string().trim().min(1).max(80).parse(body.name)]);
        await c.query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)",[s.user_id,`${method}:passkey`]);
      }); result={ok:true};
    } else if(path[0]==="sessions" && path.length===2 && method==="DELETE") {
      const s=await currentSession(true);
      await query("DELETE FROM private_area.sessions WHERE id=$1 AND user_id=$2",[z.string().uuid().parse(path[1]),s.user_id]);
      if(path[1]===s.id) await clearSession(); result={ok:true};
    } else if(route==="tools" && method==="GET") {
      const s=await currentSession();
      const tools=await query(`SELECT DISTINCT t.* FROM private_area.tools t JOIN private_area.grants g ON g.tool_id=t.id
        WHERE g.user_id=$1 OR g.group_id IN (SELECT group_id FROM private_area.memberships WHERE user_id=$1) ORDER BY t.name`,[s.user_id]);
      result={tools,vaultConfigured:false};
    } else if(route==="admin" && method==="GET") result=await adminGet();
    else if(path[0]==="admin" && method!=="GET") result=await adminMutation(path.slice(1),method,body);
    else throw new AccessError(404,"Nicht gefunden.");
    return NextResponse.json(result,{headers});
  } catch(e) {
    if(e instanceof AccessError) return NextResponse.json({error:e.message},{status:e.status,headers});
    if(e instanceof z.ZodError || e instanceof SyntaxError) return NextResponse.json({error:"Eingaben sind ungültig."},{status:400,headers});
    // Do not log WebAuthn responses, cookies, invitation tokens or raw database errors.
    return NextResponse.json({error:"Vorgang nicht möglich. Bitte erneut versuchen; Einrichtung oder Server prüfen."},{status:503,headers});
  }
}
export {handle as GET,handle as POST,handle as PATCH,handle as DELETE};
