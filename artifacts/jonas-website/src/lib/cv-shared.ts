// Teil des Lebenslaufs, den auch Client-Komponenten brauchen (keine Dateizugriffe). Daten: src/lib/cv.ts.
import logoFit from "@/data/logos.json";

export type CvLink = { label: string; url: string };
export type CvPhoto = { file: string; alt: string; focus?: string };
export type CvEntry = {
  id: string;
  kind: "station" | "award";
  pinned?: boolean;
  now?: boolean;
  year: number;
  date: string;
  place?: string;
  loc?: string;
  tags: string[];
  title: string;
  org: string;
  why: string;
  text: string[];
  points: string[];
  photo?: CvPhoto;
  logo?: string;
  icon?: string;
  links: CvLink[];
};
export type CvPlace = { name: string; lat: number; lon: number; when: string; what: string; badge?: "home" | "now"; label?: "left" | "none" };
export type Cv = { places: Record<string, CvPlace>; entries: CvEntry[] };

/** Ein Ort mit Lage auf der Karte (Prozent der Kartenbreite und -höhe). */
export type MapPlace = CvPlace & { key: string; x: number; y: number; count: number };

/** Größe des Logos im Feld (Breite/Höhe in Prozent), damit alle Logos gleich schwer wirken. Siehe docs/style-guide.md. */
export function logoBox(file?: string): string | undefined {
  if (!file) return undefined;
  const f = (logoFit as Record<string, number[]>)[file];
  return f ? `${f[0]}% ${f[1]}%` : undefined;
}

export const MEDIA = "/media";
