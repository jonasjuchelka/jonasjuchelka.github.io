import Link from "next/link";
import { Eyebrow } from "@workspace/site-ui";
import type { Metadata } from "next";
import { ProjectList } from "@/components/ProjectList";
import { RecursionDiagram } from "@/components/RecursionDiagram";
import { getPosts, getProjects, formatDate } from "@/lib/content";
import { EMAIL, GITHUB, SITE_NAME, abs } from "@/lib/site";
import { LANGUAGES, availableLocales, getDict, localePath } from "@/lib/i18n";

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

export function HomeView({ lang }: { lang: string }) {
  const t = getDict(lang);
  const projects = getProjects(lang);
  const posts = getPosts(lang).slice(0, 3);
  return (
    <>
      <section className="hero hero--split wrap" aria-labelledby="hero-title">
        <div className="hero__copy">
          <Eyebrow>{t.home.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="hero__title">{t.home.title}</h1>
          <p className="hero__intro">{t.home.intro}</p>
          <div className="actions">
            <Link href={localePath(lang, "/projects/trm-keras/")} className="btn btn--primary" data-testid="link-hero-projects">{t.home.ctaProject}</Link>
            <a href={`mailto:${EMAIL}`} className="btn btn--ghost" data-testid="link-hero-mail">{t.home.ctaMail}</a>
          </div>
          <dl className="spec">
            {t.home.spec.map((f) => (
              <div key={f.k} className="spec__row"><dt>{f.k}</dt><dd>{f.v}</dd></div>
            ))}
          </dl>
        </div>
        <figure className="hero__figure">
          <RecursionDiagram t={t.diagram} />
          <figcaption>{t.home.figcaption}</figcaption>
        </figure>
      </section>

      <section className="wrap section" aria-labelledby="proj-title">
        <div className="section__head">
          <Eyebrow>{t.home.workEyebrow}</Eyebrow>
          <h2 id="proj-title">{t.home.projectsTitle}</h2>
        </div>
        <ProjectList projects={projects} lang={lang} />
      </section>

      {posts.length ? (
        <section className="wrap section" aria-labelledby="blog-title">
          <div className="section__head">
            <Eyebrow>{t.home.notesEyebrow}</Eyebrow>
            <h2 id="blog-title">{t.home.blogTitle}</h2>
          </div>
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={localePath(lang, `/blog/${p.slug}/`)}>{p.title}</Link>
                <span className="meta-line"><time dateTime={p.date.toISOString()}>{formatDate(p.date, lang)}</time></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wrap section contact-cta" aria-labelledby="contact-title">
        <h2 id="contact-title" className="visually-hidden">{t.home.contactTitle}</h2>
        <p className="contact-cta__links">
          <a href={`mailto:${EMAIL}`} className="big-link">{EMAIL}</a>
          <a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor">github.com/jonasjuchelka</a>
        </p>
      </section>
    </>
  );
}
