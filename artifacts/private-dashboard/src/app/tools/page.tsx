"use client";
import Link from "next/link";
import { ACCESS_LABEL, type Tool } from "@/lib/client";
import { LoadError, PageHead, Skeleton, useResource } from "@/components/ui";

export default function ToolsPage() {
  const { data, error, loading, reload } = useResource<{ tools: Tool[]; vaultConfigured: boolean }>("/tools");
  return (
    <>
      <PageHead eyebrow="Dashboard" title="Deine Tools">
        <p>Hier siehst du nur Tools, die für dich freigegeben sind. Die Anmeldung beim Anbieter erfolgt separat, mit deinem eigenen Zugang.</p>
      </PageHead>
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
                {t.description ? <p>{t.description}</p> : null}
                {t.instructions ? <details><summary>Anleitung anzeigen</summary><p style={{ whiteSpace: "pre-wrap" }}>{t.instructions}</p></details> : null}
                <div style={{ marginTop: "auto" }}>
                  <a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">{t.name} öffnen<span className="sr-only"> (neues Fenster)</span></a>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {data ? (
        <section className="section panel" aria-labelledby="vault-h">
          <h2 id="vault-h">Passworttresor</h2>
          <p><span className="pill pill--warn">Noch nicht aktiviert</span></p>
          <p>Der separate Vaultwarden-Tresor ist die letzte Ausbaustufe und noch nicht eingerichtet. Geteilte Zugangsdaten werden nie auf dieser Website gespeichert.</p>
          <button className="btn" disabled aria-disabled="true">Tresor öffnen</button>
        </section>
      ) : null}
    </>
  );
}
