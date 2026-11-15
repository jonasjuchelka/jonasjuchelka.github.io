// Cloudflare Email Worker: Mail an die geheime Adresse → Entwurf → Bestätigungslink per Antwortmail → Gedanke auf der Website.
// Ablauf: Größe, Empfänger, Absender-Allowlist, SPF/DKIM/DMARC (Cloudflare-Header), Tageslimit prüfen → Klartext →
//         Entwurf im KV (24 h) → Antwort an den echten Absender mit Link "Veröffentlichen" (und "Zurücknehmen").
// Veröffentlicht wird erst nach Klick + Bestätigung (POST). Eine gefälschte Mail kommt nie bis online,
// weil die Antwort mit dem Link an das echte Postfach geht.
// Die Antwort geht über Resend (RESEND_API_KEY + MAIL_FROM), weil Cloudflares reply() auf Subdomains nicht funktioniert
// (bekannter Fehler: "mail from is not from the correct domain"). Ohne Resend-Schlüssel wird reply() versucht.
// Secrets: GITHUB_TOKEN, UNPUBLISH_SECRET, RESEND_API_KEY. Variablen: REPO, ALLOWED_SENDERS, SECRET_LOCAL_PART, PUBLIC_URL, MAIL_FROM. KV: STATE.
import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { checkEnvelope, cleanText, MAX_CHARS, makeSlug, frontmatter, sign, verify, underLimit, publishGedanke, unpublishGedanke,
  replyMime, validSlug, savePending, takePending } from "./core.js";

/**
 * Antwort an den (geprüften, erlaubten) Absender.
 * 1. Über Resend, wenn RESEND_API_KEY und MAIL_FROM gesetzt sind. Empfänger ist nur der geprüfte Absender von der Allowlist.
 * 2. Sonst Cloudflares reply(): genau ein Versuch, nur von der Empfangsadresse; auf Subdomains scheitert das (Cloudflare-Fehler).
 */
async function reply(message, env, subject, body, sender, idemKey) {
  const inReplyTo = message.headers.get("message-id");
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    try {
      const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "User-Agent": "jonas-post-mail/1.0" };
      if (idemKey) headers["Idempotency-Key"] = idemKey;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers, signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ from: env.MAIL_FROM, to: [sender], subject, text: body,
          ...(inReplyTo ? { headers: { "In-Reply-To": inReplyTo, References: inReplyTo } } : {}) }),
      });
      if (r.ok) { console.log("antwort gesendet (resend)"); return true; }
      const err = await r.json().catch(() => ({}));
      console.log("antwort fehlgeschlagen (resend):", r.status, String(err?.message ?? err?.name ?? "").slice(0, 200));
    } catch (e) { console.log("antwort fehlgeschlagen (resend):", String(e?.message ?? e).slice(0, 200)); }
    // weiter mit reply() als Rückfall (klappt nur ohne Subdomain)
  }
  const from = message.to;
  try {
    const raw = replyMime({ from, to: message.from, subject, inReplyTo, body, messageId: `${crypto.randomUUID()}@${from.split("@")[1]}` });
    await message.reply(new EmailMessage(from, message.from, raw));
    console.log("antwort gesendet (reply)");
    return true;
  } catch (e) { console.log("antwort fehlgeschlagen (reply):", String(e?.message ?? e).slice(0, 200)); return false; }
}

