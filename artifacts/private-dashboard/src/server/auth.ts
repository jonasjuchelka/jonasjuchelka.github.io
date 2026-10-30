import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { query } from "./db";
import { AccessError } from "./policy";

export const SESSION = "__Host-jj-session";
const FLOW = "__Host-jj-flow";
export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
const options = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };
export async function currentSession(fresh = false, admin = false) {
  const raw = (await cookies()).get(SESSION)?.value;
  if (!raw) throw new AccessError(401, "Bitte mit einem Passkey anmelden.");
  const [s] = await query(`SELECT s.*, u.name, u.role, u.blocked FROM private_area.sessions s
    JOIN private_area.users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()`, [digest(raw)]);
  if (!s) throw new AccessError(401, "Sitzung abgelaufen oder widerrufen.");
  if (s.blocked) throw new AccessError(403, "Dieses Konto ist gesperrt.");
  if (admin && s.role !== "admin") throw new AccessError(403, "Keine Administrationsberechtigung.");
  if (fresh && Date.now() - new Date(s.confirmed_at).getTime() > 300_000) throw new AccessError(403, "Bitte zuerst erneut mit Passkey bestätigen.");
  return s;
}
export async function issueSession(c: PoolClient, userId: string) {
  const raw = token();
  const old = (await cookies()).get(SESSION)?.value;
  if (old) await c.query("DELETE FROM private_area.sessions WHERE token_hash=$1", [digest(old)]);
  await c.query(`INSERT INTO private_area.sessions(id,token_hash,user_id,expires_at) VALUES($1,$2,$3,now()+interval '365 days')`, [randomUUID(),digest(raw),userId]);
  return raw;
}
export async function setSession(raw: string) { (await cookies()).set(SESSION, raw, {...options, maxAge:31536000}); }
export async function clearSession() { (await cookies()).set(SESSION, "", {...options,maxAge:0}); }
export async function putChallenge(challenge: string, purpose: string, userId?: string, invitationId?: string, sessionId?: string) {
  const raw = token();
  const jar = await cookies();
  const previous = jar.get(FLOW)?.value;
  if (previous) await query("DELETE FROM private_area.challenges WHERE token_hash=$1", [digest(previous)]);
  await query(`INSERT INTO private_area.challenges(token_hash,challenge,purpose,user_id,invitation_id,session_id,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')`,[digest(raw),challenge,purpose,userId??null,invitationId??null,sessionId??null]);
  jar.set(FLOW,raw,{...options,maxAge:300});
}
export async function consumeChallenge() {
  const jar=await cookies(); const raw=jar.get(FLOW)?.value;
  jar.set(FLOW,"",{...options,maxAge:0});
  if (!raw) throw new AccessError(400,"Anmeldung abgelaufen. Bitte neu beginnen.");
  // DELETE commits before verification: even a failed attempt burns the challenge.
  const [flow]=await query("DELETE FROM private_area.challenges WHERE token_hash=$1 AND expires_at>now() RETURNING *",[digest(raw)]);
  if (!flow) throw new AccessError(400,"Challenge abgelaufen oder bereits verwendet.");
  return flow;
}
export async function rateLimit(key: string) {
  const [r]=await query(`INSERT INTO private_area.rate_limits(key,hits,expires_at) VALUES($1,1,now()+interval '1 minute')
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN private_area.rate_limits.expires_at<now() THEN 1 ELSE private_area.rate_limits.hits+1 END,
    expires_at=CASE WHEN private_area.rate_limits.expires_at<now() THEN now()+interval '1 minute' ELSE private_area.rate_limits.expires_at END RETURNING hits`,[key]);
  if (r.hits>60) throw new AccessError(429,"Zu viele Versuche. Bitte in einer Minute erneut versuchen.");
}
