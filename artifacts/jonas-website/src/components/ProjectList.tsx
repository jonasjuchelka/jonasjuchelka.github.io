import Link from "next/link";
import { Tag } from "@workspace/site-ui";
import type { Project } from "@/lib/content";

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ol className="index-list">
      {projects.map((p, i) => (
        <li key={p.slug} className="index-item">
          <span className="index-item__no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          <div className="index-item__main">
            <h3><Link href={`/projects/${p.slug}/`} className="stretched" data-testid={`link-project-${p.slug}`}>{p.title}</Link></h3>
            <p>{p.summary}</p>
          </div>
          <div className="index-item__meta">
            {p.role ? <span className="meta-line">{p.role}</span> : null}
            <span className="tags">{p.tags.map((t) => <Tag key={t}>{t}</Tag>)}</span>
          </div>
          <span className="index-item__arrow" aria-hidden="true">&rarr;</span>
        </li>
      ))}
    </ol>
  );
}
