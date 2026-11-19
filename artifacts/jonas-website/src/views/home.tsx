import Link from "next/link";
import type { Metadata } from "next";
import { Schriftzug } from "@/components/Schriftzug";
import { MapSection } from "@/components/cv/MapSection";
import { HomeProjects } from "@/components/cv/HomeProjects";
import { getPosts, formatDate } from "@/lib/content";
import { getCv, mapPlaces } from "@/lib/cv";
import { SITE_NAME, abs } from "@/lib/site";
import { LANGUAGES, availableLocales, getDict, localePath } from "@/lib/i18n";
import world from "@/data/world.json";

export function homeMeta(lang: string): Metadata {
  const t = getDict(lang);
  const languages: Record<string, string> = Object.fromEntries(availableLocales().map((c) => [c, abs(localePath(c, "/"))]));
  languages["x-default"] = abs("/");
  return {
    title: { absolute: SITE_NAME },
    description: t.meta.description,
    alternates: { canonical: abs(localePath(lang, "/")), languages },
    openGraph: { title: SITE_NAME, description: t.meta.description, url: abs(localePath(lang, "/")), siteName: SITE_NAME, locale: LANGUAGES[lang]?.og ?? "de_DE", type: "website" },
  };
}

// Startseite: nur Foto und Schriftzug, darunter (nach der Leiste) die Aussage und zwei Buttons, dann die aktuellen
// Projekte (kompakt), die letzten Stationen, Karte und Blog. Ganz unten führt „Als Nächstes“ weiter zu den Projekten.
// Die Leiste sitzt hier unter dem Bild: das Bild liegt absolut oben, die Leiste bekommt per CSS (body:has(.home-hero)) Abstand.
export function HomeView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.home;
  const cv = getCv(lang);
  const posts = getPosts(lang).slice(0, 3);
  return (
    <>
      <section className="home-hero" data-hero aria-label={SITE_NAME}>
        <picture className="home-hero__bg">
          <source media="(max-width: 820px)" srcSet="/media/fotos/jonas-phone.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/fotos/jonas-wide.jpg" alt={t.photoAlt} fetchPriority="high" />
        </picture>
        <div className="home-hero__shade" aria-hidden="true" />
        <div className="wrap home-hero__in">
          <Schriftzug className="home-hero__sz" />
        </div>
      </section>

      <section className="wrap home-say" aria-labelledby="say-h">
        <h1 id="say-h" lang="en"><span>{t.headline1}</span> <span>{t.headline2} <span className="mark">{t.headline2Mark}</span>{t.headline2End}</span></h1>
        <p className="actions">
          <Link href={localePath(lang, "/projects/")} className="btn btn--primary" data-testid="link-hero-cv">{t.ctaCv}</Link>
          <Link href={localePath(lang, "/kontakt/")} className="btn" data-testid="link-hero-contact">{t.ctaContact}</Link>
        </p>
      </section>

      <HomeProjects entries={cv.entries} places={mapPlaces(cv)} t={d.projects} lang={lang}
        labels={{ eyebrow: t.projectsEyebrow, title: d.nav.projects, path: t.projectsPath, all: t.allProjects }} />

      <MapSection entries={cv.entries} places={mapPlaces(cv)} t={d.projects} lang={lang} world={world} title={t.mapTitle} aria={t.mapAria} />

      {posts.length ? (
        <section className="wrap cv-sec" aria-labelledby="blog-h">
          <h2 id="blog-h" className="cv-h2">{t.blogTitle}</h2>
          <ul className="home-posts">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={localePath(lang, `/blog/${p.slug}/`)} className="home-post">
                  <span className="cv-label"><time dateTime={p.date.toISOString()}>{formatDate(p.date, lang)}</time></span>
                  <span className="home-post__t">{p.title}</span>
                  <span className="home-post__s">{p.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="more"><Link href={localePath(lang, "/blog/")}>{t.allPosts} &rarr;</Link></p>
        </section>
      ) : null}
    </>
  );
}
