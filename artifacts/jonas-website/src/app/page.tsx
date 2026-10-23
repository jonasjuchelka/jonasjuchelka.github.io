import Link from "next/link";
import { Eyebrow } from "@workspace/site-ui";
import { ProjectList } from "@/components/ProjectList";
import { getPosts, getProjects, formatDate } from "@/lib/content";
import { EMAIL, GITHUB, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { absolute: "Jonas Juchelka" }, description: SITE_DESCRIPTION, alternates: { canonical: SITE_URL } };

const fields = [
  { k: "Fokus", v: "Deep Learning: wie Netze aufgebaut sind, warum Rekursion mit wenigen Parametern funktioniert und wie sich KI effizienter machen lässt." },
  { k: "Interessen", v: "Struktur tiefer Schichten, Wiederverwendung von Gewichten durch Rekursion, die Mathematik der Gewichtsmatrizen und die Frage, welche Daten Modelle besser machen." },
  { k: "Aktuell", v: "Reimplementierung des Papers „Less is More: Recursive Reasoning with Tiny Networks“ (TRM) in Keras." },
  { k: "Studium", v: "Management & Technology, Technische Universität München. Technische Vertiefung: Computer Engineering. Austausch an der UC Berkeley." },
  { k: "Lehre", v: "Tutor für Operations Research bei Prof. Rainer Kolisch (TUM): lineare Optimierung, Simplex, Netzwerkflüsse." },
];

export default function Home() {
  const projects = getProjects();
  const posts = getPosts().slice(0, 3);
  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <Eyebrow>München / Berkeley</Eyebrow>
        <h1 id="hero-title" className="hero__title">
          Kleine Netze, rekursives Denken: <span className="mark">Deep Learning</span> effizienter machen.
        </h1>
        <p className="hero__intro">
          Ich bin Jonas Juchelka und studiere Management &amp; Technology mit Vertiefung Computer Engineering an der
          TU München, aktuell als Austauschstudent an der UC Berkeley. Mich interessiert, wie tiefe Netze aufgebaut sind,
          wie man mit Rekursion und wenigen Parametern weit kommt und welche Daten KI besser machen. Hier zeige ich,
          woran ich arbeite.
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

      <section className="band dark" aria-labelledby="dl-title">
        <div className="wrap band__inner">
          <p className="band__eyebrow">Ein Schwerpunkt</p>
          <h2 id="dl-title" className="band__title">h<sub>t+1</sub> = f(h<sub>t</sub>, x)</h2>
          <p className="band__text">
            Dieselben Schichten immer wieder anwenden, statt immer größere Netze zu bauen: Dieser Gedanke aus der Arbeit
            zu rekursivem Schließen mit kleinen Netzen fasziniert mich. Mich beschäftigen die Struktur tiefer Schichten,
            die Mathematik der Gewichtsmatrizen und die Frage, welche Daten Modelle wirklich besser machen. Dazu kommt ein
            solides Fundament aus Optimierung, das ich als OR-Tutor bei Prof. Rainer Kolisch festige.
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
        <h2 id="contact-title">Gespräch über Deep Learning, eine Forschungsidee oder eine mögliche Zusammenarbeit?</h2>
        <p className="contact-cta__links">
          <a href={`mailto:${EMAIL}`} className="big-link">{EMAIL}</a>
          <a href={GITHUB} rel="me noopener noreferrer" className="big-link big-link--minor">github.com/jonasjuchelka</a>
        </p>
      </section>
    </>
  );
}
