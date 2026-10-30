import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@workspace/site-ui";
import { Markdown } from "@/components/Markdown";
import { PageHead } from "@/components/PageHead";
import { getPost, getPosts, formatDate } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { fill, getDict, localePath } from "@/lib/i18n";

export const blogMeta = (lang: string) => pageMeta(lang, getDict(lang).blog.metaTitle, getDict(lang).blog.metaDesc, "/blog/");

export function BlogView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.blog;
  const posts = getPosts(lang);
  return (
    <>
      <PageHead eyebrow={t.eyebrow} title={t.title} />
      <div className="wrap section section--tight">
        {posts.length === 0 ? (
          <div className="empty">
            <p className="empty__mark" aria-hidden="true">0</p>
            <div>
              <h2>{t.emptyTitle}</h2>
              <p>{t.emptyBefore} <Link href="/feed.xml" prefetch={false}>{t.emptyLink}</Link>{t.emptyAfter}</p>
            </div>
          </div>
        ) : (
          <ul className="post-list post-list--full">
            {posts.map((p) => (
              <li key={p.slug}>
                <time dateTime={p.date.toISOString()} className="meta-line">{formatDate(p.date, lang)} &middot; {fill(d.ui.readingTime, { n: p.readingMinutes })}</time>
                <h2><Link href={localePath(lang, `/blog/${p.slug}/`)}>{p.title}</Link></h2>
                <p>{p.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// Next static export requires at least one param; the placeholder only renders a 404 page.
export const postSlugs = () => {
  const posts = getPosts();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: "_none" }];
};

export function postMeta(lang: string, slug: string) {
  const p = getPost(slug, lang);
  return p ? pageMeta(lang, p.title, p.summary, `/blog/${p.slug}/`, "article") : { robots: { index: false } };
}

export function PostView({ lang, slug }: { lang: string; slug: string }) {
  const d = getDict(lang);
  const p = getPost(slug, lang);
  if (!p) notFound();
  return (
    <article className="wrap detail">
      <nav aria-label={d.ui.crumbsAria} className="crumbs"><Link href={localePath(lang, "/blog/")}>{d.blog.title}</Link></nav>
      <header className="detail__head">
        <Eyebrow>{d.blog.articleEyebrow}</Eyebrow>
        <h1>{p.title}</h1>
        <p className="meta-line">
          <time dateTime={p.date.toISOString()}>{formatDate(p.date, lang)}</time> &middot; {fill(d.ui.readingTime, { n: p.readingMinutes })}
        </p>
      </header>
      <div className="detail__grid">
        {p.headings.length > 1 ? (
          <nav className="detail__aside toc" aria-label={d.blog.toc}>
            <p className="toc__title">{d.blog.toc}</p>
            <ol>{p.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol>
          </nav>
        ) : <div />}
        <Markdown source={p.body} />
      </div>
    </article>
  );
}
