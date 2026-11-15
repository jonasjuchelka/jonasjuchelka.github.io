// Kernlogik des Mail-Workers: reine Funktionen, ohne Cloudflare-Importe, damit sie lokal testbar sind.
// Eingaben sind immer fremd: Absender, Header und Text werden nur nach Prüfung verwendet.

export const MAX_RAW_BYTES = 100_000;   // ganze Mail
export const MAX_CHARS = 2000;          // Gedanke
export const MAX_PER_DAY = 10;
const SLUG_RE = /^g-\d{8}-\d{6}-[a-z0-9]{6}$/;

/** "Name <a@b.c>" oder "a@b.c" → "a@b.c" in Kleinbuchstaben, sonst null. */
export function address(s) {
  const m = /<([^<>\s@]+@[^<>\s@]+)>$/.exec(String(s ?? "").trim()) ?? /^([^<>\s@]+@[^<>\s@]+)$/.exec(String(s ?? "").trim());
  return m ? m[1].toLowerCase() : null;
}

export const AUTHSERV = "mx.cloudflare.net";

/**
 * Quoted Strings und Kommentare (auch verschachtelt) entfernen.
 * Cloudflares eigene Kommentare/Quotes enthalten nie ";" oder "=". Tauchen sie darin auf, versucht jemand,
 * ein echtes Ergebnis in einem Kommentar zu verstecken → null (dann wird abgelehnt). Ebenso bei unausgeglichenen Klammern/Quotes.
 */
function stripComments(v) {
  let out = "", depth = 0, quoted = false;
  for (const c of v) {
    if (quoted) { if (c === '"') quoted = false; else if (c === ";" || c === "=") return null; continue; }
    if (c === '"' && depth === 0) { quoted = true; out += '""'; continue; }
    if (c === "(") { depth++; continue; }
    if (c === ")") { if (--depth < 0) return null; continue; }
    if (depth > 0) { if (c === ";" || c === "=") return null; continue; }
    out += c;
  }
  return depth === 0 && !quoted ? out : null;
}

/**
 * Prüft das Authentication-Results, das Cloudflares Mailserver setzt (RFC 8601).
 * Gezählt werden nur echte Methoden-Ergebnisse am Anfang eines Abschnitts ("; dmarc=pass ..."),
 * nicht Eigenschaften wie "policy.dmarc=none" (das ist nur die veröffentlichte Richtlinie des Absenders).
 * Regeln (alle müssen gelten):
 *  1. Der Header beginnt mit Cloudflares Kennung (mx.cloudflare.net).
 *  2. Es gibt mindestens ein dmarc-Ergebnis, ALLE dmarc-Ergebnisse sind "pass", jedes für header.from=<Absender-Domain>.
 *  3. Es gibt mindestens ein dkim-Ergebnis, ALLE dkim-Ergebnisse sind "pass", mindestens eines mit header.d=<Absender-Domain>.
 * "Alle" statt "eins": Fügt ein Angreifer eigene Header mit "pass" ein, bleibt Cloudflares echtes "fail"/"none" stehen und die Mail fällt durch.
 */
export function authCheck(authResults, domain) {
  const raw = String(authResults ?? "");
  const d = String(domain ?? "").toLowerCase();
  if (!raw.trim() || !d) return { ok: false, why: "kein_header" };
  const stripped = stripComments(raw);
  if (stripped == null) return { ok: false, why: "header_kaputt" };
  const v = stripped.toLowerCase().replace(/\s+/g, " ").trim();
  const parts = v.split(";").map((x) => x.trim());
  if (parts[0] !== AUTHSERV) return { ok: false, why: "fremder_server" };
  const res = { dmarc: [], dkim: [] };
  for (const seg of parts.slice(1)) {
    const m = /^([a-z][a-z0-9_-]*)\s*=\s*([a-z]+)(.*)$/.exec(seg);
    if (m && m[1] in res) res[m[1]].push({ result: m[2], props: m[3] });
  }
  const prop = (props, key) => (new RegExp(`(?:^|\\s)${key.replace(".", "\\.")}=([^\\s,]+)`).exec(props) ?? [])[1];
  if (res.dmarc.length === 0 || res.dmarc.some((r) => r.result !== "pass")) return { ok: false, why: "dmarc" };
  if (res.dmarc.some((r) => prop(r.props, "header.from") !== d)) return { ok: false, why: "dmarc_domain" };
  if (res.dkim.length === 0 || res.dkim.some((r) => r.result !== "pass")) return { ok: false, why: "dkim" };
  if (!res.dkim.some((r) => prop(r.props, "header.d") === d)) return { ok: false, why: "dkim_domain" };
  return { ok: true };
}
/** Kurzform für Tests und Logs. */
export const dmarcPass = (authResults, domain) => authCheck(authResults, domain).ok;

/** Alle Bedingungen für eine gültige Mail. Gibt { ok:true, sender } oder { ok:false, reason } zurück. */
export function checkEnvelope({ rawSize, envelopeFrom, headerFrom, to, authResults }, env) {
  if (!(rawSize > 0) || rawSize > MAX_RAW_BYTES) return { ok: false, reason: "too_large" };
  const allowed = String(env.ALLOWED_SENDERS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => s && s !== "ersetzen");
  if (allowed.length === 0) return { ok: false, reason: "not_configured" };
  const rcpt = address(to);
  const secret = String(env.SECRET_LOCAL_PART ?? "").toLowerCase();
  if (!secret || secret === "ersetzen" || !rcpt || rcpt.split("@")[0] !== secret) return { ok: false, reason: "wrong_recipient" };
  const env_from = address(envelopeFrom);
  const hdr_from = address(headerFrom);
  // Umschlag- und Header-Absender müssen übereinstimmen und auf der Liste stehen, sonst ist es Fälschung.
  if (!env_from || env_from !== hdr_from || !allowed.includes(env_from)) return { ok: false, reason: "sender" };
  const auth = authCheck(authResults, env_from.split("@")[1]);
  if (!auth.ok) return { ok: false, reason: "auth", why: auth.why };
  return { ok: true, sender: env_from };
}

