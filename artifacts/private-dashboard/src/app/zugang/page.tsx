"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, api, errText } from "@/lib/client";
import { Skeleton } from "@/components/ui";
import { ToolLogo } from "@/components/ToolLogo";

type Totp = { code: string; period: number; remaining: number } | null;
type Access = {
  tool: { name: string; logo_url?: string; url: string };
  email: string; username: string; password: string; totp: Totp;
  expires_at: string; views: number;
};
const KEY = "jj-access-token";

function readToken() {
  const m = /(?:^|&)t=([^&]+)/.exec(window.location.hash.slice(1));
  let t = m ? decodeURIComponent(m[1]) : null;
  // Keep the token for reloads of this tab only, and strip it from the address bar right away.
  try { if (t) sessionStorage.setItem(KEY, t); else t = sessionStorage.getItem(KEY); } catch { /* storage blocked: memory only */ }
  if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  return t;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn--small btn--ghost" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
    }}>{done ? "Kopiert" : "Kopieren"}<span className="sr-only">: {label}</span></button>
  );
}

function Row({ icon, label, value, children }: { icon: ReactNode; label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="acc-row">
      <span className="acc-row__icon" aria-hidden="true">{icon}</span>
      <div className="acc-row__main"><span className="acc-row__label">{label}</span><span className="acc-row__value">{value}</span></div>
      <div className="acc-row__actions">{children}</div>
    </div>
  );
}

const I = {
  mail: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  user: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  key: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8m-3 3 2 2m-4 0 2 2" /></svg>,
  lock: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>,
  globe: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>,
  eye: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
};

/** Countdown ring like an authenticator app. */
function Ring({ remaining, period }: { remaining: number; period: number }) {
  const r = 16, c = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, remaining / period));
  return (
    <span className={`ring${remaining <= 5 ? " ring--low" : ""}`} aria-label={`noch ${remaining} Sekunden`}>
      <svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r={r} className="ring__bg" /><circle cx="20" cy="20" r={r} className="ring__fg" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 20 20)" /></svg>
      <span className="ring__num">{remaining}</span>
    </span>
  );
}

export default function AccessPage() {
  const token = useRef<string | null>(null);
  const [data, setData] = useState<Access | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [missing, setMissing] = useState(false);
  const [show, setShow] = useState(false);
  const [totp, setTotp] = useState<Totp>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    token.current = readToken();
    if (!token.current) { setMissing(true); return; }
    api<Access>("/access/view", { method: "POST", body: { token: token.current } })
      .then((d) => { setData(d); setTotp(d.totp); setLeft(d.totp?.remaining ?? 0); })
      .catch((e) => setErr(e instanceof ApiError ? e : new ApiError(500, errText(e))));
  }, []);

  const refresh = useCallback(async () => {
    if (!token.current) return;
    try {
      const r = await api<{ totp: Totp }>("/access/view", { method: "POST", body: { token: token.current, mode: "totp" } });
      setTotp(r.totp); setLeft(r.totp?.remaining ?? 0);
    } catch (e) { setErr(e instanceof ApiError ? e : new ApiError(500, errText(e))); setData(null); }
  }, []);

  // Tick every second; when the code runs out, fetch the next one from the server.
  useEffect(() => {
    if (!totp) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [totp]);
  useEffect(() => { if (totp && left === 0) void refresh(); }, [left, totp, refresh]);

  const until = data ? new Date(data.expires_at).toLocaleString("de-DE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="access">
      <p className="ui-eyebrow">Geteilter Zugang</p>
      {!data && !err && !missing ? <Skeleton rows={4} /> : null}
      {missing || err ? (
        <div className="access-card access-card--empty">
          <h1>{missing ? "Kein Link gefunden" : err?.status === 410 ? "Link nicht mehr gültig" : "Zugang nicht möglich"}</h1>
          <p>{missing ? "Öffne den Zugang über „Login öffnen“ bei deinen Tools." : err?.message}</p>
          <Link className="btn" href="/tools">Zu deinen Tools</Link>
        </div>
      ) : null}
      {data ? (
        <>
          <div className="access-note" role="note">
            Gültig bis <strong>{until} Uhr</strong>, nur in diesem Browser. {data.views}× geöffnet.
          </div>
          <section className="access-card" aria-labelledby="acc-h">
            <div className="tool-head access-card__head">
              <ToolLogo name={data.tool.name} logo={data.tool.logo_url} />
              <h1 id="acc-h">{data.tool.name}</h1>
            </div>
            <div className="acc-group">
              {data.email ? <Row icon={I.mail} label="E-Mail" value={data.email}><CopyButton value={data.email} label="E-Mail" /></Row> : null}
              {data.username ? <Row icon={I.user} label="Nutzername" value={data.username}><CopyButton value={data.username} label="Nutzername" /></Row> : null}
              {data.password ? (
                <Row icon={I.key} label="Passwort" value={<span className="acc-mono">{show ? data.password : "•".repeat(Math.min(14, data.password.length))}</span>}>
                  <button type="button" className={`icon-btn${show ? " is-on" : ""}`} aria-pressed={show} onClick={() => setShow((v) => !v)}>{I.eye}<span className="sr-only">{show ? "Passwort verbergen" : "Passwort anzeigen"}</span></button>
                  <CopyButton value={data.password} label="Passwort" />
                </Row>
              ) : null}
              {totp ? (
                <Row icon={I.lock} label="2FA-Code" value={<span className="acc-mono acc-code">{totp.code.slice(0, 3)} {totp.code.slice(3)}</span>}>
                  <Ring remaining={left} period={totp.period} />
                  <CopyButton value={totp.code} label="2FA-Code" />
                </Row>
              ) : null}
            </div>
            <div className="acc-group">
              <Row icon={I.globe} label="Website" value={<a href={data.tool.url} target="_blank" rel="noopener noreferrer">{data.tool.url.replace(/^https:\/\//, "").replace(/\/$/, "")}</a>} />
            </div>
          </section>
          <p className="hint access-hint">Bitte nicht weitergeben. Der Link funktioniert nur in diesem Browser und läuft nach 6 Stunden ab.</p>
        </>
      ) : null}
    </div>
  );
}
