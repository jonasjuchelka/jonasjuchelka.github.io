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
  /** "essay" (lang, eigene Seite, PDF) oder "gedanke" (kurz, ohne Seite). Gedanken liegen in content/gedanken. */
  kind: z.enum(["essay", "gedanke"]).default("essay"),
  topic: z.string().max(40).optional(),
  /** Optionales kleines Bild eines Essays, Pfad unter /public (z. B. /blog/mein-essay.jpg). */
  image: z.string().regex(/^\/[\w./-]+$/).optional(),
  /** Sprache des Originals (z. B. "en"). Fehlt sie, wird sie aus dem Text erkannt (detectLang). */
  lang: z.string().regex(/^[a-z]{2}$/).optional(),
});

export type Gedanke = { slug: string; date: Date; topic?: string; text: string };
export type Project = z.infer<typeof projectSchema> & { body: string };
export type Post = z.infer<typeof postSchema> & {
  body: string; readingMinutes: number; headings: { id: string; text: string }[];
  /** Sprache des Originals und ob diese Fassung eine Übersetzung davon ist. */
  original: string; translated: boolean;
};

function readFiles(full: string) {
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).map((file) => {
    const raw = fs.readFileSync(path.join(full, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) throw new Error(`Kein Frontmatter in ${file}`);
    return { file, data: parseYaml(m[1]) as unknown, content: m[2] };
  });
}

/** Files in content/<dir> are the source. content/<lang>/<dir>/<same file> overrides them per file; missing files fall back
 *  to the source. German can have overrides too: essays written in another language get a German translation in content/de/blog. */
function readDir(dir: string, lang: string = DEFAULT_LOCALE) {
  const base = readFiles(path.join(ROOT, dir));
  const over = new Map(readFiles(path.join(ROOT, lang, dir)).map((d) => [d.file, d]));
  return base.map((d) => ({ ...(over.get(d.file) ?? d), source: d, overridden: over.has(d.file) }));
}

/** Rough language guess for essays without `lang` in the frontmatter. Same rule as scripts/translate.mjs. */
export function detectLang(text: string): string {
  const words = text.toLowerCase().match(/[a-zäöüß']+/g) ?? [];
  const count = (list: string[]) => words.filter((w) => list.includes(w)).length;
  const de = count(["der", "die", "das", "und", "ist", "nicht", "ich", "ein", "eine", "mit", "auf", "für", "zu", "wir", "sich", "auch", "dass"]);
  const en = count(["the", "and", "is", "not", "i", "a", "an", "with", "on", "for", "to", "we", "it", "also", "that", "you", "of"]);
  return en > de ? "en" : "de";
}

/** Plain first sentences of a Markdown body, for posts whose summary only repeats the title. */
function firstSentences(body: string, max = 220): string {
  const para = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^(#|>|-|\*|\d+\.|---)/.test(p)) ?? "";
  const plain = para.replace(/\*\*|__|\*|_|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 60 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + " …";
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

function toPost(d: { file: string; data: unknown; content: string }, original: string, translated: boolean): Post {
  const meta = parse(postSchema, d.data, d.file);
  const words = d.content.trim().split(/\s+/).filter(Boolean).length;
  const headings = [...d.content.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ text: m[1].trim(), id: slugify(m[1]) }));
  // Eine Zusammenfassung, die nur den Titel wiederholt, ersetzen die ersten Sätze des Textes.
  const summary = meta.summary.trim().toLowerCase() === meta.title.trim().toLowerCase() ? firstSentences(d.content) || meta.summary : meta.summary;
  return { ...meta, summary, body: d.content, readingMinutes: Math.max(1, Math.round(words / 200)), headings, original, translated };
}

export function getPosts(lang: string = DEFAULT_LOCALE): Post[] {
  return readDir("blog", lang)
    .map((d) => {
      const src = parse(postSchema, d.source.data, d.source.file);
      const original = src.lang ?? detectLang(d.source.content);
      // Eine Übersetzung liegt vor, wenn die Seite nicht in der Originalsprache ist und eine eigene Fassung existiert.
      const translated = d.overridden && lang !== original;
      return toPost(translated ? d : d.source, original, translated);
    })
    .filter((p) => !p.draft && p.kind === "essay")
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Das Original eines Essays (content/blog), unabhängig von der Seitensprache. */
export function getOriginalPost(slug: string): Post | undefined {
  return readFiles(path.join(ROOT, "blog"))
    .map((d) => { const m = parse(postSchema, d.data, d.file); return toPost(d, m.lang ?? detectLang(d.content), false); })
    .find((p) => p.slug === slug && !p.draft && p.kind === "essay");
}
/** Gedanken: kurze Texte aus content/gedanken (Upload oder Mail). Kein eigener Seitenpfad. */
export function getGedanken(lang: string = DEFAULT_LOCALE): Gedanke[] {
  return readDir("gedanken", lang)
    .map((d) => {
      const meta = parse(postSchema.extend({ draft: z.boolean().default(false), summary: z.string().default("") }), d.data, d.file);
      // Der Mail-Worker maskiert "<" als "&lt;". React escaped selbst, also hier zurück.
      return { meta, text: d.content.trim().replace(/&lt;/g, "<") };
    })
    .filter((g) => !g.meta.draft && g.text.length > 0)
    .map((g) => ({ slug: g.meta.slug, date: g.meta.date, topic: g.meta.topic, text: g.text }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
export function getPost(slug: string, lang: string = DEFAULT_LOCALE) {
  return getPosts(lang).find((p) => p.slug === slug);
}

/** Blog-Datum: nur Monat und Jahr (Wunsch: keine Tage). */
export const formatDate = (d: Date, lang: string = DEFAULT_LOCALE) => {
  const tag = (LANGUAGES[lang]?.og ?? "de_DE").replace("_", "-");
  try {
    return new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
};

/** Kurzform für das Handy, ebenfalls ohne Tag, z. B. „Nov. 26“. */
export const formatMonthShort = (d: Date, lang: string = DEFAULT_LOCALE) => {
  const tag = (LANGUAGES[lang]?.og ?? "de_DE").replace("_", "-");
  try {
    return new Intl.DateTimeFormat(tag, { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
  }
};
