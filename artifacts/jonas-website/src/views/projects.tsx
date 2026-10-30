import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow, Tag } from "@workspace/site-ui";
import { Markdown } from "@/components/Markdown";
import { PageHead } from "@/components/PageHead";
import { ProjectList } from "@/components/ProjectList";
import { getProject, getProjects } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { getDict, localePath } from "@/lib/i18n";

export const projectsMeta = (lang: string) => pageMeta(lang, getDict(lang).projects.metaTitle, getDict(lang).projects.metaDesc, "/projects/");

export function ProjectsView({ lang }: { lang: string }) {
  const t = getDict(lang).projects;
  return (
    <>
      <PageHead eyebrow={t.eyebrow} title={t.title}><p>{t.lede}</p></PageHead>
      <div className="wrap section section--tight">
        <ProjectList projects={getProjects(lang)} lang={lang} />
      </div>
    </>
  );
}

export const projectSlugs = () => getProjects().map((p) => ({ slug: p.slug }));

export function projectMeta(lang: string, slug: string) {
  const p = getProject(slug, lang);
  return p ? pageMeta(lang, p.title, p.summary, `/projects/${p.slug}/`) : {};
}

export function ProjectView({ lang, slug }: { lang: string; slug: string }) {
  const d = getDict(lang);
  const t = d.projects;
  const p = getProject(slug, lang);
  if (!p) notFound();
  return (
    <article className="wrap detail">
      <nav aria-label={d.ui.crumbsAria} className="crumbs"><Link href={localePath(lang, "/projects/")}>{t.title}</Link> <span aria-hidden="true">/</span> <span aria-current="page">{p.title}</span></nav>
      <header className="detail__head">
        <Eyebrow>{t.detailEyebrow}</Eyebrow>
        <h1>{p.title}</h1>
        <p className="lede">{p.summary}</p>
      </header>
      <div className="detail__grid">
        <aside className="detail__aside" aria-label={t.asideAria}>
          <dl>
            {p.role ? (<><dt>{t.role}</dt><dd>{p.role}</dd></>) : null}
            {p.context ? (<><dt>{t.context}</dt><dd>{p.context}</dd></>) : null}
            <dt>{t.topics}</dt><dd className="tags">{p.tags.map((x) => <Tag key={x}>{x}</Tag>)}</dd>
          </dl>
        </aside>
        <Markdown source={p.body} />
      </div>
      <p className="more"><Link href={localePath(lang, "/projects/")}>{t.back}</Link></p>
    </article>
  );
}
