import { ProjectsApp } from "@/components/cv/ProjectsApp";
import { getCv, mapPlaces } from "@/lib/cv";
import { pageMeta } from "@/lib/meta";
import { getDict } from "@/lib/i18n";

export const projectsMeta = (lang: string) => pageMeta(lang, getDict(lang).projects.metaTitle, getDict(lang).projects.metaDesc, "/projects/");

// Projekte = Lebenslauf. Kopf ohne Fotos, voll breit; darunter angepinnte Projekte, Zeitstrahl und Stipendien.
// Das PDF entsteht beim Bauen aus content/cv.json (scripts/cv-pdf.mjs), ohne Telefonnummer und Adresse.
export function ProjectsView({ lang }: { lang: string }) {
  const t = getDict(lang).projects;
  const cv = getCv(lang);
  return (
    <>
      <header className="phead">
        <div className="wrap phead__in">
          <p className="cv-label">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="phead__lede">{t.lede}</p>
          <p className="phead__act"><a className="btn btn--ondark" href="/media/lebenslauf.pdf" download="Jonas-Juchelka-Lebenslauf.pdf">{t.pdf}</a></p>
        </div>
      </header>
      <ProjectsApp entries={cv.entries} places={mapPlaces(cv)} t={t} lang={lang} />
    </>
  );
}
