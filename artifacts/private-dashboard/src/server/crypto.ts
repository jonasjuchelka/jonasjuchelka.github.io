import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { AccessError } from "./policy";

/**
 * Encryption and TOTP helpers for shared logins. No "server-only" import, so unit tests can load it;
 * it is only ever imported from server code (vault.ts).
 * Key: CREDENTIALS_KEY (32 random bytes, base64) in the server environment, never in the database.
 */
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
export function base32(s: string) {
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

