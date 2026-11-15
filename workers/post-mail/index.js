// Cloudflare Email Worker: Mail an die geheime Adresse → Gedanke auf der Website.
// Ablauf: Größe, Empfänger, Absender-Allowlist, DMARC, Tageslimit prüfen → Klartext → GitHub → Antwortmail mit Zurücknehmen-Link.
// Secrets: GITHUB_TOKEN, UNPUBLISH_SECRET. Variablen: REPO, ALLOWED_SENDERS, SECRET_LOCAL_PART, PUBLIC_URL, REPLY_FROM. KV: STATE.
import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { checkEnvelope, cleanText, MAX_CHARS, makeSlug, frontmatter, sign, verify, underLimit, publishGedanke, unpublishGedanke, replyMime, validSlug } from "./core.js";

async function reply(message, env, subject, body) {
  try {
    const raw = replyMime({ from: env.REPLY_FROM, to: message.from, subject, inReplyTo: message.headers.get("message-id"), body, messageId: `${crypto.randomUUID()}@${env.REPLY_FROM.split("@")[1]}` });
    await message.reply(new EmailMessage(env.REPLY_FROM, message.from, raw));
  } catch { /* Antwort ist Komfort, kein Muss */ }
}

export default {
  async email(message, env) {
    const check = checkEnvelope({
      rawSize: message.rawSize, envelopeFrom: message.from, to: message.to,
      headerFrom: message.headers.get("from"), authResults: message.headers.get("authentication-results"),
    }, env);
    if (!check.ok) { console.log("abgelehnt:", check.reason); message.setReject("Nicht angenommen"); return; }   // Absender sieht nur eine Ablehnung, keinen Grund
    if (!(await underLimit(env.STATE))) { message.setReject("Tageslimit erreicht"); return; }

    const mail = await PostalMime.parse(message.raw);                    // Anhänge und HTML werden ignoriert
    const text = cleanText(mail.text);
    if (!text) { await reply(message, env, "Leer", "Die Mail enthielt keinen Klartext. Nichts veröffentlicht."); return; }
    if (text.length > MAX_CHARS) { await reply(message, env, "Zu lang", `Ein Gedanke darf höchstens ${MAX_CHARS} Zeichen haben (hier: ${text.length}). Nichts veröffentlicht.`); return; }

    const slug = makeSlug();
    await publishGedanke(env, slug, frontmatter(slug, text));
    const link = `${env.PUBLIC_URL}/u/${slug}/${await sign(slug, env.UNPUBLISH_SECRET)}`;
    await reply(message, env, "Gedanke ist online", `Dein Gedanke geht in ein bis zwei Minuten live.\n\nZurücknehmen: ${link}`);
  },

  // Zurücknehmen-Seite: GET zeigt nur eine Bestätigung (Mail-Scanner klicken Links), erst POST löscht.
  async fetch(request, env) {
    const m = /^\/u\/([^/]+)\/([0-9a-f]{64})$/.exec(new URL(request.url).pathname);
    const page = (t, extra = "") => new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${t}</title><body style="font:18px/1.5 system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem;color:#1c2b36"><h1 style="font-size:1.3rem">${t}</h1>${extra}`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
    if (!m || !validSlug(m[1]) || !(await verify(m[1], m[2], env.UNPUBLISH_SECRET))) return page("Link ungültig");
    if (request.method === "POST") {
      try { const r = await unpublishGedanke(env, m[1]); return page(r === "gone" ? "Schon zurückgenommen" : "Zurückgenommen", "<p>Die Seite ist in ein bis zwei Minuten weg.</p>"); }
      catch { return page("Das hat nicht geklappt", "<p>Bitte später noch einmal versuchen.</p>"); }
    }
    return page("Gedanke zurücknehmen?", `<form method=post><button style="font:inherit;padding:.6rem 1.2rem;border-radius:999px;border:2px solid #74afdb;background:#fafafa;color:#1c2b36">Ja, zurücknehmen</button></form>`);
  },
};
