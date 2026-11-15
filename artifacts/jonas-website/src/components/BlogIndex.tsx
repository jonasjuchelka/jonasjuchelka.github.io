"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

/** Ein Eintrag der Blogliste. Datumstexte kommen fertig vom Server, damit Server und Browser gleich rendern. */
export type BlogItem = {
  kind: "e" | "g";
  id: string;
  href?: string;
  title?: string;
  text: string;
  date: string; // yyyy-mm-dd
  long: string;
  short: string;
  topic?: string;
  tags: string[];
  minutes?: number;
  image?: string;
};

export type BlogLabels = Record<string, string> & { readLong: string; readShort: string };

const NEW_DAYS = 7;
const PHONE_Q = "(max-width:720px)";
const style = (v: Record<string, string | number>) => v as unknown as CSSProperties;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Suchtreffer mit <mark> markieren (React escaped den Text selbst). */
function hl(text: string, q: string): ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  return text.split(new RegExp(`(${esc(needle)})`, "gi")).map((part, i) =>
    i % 2 ? <mark key={i}>{part}</mark> : part,
  );
}
/** Kurzer Ausschnitt rund um den Treffer, damit er in der Liste sichtbar ist. */
function excerpt(p: BlogItem, q: string): string {
  const at = p.text.toLowerCase().indexOf(q.trim().toLowerCase());
  const start = at > 60 ? at - 40 : 0;
  const end = Math.min(p.text.length, start + 110);
  const body = (start > 0 ? "…" : "") + p.text.slice(start, end) + (end < p.text.length ? "…" : "");
  return body + (p.tags.length ? ` · ${p.tags.join(", ")}` : "");
}
const fillN = (s: string, n: number) => s.replace("{n}", String(n));

const Chev = ({ size = 18, up = false }: { size?: number; up?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "M4 9.8l4-4 4 4" : "M4 6.2l4 4 4-4"} />
  </svg>
);

function Seg({ mode, onPick, t }: { mode: string; onPick: (v: "preview" | "list") => void; t: BlogLabels }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const place = useCallback(() => {
    const s = ref.current;
    if (!s) return;
    const b = s.querySelector<HTMLElement>("[aria-pressed=true]");
    const i = s.querySelector<HTMLElement>(".ind");
    if (b && i && b.offsetWidth) {
      i.style.width = `${b.offsetWidth}px`;
      i.style.transform = `translateX(${b.offsetLeft}px)`;
    }
  }, []);
  useLayoutEffect(place, [place, mode]);
  useEffect(() => {
    const id = requestAnimationFrame(() => { place(); setReady(true); });
    addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => { cancelAnimationFrame(id); removeEventListener("resize", place); };
  }, [place]);
  return (
    <div ref={ref} className={`seg${ready ? " ready" : ""}`} role="group" aria-label={t.view}>
      <button type="button" aria-pressed={mode === "preview"} onClick={() => onPick("preview")}>{t.preview}</button>
      <button type="button" aria-pressed={mode === "list"} onClick={() => onPick("list")}>{t.list}</button>
      <i className="ind" aria-hidden="true" />
    </div>
  );
}

type ReaderData = { text: string; long: string; short: string; fresh: boolean };

