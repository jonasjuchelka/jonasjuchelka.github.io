/** Mail through Resend's HTTP API. No dependency; sending returns false instead of throwing. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const escLines = (s: string) => esc(s.trim()).replace(/\r?\n/g, "<br>");

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export type Mail = { subject: string; text: string; html: string };

// Brand colours (lib/design-tokens). Mail clients ignore CSS variables and SVG, so everything is inline.
const C = { navy: "#1c2b36", sky: "#74afdb", baby: "#82c4f5", bg: "#eef2f5", card: "#ffffff", text: "#06060d", muted: "#2d4354", line: "#b0c4d4" };
const FONT_HEAD = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_BODY = "Catamaran,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SITE = "jonasjuchelka.github.io";

const para = (html: string, extra = "") =>
  `<p style="margin:0 0 20px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${C.text};${extra}">${html}</p>`;
const small = (html: string, extra = "") =>
  `<p style="margin:0 0 20px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.muted};${extra}">${html}</p>`;
const greeting = (first: string) =>
  `<h1 style="margin:0 0 14px 0;font-family:${FONT_HEAD};font-weight:700;font-size:24px;line-height:1.3;color:${C.navy}">Hi ${esc(first)},</h1>`;
const button = (url: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0"><tr><td style="border-radius:6px;background:${C.sky};border:2px solid ${C.navy}">
  <a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT_HEAD};font-weight:700;font-size:16px;color:${C.navy};text-decoration:none">${esc(label)}&nbsp;→</a>
</td></tr></table>`;
const signoff = (closing: string) =>
  `<p style="margin:8px 0 2px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${C.text}">${esc(closing)}</p>
<p style="margin:0 0 28px 0;font-family:${FONT_HEAD};font-weight:700;font-size:16px;color:${C.navy}">Dein Jonas</p>`;

/** Shared frame: navy header with the brand stripe, white card, navy footer. */
function frame(subject: string, preheader: string, body: string, footer: string) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:10px;overflow:hidden">
  <tr><td style="background:${C.navy};padding:22px 32px">
    <div style="font-family:${FONT_BODY};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.baby}">Jonas Juchelka</div>
    <div style="font-family:${FONT_HEAD};font-weight:700;font-size:20px;color:#fafafa;margin-top:2px">Privater Bereich</div>
  </td></tr>
  <tr><td style="padding:0;font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="18%" height="4" style="background:${C.navy}"></td><td width="40%" height="4" style="background:${C.sky}"></td><td width="42%" height="4" style="background:${C.baby}"></td>
  </tr></table></td></tr>
  <tr><td style="padding:32px 32px 4px 32px">${body}</td></tr>
  <tr><td style="background:${C.navy};padding:14px 32px;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${C.baby}">${esc(footer)}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ---------- Invitation ---------- */
export function inviteMail(firstName: string, url: string, hours: number): Mail {
  const subject = `🎉 ${firstName}, du bist dabei!`;
  const steps: [string, string][] = [
    ["Link öffnen", "Am besten auf dem Handy oder Laptop, den du immer dabei hast."],
    ["Passkey benennen", "Zum Beispiel „Handy“. Der Name ist schon vorausgefüllt."],
    ["Bestätigen", "Mit Face ID, Fingerabdruck oder Geräte-PIN. Ein Passwort brauchst du nicht."],
  ];
  const text = `Hi ${firstName},\n\n` +
    `ich habe dir einen Zugang zu meinem privaten Bereich eingerichtet 🎉 Dort findest du die Tools, die ich mit dir teile.\n\n` +
    `Zugang einrichten (dauert etwa eine Minute):\n${url}\n\n` +
    steps.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join("\n") +
    `\n\nDer Link funktioniert einmal und ist ${hours} Stunden gültig. Danach meldest du dich immer über ${SITE} → Privater Bereich an.\n\n` +
    `Klappt etwas nicht? Antworte einfach auf diese Mail.\n\nViel Spaß beim Ausprobieren!\nDein Jonas`;

  const step = ([t, d]: [string, string], i: number) => `
<tr><td style="padding:0 0 14px 0;vertical-align:top;width:40px">
  <div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${C.navy};color:${C.baby};font-family:${FONT_HEAD};font-weight:700;font-size:14px;text-align:center">${i + 1}</div>
</td><td style="padding:3px 0 14px 0;vertical-align:top;font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${C.text}">
  <strong style="font-family:${FONT_HEAD};color:${C.navy}">${esc(t)}</strong><br>${esc(d)}
</td></tr>`;

  const body = greeting(firstName) +
    para("ich habe dir einen Zugang zu meinem privaten Bereich eingerichtet 🎉 Dort findest du die Tools, die ich mit dir teile, und alles, was du mit GitHub Education gratis bekommst.", "margin-bottom:24px") +
    button(url, "Zugang einrichten") +
    small(`Dauert etwa eine Minute. Der Link funktioniert einmal und ist ${hours} Stunden gültig.`, "margin-bottom:28px") +
    `<div style="font-family:${FONT_BODY};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin:0 0 12px 0">So geht's</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps.map(step).join("")}</table>
<p style="margin:8px 0 24px 0;padding:14px 16px;background:${C.bg};border-radius:8px;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.text}">Danach meldest du dich immer über <a href="https://${SITE}" style="color:${C.navy}">${SITE}</a> → <strong>Privater Bereich</strong> an.</p>
<p style="margin:0 0 6px 0;font-family:${FONT_BODY};font-size:13px;color:${C.muted}">Button geht nicht? Kopiere diesen Link in deinen Browser:</p>
<p style="margin:0 0 24px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(url)}" style="color:${C.navy}">${esc(url)}</a></p>` +
    para("Klappt etwas nicht? Antworte einfach auf diese Mail.", "margin-bottom:4px") +
    signoff("Viel Spaß beim Ausprobieren!");

  return { subject, text, html: frame(subject, "Dein Zugang ist bereit. In einer Minute eingerichtet, ganz ohne Passwort.", body, "Zugang nur mit Passkeys. Keine Passwörter, keine Tracker.") };
}

