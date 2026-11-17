// Lebenslauf (Projekte-Seite, Karte, PDF). Quelle: content/cv.json (Deutsch). Übersetzungen liegen in
// content/<lang>/cv.json mit derselben Form; fehlt eine oder passt sie nicht, gilt die deutsche Fassung.
// Gepflegt wird die Datei im privaten Bereich (Stationen) oder direkt im Repo.
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE } from "@/i18n/config";

import type { Cv, CvPlace, MapPlace } from "./cv-shared";
export * from "./cv-shared";

const CONTENT = path.join(process.cwd(), "content");
const cache = new Map<string, Cv>();

function sameShape(a: unknown, b: unknown): boolean {
  if (typeof a === "string") return typeof b === "string" && b.trim().length > 0;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameShape(v, b[i]));
  if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return false;
    const ka = Object.keys(a).sort().join(), kb = Object.keys(b).sort().join();
    return ka === kb && Object.keys(a).every((k) => sameShape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return typeof a === typeof b;
}

function read(file: string): Cv | null {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as Cv; } catch { return null; }
}

/** Lebenslauf in der gewünschten Sprache. Stationen sind nach Jahr absteigend sortiert, sonst in Dateireihenfolge. */
export function getCv(lang: string = DEFAULT_LOCALE): Cv {
  const hit = cache.get(lang);
  if (hit) return hit;
  const base = read(path.join(CONTENT, "cv.json"));
  if (!base) throw new Error("content/cv.json fehlt oder ist ungültig");
  let cv = base;
  if (lang !== DEFAULT_LOCALE) {
    const tr = read(path.join(CONTENT, lang, "cv.json"));
    // Übersetzung nur übernehmen, wenn sie zur aktuellen deutschen Fassung passt (gleiche Stationen, gleiche Form).
    if (tr && sameShape(base, tr)) cv = tr;
  }
  const order = new Map(cv.entries.map((e, i) => [e.id, i]));
  const entries = [...cv.entries].sort((a, b) => b.year - a.year || (order.get(a.id)! - order.get(b.id)!));
  const out = { places: cv.places, entries };
  cache.set(lang, out);
  return out;
}

// Winkel-Tripel-Projektion, gleiche Formel wie beim Erzeugen der Karte (public/media/welt.svg, viewBox 0 0 1000 611).
const C1 = 2 / Math.PI;
function wt(lon: number, lat: number): [number, number] {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180;
  const a = Math.acos(Math.max(-1, Math.min(1, Math.cos(p) * Math.cos(l / 2))));
  const s = a > 1e-9 ? Math.sin(a) / a : 1;
  return [0.5 * (l * C1 + (2 * Math.cos(p) * Math.sin(l / 2)) / s), 0.5 * (p + Math.sin(p) / s)];
}
const XM = wt(180, 0)[0], YM = wt(0, 90)[1];
export function project(lat: number, lon: number) {
  const [x, y] = wt(lon, lat);
  return { x: Math.round(((x + XM) / (2 * XM)) * 10000) / 100, y: Math.round(((YM - y) / (2 * YM)) * 10000) / 100 };
}

export function mapPlaces(cv: Cv): MapPlace[] {
  return Object.entries(cv.places).map(([key, p]) => ({ ...p, key, ...project(p.lat, p.lon), count: cv.entries.filter((e) => e.loc === key).length }));
}

