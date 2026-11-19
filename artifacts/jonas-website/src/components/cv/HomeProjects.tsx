"use client";

// Startseite: Wer weiterscrollt, landet in den Projekten. Oben die angepinnten Projekte (Bühne wie auf /projects/),
// darunter die letzten Stationen als Karten mit Foto. Jede Karte öffnet dasselbe Blatt wie auf der Projekte-Seite.
import Link from "next/link";
import { localePath } from "@/i18n/config";
import { MEDIA, type CvEntry, type MapPlace } from "@/lib/cv-shared";
import { useCvSheet, type SheetT } from "./CvSheet";
import { LogoTile } from "./LogoTile";
import { Stage } from "./ProjectsApp";

type Labels = { eyebrow: string; title: string; path: string; all: string };

export function HomeProjects({ entries, places, t, lang, labels }: { entries: CvEntry[]; places: MapPlace[]; t: SheetT; lang: string; labels: Labels }) {
  const { sheet, openStation } = useCvSheet({ entries, places, t, lang });
  const pinned = entries.filter((e) => e.kind === "station" && e.pinned);
  const recent = entries.filter((e) => e.kind === "station" && !e.pinned).slice(0, 6);
  return (
    <section className="wrap cv-sec home-proj" id="projekte" aria-labelledby="hp-h">
      <div className="cv-sec__head">
        <div><p className="cv-pinned">{labels.eyebrow}</p><h2 id="hp-h" className="cv-h2">{labels.title}</h2></div>
        <p className="cv-sec__note">{t.pinnedNote}</p>
      </div>
      {pinned.length ? <Stage list={pinned} t={t} lang={lang} onOpen={openStation} /> : null}

      <h3 className="home-proj__h">{labels.path}</h3>
      <ul className="cards">
        {recent.map((e) => (
          <li key={e.id}>
            <a className="card" href={`${localePath(lang, "/projects/")}#${e.id}`} onClick={(ev) => { ev.preventDefault(); openStation(e.id); }}>
              {e.photo ? (
                <span className="card__pic">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${MEDIA}/fotos/${e.photo.file}`} alt="" loading="lazy" decoding="async" style={e.photo.focus ? { objectPosition: e.photo.focus } : undefined} />
                </span>
              ) : <span className="card__pic card__pic--plain"><LogoTile e={e} size="lg" /></span>}
              <span className="card__body">
                <span className="cv-label">{e.date}</span>
                <span className="card__t">{e.title}</span>
                <span className="card__o">{e.org}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="actions"><Link className="btn btn--primary" href={localePath(lang, "/projects/")} data-testid="link-home-projects">{labels.all}</Link></p>
      {sheet}
    </section>
  );
}
