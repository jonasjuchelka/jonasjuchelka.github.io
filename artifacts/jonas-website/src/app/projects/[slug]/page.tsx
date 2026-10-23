import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow, Tag } from "@workspace/site-ui";
import { Markdown } from "@/components/Markdown";
import { getProject, getProjects } from "@/lib/content";
import { pageMeta } from "@/lib/meta";

export const dynamicParams = false;
export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug);
  return p ? pageMeta(p.title, p.summary, `/projects/${p.slug}/`) : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  return (
    <article className="wrap detail">
      <nav aria-label="Brotkrumen" className="crumbs"><Link href="/projects/">Projekte</Link> <span aria-hidden="true">/</span> <span aria-current="page">{p.title}</span></nav>
      <header className="detail__head">
        <Eyebrow>Projekt</Eyebrow>
        <h1>{p.title}</h1>
        <p className="lede">{p.summary}</p>
      </header>
      <div className="detail__grid">
        <aside className="detail__aside" aria-label="Projektangaben">
          <dl>
            {p.role ? (<><dt>Rolle</dt><dd>{p.role}</dd></>) : null}
            {p.context ? (<><dt>Rahmen</dt><dd>{p.context}</dd></>) : null}
            <dt>Themen</dt><dd className="tags">{p.tags.map((t) => <Tag key={t}>{t}</Tag>)}</dd>
          </dl>
        </aside>
        <Markdown source={p.body} />
      </div>
      <p className="more"><Link href="/projects/">Zurück zu allen Projekten</Link></p>
    </article>
  );
}
