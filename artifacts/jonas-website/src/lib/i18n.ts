import fs from "node:fs";
import path from "node:path";
import de from "@/i18n/dictionaries/de.json";
import { DEFAULT_LOCALE, LANGUAGES } from "@/i18n/config";

export type Dict = typeof de;
export { DEFAULT_LOCALE, LANGUAGES };
export { localePath, stripLocale } from "@/i18n/config";

const DICT_DIR = path.join(process.cwd(), "src", "i18n", "dictionaries");

let cache: string[] | null = null;
/** German plus every language with a dictionary file. Order follows the language catalogue. */
export function availableLocales(): string[] {
  if (!cache) {
    const files = new Set(fs.readdirSync(DICT_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
    cache = Object.keys(LANGUAGES).filter((c) => c === DEFAULT_LOCALE || files.has(c));
  }
  return cache;
}
export const nonDefaultLocales = () => availableLocales().filter((c) => c !== DEFAULT_LOCALE);
export const isRtl = (lang: string) => Boolean(LANGUAGES[lang]?.rtl);

function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(over) && over.length === base.length ? over : base) as T;
  if (base && typeof base === "object") {
    const o = (over && typeof over === "object" ? over : {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(base as Record<string, unknown>).map(([k, v]) => [k, merge(v, o[k])])) as T;
  }
  return (typeof over === typeof base ? over : base) as T;
}

const dicts = new Map<string, Dict>();
/** Missing or malformed keys fall back to German, so a partial translation never breaks the build. */
export function getDict(lang: string): Dict {
  let d = dicts.get(lang);
  if (!d) {
    d = lang === DEFAULT_LOCALE ? de : merge(de, JSON.parse(fs.readFileSync(path.join(DICT_DIR, `${lang}.json`), "utf8")));
    dicts.set(lang, d);
  }
  return d;
}

export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
