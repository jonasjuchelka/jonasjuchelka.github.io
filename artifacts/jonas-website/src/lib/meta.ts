import type { Metadata } from "next";
import { SITE_NAME, abs } from "./site";

export function pageMeta(title: string, description: string, path: string, type: "website" | "article" = "website"): Metadata {
  return {
    title,
    description,
    alternates: { canonical: abs(path) },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: abs(path), siteName: SITE_NAME, locale: "de_DE", type },
    twitter: { card: "summary", title, description },
  };
}
