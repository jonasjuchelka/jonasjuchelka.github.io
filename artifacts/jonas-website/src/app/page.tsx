import Link from "next/link";
import { Eyebrow } from "@workspace/site-ui";
import { ProjectList } from "@/components/ProjectList";
import { getPosts, getProjects, formatDate } from "@/lib/content";
import { EMAIL, GITHUB, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Jonas Juchelka" }, description: SITE_DESCRIPTION, alternates: { canonical: SITE_URL } };

const fields = [
  { k: "Studium", v: "Management & Technology, Technische Universität München. Technische Vertiefung: Computer Engineering." },
  { k: "Ausland", v: "Studienaufenthalt an der UC Berkeley, Herbst 2026." },
  { k: "Praxis", v: "Erfahrung in der Beratung und bei comstruct, einem Construction-SaaS-Unternehmen." },
  { k: "Methoden", v: "Operations Research: lineare Optimierung, Simplex, Netzwerkflüsse, Gurobi." },
];

export default function Home() {
  const projects = getProjects();
  const posts = getPosts().slice(0, 3);
  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <Eyebrow>München / Berkeley</Eyebrow>
        <h1 id="hero-title" className="hero__title">
          Technologie, Unternehmertum und <span className="mark">Operations Research</span> zusammendenken.
        </h1>
        <p className="hero__intro">
          Ich bin Jonas Juchelka und studiere Management &amp; Technology an der TU München. Mich interessiert, wie sich
          Technologie, Unternehmertum und Operations Research verbinden lassen. Hier teile ich Projekte und Gedanken aus
          Studium und Praxis.
        </p>
        <div className="actions">
          <Link href="/projects/" className="btn btn--primary" data-testid="link-hero-projects">Projekte ansehen</Link>
          <a href={`mailto:${EMAIL}`} className="btn btn--ghost" data-testid="link-hero-mail">E-Mail schreiben</a>
        </div>
      </section>

      <section className="wrap facts" aria-labelledby="facts-title">
        <h2 id="facts-title" className="visually-hidden">Kurz gefasst</h2>
        <dl className="facts__grid">
          {fields.map((f) => (
            <div key={f.k} className="facts__row">
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wrap section" aria-labelledby="proj-title">
        <div className="section__head">
          <Eyebrow>Ausgewählt</Eyebrow>
          <h2 id="proj-title">Projekte</h2>
        </div>
        <ProjectList projects={projects} />
        <p className="more"><Link href="/projects/">Alle Projekte</Link></p>
      </section>

      <section className="band dark" aria-labelledby="or-title">
        <div className="wrap band__inner">
          <p className="band__eyebrow">Ein Schwerpunkt</p>
          <h2 id="or-title" className="band__title">max c<sup>T</sup>x &nbsp;unter&nbsp; Ax &le; b, x &ge; 0</h2>
          <p className="band__text">
            Lineare Optimierung ist für mich mehr als Prüfungsstoff: ein Werkzeug, um Entscheidungen unter Knappheit
            nachvollziehbar zu machen. Im Umfeld von Prof. Rainer Kolisch habe ich mich als wissenschaftliche Hilfskraft
            und OR-Tutor mit Simplex, Netzwerkflüssen und Gurobi beschäftigt.
          </p>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="blog-title">
        <div className="section__head">
          <Eyebrow>Notizen</Eyebrow>
          <h2 id="blog-title">Blog</h2>
        </div>
        {posts.length ? (
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}/`}>{p.title}</Link>
                <span className="meta-line"><time dateTime={p.date.toISOString()}>{formatDate(p.date)}</time></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-inline">
            Noch keine Artikel veröffentlicht. Erste Texte entstehen gerade; der <Link href="/feed.xml" prefetch={false}>RSS-Feed</Link> meldet sie, sobald sie erscheinen.
          </p>
        )}
      </section>

      <section className="wrap section contact-cta" aria-labelledby="contact-title">
        <h2 id="contact-title">Gespräch über ein Projekt, eine Idee oder ein Optimierungsproblem?</h2>
        <p className="contact-cta__links">
          <a href={`mailto:${EMAIL}`} className="big-link">{EMAIL}</a>
          <a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor">github.com/jonasjuchelka</a>
        </p>
      </section>
    </>
  );
}
