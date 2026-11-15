import Link from "next/link";
import { Eyebrow, Tag } from "@workspace/site-ui";
import type { Metadata } from "next";
import { FactIcon, ProjectArt } from "@/components/HomeArt";
import { Schriftzug } from "@/components/Schriftzug";
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

function Fact({ f, index, className }: { f: { k: string; v: string }; index: number; className: string }) {
  return (
    <div className={className}>
      <FactIcon index={index} />
      <div className="glance__text"><dt>{f.k}</dt><dd>{f.v}</dd></div>
    </div>
  );
}

export function HomeView({ lang }: { lang: string }) {
  const t = getDict(lang);
  const projects = getProjects(lang);
  const posts = getPosts(lang).slice(0, 3);
  return (
    <>
      <section className="hero home-hero wrap" aria-labelledby="hero-title">
        <div className="home-hero__copy">
          <Schriftzug />
          <Eyebrow>{t.home.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="hero__title home-hero__title">{t.home.title}</h1>
          <p className="hero__intro">{t.home.intro}</p>
          <div className="actions">
            <Link href={localePath(lang, "/projects/trm-keras/")} className="btn btn--primary" data-testid="link-hero-projects">{t.home.ctaProject}</Link>
            <a href={`mailto:${EMAIL}`} className="btn btn--ghost" data-testid="link-hero-mail">{t.home.ctaMail}</a>
          </div>
        </div>
        <figure className="hero__figure">
          <RecursionDiagram t={t.diagram} />
          <figcaption>{t.home.figcaption}</figcaption>
        </figure>
      </section>

      {/* Auf einen Blick: Studium -> Austausch as a route, the other facts as tiles. Order follows home.spec. */}
      <section className="wrap section home-glance" aria-labelledby="glance-title">
        <h2 id="glance-title" className="visually-hidden">{t.home.glanceTitle}</h2>
        <dl className="route">
          <Fact f={t.home.spec[1]} index={1} className="route__place" />
          <svg className="route__arc" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M1 34C30 4 70 4 99 34" />
          </svg>
          <Fact f={t.home.spec[3]} index={3} className="route__place" />
        </dl>
        <dl className="glance">
          <Fact f={t.home.spec[0]} index={0} className="glance__item" />
          <Fact f={t.home.spec[2]} index={2} className="glance__item" />
        </dl>
      </section>

      <section className="wrap section" aria-labelledby="proj-title">
        <div className="section__head">
          <Eyebrow>{t.home.workEyebrow}</Eyebrow>
          <h2 id="proj-title">{t.home.projectsTitle}</h2>
        </div>
        <ul className="pcards">
          {projects.map((p) => (
            <li key={p.slug} className="pcard">
              <ProjectArt slug={p.slug} />
              <div className="pcard__body">
                {p.role ? <p className="pcard__role">{p.role}</p> : null}
                <h3><Link href={localePath(lang, `/projects/${p.slug}/`)} className="stretched" data-testid={`link-project-${p.slug}`}>{p.title}</Link></h3>
                <p className="pcard__sum">{p.summary}</p>
                <span className="tags">{p.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="more"><Link href={localePath(lang, "/projects/")}>{t.home.allProjects} &rarr;</Link></p>
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

      <section className="wrap section home-contact" aria-labelledby="contact-title">
        <div className="home-contact__card dark">
          <Eyebrow>{t.home.contactTitle}</Eyebrow>
          <h2 id="contact-title">{t.contact.title}</h2>
          <p>{t.contact.lede}</p>
          <p className="home-contact__links">
            <a href={`mailto:${EMAIL}`} className="big-link">{EMAIL}</a>
            <a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor">github.com/jonasjuchelka</a>
          </p>
        </div>
      </section>
    </>
  );
}
