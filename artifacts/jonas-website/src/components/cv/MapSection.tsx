"use client";

// Weltkarte (Winkel-Tripel, Natural Earth) mit den Orten, an denen ich gelebt habe. Ein Klick zeigt, was ich dort gemacht habe.
import type { CvEntry, MapPlace } from "@/lib/cv-shared";
import { useCvSheet, type SheetT } from "./CvSheet";
import { Icon } from "./LogoTile";

export function MapSection({ entries, places, t, lang, world, title, aria }: {
  entries: CvEntry[]; places: MapPlace[]; t: SheetT; lang: string; title: string; aria: string;
  world: { viewBox: string; sphere: string; grat: string };
}) {
  const { sheet, openPlace } = useCvSheet({ entries, places, t, lang });
  return (
    <section className="wrap cv-sec home-map" aria-labelledby="map-h">
      <h2 id="map-h" className="cv-h2">{title}</h2>
      <div className="wmap" role="group" aria-label={aria}>
        <svg viewBox={world.viewBox} aria-hidden="true" focusable="false">
          <path className="wmap__sphere" d={world.sphere} />
          <path className="wmap__grat" d={world.grat} />
        </svg>
        <span className="wmap__land" aria-hidden="true" />
        {places.map((p) => (
          <button key={p.key} type="button" className={`pin${p.badge === "now" ? " pin--now" : ""}${p.label === "left" || p.x > 75 ? " pin--left" : ""}${p.label === "none" ? " pin--quiet" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => openPlace(p.key)} aria-label={p.name}>
            <span className="pin__l" aria-hidden="true">{p.name}</span>
          </button>
        ))}
      </div>
      <ul className="map-chips">
        {places.map((p) => (
          <li key={p.key}>
            <button type="button" className="cv-chip" onClick={() => openPlace(p.key)}>
              {p.badge ? <Icon name={p.badge === "home" ? "home" : "pin"} className="cv-chip__i" /> : null}
              {p.name}
              {p.badge ? <small>{p.badge === "home" ? t.home : t.now}</small> : null}
            </button>
          </li>
        ))}
      </ul>
      {sheet}
    </section>
  );
}
