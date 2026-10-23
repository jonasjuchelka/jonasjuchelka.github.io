export const SITE_URL = "https://jonasjuchelka.github.io/";
export const SITE_NAME = "Jonas Juchelka";
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

export const NAV = [
  { href: "/projects/", label: "Projekte" },
  { href: "/blog/", label: "Blog" },
  { href: "/kontakt/", label: "Kontakt" },
  { href: "/login/", label: "Privater Bereich" },
];
