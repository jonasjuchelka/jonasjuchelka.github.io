import "server-only";
import { randomUUID } from "node:crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { z } from "zod";
import { query, transaction } from "./db";
import { authConfig, AccessError } from "./policy";
import { currentSession, putChallenge, consumeChallenge, digest, issueSession, setSession } from "./auth";

const keyName=z.string().trim().min(1).max(80);
export async function authenticationOptions(body: Record<string,unknown>) {
  const {rpID}=authConfig();
  const purpose=body.purpose==="reauth"?"reauth":"login";
  const s=purpose==="reauth"?await currentSession():undefined;
  const options=await generateAuthenticationOptions({rpID,userVerification:"required"});
  await putChallenge(options.challenge,purpose,s?.user_id,undefined,s?.id);
  return options;
}
export async function authenticationVerify(body: Record<string,unknown>) {
  const config=authConfig();
  const flow=await consumeChallenge();
  if (!["login","reauth"].includes(flow.purpose)) throw new AccessError(400,"Falscher Vorgang.");
  const response=body.response as AuthenticationResponseJSON;
  if (!response?.id) throw new AccessError(400,"Passkey-Antwort fehlt.");
  const s=flow.purpose==="reauth"?await currentSession():undefined;
  if (s && (s.id!==flow.session_id || s.user_id!==flow.user_id)) throw new AccessError(403,"Sitzung passt nicht.");
  const raw=await transaction(async c=>{
    const result=await c.query(`SELECT p.*,u.blocked FROM private_area.passkeys p JOIN private_area.users u ON u.id=p.user_id WHERE p.id=$1 FOR UPDATE OF p,u`,[response.id]);
    const key=result.rows[0];
    if (!key || key.blocked || (flow.user_id && key.user_id!==flow.user_id)) throw new AccessError(403,"Passkey nicht zugelassen.");
    const verified=await verifyAuthenticationResponse({
      response,expectedChallenge:flow.challenge,expectedOrigin:config.origin,expectedRPID:config.rpID,requireUserVerification:true,
      credential:{id:key.id,publicKey:new Uint8Array(key.public_key),counter:Number(key.counter),transports:key.transports},
    });
    if (!verified.verified) throw new AccessError(400,"Passkey konnte nicht bestätigt werden.");
    await c.query("UPDATE private_area.passkeys SET counter=$2,backed_up=$3 WHERE id=$1",[key.id,verified.authenticationInfo.newCounter,verified.authenticationInfo.credentialBackedUp]);
    await c.query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)",[key.user_id,flow.purpose]);
    if (s) {
      await c.query("UPDATE private_area.sessions SET confirmed_at=now() WHERE id=$1 AND expires_at>now()",[s.id]);
      return null;
    }
    return issueSession(c,key.user_id);
  });
  if(raw) await setSession(raw);
  return {ok:true};
}
export async function registrationOptions(body: Record<string,unknown>, invite:boolean) {
  const config=authConfig();
  let userId:string, name:string, invitationId:string|undefined, sessionId:string|undefined;
  if(invite) {
    const raw=z.string().min(40).max(100).parse(body.token);
    const [i]=await query("SELECT id,name FROM private_area.invitations WHERE token_hash=$1 AND expires_at>now() AND used_at IS NULL",[digest(raw)]);
    if(!i) throw new AccessError(400,"Einladung abgelaufen, widerrufen oder bereits verwendet.");
    userId=randomUUID(); name=i.name; invitationId=i.id;
  } else {
    const s=await currentSession(true);
    userId=s.user_id; name=s.name; sessionId=s.id;
  }
  const keys=await query("SELECT id,transports FROM private_area.passkeys WHERE user_id=$1",[userId]);
  const options=await generateRegistrationOptions({
    rpName:"Jonas Juchelka · Privater Bereich",rpID:config.rpID,userName:name,
    userID:new TextEncoder().encode(userId),attestationType:"none",
    authenticatorSelection:{residentKey:"required",userVerification:"required"},
    excludeCredentials:keys.map(k=>({id:k.id,transports:k.transports as AuthenticatorTransportFuture[]})),
  });
  await putChallenge(options.challenge,invite?"invite":"add",userId,invitationId,sessionId);
  return options;
}
export async function registrationVerify(body: Record<string,unknown>, invite:boolean) {
  const config=authConfig(), flow=await consumeChallenge();
  const name=keyName.parse(body.name);
  if(flow.purpose!==(invite?"invite":"add")) throw new AccessError(400,"Falscher Vorgang.");
  const s=invite?undefined:await currentSession(true);
  if(s && (s.user_id!==flow.user_id || s.id!==flow.session_id)) throw new AccessError(403,"Fremder Registrierungsvorgang.");
  const verified=await verifyRegistrationResponse({
    response:body.response as RegistrationResponseJSON,expectedChallenge:flow.challenge,
    expectedOrigin:config.origin,expectedRPID:config.rpID,requireUserVerification:true,
  });
  if(!verified.verified || !verified.registrationInfo) throw new AccessError(400,"Passkey-Registrierung fehlgeschlagen.");
  const info=verified.registrationInfo;
  const raw=await transaction(async c=>{
    if(invite) {
      const r=await c.query("UPDATE private_area.invitations SET used_at=now() WHERE id=$1 AND used_at IS NULL AND expires_at>now() RETURNING *",[flow.invitation_id]);
      const i=r.rows[0];
      if(!i) throw new AccessError(400,"Einladung bereits verwendet oder abgelaufen.");
      await c.query("INSERT INTO private_area.users(id,name,role) VALUES($1,$2,$3)",[flow.user_id,i.name,i.role]);
    } else {
      const r=await c.query(`SELECT u.id FROM private_area.users u JOIN private_area.sessions s ON s.user_id=u.id
        WHERE u.id=$1 AND NOT u.blocked AND s.id=$2 AND s.expires_at>now()
        AND s.confirmed_at>now()-interval '5 minutes' FOR UPDATE OF u,s`,[flow.user_id,s!.id]);
      if(!r.rowCount) throw new AccessError(403,"Konto gesperrt.");
    }
    await c.query(`INSERT INTO private_area.passkeys(id,user_id,public_key,counter,transports,device_type,backed_up,name)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[info.credential.id,flow.user_id,Buffer.from(info.credential.publicKey),info.credential.counter,info.credential.transports??[],info.credentialDeviceType,info.credentialBackedUp,name]);
    await c.query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,'passkey_registered')",[flow.user_id]);
    return invite?issueSession(c,flow.user_id):null;
  });
  if(raw) await setSession(raw);
  return {ok:true};
}
