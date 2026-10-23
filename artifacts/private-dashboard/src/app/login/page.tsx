"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@workspace/site-ui";
import { api, authenticate, errText, webauthnSupported } from "@/lib/client";
import { Skeleton } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSupported(webauthnSupported());
    api<{ configured: boolean }>("/status").then((s) => setConfigured(s.configured)).catch((e) => setStatusErr(errText(e)));
  }, []);

  async function login() {
    setBusy(true); setErr(null);
    try { await authenticate("login"); router.replace("/tools"); }
    catch (e) { setErr(errText(e)); setBusy(false); }
  }

  return (
    <div className="split">
      <section>
        <p className="ui-eyebrow">Privater Bereich</p>
        <h1>Anmelden mit Passkey</h1>
        <p className="lead">Dieser Bereich ist nur für eingeladene Personen. Es gibt keine Passwörter, keine Social Logins und keine E-Mail-Links.</p>
        <div className="stack" style={{ marginTop: "2rem" }}>
          {configured === null && !statusErr ? <Skeleton rows={2} /> : null}
          {statusErr ? <Notice tone="error" title="Status nicht abrufbar"><p>{statusErr}</p><p><button className="btn btn--ghost" onClick={() => location.reload()}>Erneut versuchen</button></p></Notice> : null}
          {configured === false ? (
            <Notice tone="warning" title="Noch nicht eingerichtet">
              <p>Der private Bereich ist auf diesem Server noch nicht vollständig konfiguriert. Eine Anmeldung ist derzeit nicht möglich.</p>
            </Notice>
          ) : null}
          {!supported ? <Notice tone="error" title="Passkeys nicht unterstützt"><p>Dieser Browser unterstützt keine Passkeys. Verwende einen aktuellen Browser oder ein anderes Gerät.</p></Notice> : null}
          {configured ? (
            <div>
              <button className="btn btn--big" onClick={login} disabled={busy || !supported} aria-describedby="login-hint">
                {busy ? "Warte auf Passkey..." : "Mit Passkey anmelden"}
              </button>
              <p className="hint" id="login-hint" style={{ marginTop: ".6rem" }}>Dein Gerät fragt nach Fingerabdruck, Gesicht, PIN oder Sicherheitsschlüssel.</p>
            </div>
          ) : null}
          {err ? <div className="status" role="alert"><p>{err}</p></div> : null}
        </div>
      </section>
      <aside className="panel panel--dark">
        <h2>Noch kein Zugang?</h2>
        <p>Zugang gibt es nur über eine persönliche Einladung von Jonas. Der Einladungslink ist eine Stunde gültig und nur einmal nutzbar.</p>
        <h3>Passkey verloren?</h3>
        <p>Es gibt keinen automatischen Reset. Ein verifizierter manueller Wiederherstellungsprozess ist noch nicht eingerichtet. Bei Verlust aller Passkeys bleibt der Zugang gesperrt.</p>
      </aside>
    </div>
  );
}
