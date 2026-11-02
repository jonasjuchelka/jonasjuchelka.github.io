import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import { digest, token } from "./auth";
import { AccessError } from "./policy";
import { parseTotp, seal, unseal } from "./crypto";
import { accessView, totpView, type Login } from "./access-view";
export { seal, unseal, parseTotp, totpNow, vaultConfigured } from "./crypto";

/**
 * Shared logins per tool, encrypted at rest with AES-256-GCM.
 * Key: CREDENTIALS_KEY (32 random bytes, base64) in the server environment, never in the database.
 * The tool id is bound as additional data, so a box copied to another tool does not decrypt.
 */
export type { Login } from "./access-view";
export const LOGIN_FIELDS = ["email", "username", "password", "totp", "website"] as const;
export const LINK_HOURS = 6;

/* ---------- Stored logins ---------- */
const field = (max: number) => z.string().trim().max(max).optional();
export const loginInput = z.object({
  email: field(254), username: field(254), password: z.string().max(500).optional(), totp: field(1000), website: field(2000),
  clear: z.array(z.enum(LOGIN_FIELDS)).max(5).optional(),
});

export async function readLogin(toolId: string): Promise<Login | null> {
  const [row] = await query("SELECT secret_box FROM private_area.tool_credentials WHERE tool_id=$1", [toolId]);
  if (!row) return null;
  return JSON.parse(unseal(row.secret_box, toolId)) as Login;
}
/** Empty input fields keep the stored value; names in `clear` remove it. Returns the fields now stored. */
export function mergeLogin(old: Login | null, input: z.infer<typeof loginInput>): Login {
  const next: Login = { email: "", username: "", password: "", totp: "", website: "", ...(old ?? {}) };
  for (const f of LOGIN_FIELDS) {
    const v = input[f];
    if (typeof v === "string" && v !== "") next[f] = f === "password" ? v : v.trim();
  }
  for (const f of input.clear ?? []) next[f] = "";
  if (next.totp) parseTotp(next.totp); // reject broken secrets before storing
  if (next.website && !/^https:\/\//.test(next.website)) throw new AccessError(400, "Website muss mit https:// beginnen.");
  return next;
}
export const presentFields = (l: Login) => LOGIN_FIELDS.filter((f) => l[f]);

/* ---------- Access links: 6 hours, bound to the browser session that created them ---------- */
export async function hasGrant(userId: string, toolId: string) {
  const r = await query(`SELECT 1 FROM private_area.grants g WHERE g.tool_id=$2 AND (g.user_id=$1 OR g.group_id IN
    (SELECT group_id FROM private_area.memberships WHERE user_id=$1)) LIMIT 1`, [userId, toolId]);
  return r.length > 0;
}

/** Returns the open link of this session for the tool, or creates a new one. */
export const REAUTH_MESSAGE = "Bitte zuerst erneut mit Passkey bestätigen.";
/** Reusing the open link only needs the session; a new link needs a passkey confirmation from the last 5 minutes. */
export async function openLink(session: { id: string; user_id: string; confirmed: boolean }, toolId: string, fresh: boolean) {
  if (!(await hasGrant(session.user_id, toolId))) throw new AccessError(403, "Dieses Tool ist für dich nicht freigegeben.");
  const [cred] = await query("SELECT 1 FROM private_area.tool_credentials WHERE tool_id=$1", [toolId]);
  if (!cred) throw new AccessError(404, "Für dieses Tool sind noch keine Logindaten hinterlegt.");
  if (!fresh) {
    const [cur] = await query(`SELECT id,token_box,expires_at,views FROM private_area.access_links
      WHERE session_id=$1 AND tool_id=$2 AND revoked_at IS NULL AND expires_at>now()+interval '10 minutes'
      ORDER BY created_at DESC LIMIT 1`, [session.id, toolId]);
    if (cur) return { id: cur.id, token: unseal(cur.token_box, cur.id), expires_at: cur.expires_at, views: cur.views };
  }
  if (!session.confirmed) throw new AccessError(403, REAUTH_MESSAGE);
  const id = randomUUID(), raw = token();
  const [row] = await query(`INSERT INTO private_area.access_links(id,token_hash,token_box,tool_id,user_id,session_id,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,now()+make_interval(hours=>$7)) RETURNING expires_at`,
    [id, digest(raw), seal(raw, id), toolId, session.user_id, session.id, LINK_HOURS]);
  await query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)", [session.user_id, "POST:access-link"]);
  return { id, token: raw, expires_at: row.expires_at, views: 0 };
}

/** Resolves a link for the current session. `count` = a page view (not a 2FA refresh). */
export async function viewLink(session: { id: string; user_id: string }, raw: string, count: boolean) {
  const [l] = await query(`SELECT l.*, t.name AS tool_name, t.url AS tool_url, t.logo_url FROM private_area.access_links l
    JOIN private_area.tools t ON t.id=l.tool_id WHERE l.token_hash=$1`, [digest(raw)]);
  if (!l) throw new AccessError(404, "Dieser Link existiert nicht.");
  if (l.revoked_at) throw new AccessError(410, "Dieser Link wurde widerrufen.");
  if (new Date(l.expires_at).getTime() <= Date.now()) throw new AccessError(410, "Dieser Link ist abgelaufen.");
  if (l.session_id !== session.id) throw new AccessError(403, "Dieser Link funktioniert nur in dem Browser, in dem er erstellt wurde.");
  if (!(await hasGrant(session.user_id, l.tool_id))) throw new AccessError(403, "Dieses Tool ist für dich nicht mehr freigegeben.");
  const login = await readLogin(l.tool_id);
  if (!login) throw new AccessError(404, "Die Logindaten wurden entfernt.");
  // Only the current 2FA code ever leaves the server, never the secret (see access-view.ts and tests/access.test.ts).
  if (!count) return { totp: totpView(login) };
  const [v] = await query("UPDATE private_area.access_links SET views=views+1,last_viewed_at=now() WHERE id=$1 RETURNING views", [l.id]);
  await query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)", [session.user_id, "VIEW:access-link"]);
  return accessView(login, l as { tool_name: string; logo_url: string | null; tool_url: string; expires_at: string }, v.views);
}
