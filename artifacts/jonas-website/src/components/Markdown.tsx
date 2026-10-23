import ReactMarkdown, { type Components } from "react-markdown";
import { slugify } from "@/lib/content";
import type { ReactNode } from "react";

function text(n: ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(text).join("");
  if (n && typeof n === "object" && "props" in n) return text((n as { props: { children?: ReactNode } }).props.children);
  return "";
}

const safeUrl = (url: string) => (/^(https:|mailto:|\/|#)/i.test(url) ? url : "");

const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h2 id={slugify(text(children))}>{children}</h2>,
  a: ({ href, children }) => {
    const ext = href?.startsWith("https:");
    return <a href={href} {...(ext ? { rel: "noopener noreferrer" } : {})}>{children}</a>;
  },
  img: ({ src, alt }) => (typeof src === "string" && src.startsWith("/") ? <img src={src} alt={alt ?? ""} loading="lazy" /> : null),
};

/** Safe rendering: react-markdown never renders raw HTML (no rehype-raw), URLs are filtered. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown components={components} skipHtml urlTransform={safeUrl}>{source}</ReactMarkdown>
    </div>
  );
}