/** Nur Klartext, Steuerzeichen raus, < wird maskiert, Länge begrenzt. */
export function cleanText(text) {
  const t = String(text ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g, "")
    .replace(/\n-- \n[\s\S]*$/, "")           // Signatur
    .replace(/\n{3,}/g, "\n\n").trim();
  return t.replace(/</g, "&lt;");
}

export function makeSlug(now = new Date(), rand = () => Math.random().toString(36).slice(2, 8).padEnd(6, "0")) {
  const p = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15); // YYYYMMDD-HHMMSS
  return `g-${p}-${rand()}`;
}
export const validSlug = (s) => SLUG_RE.test(s);

export function frontmatter(slug, text, now = new Date()) {
  const first = text.split("\n")[0].slice(0, 160);
  return ["---", `title: ${JSON.stringify(first)}`, `slug: ${slug}`, `date: ${now.toISOString().slice(0, 10)}`,
    `summary: ${JSON.stringify(first)}`, "kind: gedanke", "tags: []", "draft: false", "---", "", text, ""].join("\n");
}

// --- Zurücknehmen-Link: HMAC über den Slug, damit niemand fremde Beiträge löschen kann ---
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
// Zweck ("unpublish" oder "confirm") ist Teil der Signatur: ein Zurücknehmen-Link kann nie veröffentlichen und umgekehrt.
export async function sign(slug, secret, purpose = "unpublish") {
  if (!secret || String(secret).length < 32) throw new Error("secret_too_short");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${purpose}:${slug}`)));
}
export async function verify(slug, sig, secret, purpose = "unpublish") {
  if (!validSlug(slug) || !/^[0-9a-f]{64}$/.test(sig ?? "")) return false;
  const good = await sign(slug, secret, purpose);
  let d = 0; for (let i = 0; i < 64; i++) d |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

/** Zähler pro Tag im KV. Gibt false zurück, wenn das Limit erreicht ist. */
export async function underLimit(kv, now = new Date()) {
  const key = `rl:${now.toISOString().slice(0, 10)}`;
  const n = Number((await kv.get(key)) ?? 0);
  if (n >= MAX_PER_DAY) return false;
  await kv.put(key, String(n + 1), { expirationTtl: 172800 });
  return true;
}

// --- Entwurf bis zur Bestätigung (KV, verfällt nach 24 h) ---
export const PENDING_TTL = 86400;
export async function savePending(kv, slug, content) { await kv.put(`p:${slug}`, content, { expirationTtl: PENDING_TTL }); }
export async function takePending(kv, slug) {
  const c = await kv.get(`p:${slug}`);
  if (c != null) await kv.delete(`p:${slug}`);   // zuerst löschen: ein zweiter Klick findet nichts mehr
  return c;
}

// --- GitHub Contents API ---
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
  ...init,
  headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "jj-post-mail", "x-github-api-version": "2022-11-28", ...(init.headers ?? {}) },
});
const b64 = (s) => { const b = enc.encode(s); let r = ""; for (const x of b) r += String.fromCharCode(x); return btoa(r); };

export async function publishGedanke(env, slug, content) {
  const r = await gh(env, `artifacts/jonas-website/content/gedanken/${slug}.md`, { method: "PUT", body: JSON.stringify({ message: `Gedanke per Mail: ${slug}`, content: b64(content), branch: env.BRANCH ?? "main" }) });
  if (r.status === 422) return "exists";   // Datei gibt es schon (z. B. Doppelklick an zwei Standorten): nichts überschreiben
  if (!r.ok) throw new Error(`github_put_${r.status}`);
  return "created";
}
export async function unpublishGedanke(env, slug) {
  const path = `artifacts/jonas-website/content/gedanken/${slug}.md`;
  const g = await gh(env, `${path}?ref=${env.BRANCH ?? "main"}`);
  if (g.status === 404) return "gone";
  if (!g.ok) throw new Error(`github_get_${g.status}`);
  const { sha } = await g.json();
  const d = await gh(env, path, { method: "DELETE", body: JSON.stringify({ message: `Gedanke zurückgenommen: ${slug}`, sha, branch: env.BRANCH ?? "main" }) });
  if (!d.ok) throw new Error(`github_delete_${d.status}`);
  return "removed";
}

const b64wrap = (s) => b64(s).replace(/.{76}(?=.)/g, "$&\r\n");
const encWord = (s) => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
export function replyMime({ from, to, subject, inReplyTo, body, messageId, date = new Date() }) {
  const safe = (s) => String(s ?? "").replace(/[\r\n]+/g, " ");
  const irt = safe(inReplyTo);
  return [`From: <${safe(from)}>`, `To: <${safe(to)}>`, `Subject: ${encWord(safe(subject))}`, `Date: ${date.toUTCString()}`,
    ...(irt ? [`In-Reply-To: ${irt}`, `References: ${irt}`] : []), `Message-ID: <${safe(messageId)}>`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64wrap(body), ""].join("\r\n");
}
