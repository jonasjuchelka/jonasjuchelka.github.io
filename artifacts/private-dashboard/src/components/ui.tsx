"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Notice } from "@workspace/site-ui";
import { ApiError, api, authenticate, errText } from "@/lib/client";

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <p className="ui-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children ? <div className="lead">{children}</div> : null}
    </header>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-wrap">
      <span className="sr-only">Wird geladen</span>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skel" style={{ width: `${92 - i * 13}%` }} />)}
    </div>
  );
}

/** Loads a protected endpoint; renders appropriate auth/permission/error states. */
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await api<T>(path)); setError(null); }
    catch (e) { setError(e instanceof ApiError ? e : new ApiError(500, errText(e))); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload };
}

export function LoadError({ error, retry }: { error: ApiError; retry: () => void }) {
  if (error.status === 401)
    return <Notice tone="warning" title="Nicht angemeldet">
      <p>Diese Seite ist nur mit einem gültigen Passkey-Login erreichbar.</p>
      <p><Link className="btn" href="/login">Zur Anmeldung</Link></p>
    </Notice>;
  if (error.status === 403)
    return <Notice tone="error" title="Kein Zugriff">
      <p>{error.message}</p><p>Falls dein Konto gesperrt wurde oder Rechte fehlen, wende dich an Jonas.</p>
    </Notice>;
  if (error.status === 503)
    return <Notice tone="warning" title="Noch nicht eingerichtet"><p>{error.message}</p></Notice>;
  return <Notice tone="error" title="Laden fehlgeschlagen">
    <p>{error.message}</p>
    <p><button className="btn btn--ghost" onClick={retry}>Erneut versuchen</button></p>
  </Notice>;
}

/** Runs a mutation; on 401/403 offers passkey reconfirmation, then user retries manually. */
export function useAction(onDone: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const run = useCallback(async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true); setMsg(null);
    try {
      await fn();
      setNeedsReauth(false);
      if (success) setMsg({ tone: "success", text: success });
      await doneRef.current();
      return true;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setNeedsReauth(true);
      setMsg({ tone: "error", text: errText(e) });
      return false;
    } finally { setBusy(false); }
  }, []);
  const reauth = useCallback(async () => {
    setBusy(true);
    try {
      await authenticate("reauth");
      setNeedsReauth(false);
      setMsg({ tone: "success", text: "Bestätigt. Bitte führe die Aktion jetzt erneut aus (gültig für 5 Minuten)." });
    } catch (e) { setMsg({ tone: "error", text: errText(e) }); }
    finally { setBusy(false); }
  }, []);
  return { busy, msg, needsReauth, run, reauth, setMsg };
}

export function ActionStatus({ a }: { a: ReturnType<typeof useAction> }) {
  if (!a.msg && !a.needsReauth) return null;
  return (
    <div className={`status status--${a.msg?.tone ?? "error"}`} role={a.msg?.tone === "error" ? "alert" : "status"}>
      {a.msg ? <p><strong>{a.msg.tone === "error" ? "Fehler: " : "Erledigt: "}</strong>{a.msg.text}</p> : null}
      {a.needsReauth ? (
        <p>Sicherheitskritische Änderungen erfordern eine frische Bestätigung.{" "}
          <button className="btn btn--small" onClick={a.reauth} disabled={a.busy}>Mit Passkey bestätigen</button>
        </p>
      ) : null}
    </div>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>
  );
}
