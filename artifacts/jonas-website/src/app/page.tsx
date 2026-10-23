import Link from "next/link";
import { Eyebrow } from "@workspace/site-ui";
import { ProjectList } from "@/components/ProjectList";
import { RecursionDiagram } from "@/components/RecursionDiagram";
import { getPosts, getProjects, formatDate } from "@/lib/content";
import { EMAIL, GITHUB, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Jonas Juchelka" }, description: SITE_DESCRIPTION, alternates: { canonical: SITE_URL } };

const spec = [
  { k: "Aktuell", v: "TRM in Keras nachgebaut" },
  { k: "Studium", v: "Management & Technology, TU München" },
  { k: "Vertiefung", v: "Computer Engineering" },
  { k: "Austausch", v: "UC Berkeley, 2026/27" },
];

export default function Home() {
  const projects = getProjects();
  const posts = getPosts().slice(0, 3);
  return (
    <>
      <section className="hero hero--split wrap" aria-labelledby="hero-title">
        <div className="hero__copy">
          <Eyebrow>München / Berkeley</Eyebrow>
          <h1 id="hero-title" className="hero__title">Kleine Netze. Rekursives Denken.</h1>
          <p className="hero__intro">Deep Learning mit wenigen Parametern: Ich baue Architekturen nach, die dasselbe Netz mehrfach anwenden.</p>
          <div className="actions">
            <Link href="/projects/trm-keras/" className="btn btn--primary" data-testid="link-hero-projects">TRM-Projekt</Link>
            <a href={`mailto:${EMAIL}`} className="btn btn--ghost" data-testid="link-hero-mail">E-Mail</a>
          </div>
          <dl className="spec">
            {spec.map((f) => (
              <div key={f.k} className="spec__row"><dt>{f.k}</dt><dd>{f.v}</dd></div>
            ))}
          </dl>
        </div>
        <figure className="hero__figure">
          <RecursionDiagram />
          <figcaption>Ein Netz, T-mal angewendet.</figcaption>
        </figure>
      </section>

      <section className="wrap section" aria-labelledby="proj-title">
        <div className="section__head">
          <Eyebrow>Arbeit</Eyebrow>
          <h2 id="proj-title">Projekte</h2>
        </div>
        <ProjectList projects={projects} />
      </section>

      {posts.length ? (
        <section className="wrap section" aria-labelledby="blog-title">
          <div className="section__head">
            <Eyebrow>Notizen</Eyebrow>
            <h2 id="blog-title">Blog</h2>
          </div>
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}/`}>{p.title}</Link>
                <span className="meta-line"><time dateTime={p.date.toISOString()}>{formatDate(p.date)}</time></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wrap section contact-cta" aria-labelledby="contact-title">
        <h2 id="contact-title" className="visually-hidden">Kontakt</h2>
        <p className="contact-cta__links">
          <a href={`mailto:${EMAIL}`} className="big-link">{EMAIL}</a>
          <a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor">github.com/jonasjuchelka</a>
        </p>
      </section>
    </>
  );
}
