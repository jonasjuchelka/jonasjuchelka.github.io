import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

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

function readDir(dir: string) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).map((file) => {
    const raw = fs.readFileSync(path.join(full, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`Kein Frontmatter in ${file}`);
    return { file, data: parseYaml(m[1]) as unknown, content: m[2] };
  });
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

export function getProjects(): Project[] {
  return readDir("projects")
    .map((d) => ({ ...parse(projectSchema, d.data, d.file), body: d.content }))
    .filter((p) => p.published)
    .sort((a, b) => a.order - b.order);
}
export function getProject(slug: string) {
  return getProjects().find((p) => p.slug === slug);
}

export function getPosts(): Post[] {
  return readDir("blog")
    .map((d) => {
      const meta = parse(postSchema, d.data, d.file);
      const words = d.content.trim().split(/\s+/).filter(Boolean).length;
      const headings = [...d.content.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ text: m[1].trim(), id: slugify(m[1]) }));
      return { ...meta, body: d.content, readingMinutes: Math.max(1, Math.round(words / 200)), headings };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
export function getPost(slug: string) {
  return getPosts().find((p) => p.slug === slug);
}

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