function Thought({ text, q, variant, t, long, short, fresh, onRead }: {
  text: string; q: string; variant: "post" | "row"; t: BlogLabels; long: string; short: string; fresh: boolean; onRead: (d: ReaderData) => void;
}) {
  const pRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState(0);
  const lines = variant === "row" ? 2 : 3;

  // Gemessen wird im ungekürzten Zustand: erst zurücksetzen, dann im nächsten Layout-Durchlauf messen.
  useLayoutEffect(() => {
    const p = pRef.current;
    if (!p) return;
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    setClamped(p.scrollHeight > lh * lines + 2);
  }, [gen, lines, text]);
  useEffect(() => {
    const re = () => { setOpen(false); setClamped(false); setGen((g) => g + 1); };
    addEventListener("resize", re);
    document.fonts?.ready.then(re);
    return () => removeEventListener("resize", re);
  }, []);

  const toggle = () => {
    const p = pRef.current;
    if (!p) return;
    if (!open) {
      const lh = parseFloat(getComputedStyle(p).lineHeight);
      p.parentElement?.style.setProperty("--full", String(Math.ceil(p.scrollHeight / lh)));
    }
    setOpen(!open);
  };
  const click = (e: ReactMouseEvent) => {
    if (!clamped) return;
    if (matchMedia(PHONE_Q).matches) {
      e.preventDefault();
      onRead({ text, long, short, fresh });
    } else if ((e.target as HTMLElement).closest(".more")) toggle();
  };

  return (
    <div className={`gt${clamped ? " clamped" : ""}${open ? " open" : ""}`} onClick={click}>
      <div className="gp">
        <p ref={pRef}>{hl(text, q)}</p>
        {clamped ? (
          <button type="button" className="more" aria-expanded={open} aria-label={t.showFull}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6.2l4 4 4-4" /></svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BlogIndex({ items, t }: { items: BlogItem[]; t: BlogLabels }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<"" | "preview" | "list">("");
  const [out, setOut] = useState(false);
  const [shown, setShown] = useState(3);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [reader, setReader] = useState<ReaderData | null>(null);
  const [, bump] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const tglRef = useRef<HTMLButtonElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLLIElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setNow(Date.now()), []);
  const isNew = (d: string) => now !== null && (now - new Date(`${d}T12:00:00Z`).getTime()) / 864e5 <= NEW_DAYS;

  const active = !!(q || cat || type || year || tags.length);
  const mode = view || (active ? "list" : "preview");
  const batch = mode === "list" ? 10 : 3;

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items
      .filter((p) =>
        (!cat || p.topic === cat) && (!type || p.kind === type) && (!year || p.date.startsWith(year)) &&
        tags.every((x) => p.tags.includes(x)) &&
        (!n || `${p.title ?? ""} ${p.text} ${p.tags.join(" ")}`.toLowerCase().includes(n)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items, q, cat, type, year, tags]);

  const counts = useMemo(() => {
    const c = { cats: {} as Record<string, number>, tags: {} as Record<string, number>, years: {} as Record<string, number>, types: { e: 0, g: 0 } };
    for (const p of items) {
      if (p.topic) c.cats[p.topic] = (c.cats[p.topic] ?? 0) + 1;
      for (const x of p.tags) c.tags[x] = (c.tags[x] ?? 0) + 1;
      const y = p.date.slice(0, 4);
      c.years[y] = (c.years[y] ?? 0) + 1;
      c.types[p.kind]++;
    }
    return c;
  }, [items]);

  // Nach jeder Änderung der Auswahl wieder mit der ersten Portion beginnen.
  useEffect(() => setShown(batch), [q, cat, type, year, tags, mode, batch]);

  // Endloses Nachladen
  useEffect(() => {
    const s = sentRef.current;
    if (!s) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown((n) => n + batch); }, { rootMargin: "60px" });
    io.observe(s);
    return () => io.disconnect();
  }, [shown, list.length, batch]);

  const nFilters = (cat ? 1 : 0) + (type ? 1 : 0) + (year ? 1 : 0) + tags.length;
  const flip = (cur: string, v: string, set: (x: string) => void) => set(cur === v ? "" : v);
  const pickView = (v: "preview" | "list") => {
    setOut(true);
    setTimeout(() => { setView(v); setOut(false); }, matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : 150);
  };
  const reset = () => {
    setQ(""); setCat(""); setType(""); setYear(""); setTags([]); setView(""); setSearchOpen(false);
    if (searchRef.current) searchRef.current.value = "";
  };

  /* Filter: Höhe der Vorschau (Mac) und Höhe des offenen Panels. Läuft nach jedem Render, weil sich Inhalt und Breite ändern. */
  useLayoutEffect(() => {
    const w = panelRef.current;
    if (!w) return;
    const inner = w.firstElementChild as HTMLElement;
    const tgl = tglRef.current;
    inner.querySelectorAll(".gray1,.gray2,.tmar").forEach((e) => e.classList.remove("gray1", "gray2", "tmar"));
    const g = inner.querySelectorAll(".fg")[1] ?? inner.querySelectorAll(".fg")[0];
    const items2 = g ? [...g.querySelectorAll<HTMLElement>(".opt")] : [];
    const phone = matchMedia(PHONE_Q).matches;
    if (!phone && items2.length) {
      const last = items2[Math.min(2, items2.length - 1)];
      items2[1]?.classList.add("gray1");
      items2[2]?.classList.add("gray2");
      const b = last.getBoundingClientRect().bottom - inner.getBoundingClientRect().top;
      w.style.setProperty("--peek", `${Math.ceil(b + 4)}px`);
      last.classList.add("tmar");
      if (tgl) tgl.style.top = `${w.offsetTop + Math.ceil(b + 4)}px`;
    } else w.style.setProperty("--peek", "0px");
    w.style.maxHeight = open ? `${inner.scrollHeight}px` : "";
  });
  useEffect(() => {
    const re = () => bump((n) => n + 1); // erzwingt Neuberechnung nach Größenänderung
    addEventListener("resize", re);
    document.fonts?.ready.then(re);
    return () => removeEventListener("resize", re);
  }, []);

  /* Teilweise feste Leiste (Headroom): beim Runterscrollen weg, beim Hochscrollen wieder da. Nur auf dem Handy aktiv (position: sticky). */
  useEffect(() => {
    let last: number | null = null;
    const tol = { up: 6, down: 4 };
    const tick = () => {
      const cur = scrollY;
      if (last === null) { last = cur; return; }
      const dy = cur - last;
      document.querySelectorAll<HTMLElement>(".blog .hr").forEach((b) => {
        if (getComputedStyle(b).position !== "sticky" || !b.offsetParent) return;
        if (b.matches(":focus-within")) { b.classList.remove("hid"); return; }
        // Die Leiste ist das erste sichtbare Kind der Filterspalte: deren Oberkante ist ihre natürliche Position.
        const edge = (b.parentElement as HTMLElement).getBoundingClientRect().top;
        if (edge > -b.offsetHeight) { b.classList.remove("hid"); return; }
        if (dy > tol.down) b.classList.add("hid");
        else if (dy < -tol.up) b.classList.remove("hid");
      });
      const bar = barRef.current;
      if (bar) bar.classList.toggle("stuck", cur > 0 && bar.getBoundingClientRect().top <= 1);
      if (Math.abs(dy) > Math.min(tol.up, tol.down)) last = cur;
    };
    addEventListener("scroll", tick, { passive: true });
    const fi = (e: FocusEvent) => (e.target as HTMLElement).closest?.(".hr")?.classList.remove("hid");
    document.addEventListener("focusin", fi);
    return () => { removeEventListener("scroll", tick); document.removeEventListener("focusin", fi); };
  }, []);

  /* Leseansicht (Handy) */
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (reader && !d.open) { document.documentElement.classList.add("rd-open"); d.showModal(); d.querySelector(".rd-body")?.scrollTo(0, 0); }
    const close = () => { document.documentElement.classList.remove("rd-open"); setReader(null); };
    d.addEventListener("close", close);
    return () => d.removeEventListener("close", close);
  }, [reader]);

  const closePanel = () => {
    setOpen(false);
    trigRef.current?.focus({ preventScroll: true });
    headRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
  };

  const opt = (label: string, on: boolean, n: number | null, click: () => void, key: string) => (
    <button key={key} type="button" className="opt" aria-pressed={on} onClick={click}>
      <span className="t">{label}</span>{n != null ? <span className="n">{n}</span> : null}
    </button>
  );
  const chip = (label: string, on: boolean, click: () => void) => (
    <button key={label} type="button" className="chip" aria-pressed={on} onClick={click}>{label}</button>
  );

  const cats = Object.keys(counts.cats).sort();
  const tagList = Object.keys(counts.tags).sort();
  const years = Object.keys(counts.years).sort().reverse();
  const countText = `${list.length} ${list.length === 1 ? t.countOne : t.countMany}`;
  const badge = nFilters > 0 ? <>{nFilters}<span className="vh"> {t.activeFilters}</span></> : null;
  const searchBox = (
    <div className={`sin${searchOpen ? " open" : ""}`}>
      <input ref={searchRef} className="search" type="search" placeholder={t.search} aria-label={t.searchAria} value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
  );
  const lupe = (
    <button type="button" className="lupe" aria-label={t.searchOpen} aria-expanded={searchOpen}
      onClick={() => { const o = !searchOpen; setSearchOpen(o); if (o) setTimeout(() => searchRef.current?.focus(), 50); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
    </button>
  );

  const visible = list.slice(0, shown);
  const more = list.length > shown;
  const neu = (d: string) => (isNew(d) ? <span className="neu">{t.isNew}</span> : null);
  const dateSpans = (p: BlogItem) => (
    <time dateTime={p.date}><span className="mac-only">{p.long}</span><span className="ph-only">{p.short}</span></time>
  );
  const tagRow = (p: BlogItem) => (p.tags.length ? <div className="tags">{p.tags.map((x) => <span className="tag" key={x}>{hl(x, q)}</span>)}</div> : null);
  const readLine = (p: BlogItem) => (
    <><span className="mac-only">{fillN(t.readLong, p.minutes ?? 1)}</span><span className="ph-only">{fillN(t.readShort, p.minutes ?? 1)}</span></>
  );

  const row = (p: BlogItem, i: number) => (
    <li className="row" key={p.id} style={style({ "--i": i % 10 })}>
      <span className="d"><time dateTime={p.date}>{p.short}</time>{neu(p.date)}</span>
      {p.kind === "g" ? (
        <Thought text={p.text} q={q} variant="row" t={t} long={p.long} short={p.short} fresh={isNew(p.date)} onRead={setReader} />
      ) : (
        <Link href={p.href!}>
          {hl(p.title!, q)}
          {q ? <span className="sub">{hl(excerpt(p, q), q)}</span> : null}
        </Link>
      )}
      {p.kind === "g" ? <span className="gtag">{t.thought}</span> : p.topic ? <span className="cat">{p.topic}</span> : <span />}
      <span className="th">{p.image ? <img src={p.image} alt="" loading="lazy" /> : null}</span>
    </li>
  );

  const post = (p: BlogItem, i: number) =>
    p.kind === "g" ? (
      <li className="post g" key={p.id} style={style({ "--i": i % 10 })}>
        <div className="body">
          <div className="meta">
            <span className="gtag">{t.thought}</span>{neu(p.date)}<span className="dt">{dateSpans(p)}</span>
            {p.topic ? <span className="cat mac-only">{p.topic}</span> : null}
          </div>
          <Thought text={p.text} q={q} variant="post" t={t} long={p.long} short={p.short} fresh={isNew(p.date)} onRead={setReader} />
          {tagRow(p)}
        </div>
      </li>
    ) : (
      <li className={`post${p.image ? " hasimg" : ""}`} key={p.id} style={style({ "--i": i % 10 })}>
        <div className="body">
          <div className="meta">
            {p.topic ? <span className="cat">{p.topic}</span> : null}{neu(p.date)}
            <span className="dt">{dateSpans(p)} · {readLine(p)}</span>
          </div>
          <h2><Link href={p.href!}>{hl(p.title!, q)}</Link></h2>
          <p>{hl(p.text, q)}</p>
          {tagRow(p)}
        </div>
        {p.image ? <Link className="pic" href={p.href!} tabIndex={-1} aria-hidden="true"><img src={p.image} alt="" loading="lazy" /></Link> : null}
      </li>
    );

  return (
    <div className="blog">
      <div className="wrap head" ref={headRef}>
        <h1>{t.title}</h1>
      </div>
      <div className="wrap layout">
        <aside aria-label={t.filter}>
          <div className="fhead mac-only">
            <h2 className="fh">{t.filter}<span className="fbadge">{badge}</span></h2>
            <div className="ftools"><p className="count" aria-live="polite">{countText}</p>{lupe}</div>
          </div>
          <div className="bar hr ph-only" ref={barRef}>
            <h2 className="fh">
              <button type="button" ref={trigRef} className="tgl ftrig" aria-expanded={open} aria-controls="fpanel" onClick={() => setOpen(!open)}>
                {t.filter}<span className="fbadge">{badge}</span><span className="chev"><Chev /></span>
              </button>
            </h2>
            <p className="count" aria-live="polite">{countText}</p>
            {lupe}
          </div>
          {searchBox}
          <div
            className={`fwrap${open ? " open" : ""}`}
            id="fpanel"
            ref={panelRef}
            onFocus={(e) => { if (!open && (e.target as HTMLElement).matches(":focus-visible") && e.target.getBoundingClientRect().bottom > e.currentTarget.getBoundingClientRect().bottom - 4) setOpen(true); }}
          >
            <div className="finner">
              <div className="fg"><p className="lbl">{t.format}</p><div className="grid">
                {opt(t.all, !type, items.length, () => setType(""), "t-all")}
                {opt(t.essays, type === "e", counts.types.e, () => flip(type, "e", setType), "t-e")}
                {opt(t.thoughts, type === "g", counts.types.g, () => flip(type, "g", setType), "t-g")}
              </div></div>
              {cats.length ? (
                <div className="fg"><p className="lbl">{t.category}</p><div className="grid">
                  {opt(t.all, !cat, items.length, () => setCat(""), "c-all")}
                  {cats.map((c) => opt(c, cat === c, counts.cats[c], () => flip(cat, c, setCat), `c-${c}`))}
                </div></div>
              ) : null}
              {tagList.length ? (
                <div className="fg"><p className="lbl">{t.tagsLabel}</p><div className="chips">
                  {tagList.map((x) => chip(x, tags.includes(x), () => setTags(tags.includes(x) ? tags.filter((y) => y !== x) : [...tags, x])))}
                </div></div>
              ) : null}
              <div className="fg"><p className="lbl">{t.year}</p><div className="grid">
                {opt(t.all, !year, null, () => setYear(""), "y-all")}
                {years.map((y) => opt(y, year === y, counts.years[y], () => flip(year, y, setYear), `y-${y}`))}
              </div></div>
              <div className="fg ph-only"><p className="lbl">{t.view}</p><Seg mode={mode} onPick={pickView} t={t} /></div>
              <div className="fend">
                <button type="button" className="reset" onClick={reset}><span className="mac-only">{t.reset}</span><span className="ph-only">{t.resetShort}</span></button>
                <button type="button" className="fclose ph-only" aria-controls="fpanel" onClick={closePanel}>{t.collapse}<span className="chev" aria-hidden="true"><Chev size={16} up /></span></button>
              </div>
            </div>
          </div>
          <button type="button" ref={tglRef} className="tgl mac-only" aria-expanded={open} aria-controls="fpanel" aria-label={t.toggleFilter} onClick={() => setOpen(!open)}>
            <span className="chev"><Chev /></span>
          </button>
        </aside>
        <section>
          <div className="bar2 mac-only"><Seg mode={mode} onPick={pickView} t={t} /></div>
          <ul className={`list${out ? " out" : ""}${more ? " fadeend" : ""}`}>
            {visible.length === 0 ? <li className="none">{t.none}</li> : visible.map((p, i) => (mode === "list" ? row(p, i) : post(p, i)))}
            {visible.length && more ? <li className="sent" ref={sentRef} aria-hidden="true" /> : null}
          </ul>
        </section>
      </div>

      <dialog className="reader" ref={dialogRef} aria-labelledby="rd-h" onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}>
        <div className="rd-handle" aria-hidden="true" />
        <div className="rd-top">
          <h2 className="vh" id="rd-h">{t.thought}</h2>
          <div className="meta">
            <span className="gtag">{t.thought}</span>
            {reader?.fresh ? <span className="neu">{t.isNew}</span> : null}
            <span className="dt">{reader?.short}</span>
          </div>
          <button type="button" className="rd-x" aria-label={t.close} onClick={() => dialogRef.current?.close()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="rd-body"><p>{reader?.text}</p></div>
      </dialog>
    </div>
  );
}
