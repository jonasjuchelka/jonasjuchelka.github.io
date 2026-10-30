import type { Metadata } from "next";
import { SITE_NAME, abs } from "./site";
import { DEFAULT_LOCALE, LANGUAGES, availableLocales, localePath } from "./i18n";

export function pageMeta(lang: string, title: string, description: string, path: string, type: "website" | "article" = "website"): Metadata {
  const url = abs(localePath(lang, path));
  const languages: Record<string, string> = Object.fromEntries(availableLocales().map((c) => [c, abs(localePath(c, path))]));
  languages["x-default"] = abs(localePath(DEFAULT_LOCALE, path));
  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: LANGUAGES[lang]?.og ?? "de_DE", type },
    twitter: { card: "summary", title, description },
  };
}
