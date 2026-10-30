/** Sends mail through Resend's HTTP API. No dependency; returns false instead of throwing. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export function inviteMail(name: string, url: string, hours: number) {
  const subject = `🎉 ${name}, du bist dabei!`;
  const steps = [
    "Öffne den Link unten (am besten auf dem Gerät, das du immer dabei hast).",
    "Gib einen Namen für deinen Passkey ein, zum Beispiel „Handy“ oder „Laptop“.",
    "Bestätige mit Face ID, Fingerabdruck oder Geräte-PIN. Ein Passwort brauchst du nicht.",
    "Fertig. Danach loggst du dich immer über „Privater Bereich“ auf jonasjuchelka.github.io ein.",
  ];
  const text = `Hey ${name},\n\nich habe dir einen Zugang zu meinem privaten Bereich eingerichtet. 🎉\n\n` +
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
    `\n\nDein Link (einmalig, ${hours} Stunden gültig):\n${url}\n\nKlappt etwas nicht? Antworte einfach auf diese Mail.\n\nJonas`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1c2b36;max-width:520px">
<p>Hey ${esc(name)},</p>
<p>ich habe dir einen Zugang zu meinem privaten Bereich eingerichtet. 🎉</p>
<ol style="padding-left:1.2em">${steps.map((s) => `<li style="margin:.35em 0">${esc(s)}</li>`).join("")}</ol>
<p><a href="${esc(url)}" style="display:inline-block;background:#74afdb;color:#1c2b36;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">Zugang einrichten</a></p>
<p style="font-size:14px;color:#2d4354">Der Link funktioniert einmal und ist ${hours} Stunden gültig.</p>
<p>Klappt etwas nicht? Antworte einfach auf diese Mail.</p>
<p>Jonas</p></div>`;
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
