import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { DEFAULT_LOCALE, LANGUAGES } from "@/i18n/config";

const ROOT = path.join(process.cwd(), "content");
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const projectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(slugRe),
  summary: z.string().min(1),
  role: z.string().optional(),
  context: z.string().optional(),
  tags: z.array(z.string()).default([]),
  order: z.number().int().default(99),
  published: z.boolean(),
});

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(slugRe),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(true),
});

export type Project = z.infer<typeof projectSchema> & { body: string };
export type Post = z.infer<typeof postSchema> & { body: string; readingMinutes: number; headings: { id: string; text: string }[] };

function readFiles(full: string) {
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).map((file) => {
    const raw = fs.readFileSync(path.join(full, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`Kein Frontmatter in ${file}`);
    return { file, data: parseYaml(m[1]) as unknown, content: m[2] };
  });
}

/** German files are the source. content/<lang>/<dir>/<same file> overrides them per file; missing files fall back to German. */
function readDir(dir: string, lang: string = DEFAULT_LOCALE) {
  const base = readFiles(path.join(ROOT, dir));
  if (lang === DEFAULT_LOCALE) return base;
  const over = new Map(readFiles(path.join(ROOT, lang, dir)).map((d) => [d.file, d]));
  return base.map((d) => over.get(d.file) ?? d);
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown, file: string): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error(`Ungültiges Frontmatter in ${file}: ${r.error.message}`);
  return r.data;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getProjects(lang: string = DEFAULT_LOCALE): Project[] {
  return readDir("projects", lang)
    .map((d) => ({ ...parse(projectSchema, d.data, d.file), body: d.content }))
    .filter((p) => p.published)
    .sort((a, b) => a.order - b.order);
}
export function getProject(slug: string, lang: string = DEFAULT_LOCALE) {
  return getProjects(lang).find((p) => p.slug === slug);
}

export function getPosts(lang: string = DEFAULT_LOCALE): Post[] {
  return readDir("blog", lang)
    .map((d) => {
      const meta = parse(postSchema, d.data, d.file);
      const words = d.content.trim().split(/\s+/).filter(Boolean).length;
      const headings = [...d.content.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ text: m[1].trim(), id: slugify(m[1]) }));
      return { ...meta, body: d.content, readingMinutes: Math.max(1, Math.round(words / 200)), headings };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
export function getPost(slug: string, lang: string = DEFAULT_LOCALE) {
  return getPosts(lang).find((p) => p.slug === slug);
}

export const formatDate = (d: Date, lang: string = DEFAULT_LOCALE) => {
  const tag = (LANGUAGES[lang]?.og ?? "de_DE").replace("_", "-");
  try {
    return new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
};