const page = (t, extra = "") => new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${t}</title><body style="font:18px/1.5 system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem;color:#1c2b36"><h1 style="font-size:1.3rem">${t}</h1>${extra}`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer", "x-frame-options": "DENY" } });
const button = (label) => `<form method=post><button style="font:inherit;padding:.6rem 1.2rem;border-radius:999px;border:2px solid #74afdb;background:#fafafa;color:#1c2b36">${label}</button></form>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default {
  async email(message, env) {
    const check = checkEnvelope({
      rawSize: message.rawSize, envelopeFrom: message.from, to: message.to,
      headerFrom: message.headers.get("from"), authResults: message.headers.get("authentication-results"),
    }, env);
    if (!check.ok) {   // Absender sieht nur eine Ablehnung, keinen Grund. Im Log (wrangler tail) steht der Grund, ohne Adressen.
      console.log("abgelehnt:", check.reason, check.why ?? "");
      message.setReject("Nicht angenommen"); return;
    }
    if (!(await underLimit(env.STATE))) { console.log("abgelehnt: limit"); message.setReject("Tageslimit erreicht"); return; }

    const mail = await PostalMime.parse(message.raw);                    // Anhänge und HTML werden ignoriert
    const text = cleanText(mail.text);
    if (!text) { await reply(message, env, "Leer", "Die Mail enthielt keinen Klartext. Nichts veröffentlicht.", check.sender); return; }
    if (text.length > MAX_CHARS) { await reply(message, env, "Zu lang", `Ein Gedanke darf höchstens ${MAX_CHARS} Zeichen haben (hier: ${text.length}). Nichts veröffentlicht.`, check.sender); return; }

    const slug = makeSlug();
    await savePending(env.STATE, slug, frontmatter(slug, text));
    const ok = `${env.PUBLIC_URL}/c/${slug}/${await sign(slug, env.UNPUBLISH_SECRET, "confirm")}`;
    const undo = `${env.PUBLIC_URL}/u/${slug}/${await sign(slug, env.UNPUBLISH_SECRET)}`;
    console.log("entwurf gespeichert");
    await reply(message, env, "Gedanke bestätigen",
      `Dein Gedanke wartet auf Bestätigung (24 Stunden gültig):\n\n${text.slice(0, 300)}${text.length > 300 ? " …" : ""}\n\n` +
      `Veröffentlichen: ${ok}\n\nSpäter zurücknehmen: ${undo}\n\nWenn du das nicht geschickt hast: nichts tun. Ohne Klick wird nichts veröffentlicht.\nBitte nicht auf diese Mail antworten.`, check.sender, `confirm-${slug}`);
  },

  // GET zeigt nur eine Seite mit Knopf (Mail-Scanner öffnen Links), erst POST handelt.
  async fetch(request, env) {
    const m = /^\/(c|u)\/([^/]+)\/([0-9a-f]{64})$/.exec(new URL(request.url).pathname);
    if (!m) return page("Link ungültig");
    const [, kind, slug, sig] = m;
    if (!validSlug(slug) || !(await verify(slug, sig, env.UNPUBLISH_SECRET, kind === "c" ? "confirm" : "unpublish"))) return page("Link ungültig");

    if (kind === "c") {
      if (request.method !== "POST") {
        const draft = await env.STATE.get(`p:${slug}`);
        if (draft == null) return page("Nichts zu bestätigen", "<p>Nicht gefunden. Kam die Mail gerade erst? Dann eine Minute warten und die Seite neu laden. Sonst ist der Gedanke schon veröffentlicht oder der Link abgelaufen (24 Stunden).</p>");
        const body = draft.split("\n---\n").slice(1).join("\n---\n").trim();
        return page("Gedanke veröffentlichen?", `<p style="white-space:pre-wrap;border-left:3px solid #74afdb;padding-left:.8rem">${esc(body)}</p>${button("Ja, veröffentlichen")}`);
      }
      const draft = await takePending(env.STATE, slug);
      if (draft == null) return page("Nichts zu bestätigen", "<p>Nicht gefunden. Kam die Mail gerade erst? Dann eine Minute warten und die Seite neu laden. Sonst ist der Gedanke schon veröffentlicht oder der Link abgelaufen (24 Stunden).</p>");
      let r;
      try { r = await publishGedanke(env, slug, draft); }
      catch (e) { await env.STATE.put(`p:${slug}`, draft, { expirationTtl: 86400 }); console.log("veröffentlichen fehlgeschlagen:", String(e?.message ?? e)); return page("Das hat nicht geklappt", "<p>Bitte in einer Minute noch einmal versuchen.</p>"); }
      console.log("veröffentlicht:", r);
      if (r === "exists") return page("Schon veröffentlicht", "<p>Dieser Gedanke ist bereits online.</p>");
      return page("Veröffentlicht", "<p>Der Gedanke ist in zwei bis drei Minuten auf der Website. Zurücknehmen geht über den zweiten Link in der Mail.</p>");
    }

    if (request.method !== "POST") return page("Gedanke zurücknehmen?", button("Ja, zurücknehmen"));
    await takePending(env.STATE, slug);   // auch einen noch nicht bestätigten Entwurf verwerfen
    try { const r = await unpublishGedanke(env, slug); return page(r === "gone" ? "Nicht (mehr) online" : "Zurückgenommen", "<p>Die Seite ist in zwei bis drei Minuten weg.</p>"); }
    catch (e) { console.log("zurücknehmen fehlgeschlagen:", String(e?.message ?? e)); return page("Das hat nicht geklappt", "<p>Bitte später noch einmal versuchen.</p>"); }
  },
};
