import { DEFAULT_LOCALE } from "@/i18n/config";
export const SITE_URL = "https://jonasjuchelka.github.io/";
export const SITE_NAME = "Jonas Juchelka";
// German source text, kept for the feed and root metadata. Other languages use meta.description from their dictionary.
export const SITE_DESCRIPTION =
  "Jonas Juchelka studiert Management & Technology an der TU München und gründet. Projekte, Lebenslauf und Gedanken.";
export const EMAIL = "jonas.juchelka@gmail.com";
export const GITHUB = "https://github.com/jonasjuchelka";
export const LINKEDIN = "https://www.linkedin.com/in/jonasjuchelka/";
export const BOOKING = "https://app.reclaim.ai/m/jonasjuchelka/callwithjj";

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
  { href: "/", key: "home" },
  { href: "/projects/", key: "projects" },
  { href: "/blog/", key: "blog" },
  { href: "/kontakt/", key: "contact" },
  { href: "/login/", key: "private" },
] as const;
export { DEFAULT_LOCALE };
