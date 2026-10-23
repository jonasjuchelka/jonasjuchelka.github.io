import { getPosts, getProjects } from "@/lib/content";
import { abs } from "@/lib/site";
export const dynamic = "force-static";
export function GET() {
  const paths = ["/", "/projects/", "/blog/", "/kontakt/",
    ...getProjects().map((p) => `/projects/${p.slug}/`),
    ...getPosts().map((p) => `/blog/${p.slug}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${abs(p)}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