/* ---------- New tool ---------- */
export type AccessKind = "own_account" | "team_seat" | "permitted_shared";
export const ACCESS_TEXT: Record<AccessKind, string> = {
  own_account: "Eigenes Konto",
  team_seat: "Platz im Team-Abo",
  permitted_shared: "Gemeinsamer Login",
};
const ACCESS_HOW: Record<AccessKind, string> = {
  own_account: "Du meldest dich mit deinem eigenen Konto an. Wie das geht, steht im privaten Bereich beim Tool.",
  team_seat: "Du bekommst einen Platz im Team und meldest dich mit deinem eigenen Konto an. Die Anleitung steht im privaten Bereich.",
  permitted_shared: "Die Logindaten holst du dir im privaten Bereich über „Login öffnen“. Aus Sicherheitsgründen stehen sie nie in einer Mail.",
};
export type ToolInfo = { name: string; provider: string; description: string; category: string; access_type: AccessKind; plan?: string; price?: string };

export function newToolMail(firstName: string, t: ToolInfo, url: string): Mail {
  const subject = `✨ Neu für dich: ${t.name}`;
  const facts: [string, string][] = [
    ["Zugang", ACCESS_TEXT[t.access_type]],
    ...(t.plan ? [["Plan", t.plan] as [string, string]] : []),
    ...(t.price ? [["Kostet sonst", t.price] as [string, string]] : []),
  ];
  const meta = [t.provider, t.category].filter(Boolean).join(" · ");
  const text = `Hi ${firstName},\n\n` +
    `ich habe gerade ein neues Tool für dich freigeschaltet: ${t.name}${meta ? ` (${meta})` : ""}.\n\n` +
    (t.description.trim() ? `${t.description.trim()}\n\n` : "") +
    facts.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\n${ACCESS_HOW[t.access_type]}\n\nZum Tool: ${url}\n\nViel Spaß damit!\nDein Jonas`;

  const fact = ([k, v]: [string, string]) => `<tr>
  <td style="padding:6px 12px 6px 0;font-family:${FONT_BODY};font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};white-space:nowrap;vertical-align:top">${esc(k)}</td>
  <td style="padding:6px 0;font-family:${FONT_BODY};font-size:15px;color:${C.text};vertical-align:top">${esc(v)}</td></tr>`;
  const card = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px 0;background:${C.bg};border:1px solid ${C.line};border-radius:8px"><tr><td style="padding:18px 20px">
  <div style="font-family:${FONT_HEAD};font-weight:700;font-size:20px;line-height:1.3;color:${C.navy}">${esc(t.name)}</div>
  ${meta ? `<div style="font-family:${FONT_BODY};font-size:14px;color:${C.muted};margin-top:2px">${esc(meta)}</div>` : ""}
  ${t.description.trim() ? `<div style="font-family:${FONT_BODY};font-size:15px;line-height:1.55;color:${C.text};margin-top:12px">${escLines(t.description)}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px">${facts.map(fact).join("")}</table>
</td></tr></table>`;

  const body = greeting(firstName) +
    para("ich habe gerade ein neues Tool für dich freigeschaltet:") +
    card +
    button(url, "Tool ansehen") +
    small(esc(ACCESS_HOW[t.access_type]), "margin:8px 0 20px 0") +
    signoff("Viel Spaß damit!");

  return { subject, text, html: frame(subject, `${t.name} ist ab jetzt in deinem privaten Bereich.`, body, "Du bekommst diese Mail, weil du Zugang zu meinem privaten Bereich hast.") };
}

/* ---------- Sending ---------- */
function headers(idempotencyKey?: string): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" };
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey;
  return h;
}
const envelope = (to: string, m: Mail) => ({ from: process.env.MAIL_FROM, to: [to], reply_to: process.env.MAIL_REPLY_TO || undefined, ...m });

export async function sendMail(to: string, m: Mail): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: headers(), body: JSON.stringify(envelope(to, m)), signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** One separate mail per person (nobody sees the other addresses), up to 100 per request. Returns one result per item. */
export async function sendBatch(items: { to: string; mail: Mail }[], idempotencyKey?: string): Promise<boolean[]> {
  if (!mailConfigured()) return items.map(() => false);
  const out: boolean[] = [];
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    let ok = false;
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST", headers: headers(idempotencyKey ? `${idempotencyKey}-${i / 100}` : undefined),
        body: JSON.stringify(chunk.map((x) => envelope(x.to, x.mail))), signal: AbortSignal.timeout(15_000),
      });
      ok = r.ok;
    } catch { ok = false; }
    out.push(...chunk.map(() => ok));
  }
  return out;
}
