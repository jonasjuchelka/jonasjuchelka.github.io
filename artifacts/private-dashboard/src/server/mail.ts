/** Sends mail through Resend's HTTP API. No dependency; returns false instead of throwing. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

// Brand colours (lib/design-tokens). Mail clients ignore CSS variables and SVG, so everything is inline.
const C = { navy: "#1c2b36", sky: "#74afdb", baby: "#82c4f5", bg: "#eef2f5", card: "#ffffff", text: "#06060d", muted: "#2d4354", line: "#b0c4d4" };
const FONT_HEAD = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_BODY = "Catamaran,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function inviteMail(name: string, url: string, hours: number) {
  const subject = `🎉 ${name}, du bist dabei!`;
  const site = "jonasjuchelka.github.io";
  const steps: [string, string][] = [
    ["Link öffnen", "Am besten auf dem Handy oder Laptop, den du immer dabei hast."],
    ["Passkey benennen", "Zum Beispiel „Handy“. Der Name ist schon vorausgefüllt."],
    ["Bestätigen", "Mit Face ID, Fingerabdruck oder Geräte-PIN. Ein Passwort brauchst du nicht."],
  ];
  const text = `Hey ${name},\n\n` +
    `ich habe dir einen Zugang zu meinem privaten Bereich eingerichtet 🎉 Dort findest du die Tools, die ich mit dir teile.\n\n` +
    `Zugang einrichten (dauert etwa eine Minute):\n${url}\n\n` +
    steps.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join("\n") +
    `\n\nDer Link funktioniert einmal und ist ${hours} Stunden gültig. Danach meldest du dich immer über ${site} → Privater Bereich an.\n\n` +
    `Klappt etwas nicht? Antworte einfach auf diese Mail.\n\nJonas`;

  const step = ([t, d]: [string, string], i: number) => `
<tr><td style="padding:0 0 14px 0;vertical-align:top;width:40px">
  <div style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${C.navy};color:${C.baby};font-family:${FONT_HEAD};font-weight:700;font-size:14px;text-align:center">${i + 1}</div>
</td><td style="padding:3px 0 14px 0;vertical-align:top;font-family:${FONT_BODY};font-size:15px;line-height:1.5;color:${C.text}">
  <strong style="font-family:${FONT_HEAD};color:${C.navy}">${esc(t)}</strong><br>${esc(d)}
</td></tr>`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Dein Zugang ist bereit. In einer Minute eingerichtet, ganz ohne Passwort.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:10px;overflow:hidden">
  <tr><td style="background:${C.navy};padding:22px 32px">
    <div style="font-family:${FONT_BODY};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.baby}">Jonas Juchelka</div>
    <div style="font-family:${FONT_HEAD};font-weight:700;font-size:20px;color:#fafafa;margin-top:2px">Privater Bereich</div>
  </td></tr>
  <tr><td style="padding:0;font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="18%" height="4" style="background:${C.navy}"></td><td width="40%" height="4" style="background:${C.sky}"></td><td width="42%" height="4" style="background:${C.baby}"></td>
  </tr></table></td></tr>
  <tr><td style="padding:32px 32px 8px 32px">
    <h1 style="margin:0 0 12px 0;font-family:${FONT_HEAD};font-weight:700;font-size:26px;line-height:1.25;color:${C.navy}">Hey ${esc(name)}, du bist dabei 🎉</h1>
    <p style="margin:0 0 24px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${C.text}">Ich habe dir einen Zugang zu meinem privaten Bereich eingerichtet. Dort findest du die Tools, die ich mit dir teile, und alles, was du mit GitHub Education gratis bekommst.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:${C.sky};border:2px solid ${C.navy}">
      <a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT_HEAD};font-weight:700;font-size:16px;color:${C.navy};text-decoration:none">Zugang einrichten&nbsp;→</a>
    </td></tr></table>
    <p style="margin:12px 0 28px 0;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.muted}">Dauert etwa eine Minute. Der Link funktioniert einmal und ist ${hours} Stunden gültig.</p>
    <div style="font-family:${FONT_BODY};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin:0 0 12px 0">So geht's</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps.map(step).join("")}</table>
    <p style="margin:8px 0 24px 0;padding:14px 16px;background:${C.bg};border-radius:8px;font-family:${FONT_BODY};font-size:14px;line-height:1.5;color:${C.text}">Danach meldest du dich immer über <a href="https://${site}" style="color:${C.navy}">${site}</a> → <strong>Privater Bereich</strong> an.</p>
    <p style="margin:0 0 6px 0;font-family:${FONT_BODY};font-size:13px;color:${C.muted}">Button geht nicht? Kopiere diesen Link in deinen Browser:</p>
    <p style="margin:0 0 28px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all"><a href="${esc(url)}" style="color:${C.navy}">${esc(url)}</a></p>
    <p style="margin:0 0 4px 0;font-family:${FONT_BODY};font-size:16px;line-height:1.6;color:${C.text}">Klappt etwas nicht? Antworte einfach auf diese Mail.</p>
    <p style="margin:0 0 28px 0;font-family:${FONT_HEAD};font-weight:700;font-size:16px;color:${C.navy}">Jonas</p>
  </td></tr>
  <tr><td style="background:${C.navy};padding:14px 32px;font-family:${FONT_BODY};font-size:12px;line-height:1.5;color:${C.baby}">Zugang nur mit Passkeys. Keine Passwörter, keine Tracker.</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

export async function sendMail(to: string, m: { subject: string; text: string; html: string }): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], reply_to: process.env.MAIL_REPLY_TO || undefined, ...m }),
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
