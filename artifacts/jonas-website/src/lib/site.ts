import { DEFAULT_LOCALE } from "@/i18n/config";
export const SITE_URL = "https://jonasjuchelka.github.io/";
export const SITE_NAME = "Jonas Juchelka";
// German source text, kept for the feed and root metadata. Other languages use meta.description from their dictionary.
export const SITE_DESCRIPTION =
  "Jonas Juchelka studiert Management & Technology an der TU München. Schwerpunkt Deep Learning: rekursives Schließen mit kleinen Netzen, effiziente Modelle, Projekte und Gedanken.";
export const EMAIL = "jonas.juchelka@gmail.com";
export const GITHUB = "https://github.com/jonasjuchelka";

export function abs(path: string) {
  return new URL(path.replace(/^\//, ""), SITE_URL).toString();
}

/** Only an https origin is accepted. Anything else means "not configured". */
export function privateAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_PRIVATE_APP_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Optional HTTPS endpoint of the live-translation proxy. Unset means the live option is hidden. */
export function translateEndpoint(): string | null {
  const raw = process.env.NEXT_PUBLIC_TRANSLATE_ENDPOINT?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export const NAV_PATHS = [
  { href: "/projects/", key: "projects" },
  { href: "/blog/", key: "blog" },
  { href: "/kontakt/", key: "contact" },
  { href: "/login/", key: "private" },
] as const;
export { DEFAULT_LOCALE };
