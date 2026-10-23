"use client";
import Link from "next/link";
import { ACCESS_HINT, ACCESS_LABEL, type Tool } from "@/lib/client";
import { LoadError, PageHead, Skeleton, useResource } from "@/components/ui";

export default function ToolsPage() {
  const { data, error, loading, reload } = useResource<{ tools: Tool[]; vaultUrl: string | null }>("/tools");
  return (
    <>
      <PageHead eyebrow="Dashboard" title="Deine Tools">
        <p>Hier siehst du nur Tools, die für dich freigegeben sind. Die Anmeldung beim Anbieter erfolgt separat, mit deinem eigenen Zugang.</p>
      </PageHead>
      {data ? (
        <section className="panel" aria-labelledby="vault-h" style={{ marginBottom: "2rem" }}>
          <h2 id="vault-h">Passworttresor</h2>
          <p><span className={data.vaultUrl ? "pill pill--ok" : "pill pill--warn"}>{data.vaultUrl ? "Aktiv" : "Noch nicht verbunden"}</span></p>
          <p>Hier liegen Zugangsdaten und 2FA-Codes für gemeinsame Tools. Der Tresor ist ein eigener Dienst mit eigenem Master-Passwort und 2FA. Der Passkey dieser Seite öffnet ihn nicht. Auf dieser Website werden keine Zugangsdaten gespeichert.</p>
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
                <p className="meta">{t.provider}</p>
                <h2>{t.name}</h2>
                <p><span className="pill">{ACCESS_LABEL[t.access_type] ?? t.access_type}</span></p>
                {ACCESS_HINT[t.access_type] ? <p className="meta">{ACCESS_HINT[t.access_type]}</p> : null}
                {t.description ? <p>{t.description}</p> : null}
                {t.instructions ? <div><p className="meta">So geht&apos;s</p><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{t.instructions}</p></div> : null}
                <div style={{ marginTop: "auto" }}>
                  <a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">{t.name} öffnen<span className="sr-only"> (neues Fenster)</span></a>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}
