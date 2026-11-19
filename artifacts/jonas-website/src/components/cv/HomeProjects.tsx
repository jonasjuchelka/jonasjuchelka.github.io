"use client";

// Startseite: oben nur die aktuellen Projekte als kompakte Knöpfe (führen auf /projects/ und öffnen dort das Blatt),
// darunter die letzten Stationen als Karten mit Foto. Keine große Bühne, damit die Startseite kurz bleibt.
import Link from "next/link";
import { localePath } from "@/i18n/config";
import { MEDIA, type CvEntry, type MapPlace } from "@/lib/cv-shared";
import { useCvSheet, type SheetT } from "./CvSheet";
import { LogoTile } from "./LogoTile";

type Labels = { eyebrow: string; title: string; path: string; all: string };

export function HomeProjects({ entries, places, t, lang, labels }: { entries: CvEntry[]; places: MapPlace[]; t: SheetT; lang: string; labels: Labels }) {
  const { sheet, openStation } = useCvSheet({ entries, places, t, lang });
  const pinned = entries.filter((e) => e.kind === "station" && e.pinned);
  const recent = entries.filter((e) => e.kind === "station" && !e.pinned).slice(0, 6);
  const projects = localePath(lang, "/projects/");
  return (
    <section className="wrap cv-sec home-proj" id="projekte" aria-labelledby="hp-h">
      <p className="cv-pinned">{labels.eyebrow}</p>
      <h2 id="hp-h" className="cv-h2">{labels.title}</h2>
      {pinned.length ? (
        <ul className="home-proj__now" aria-label={labels.eyebrow}>
          {pinned.map((e) => (
            <li key={e.id}>
              <Link className="stage__tab" href={`${projects}#${e.id}`} data-testid={`link-home-pinned-${e.id}`}>
                <LogoTile e={e} size="sm" /><span>{e.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="home-proj__h">{labels.path}</h3>
      <ul className="cards">
        {recent.map((e) => (
          <li key={e.id}>
            <a className="card" href={`${projects}#${e.id}`} onClick={(ev) => { ev.preventDefault(); openStation(e.id); }}>
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
      <p className="more"><Link href={projects} data-testid="link-home-projects">{labels.all} &rarr;</Link></p>
      {sheet}
    </section>
  );
}
