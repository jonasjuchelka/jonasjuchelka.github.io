"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AccessType, Tool } from "@/lib/client";
import { LoadError, PageHead, Skeleton, useResource } from "@/components/ui";


const SHORT_LABEL: Record<AccessType, string> = {
  own_account: "Eigenes Konto",
  team_seat: "Team-Platz",
  permitted_shared: "Gemeinsamer Login",
};

/** Logo: own logo address, else the tool's favicon, else the first letter. */
function Logo({ tool }: { tool: Tool }) {
  const candidates: string[] = [];
  if (tool.logo_url) candidates.push(tool.logo_url);
  try {
    candidates.push(new URL("/favicon.ico", tool.url).href, new URL("/apple-touch-icon.png", tool.url).href);
  } catch { /* invalid URL: letter fallback */ }
  const [index, setIndex] = useState(0);
  const src = candidates[index];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="logo" src={src} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" onError={() => setIndex((i) => i + 1)} />
  ) : (
    <span className="logo logo--letter" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
  );
}

/** Instructions: one step per line; leading numbers or bullets are removed. */
function Steps({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length === 1) return <p className="tool-text">{lines[0]}</p>;
  return <ol className="tool-steps">{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>;
}

/** Small safe renderer: "## Titel" = heading, "- " = list item, blank line = new paragraph. No HTML. */
function Doc({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushList = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>); list = []; } };
  const flushPara = () => { if (para.length) { blocks.push(<p key={blocks.length}>{para.join(" ")}</p>); para = []; } };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flushList(); flushPara(); }
    else if (line.startsWith("## ")) { flushList(); flushPara(); blocks.push(<h3 key={blocks.length}>{line.slice(3)}</h3>); }
    else if (/^[-*•]\s+/.test(line)) { flushPara(); list.push(line.replace(/^[-*•]\s+/, "")); }
    else { flushList(); para.push(line); }
  }
  flushList(); flushPara();
  return <div className="doc">{blocks}</div>;
}

/** Side panel (like a "peek" view) with the tool's documentation. */
function ToolPanel({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);
  return (
    <div className="peek-backdrop" onClick={onClose}>
      <aside className="peek" role="dialog" aria-modal="true" aria-labelledby="peek-h" onClick={(e) => e.stopPropagation()}>
        <div className="peek-bar">
          <button ref={closeRef} className="btn btn--small btn--ghost" onClick={onClose}>Schließen</button>
          <a className="btn btn--small" href={tool.url} target="_blank" rel="noopener noreferrer">Öffnen<span className="sr-only"> (neues Fenster)</span></a>
        </div>
        <div className="tool-head">
          <Logo tool={tool} />
          <div>
            <h2 id="peek-h">{tool.name}</h2>
            <p className="meta">{tool.provider} · {SHORT_LABEL[tool.access_type] ?? tool.access_type}</p>
          </div>
        </div>
        {tool.plan || tool.price ? (
          <dl className="facts">
            {tool.plan ? <div><dt>Plan</dt><dd>{tool.plan}</dd></div> : null}
            {tool.price ? <div><dt>Neukauf</dt><dd>{tool.price}</dd></div> : null}
          </dl>
        ) : null}
        {tool.description ? <p>{tool.description}</p> : null}
        {tool.details ? <Doc text={tool.details} /> : <p className="meta">Noch keine ausführliche Dokumentation hinterlegt.</p>}
        {tool.instructions ? <><h3>So geht&apos;s</h3><Steps text={tool.instructions} /></> : null}
      </aside>
    </div>
  );
}

export default function ToolsPage() {
  const { data, error, loading, reload } = useResource<{ tools: Tool[]; vaultUrl: string | null }>("/tools");
  const [openId, setOpenId] = useState<string | null>(null);
  const openTool = data?.tools.find((t) => t.id === openId) ?? null;
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
                {t.description ? <p className="tool-text tool-clamp">{t.description}</p> : null}
                <div className="row" style={{ marginTop: "auto" }}>
                  <button className="btn btn--ghost" onClick={() => setOpenId(t.id)} aria-haspopup="dialog">Details<span className="sr-only">: {t.name}</span></button>
                  <a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">Öffnen<span className="sr-only">: {t.name} (neues Fenster)</span></a>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {openTool ? <ToolPanel tool={openTool} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
