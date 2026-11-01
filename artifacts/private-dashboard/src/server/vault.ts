import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import { digest, token } from "./auth";
import { AccessError } from "./policy";

/**
 * Shared logins per tool, encrypted at rest with AES-256-GCM.
 * Key: CREDENTIALS_KEY (32 random bytes, base64) in the server environment, never in the database.
 * The tool id is bound as additional data, so a box copied to another tool does not decrypt.
 */
export type Login = { email: string; username: string; password: string; totp: string; website: string };
export const LOGIN_FIELDS = ["email", "username", "password", "totp", "website"] as const;
export const LINK_HOURS = 6;

function key() {
  const raw = process.env.CREDENTIALS_KEY?.trim();
  if (!raw) throw new AccessError(503, "Logindaten sind noch nicht eingerichtet (CREDENTIALS_KEY fehlt).");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new AccessError(503, "CREDENTIALS_KEY muss 32 Byte (Base64) lang sein.");
  return k;
}
export const vaultConfigured = () => { try { key(); return true; } catch { return false; } };

export function seal(plain: string, aad: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1." + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
export function unseal(box: string, aad: string) {
  if (!box.startsWith("v1.")) throw new AccessError(500, "Unbekanntes Format.");
  const b = Buffer.from(box.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

/* ---------- TOTP (RFC 6238), computed on the server; the secret never leaves it ---------- */
type TotpSpec = { secret: Buffer; digits: number; period: number; algorithm: "sha1" | "sha256" | "sha512" };
function base32(s: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = "";
  for (const ch of clean) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw new AccessError(400, "2FA-Schlüssel ist kein gültiger Base32-Code.");
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
/** Accepts a plain Base32 secret or an otpauth://totp/… URI (as shown under the QR code). */
export function parseTotp(input: string): TotpSpec {
  let secret = input.trim(), digits = 6, period = 30, algorithm: TotpSpec["algorithm"] = "sha1";
  if (secret.toLowerCase().startsWith("otpauth://")) {
    const u = new URL(secret);
    if (u.host !== "totp") throw new AccessError(400, "Nur TOTP-Codes werden unterstützt.");
    secret = u.searchParams.get("secret") ?? "";
    digits = Number(u.searchParams.get("digits") ?? 6);
    period = Number(u.searchParams.get("period") ?? 30);
    const alg = (u.searchParams.get("algorithm") ?? "SHA1").toLowerCase();
    if (alg !== "sha1" && alg !== "sha256" && alg !== "sha512") throw new AccessError(400, "Unbekannter 2FA-Algorithmus.");
    algorithm = alg;
  }
  const bytes = base32(secret);
  if (bytes.length < 10 || ![6, 7, 8].includes(digits) || !(period >= 15 && period <= 120)) throw new AccessError(400, "2FA-Schlüssel ist unvollständig.");
  return { secret: bytes, digits, period, algorithm };
}
export function totpNow(input: string, now = Date.now()) {
  const t = parseTotp(input);
  const step = Math.floor(now / 1000 / t.period);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac(t.algorithm, t.secret).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  const code = String(bin % 10 ** t.digits).padStart(t.digits, "0");
  const remaining = t.period - (Math.floor(now / 1000) % t.period);
  return { code, period: t.period, remaining };
}

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
export async function openLink(session: { id: string; user_id: string }, toolId: string, fresh: boolean) {
  if (!(await hasGrant(session.user_id, toolId))) throw new AccessError(403, "Dieses Tool ist für dich nicht freigegeben.");
  const [cred] = await query("SELECT 1 FROM private_area.tool_credentials WHERE tool_id=$1", [toolId]);
  if (!cred) throw new AccessError(404, "Für dieses Tool sind noch keine Logindaten hinterlegt.");
  if (!fresh) {
    const [cur] = await query(`SELECT id,token_box,expires_at,views FROM private_area.access_links
      WHERE session_id=$1 AND tool_id=$2 AND revoked_at IS NULL AND expires_at>now()+interval '10 minutes'
      ORDER BY created_at DESC LIMIT 1`, [session.id, toolId]);
    if (cur) return { id: cur.id, token: unseal(cur.token_box, cur.id), expires_at: cur.expires_at, views: cur.views };
  }
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
  const totp = login.totp ? totpNow(login.totp) : null;
  if (!count) return { totp };
  const [v] = await query("UPDATE private_area.access_links SET views=views+1,last_viewed_at=now() WHERE id=$1 RETURNING views", [l.id]);
  await query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)", [session.user_id, "VIEW:access-link"]);
  return {
    tool: { name: l.tool_name, logo_url: l.logo_url, url: login.website || l.tool_url },
    email: login.email, username: login.username, password: login.password, totp,
    expires_at: l.expires_at, views: v.views,
  };
}
