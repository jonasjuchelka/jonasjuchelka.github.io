"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BASE, api, errText, type AccessLink, type AccessType, type Tool } from "@/lib/client";
import { LoadError, PageHead, Skeleton, useResource } from "@/components/ui";
import { ToolLogo } from "@/components/ToolLogo";
import { CATEGORIES, categoryLabel, categoryShort } from "@/lib/categories";
import { GH_EDU_CHECKED, GH_EDU_OFFERS, GH_EDU_PACK, type EduOffer } from "@/lib/github-education";

const SHORT_LABEL: Record<AccessType, string> = {
  own_account: "Eigenes Konto",
  team_seat: "Team-Platz",
  permitted_shared: "Gemeinsamer Login",
};

/** Access filter: the three Shared Access kinds plus GitHub Education. */
type Access = AccessType | "edu";
const ACCESS_GROUPS: { label: string; items: { id: Access; label: string }[] }[] = [
  { label: "Shared Access", items: [
    { id: "permitted_shared", label: "Gemeinsamer Login" },
    { id: "team_seat", label: "Team-Platz" },
    { id: "own_account", label: "Eigenes Konto" },
  ] },
  { label: "GitHub Education", items: [{ id: "edu", label: "Alle Angebote" }] },
];

/** One card model for both sources, so every tool looks the same. */
type Item =
  | { kind: "shared"; key: string; name: string; logo?: string; category: string; access: Access; meta: string; text: string; tool: Tool; link?: AccessLink }
  | { kind: "edu"; key: string; name: string; logo?: string; category: string; access: Access; meta: string; text: string; offer: EduOffer };

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

/** Side panel ("peek") with the documentation of one item. */
type LoginActions = { open: (toolId: string, fresh?: boolean) => void; revoke: (linkId: string) => void; busy: boolean; msg: string | null };

const untilTime = (d: string) => new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

function Peek({ item, onClose, login }: { item: Item; onClose: () => void; login: LoginActions }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);
  const href = item.kind === "shared" ? item.tool.url : item.offer.redeem;
  return (
    <div className="peek-backdrop" onClick={onClose}>
      <aside className="peek" role="dialog" aria-modal="true" aria-labelledby="peek-h" onClick={(e) => e.stopPropagation()}>
        <div className="peek-bar">
          <button ref={closeRef} className="btn btn--small btn--ghost" onClick={onClose}>Schließen</button>
          <a className="btn btn--small" href={href} target="_blank" rel="noopener noreferrer">{item.kind === "shared" ? "Öffnen" : "Einlösen"}<span className="sr-only"> (neues Fenster)</span></a>
        </div>
        <div className="tool-head">
          <ToolLogo name={item.name} logo={item.logo} />
          <div>
            <h2 id="peek-h">{item.name}</h2>
            <p className="meta">{item.meta}</p>
          </div>
        </div>
        {item.kind === "shared" ? (
          <>
            {item.tool.has_login ? (
              <div className="login-box">
                <h3>Login</h3>
                <p className="meta">{item.link
                  ? <>Dein Link ist gültig bis {untilTime(item.link.expires_at)} Uhr und wurde {item.link.views}× geöffnet.</>
                  : <>Öffnet die Logindaten mit aktuellem 2FA-Code in einem neuen Fenster. 6 Stunden gültig, nur in diesem Browser.</>}</p>
                <div className="row">
                  <button className="btn btn--small" disabled={login.busy} onClick={() => login.open(item.tool.id)}>Login öffnen</button>
                  {item.link ? <>
                    <button className="btn btn--small btn--ghost" disabled={login.busy} onClick={() => login.open(item.tool.id, true)}>Neuer Link</button>
                    <button className="btn btn--small btn--ghost" disabled={login.busy} onClick={() => login.revoke(item.link!.id)}>Widerrufen</button>
                  </> : null}
                </div>
                {login.msg ? <p className="status" role="alert">{login.msg}</p> : null}
              </div>
            ) : null}
            {item.tool.plan || item.tool.price ? (
              <dl className="facts">
                {item.tool.plan ? <div><dt>Plan</dt><dd>{item.tool.plan}</dd></div> : null}
                {item.tool.price ? <div><dt>Neukauf</dt><dd>{item.tool.price}</dd></div> : null}
              </dl>
            ) : null}
            {item.tool.description ? <p>{item.tool.description}</p> : null}
            {item.tool.details ? <Doc text={item.tool.details} /> : <p className="meta">Noch keine ausführliche Dokumentation hinterlegt.</p>}
            {item.tool.instructions ? <><h3>So geht&apos;s</h3><Steps text={item.tool.instructions} /></> : null}
          </>
        ) : (
          <>
            <dl className="facts">
              <div><dt>Gratis</dt><dd>{item.offer.free}</dd></div>
              <div><dt>Was</dt><dd>{item.offer.what}</dd></div>
            </dl>
            <h3>So löst du es ein</h3>
            <ol className="tool-steps">{item.offer.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p className="meta">
              {item.offer.generic ? "Allgemeine Schritte. Die genauen Bedingungen stehen auf der Angebotsseite. " : ""}
              Voraussetzung: verifizierter Studentenstatus bei GitHub Education.
            </p>
            <div className="row">
              <a className="btn" href={item.offer.redeem} target="_blank" rel="noopener noreferrer">Zur Angebotsseite<span className="sr-only"> (neues Fenster)</span></a>
              {item.offer.source && item.offer.source !== item.offer.redeem ? (
                <a href={item.offer.source} target="_blank" rel="noopener noreferrer">Anleitung des Anbieters</a>
              ) : null}
            </div>
            <p className="meta peek-src">Stand {GH_EDU_CHECKED}. Konditionen können sich ändern. Quelle: <a href={GH_EDU_PACK} target="_blank" rel="noopener noreferrer">education.github.com/pack</a></p>
          </>
        )}
      </aside>
    </div>
  );
}

