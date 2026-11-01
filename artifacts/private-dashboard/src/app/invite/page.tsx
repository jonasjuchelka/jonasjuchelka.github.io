"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@workspace/site-ui";
import { api, errText, register, webauthnSupported } from "@/lib/client";
import { Field, Skeleton } from "@/components/ui";

export default function InvitePage() {
  const router = useRouter();
  const token = useRef<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const m = /(?:^|&)token=([^&]+)/.exec(window.location.hash.slice(1));
    if (m) token.current = decodeURIComponent(m[1]);
    // Strip the fragment immediately; the token lives only in memory.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    setHasToken(!!token.current);
    setSupported(webauthnSupported());
    setName(guessDevice(navigator.userAgent));
    api<{ configured: boolean }>("/status").then((s) => setConfigured(s.configured)).catch(() => setConfigured(null));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token.current) return;
    if (!name.trim()) { setErr("Bitte gib einen Namen an."); return; }
    setBusy(true); setErr(null);
    try {
      await register("/invite/options", { token: token.current }, "/invite/verify", name.trim());
      token.current = null;
      setDone(true);
      setTimeout(() => router.replace("/tools"), 1400);
    } catch (e2) { setErr(errText(e2)); setBusy(false); }
  }

  const step = done ? 3 : hasToken && configured !== false && supported ? 1 : 0;
  return (
    <div className="narrow invite">
      <p className="ui-eyebrow">Einladung</p>
      <h1>Willkommen 🎉</h1>
      <p className="lead">Noch ein Schritt: Du erstellst einen Passkey. Damit meldest du dich künftig an, ganz ohne Passwort.</p>
      <ol className="invite-steps" aria-label="Fortschritt">
        {["Link geöffnet", "Passkey erstellen", "Fertig"].map((label, i) => (
          <li key={label} className={i < step || (i === 0 && hasToken) ? "is-done" : i === step ? "is-current" : ""}>
            <span className="invite-steps__dot" aria-hidden="true">{i < step || (i === 0 && hasToken) ? "✓" : i + 1}</span>{label}
          </li>
        ))}
      </ol>
      <div className="stack" style={{ marginTop: "1.5rem" }}>
        {hasToken === null ? <Skeleton rows={2} /> : null}
        {configured === false ? <Notice tone="warning" title="Noch nicht eingerichtet"><p>Der private Bereich ist noch nicht fertig konfiguriert. Bitte versuch es später noch einmal.</p></Notice> : null}
        {hasToken === false ? (
          <Notice tone="error" title="Dieser Link funktioniert nicht">
            <p>Er ist entweder unvollständig, schon benutzt oder abgelaufen. Öffne den Link direkt aus der Mail oder frag Jonas nach einem neuen.</p>
          </Notice>
        ) : null}
        {!supported ? <Notice tone="error" title="Dieser Browser kann keine Passkeys"><p>Öffne den Link in Safari, Chrome, Edge oder Firefox in einer aktuellen Version, oder auf einem anderen Gerät.</p></Notice> : null}
        {done ? (
          <div className="status status--success" role="status"><p><strong>Geschafft!</strong> Dein Passkey ist gespeichert. Du wirst weitergeleitet …</p></div>
        ) : hasToken && configured !== false ? (
          <form className="form panel" onSubmit={submit} noValidate>
            <Field id="name" label="Name für diesen Passkey" hint="Damit du ihn später unter „Konto“ wiedererkennst. Vorausgefüllt, du kannst ihn ändern.">
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required aria-describedby="name-hint" autoComplete="off" />
            </Field>
            <div><button className="btn btn--big" disabled={busy || !supported}>{busy ? "Bestätige auf deinem Gerät …" : "Passkey erstellen"}</button></div>
            <p className="hint">Dein Gerät fragt gleich nach Face ID, Fingerabdruck oder PIN. Das bleibt auf deinem Gerät, Jonas sieht davon nichts.</p>
          </form>
        ) : null}
        {err ? <div className="status" role="alert"><p><strong>Das hat nicht geklappt.</strong> {err}</p><p>Du kannst es direkt noch einmal versuchen.</p></div> : null}
        <details className="invite-faq">
          <summary>Was ist ein Passkey?</summary>
          <p>Ein Passkey ersetzt das Passwort. Er wird sicher auf deinem Gerät oder in deinem iCloud- bzw. Google-Konto gespeichert und funktioniert nur auf dieser Website. Es gibt nichts, was man dir abphishen könnte.</p>
        </details>
        <p className="hint">Tipp: Lege später unter „Konto“ einen zweiten Passkey auf einem anderen Gerät an. Dann kommst du auch rein, wenn du ein Gerät verlierst.</p>
      </div>
    </div>
  );
}

/** Friendly default name for the passkey, based on the device. */
function guessDevice(ua: string) {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android-Handy";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows-PC";
  if (/Linux/.test(ua)) return "Linux-Rechner";
  return "Mein Gerät";
}
