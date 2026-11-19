"use client";

// Projekte-Seite: angepinnte Projekte (Bühne), Zeitstrahl mit Themenfilter und Ortsfilter, Stipendien. Ein Blatt pro Station.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { localePath } from "@/i18n/config";
import { MEDIA, type CvEntry, type MapPlace } from "@/lib/cv-shared";
import { Tags, useCvSheet, type SheetT } from "./CvSheet";
import { LogoTile } from "./LogoTile";

export function Stage({ list, t, lang, onOpen }: { list: CvEntry[]; t: SheetT; lang: string; onOpen: (id: string) => void }) {
  const [i, setI] = useState(0);
  const e = list[Math.min(i, list.length - 1)];
  if (!e) return null;
  return (
    <div className="stage">
      {list.length > 1 ? (
        <div className="stage__tabs" role="group" aria-label={t.tabsAria}>
          {list.map((x, k) => (
            <button key={x.id} type="button" className="stage__tab" aria-pressed={k === i} onClick={() => setI(k)}>
              <LogoTile e={x} size="sm" /><span>{x.title}</span>
            </button>
          ))}
        </div>
      ) : null}
      {e.photo ? (
        <figure className="stage__pic">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${MEDIA}/fotos/${e.photo.file}`} alt={e.photo.alt} style={e.photo.focus ? { objectPosition: e.photo.focus } : undefined} />
        </figure>
      ) : <div className="stage__pic stage__pic--plain"><LogoTile e={e} size="lg" /></div>}
      <div className="stage__text">
        <p className="cv-label">{e.date}{e.place ? ` · ${e.place}` : ""}</p>
        <h3>{e.title}</h3>
        <p className="stage__org">{e.org}</p>
        <p className="stage__why">{e.why}</p>
        <p className="actions">
          <button type="button" className="btn btn--primary" onClick={() => onOpen(e.id)}>{t.open}</button>
          <Link className="btn" href={localePath(lang, "/kontakt/")}>{t.feedback}</Link>
        </p>
      </div>
    </div>
  );
}

export function ProjectsApp({ entries, places, t, lang }: { entries: CvEntry[]; places: MapPlace[]; t: SheetT; lang: string }) {
  const [tag, setTag] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const { sheet, openStation } = useCvSheet({ entries, places, t, lang, syncHash: true, onShowPlace: (k) => setPlace(k) });

  useEffect(() => {
    const k = new URLSearchParams(location.search).get("ort");
    if (k && places.some((p) => p.key === k)) {
      setPlace(k);
      requestAnimationFrame(() => document.getElementById("weg")?.scrollIntoView());
    }
  }, [places]);

  const pinned = entries.filter((e) => e.kind === "station" && e.pinned);
  const stations = entries.filter((e) => e.kind === "station" && !e.pinned);
  const awards = entries.filter((e) => e.kind === "award");
  const tags = useMemo(() => [...new Set(stations.flatMap((e) => e.tags))], [stations]);
  const shown = stations.filter((e) => (!tag || e.tags.includes(tag)) && (!place || e.loc === place));
  const years = [...new Set(shown.map((e) => e.year))];
  const placeName = place ? places.find((p) => p.key === place)?.name : null;

  const row = (e: CvEntry) => (
    <a className="st" href={`#${e.id}`} onClick={(ev) => { ev.preventDefault(); openStation(e.id); }}>
      <LogoTile e={e} />
      <span className="st__body">
        <span className="cv-label">{e.date}{e.place ? ` · ${e.place}` : ""}</span>
        <span className="st__title">{e.title}</span>
        <span className="st__org">{e.org}</span>
        <Tags e={e} t={t} />
      </span>
      {e.photo ? (
        <span className="st__pic" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${MEDIA}/fotos/${e.photo.file}`} alt="" loading="lazy" decoding="async" style={e.photo.focus ? { objectPosition: e.photo.focus } : undefined} />
        </span>
      ) : null}
      <span className="cv-go" aria-hidden="true">→</span>
    </a>
  );

  return (
    <>
      {pinned.length ? (
        <section className="wrap cv-sec" aria-labelledby="pin-h">
          <div className="cv-sec__head">
            <div><p className="cv-pinned">{t.pinned}</p><h2 id="pin-h" className="cv-h2">{t.pinnedTitle}</h2></div>
          </div>
          <Stage list={pinned} t={t} lang={lang} onOpen={openStation} />
        </section>
      ) : null}

      <section className="wrap cv-sec" id="weg" aria-labelledby="weg-h">
        <h2 id="weg-h" className="cv-h2">{t.pathTitle}</h2>
        <div className="cv-filter" role="group" aria-label={t.filterAria}>
          {tags.map((x) => (
            <button key={x} type="button" className="cv-chip" aria-pressed={tag === x} onClick={() => setTag(tag === x ? null : x)}>{x}</button>
          ))}
          {placeName ? (
            <button type="button" className="cv-chip cv-chip--place" aria-pressed="true" onClick={() => setPlace(null)} aria-label={t.clearPlace}>
              {t.placeFilter.replace("{name}", placeName)} <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
        <p className="cv-count" aria-live="polite">{shown.length === 1 ? t.countOne : t.count.replace("{n}", String(shown.length))}</p>
        <div className="tl">
          {years.map((y) => (
            <div key={y} className="tl__year">
              <span className="tl__y">{y}</span>
              <ul className="tl__list">{shown.filter((e) => e.year === y).map((e) => <li key={e.id}>{row(e)}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {awards.length ? (
        <section className="wrap cv-sec" aria-labelledby="aw-h">
          <h2 id="aw-h" className="cv-h2">{t.awardsTitle}</h2>
          <ul className="aw">
            {awards.map((e) => (
              <li key={e.id}>
                <a className="aw__row" href={`#${e.id}`} onClick={(ev) => { ev.preventDefault(); openStation(e.id); }}>
                  <LogoTile e={e} />
                  <span className="aw__t">{e.title}<small>{e.org}</small></span>
                  <span className="aw__w">{e.why}</span>
                  <span className="aw__y">{e.date}</span>
                  <span className="cv-go" aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {sheet}
    </>
  );
}