function Card({ item, onDetails, login }: { item: Item; onDetails: () => void; login: LoginActions }) {
  const href = item.kind === "shared" ? item.tool.url : item.offer.redeem;
  const hasLogin = item.kind === "shared" && item.tool.has_login;
  return (
    <li className={`tool tool--${item.kind}`}>
      <div className="tool-head">
        <ToolLogo name={item.name} logo={item.logo} />
        <div>
          <h3>{item.name}</h3>
          <p className="meta">{item.meta}</p>
        </div>
      </div>
      {item.text ? <p className="tool-text tool-clamp">{item.text}</p> : null}
      <div className="row tool-actions">
        <button className="btn btn--small btn--ghost" onClick={onDetails} aria-haspopup="dialog">Details<span className="sr-only">: {item.name}</span></button>
        {hasLogin && item.kind === "shared" ? (
          <button className="btn btn--small" disabled={login.busy} onClick={() => login.open(item.tool.id)}>Login öffnen<span className="sr-only">: {item.name} (neues Fenster)</span></button>
        ) : (
          <a className="btn btn--small" href={href} target="_blank" rel="noopener noreferrer">{item.kind === "shared" ? "Öffnen" : "Einlösen"}<span className="sr-only">: {item.name} (neues Fenster)</span></a>
        )}
      </div>
      {item.kind === "shared" && item.link ? <p className="meta tool-link">Link {item.link.views}× geöffnet · bis {untilTime(item.link.expires_at)} Uhr</p> : null}
    </li>
  );
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export default function ToolsPage() {
  const { data, error, loading, reload } = useResource<{ tools: Tool[]; vaultUrl: string | null; links?: AccessLink[] }>("/tools");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const items = useMemo<Item[]>(() => {
    const shared: Item[] = (data?.tools ?? []).map((t) => ({
      kind: "shared", key: `s:${t.id}`, name: t.name, logo: t.logo_url, category: t.category ?? "", access: t.access_type,
      meta: [SHORT_LABEL[t.access_type] ?? t.access_type, categoryShort(t.category)].filter(Boolean).join(" · "), text: t.description, tool: t,
      link: data?.links?.find((l) => l.tool_id === t.id),
    }));
    const edu: Item[] = GH_EDU_OFFERS.map((o) => ({
      kind: "edu", key: `e:${o.id}`, name: o.name, logo: o.logo, category: o.category, access: "edu",
      meta: `GitHub Education · ${categoryShort(o.category)}`, text: `${o.what} · ${o.free}`, offer: o,
    }));
    return [...shared, ...edu];
  }, [data]);

  const needle = q.trim().toLowerCase();
  const matches = (it: Item, ignore?: "cat" | "access") =>
    (ignore === "cat" || cats.length === 0 || cats.includes(it.category)) &&
    (ignore === "access" || access.length === 0 || access.includes(it.access)) &&
    (!needle || `${it.name} ${it.meta} ${it.text} ${it.kind === "shared" ? it.tool.provider : ""}`.toLowerCase().includes(needle));
  const visible = items.filter((it) => matches(it));
  const visibleShared = visible.filter((it) => it.kind === "shared");
  const visibleEdu = visible.filter((it) => it.kind === "edu");
  const catCount = (id: string) => items.filter((it) => it.category === id && matches(it, "cat")).length;
  const accessCount = (id: Access) => items.filter((it) => it.access === id && matches(it, "access")).length;
  const activeCount = cats.length + access.length;
  const openItem = items.find((it) => it.key === openKey) ?? null;
  const closePeek = useCallback(() => setOpenKey(null), []);

  // "Login öffnen": open the window synchronously (popup blockers), then point it at this session's 6-hour link.
  const openLogin = async (toolId: string, fresh = false) => {
    setLoginMsg(null); setLoginBusy(true);
    const w = window.open("about:blank", "_blank");
    try {
      const r = await api<{ url: string }>("/access-links", { method: "POST", body: { toolId, fresh } });
      const target = `${BASE}${r.url}`;
      if (w) { w.opener = null; w.location.href = target; } else window.location.assign(target);
      await reload();
    } catch (e) { w?.close(); setLoginMsg(errText(e)); }
    finally { setLoginBusy(false); }
  };
  const revokeLink = async (linkId: string) => {
    setLoginMsg(null); setLoginBusy(true);
    try { await api(`/access-links/${encodeURIComponent(linkId)}`, { method: "DELETE" }); await reload(); }
    catch (e) { setLoginMsg(errText(e)); }
    finally { setLoginBusy(false); }
  };
  const login: LoginActions = { open: openLogin, revoke: revokeLink, busy: loginBusy, msg: loginMsg };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const reset = () => { setCats([]); setAccess([]); setQ(""); };

  // F toggles the filter mask, "/" jumps to the search, Esc closes the mask. Ignored while typing.
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape" && filterOpen && !openKey) { setFilterOpen(false); filterBtnRef.current?.focus(); return; }
    if (isTyping(e.target) || openKey) return;
    if (e.key === "f" || e.key === "F") { e.preventDefault(); setFilterOpen((o) => !o); }
    else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
  }, [filterOpen, openKey]);
  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  const chips = [
    ...access.map((a) => ({ key: `a:${a}`, label: ACCESS_GROUPS.flatMap((g) => g.items).find((i) => i.id === a)?.label ?? a, remove: () => setAccess(access.filter((x) => x !== a)) })),
    ...cats.map((c) => ({ key: `c:${c}`, label: categoryLabel(c), remove: () => setCats(cats.filter((x) => x !== c)) })),
  ];

  return (
    <>
      <PageHead eyebrow="Dashboard" title="Deine Tools">
        <p>Deine freigegebenen Tools und alles, was du mit GitHub Education gratis bekommst.</p>
      </PageHead>
      {loading && !data ? <Skeleton rows={4} /> : null}
      {error ? <LoadError error={error} retry={reload} /> : null}
      {data ? (
        <>
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

          <div className="toolbar">
            <button ref={filterBtnRef} className={`btn btn--ghost filter-toggle${filterOpen ? " is-open" : ""}`} aria-expanded={filterOpen} aria-controls="filter-mask" onClick={() => setFilterOpen((o) => !o)}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              Filter{activeCount ? <span className="filter-toggle__count">{activeCount}</span> : null}
              <kbd aria-hidden="true">F</kbd>
            </button>
            <div className="search">
              <svg className="search__icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <label className="sr-only" htmlFor="tool-q">Tools durchsuchen</label>
              <input ref={searchRef} id="tool-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen, z. B. Domain, Cloud, KI" autoComplete="off" />
              <kbd aria-hidden="true">/</kbd>
            </div>
          </div>
          {chips.length ? (
            <div className="chips" aria-label="Aktive Filter">
              {chips.map((c) => <button key={c.key} className="chip" onClick={c.remove}>{c.label}<span aria-hidden="true"> ×</span><span className="sr-only"> entfernen</span></button>)}
              <button className="chip chip--reset" onClick={reset}>Alle zurücksetzen</button>
            </div>
          ) : null}

          {loginMsg && !openItem ? <div className="status" role="alert"><p>{loginMsg}</p></div> : null}
          <div className={`tools-layout${filterOpen ? " has-filter" : ""}`}>
            {filterOpen ? (
              <>
                <div className="filter-backdrop" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                <aside id="filter-mask" className="filter-mask" aria-label="Filter">
                  <div className="filter-mask__head">
                    <p className="filter__label">Filter</p>
                    <button className="btn btn--small btn--ghost" onClick={() => setFilterOpen(false)}>Schließen</button>
                  </div>
                  <fieldset>
                    <legend>Zugang</legend>
                    {ACCESS_GROUPS.filter((g) => g.items.some((i) => items.some((it) => it.access === i.id))).map((g) => (
                      <div key={g.label} className="filter-group">
                        <p className="filter-group__label">{g.label}</p>
                        {g.items.filter((i) => items.some((it) => it.access === i.id)).map((i) => (
                          <label key={i.id} className="check">
                            <input type="checkbox" checked={access.includes(i.id)} onChange={() => setAccess(toggle(access, i.id))} />
                            <span>{i.label}</span><span className="check__count">{accessCount(i.id)}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </fieldset>
                  <fieldset>
                    <legend>Kategorie</legend>
                    {CATEGORIES.map((c) => (
                      <label key={c.id} className="check">
                        <input type="checkbox" checked={cats.includes(c.id)} onChange={() => setCats(toggle(cats, c.id))} />
                        <span>{c.label}</span><span className="check__count">{catCount(c.id)}</span>
                      </label>
                    ))}
                  </fieldset>
                  {activeCount ? <button className="btn btn--small btn--ghost" onClick={() => { setCats([]); setAccess([]); }}>Filter zurücksetzen</button> : null}
                </aside>
              </>
            ) : null}

            <div className="tools-content">
              <p className="meta result-count" role="status">{visible.length} {visible.length === 1 ? "Tool" : "Tools"}</p>
              {visible.length === 0 ? (
                <div className="empty">
                  <h2>Nichts gefunden</h2>
                  <p>Kein Tool passt zu Suche und Filter.</p>
                  <button className="btn btn--ghost" onClick={reset}>Zurücksetzen</button>
                </div>
              ) : null}
              {visibleShared.length ? (
                <section aria-labelledby="sec-shared" className="tool-section">
                  <h2 id="sec-shared" className="section-label">Shared Access <span>{visibleShared.length}</span></h2>
                  <ul className="tools">{visibleShared.map((it) => <Card key={it.key} item={it} onDetails={() => setOpenKey(it.key)} login={login} />)}</ul>
                </section>
              ) : data.tools.length === 0 && access.every((a) => a !== "edu") && !needle && cats.length === 0 ? (
                <div className="empty">
                  <h2>Noch keine Tools freigegeben</h2>
                  <p>Sobald Jonas ein Tool für dich oder eine deiner Gruppen freigibt, erscheint es hier mit Anleitung.</p>
                  <Link href="/access-guide">Wie Zugänge funktionieren</Link>
                </div>
              ) : null}
              {visibleEdu.length ? (
                <section aria-labelledby="sec-edu" className="tool-section">
                  <h2 id="sec-edu" className="section-label">GitHub Education <span>{visibleEdu.length}</span></h2>
                  <ul className="tools">{visibleEdu.map((it) => <Card key={it.key} item={it} onDetails={() => setOpenKey(it.key)} login={login} />)}</ul>
                </section>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      {openItem ? <Peek item={openItem} onClose={closePeek} login={login} /> : null}
    </>
  );
}
