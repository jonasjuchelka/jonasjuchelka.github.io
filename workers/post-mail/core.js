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

/** Cloudflare schreibt sein Ergebnis in Authentication-Results. Nur ein eindeutiges dmarc=pass zählt. */
export function dmarcPass(authResults) {
  const v = String(authResults ?? "").toLowerCase();
  return /\bdmarc=pass\b/.test(v) && !/\bdmarc=(fail|none|temperror|permerror|softfail)\b/.test(v);
}

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
  if (!dmarcPass(authResults)) return { ok: false, reason: "dmarc" };
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
export async function sign(slug, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(`unpublish:${slug}`)));
}
export async function verify(slug, sig, secret) {
  if (!validSlug(slug) || !/^[0-9a-f]{64}$/.test(sig ?? "")) return false;
  const good = await sign(slug, secret);
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

// --- GitHub Contents API ---
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
  ...init,
  headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "jj-post-mail", "x-github-api-version": "2022-11-28", ...(init.headers ?? {}) },
});
const b64 = (s) => { const b = enc.encode(s); let r = ""; for (const x of b) r += String.fromCharCode(x); return btoa(r); };

export async function publishGedanke(env, slug, content) {
  const r = await gh(env, `artifacts/jonas-website/content/gedanken/${slug}.md`, { method: "PUT", body: JSON.stringify({ message: `Gedanke per Mail: ${slug}`, content: b64(content), branch: env.BRANCH ?? "main" }) });
  if (!r.ok) throw new Error(`github_put_${r.status}`);
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

export function replyMime({ from, to, subject, inReplyTo, body, messageId }) {
  const safe = (s) => String(s).replace(/[\r\n]+/g, " ");
  return [`From: <${from}>`, `To: <${to}>`, `Subject: ${safe(subject)}`, `In-Reply-To: ${safe(inReplyTo ?? "")}`, `Message-ID: <${messageId}>`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
}
