import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { PageHead } from "@/components/PageHead";
import { BlogIndex, type BlogItem, type BlogLabels } from "@/components/BlogIndex";
import { OriginalToggle } from "@/components/OriginalToggle";
import { getGedanken, getOriginalPost, getPost, getPosts, formatDate, formatMonthShort, type Post } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { LANGUAGES, fill, getDict, localePath } from "@/lib/i18n";

export const blogMeta = (lang: string) => pageMeta(lang, getDict(lang).blog.metaTitle, getDict(lang).blog.metaDesc, "/blog/");

/** TT.MM.JJ, für die schmale Ansicht. */
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function BlogView({ lang }: { lang: string }) {
  const d = getDict(lang);
  const t = d.blog;
  const posts = getPosts(lang);
  const gedanken = getGedanken(lang);
  if (posts.length === 0 && gedanken.length === 0) {
    return (
      <>
        <PageHead eyebrow={t.eyebrow} title={t.title} />
        <div className="wrap section section--tight">
          <div className="empty">
            <p className="empty__mark" aria-hidden="true">0</p>
            <div>
              <h2>{t.emptyTitle}</h2>
              <p>{t.emptyBefore} <Link href="/feed.xml" prefetch={false}>{t.emptyLink}</Link>{t.emptyAfter}</p>
            </div>
          </div>
        </div>
      </>
    );
  }
  const items: BlogItem[] = [
    ...posts.map((p): BlogItem => ({
      kind: "e", id: p.slug, href: localePath(lang, `/blog/${p.slug}/`), title: p.title, text: p.summary,
      date: isoDay(p.date), long: formatDate(p.date, lang), short: formatMonthShort(p.date, lang), topic: p.topic, tags: p.tags, minutes: p.readingMinutes, image: p.image,
    })),
    ...gedanken.map((g): BlogItem => ({
      kind: "g", id: `g-${g.slug}`, text: g.text, date: isoDay(g.date), long: formatDate(g.date, lang), short: formatMonthShort(g.date, lang), topic: g.topic, tags: [],
    })),
  ];
  const labels: BlogLabels = { ...t, readLong: d.ui.readingTime, readShort: t.readShort };
  return <BlogIndex items={items} t={labels} />;
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
  const all = getPosts(lang);
  const i = all.findIndex((x) => x.slug === p.slug);
  const next = all.length > 1 ? all[(i + 1) % all.length] : null;
  // PDF nur anbieten, wenn der Workflow es erzeugt hat.
  const hasPdf = fs.existsSync(path.join(process.cwd(), "public", "blog", `${p.slug}.pdf`));
  // Übersetzter Essay: Original zusätzlich ausliefern, ein Button schaltet um.
  const orig = p.translated ? getOriginalPost(p.slug) : undefined;
  const version = (x: Post) => (
    <>
      <header>
        <div className="ameta">
          {x.topic ? <span className="cat">{x.topic}</span> : null}
          <time dateTime={x.date.toISOString()}>{formatDate(x.date, lang)}</time> &middot; {fill(d.ui.readingTime, { n: x.readingMinutes })}
        </div>
        <h1>{x.title}</h1>
        <p className="ede">{x.summary}</p>
      </header>
      {x.image ? <figure className="ahero"><img src={x.image} alt="" /></figure> : null}
      <div className="abody"><Markdown source={x.body} /></div>
    </>
  );
  return (
    <article className="article">
      <div className="abar">
        <Link className="aback" href={localePath(lang, "/blog/")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.8 4l-4 4 4 4" /></svg>
          {d.blog.back}
        </Link>
        {hasPdf ? <a className="apdf" href={`/blog/${p.slug}.pdf`} download>{d.blog.pdf}</a> : null}
      </div>
      {orig ? (
        <>
          <OriginalToggle note={fill(d.blog.translatedNote, { lang: LANGUAGES[orig.original]?.name ?? orig.original })}
            showOriginal={d.blog.readOriginal} showTranslation={d.blog.readTranslation} />
          <div data-v="tr">{version(p)}</div>
          <div data-v="orig" lang={orig.original} hidden>{version(orig)}</div>
        </>
      ) : version(p)}
      <footer className="afoot">
        {p.tags.length ? <div className="tags">{p.tags.map((x) => <span className="tag" key={x}>{x}</span>)}</div> : null}
        {next ? (
          <Link className="anext" href={localePath(lang, `/blog/${next.slug}/`)}>
            <span className="lbl">{d.blog.next}</span>
            <span className="nt">{next.title}</span>
            <span className="nm">{fill(d.ui.readingTime, { n: next.readingMinutes })}</span>
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
