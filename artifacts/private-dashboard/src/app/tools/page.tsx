"use client";
import Link from "next/link";
import { useState } from "react";
import type { AccessType, Tool } from "@/lib/client";
import { LoadError, PageHead, Skeleton, useResource } from "@/components/ui";


const SHORT_LABEL: Record<AccessType, string> = {
  own_account: "Eigenes Konto",
  team_seat: "Team-Platz",
  permitted_shared: "Gemeinsamer Login",
};

/** Logo from the tool's own site; falls back to the first letter if it cannot be loaded. */
function Logo({ tool }: { tool: Tool }) {
  const [failed, setFailed] = useState(false);
  let src = "";
  try { src = new URL("/favicon.ico", tool.url).href; } catch { src = ""; }
  return failed || !src ? (
    <span className="logo logo--letter" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="logo" src={src} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

/** Instructions: one step per line; leading numbers or bullets are removed. */
function Steps({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length === 1) return <p className="tool-text">{lines[0]}</p>;
  return <ol className="tool-steps">{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>;
}

export default function ToolsPage() {
  const { data, error, loading, reload } = useResource<{ tools: Tool[]; vaultUrl: string | null }>("/tools");
  return (
    <>
      <PageHead eyebrow="Dashboard" title="Deine Tools">
        <p>Deine freigegebenen Tools. Die Anmeldung läuft beim Anbieter.</p>
      </PageHead>
      {data ? (
        <section className="vault" aria-labelledby="vault-h">
          <div>
            <h2 id="vault-h">Passworttresor <span className={data.vaultUrl ? "pill pill--ok" : "pill pill--warn"}>{data.vaultUrl ? "Aktiv" : "Nicht verbunden"}</span></h2>
            <p className="meta">Logins und 2FA-Codes. Eigenes Master-Passwort, nicht dein Passkey.</p>
          </div>
          {data.vaultUrl ? (
            <a className="btn" href={data.vaultUrl} target="_blank" rel="noopener noreferrer">Tresor öffnen<span className="sr-only"> (neues Fenster)</span></a>
          ) : (
            <button className="btn" disabled aria-disabled="true">Tresor öffnen</button>
          )}
        </section>
      ) : null}
      {loading && !data ? <Skeleton rows={4} /> : null}
      {error ? <LoadError error={error} retry={reload} /> : null}
      {data ? (
        data.tools.length === 0 ? (
          <div className="empty">
            <h2>Noch keine Tools freigegeben</h2>
            <p>Sobald Jonas ein Tool für dich oder eine deiner Gruppen freigibt, erscheint es hier mit Anleitung.</p>
            <Link href="/access-guide">Wie Zugänge funktionieren</Link>
          </div>
        ) : (
          <ul className="tools" style={{ listStyle: "none", padding: 0 }}>
            {data.tools.map((t) => (
              <li key={t.id} className="tool">
                <div className="tool-head">
                  <Logo tool={t} />
                  <div>
                    <h2>{t.name}</h2>
                    <p className="meta">{t.provider} · {SHORT_LABEL[t.access_type] ?? t.access_type}</p>
                  </div>
                </div>
                {t.description ? <p className="tool-text">{t.description}</p> : null}
                {t.instructions ? <Steps text={t.instructions} /> : null}
                <div style={{ marginTop: "auto" }}>
                  <a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">Öffnen<span className="sr-only">: {t.name} (neues Fenster)</span></a>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}
