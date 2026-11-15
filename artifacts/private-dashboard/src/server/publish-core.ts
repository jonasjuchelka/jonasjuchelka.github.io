// Prüfung und Aufbereitung eines Uploads. Reine Funktionen ohne Datenbank und Netz, damit sie getestet werden können.
// Alles, was vom Browser kommt, ist fremde Eingabe: nichts davon wird ungeprüft in Pfade oder Dateien geschrieben.
import { z } from "zod";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;       // Vercel Hobby nimmt rund 4,5 MB pro Anfrage
export const MAX_GEDANKE_CHARS = 2000;
export const EXTENSIONS = ["docx", "doc", "md"] as const;
export type Ext = (typeof EXTENSIONS)[number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
export const validSlug = (s: string) => SLUG_RE.test(s) && s.length <= 60;

export const metaSchema = z.object({
  kind: z.enum(["essay", "gedanke"]),
  title: z.string().trim().min(1, "Titel fehlt").max(160),
  topic: z.string().trim().max(40).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  summary: z.string().trim().max(300).default(""),
});
export type Meta = z.infer<typeof metaSchema>;

export class UploadError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Endung aus dem Dateinamen; Pfadteile im Namen werden verworfen, der Name selbst wird nie gespeichert. */
export function extOf(name: string): Ext {
  const e = name.split(".").pop()?.toLowerCase() ?? "";
  if (!(EXTENSIONS as readonly string[]).includes(e)) throw new UploadError(400, "Nur .docx, .doc und .md sind erlaubt.");
  return e as Ext;
}

/** Inhalt muss zur Endung passen (Magic Bytes), damit eine umbenannte Datei nicht durchrutscht. */
export function checkContent(ext: Ext, bytes: Uint8Array) {
  if (bytes.length === 0) throw new UploadError(400, "Die Datei ist leer.");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadError(413, "Die Datei ist größer als 4 MB.");
  const head = (...b: number[]) => b.every((v, i) => bytes[i] === v);
  if (ext === "docx" && !head(0x50, 0x4b, 0x03, 0x04)) throw new UploadError(400, "Das ist keine gültige .docx-Datei.");
  if (ext === "doc" && !head(0xd0, 0xcf, 0x11, 0xe0)) throw new UploadError(400, "Das ist keine gültige .doc-Datei.");
  if (ext === "md") {
    if (bytes.includes(0)) throw new UploadError(400, "Markdown muss reiner Text sein.");
    try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new UploadError(400, "Markdown muss UTF-8 sein."); }
  }
}

export function checkMeta(meta: Meta, ext: Ext, bytes: Uint8Array) {
  if (meta.kind === "gedanke") {
    if (ext !== "md") throw new UploadError(400, "Ein Gedanke ist reiner Text (.md).");
    if (new TextDecoder().decode(bytes).length > MAX_GEDANKE_CHARS) throw new UploadError(400, `Ein Gedanke darf höchstens ${MAX_GEDANKE_CHARS} Zeichen haben.`);
  }
}

export function metaJson(meta: Meta, slug: string, date: string) {
  return JSON.stringify({ ...meta, tags: meta.kind === "gedanke" ? [] : meta.tags, slug, date }, null, 2) + "\n";
}
