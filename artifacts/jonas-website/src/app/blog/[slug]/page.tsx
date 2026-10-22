import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@workspace/site-ui";
import { Markdown } from "@/components/Markdown";
import { getPost, getPosts, formatDate } from "@/lib/content";
import { pageMeta } from "@/lib/meta";

export const dynamicParams = false;
export function generateStaticParams() {
  const posts = getPosts();
  // Next static export requires at least one param; this placeholder renders a 404 page only.
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_none" }];
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  return p ? pageMeta(p.title, p.summary, `/blog/${p.slug}/`, "article") : { robots: { index: false } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getPost((await params).slug);
  if (!p) notFound();
  return (
    <article className="wrap detail">
      <nav aria-label="Brotkrumen" className="crumbs"><Link href="/blog/">Blog</Link></nav>
      <header className="detail__head">
        <Eyebrow>Artikel</Eyebrow>
        <h1>{p.title}</h1>
        <p className="meta-line">
          <time dateTime={p.date.toISOString()}>{formatDate(p.date)}</time> &middot; {p.readingMinutes} Min. Lesezeit
        </p>
      </header>
      <div className="detail__grid">
        {p.headings.length > 1 ? (
          <nav className="detail__aside toc" aria-label="Inhalt">
            <p className="toc__title">Inhalt</p>
            <ol>{p.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        ) : <div />}
        <Markdown source={p.body} />
      </div>
    </article>
  );
}
