import { getPosts, getProjects } from "@/lib/content";
import { abs } from "@/lib/site";
import { availableLocales, localePath } from "@/lib/i18n";
export const dynamic = "force-static";
export function GET() {
  const base = ["/", "/projects/", "/blog/", "/kontakt/",
    ...getProjects().map((p) => `/projects/${p.slug}/`),
    ...getPosts().map((p) => `/blog/${p.slug}/`)];
  const locales = availableLocales();
  const entries = base.map((p) => {
    const alts = locales.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(localePath(l, p))}"/>`).join("\n");
    return locales.map((l) => `  <url>\n    <loc>${abs(localePath(l, p))}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(p)}"/>\n  </url>`).join("\n");
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
