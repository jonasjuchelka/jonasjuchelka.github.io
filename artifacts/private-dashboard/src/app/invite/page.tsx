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

  useEffect(() => {
    const m = /(?:^|&)token=([^&]+)/.exec(window.location.hash.slice(1));
    if (m) token.current = decodeURIComponent(m[1]);
    // Strip the fragment immediately; the token lives only in memory.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    setHasToken(!!token.current);
    setSupported(webauthnSupported());
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
      router.replace("/tools");
    } catch (e2) { setErr(errText(e2)); setBusy(false); }
  }

  return (
    <div className="narrow">
      <p className="ui-eyebrow">Einladung</p>
      <h1>Passkey einrichten</h1>
      <p className="lead">Mit dieser einmaligen Einladung erstellst du deinen Passkey. Danach meldest du dich immer über die normale Anmeldung an.</p>
      <div className="stack" style={{ marginTop: "2rem" }}>
        {hasToken === null ? <Skeleton rows={2} /> : null}
        {configured === false ? <Notice tone="warning" title="Noch nicht eingerichtet"><p>Der private Bereich ist noch nicht konfiguriert. Einladungen können derzeit nicht eingelöst werden.</p></Notice> : null}
        {hasToken === false ? (
          <Notice tone="error" title="Kein gültiger Einladungslink">
            <p>Öffne den vollständigen Link, den du von Jonas erhalten hast. Abgelaufene oder bereits genutzte Einladungen funktionieren nicht mehr; bitte dann um eine neue.</p>
          </Notice>
        ) : null}
        {!supported ? <Notice tone="error" title="Passkeys nicht unterstützt"><p>Verwende einen aktuellen Browser oder ein anderes Gerät.</p></Notice> : null}
        {hasToken && configured !== false ? (
          <form className="form panel" onSubmit={submit} noValidate>
            <Field id="name" label="Name für diesen Passkey" hint="Zum Beispiel Laptop oder Sicherheitsschlüssel. Dein Kontoname wurde mit der Einladung festgelegt.">
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required aria-describedby="name-hint" autoComplete="name" />
            </Field>
            <div><button className="btn btn--big" disabled={busy || !supported}>{busy ? "Warte auf Passkey..." : "Passkey erstellen"}</button></div>
          </form>
        ) : null}
        {err ? <div className="status" role="alert"><p>{err}</p></div> : null}
        <p className="hint">Tipp: Lege später unter „Konto“ einen zweiten, unabhängigen Passkey an, etwa einen Sicherheitsschlüssel. Zwei Passkeys im selben synchronisierten Konto sind kein unabhängiges Backup.</p>
      </div>
    </div>
  );
}
