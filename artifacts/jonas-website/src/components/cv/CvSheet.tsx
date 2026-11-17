"use client";

// Blatt für eine Station oder einen Ort: am Mac von rechts, auf dem Handy von unten. Immer mit Zurück-Knopf unten.
// Aufbau einer Station: ein Titelbild (wenn vorhanden), kleines Logo, dann Text. Keine weiteren Bilder.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { localePath } from "@/i18n/config";
import { MEDIA, type CvEntry, type MapPlace } from "@/lib/cv-shared";
import type { Dict } from "@/lib/i18n";
import { LogoTile } from "./LogoTile";

export type SheetT = Dict["projects"];
type Item = { kind: "station"; id: string } | { kind: "place"; key: string };

export function Tags({ e, t }: { e: CvEntry; t: SheetT }) {
  return (
    <span className="cv-tags">
      {e.now ? <span className="cv-tag cv-tag--now">{t.now}</span> : null}
      {e.tags.map((x) => <span key={x} className="cv-tag">{x}</span>)}
    </span>
  );
}

function Station({ e, t }: { e: CvEntry; t: SheetT }) {
  return (
    <article className="st-detail" aria-labelledby={`sheet-h-${e.id}`}>
      {e.photo ? (
        <figure className="cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${MEDIA}/fotos/${e.photo.file}`} alt={e.photo.alt} style={e.photo.focus ? { objectPosition: e.photo.focus } : undefined} />
        </figure>
      ) : <div className="cover cover--plain" aria-hidden="true" />}
      <div className="cover__logo"><LogoTile e={e} /></div>
      <p className="cv-label">{e.date}{e.place ? ` · ${e.place}` : ""}</p>
      <h2 id={`sheet-h-${e.id}`}>{e.title}</h2>
      <p className="st-detail__org">{e.org}</p>
      <Tags e={e} t={t} />
      <div className="why"><p className="cv-label">{t.why}</p><p>{e.why}</p></div>
      {e.text.map((p, i) => <p key={i} className="st-detail__p">{p}</p>)}
      {e.points.length ? (<><h3>{t.did}</h3><ul className="pts">{e.points.map((p, i) => <li key={i}>{p}</li>)}</ul></>) : null}
      {e.links.length ? (
        <><h3>{t.more}</h3><p className="cv-links">{e.links.map((l) => <a key={l.url} className="cv-chip" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <span aria-hidden="true">↗</span></a>)}</p></>
      ) : null}
    </article>
  );
}

function Place({ p, list, t, lang, onOpen, onShowPlace }: { p: MapPlace; list: CvEntry[]; t: SheetT; lang: string; onOpen: (id: string) => void; onShowPlace?: (key: string) => void }) {
  return (
    <section aria-labelledby={`sheet-h-${p.key}`}>
      <p className="cv-label">{p.when}</p>
      <h2 id={`sheet-h-${p.key}`}>{p.name}</h2>
      <p className="st-detail__org">{p.what}</p>
      {list.length ? (
        <>
          <ul className="plist">
            {list.map((e) => (
              <li key={e.id}>
                <button type="button" className="plist__row" onClick={() => onOpen(e.id)}>
                  <LogoTile e={e} size="sm" />
                  <span className="plist__t"><span className="cv-label">{e.date}</span><span className="plist__title">{e.title}</span></span>
                  <span className="cv-go" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="plist__more">
            {onShowPlace
              ? <button type="button" className="btn btn--primary" onClick={() => onShowPlace(p.key)}>{t.showInCv}</button>
              : <Link className="btn btn--primary" href={`${localePath(lang, "/projects/")}?ort=${p.key}`}>{t.showInCv}</Link>}
          </p>
        </>
      ) : <p className="plist__none">{t.noStations}</p>}
    </section>
  );
}

/** Ein Blatt mit Stapel (Ort → Station). Gibt die Funktionen zum Öffnen und das Element zurück. */
export function useCvSheet({ entries, places, t, lang, onShowPlace, syncHash }: {
  entries: CvEntry[]; places: MapPlace[]; t: SheetT; lang: string; onShowPlace?: (key: string) => void; syncHash?: boolean;
}) {
  const [stack, setStack] = useState<Item[]>([]);
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const top = stack[stack.length - 1];

  const close = useCallback(() => {
    setStack([]);
    if (syncHash && location.hash) history.replaceState(null, "", location.pathname + location.search);
  }, [syncHash]);
  const push = useCallback((it: Item) => {
    if (!ref.current?.open) opener.current = document.activeElement as HTMLElement | null;
    setStack((s) => [...s, it]);
    if (syncHash && it.kind === "station") history.replaceState(null, "", `#${it.id}`);
  }, [syncHash]);
  const openStation = useCallback((id: string) => push({ kind: "station", id }), [push]);
  const openPlace = useCallback((key: string) => push({ kind: "place", key }), [push]);
  const back = () => setStack((s) => s.slice(0, -1));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (top && !d.open) { d.showModal(); document.documentElement.classList.add("sheet-open"); }
    if (!top && d.open) { d.close(); document.documentElement.classList.remove("sheet-open"); opener.current?.focus?.(); }
    d.querySelector(".sheet__p")?.scrollTo?.(0, 0);
  }, [top]);

  useEffect(() => {
    if (!syncHash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && entries.some((e) => e.id === id)) setStack([{ kind: "station", id }]);
  }, [entries, syncHash]);

  const prev = stack[stack.length - 2];
  const prevName = prev?.kind === "place" ? places.find((p) => p.key === prev.key)?.name : prev ? entries.find((e) => e.id === prev.id)?.title : undefined;
  const entry = top?.kind === "station" ? entries.find((e) => e.id === top.id) : undefined;
  const place = top?.kind === "place" ? places.find((p) => p.key === top.key) : undefined;

  const sheet = (
    <dialog ref={ref} className="sheet" aria-label={entry?.title ?? place?.name ?? t.station}
      onCancel={(ev) => { ev.preventDefault(); close(); }}
      onClick={(ev) => { if (ev.target === ref.current) close(); }}>
      <div className="sheet__p">
        <div className="sheet__top">
          <span className="sheet__grab" aria-hidden="true" />
          <span className="cv-label">{place ? t.place : t.station}</span>
          <button type="button" className="sheet__x" onClick={close} aria-label={t.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="sheet__body">
          {entry ? <Station e={entry} t={t} /> : null}
          {place ? <Place p={place} list={entries.filter((e) => e.loc === place.key)} t={t} lang={lang} onOpen={openStation}
            onShowPlace={onShowPlace ? (k) => { close(); onShowPlace(k); } : undefined} /> : null}
        </div>
        <div className="sheet__back">
          <button type="button" className="btn" onClick={stack.length > 1 ? back : close}>
            ‹ {prevName ? t.backTo.replace("{name}", prevName) : t.back}
          </button>
        </div>
      </div>
    </dialog>
  );
  return { sheet, openStation, openPlace, close };
}
