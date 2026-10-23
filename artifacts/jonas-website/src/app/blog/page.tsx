import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { getPosts, formatDate } from "@/lib/content";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("Blog", "Artikel und Notizen von Jonas Juchelka.", "/blog/");

export default function Blog() {
  const posts = getPosts();
  return (
    <>
      <PageHead eyebrow="Notizen" title="Blog" />
      <div className="wrap section section--tight">
        {posts.length === 0 ? (
          <div className="empty">
            <p className="empty__mark" aria-hidden="true">0</p>
            <div>
              <h2>Noch nichts veröffentlicht.</h2>
              <p>
                Hier erscheinen Texte aus Studium und Praxis, sobald sie fertig sind, nicht früher. Wer nichts verpassen
                will, abonniert den <Link href="/feed.xml" prefetch={false}>RSS-Feed</Link>.
              </p>
            </div>
          </div>
        ) : (
          <ul className="post-list post-list--full">
            {posts.map((p) => (
              <li key={p.slug}>
                <time dateTime={p.date.toISOString()} className="meta-line">{formatDate(p.date)} &middot; {p.readingMinutes} Min. Lesezeit</time>
                <h2><Link href={`/blog/${p.slug}/`}>{p.title}</Link></h2>
                <p>{p.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
