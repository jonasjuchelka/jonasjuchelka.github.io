import "server-only";
import { z } from "zod";
import { currentSession } from "./auth";
import { AccessError } from "./policy";
import { query } from "./db";

// Lebenslauf der öffentlichen Seite (Projekte, Karte, PDF). Liegt als JSON im Repo; Speichern = ein Commit auf main,
// danach baut GitHub Pages die Seite und das PDF neu. Token wie beim Veröffentlichen (nur dieses Repo, Contents: Read & write).
const FILE = "artifacts/jonas-website/content/cv.json";
const repo = () => process.env.GITHUB_REPO ?? "jonasjuchelka/jonasjuchelka.github.io";
function token() { const t = process.env.GITHUB_TOKEN; if (!t) throw new AccessError(503, "GitHub-Zugang ist noch nicht eingerichtet."); return t; }
const gh = (init: RequestInit = {}, ref = "") => fetch(`https://api.github.com/repos/${repo()}/contents/${FILE}${ref}`, {
  ...init, cache: "no-store",
  headers: { authorization: `Bearer ${token()}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "jj-private-area", ...(init.headers ?? {}) },
});

const text = (max: number) => z.string().trim().min(1).max(max);
const opt = (max: number) => z.string().trim().max(max).optional();
const file = z.string().regex(/^[a-z0-9][a-z0-9-]*\.(svg|png|jpg)$/, "Dateiname nur mit Kleinbuchstaben, Zahlen und Bindestrich.").optional();
const entry = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/, "ID nur mit Kleinbuchstaben, Zahlen und Bindestrich."),
  kind: z.enum(["station", "award"]),
  pinned: z.boolean().optional(),
  now: z.boolean().optional(),
  year: z.number().int().min(1990).max(2100),
  date: text(60),
  place: opt(80),
  loc: opt(40),
  tags: z.array(text(30)).max(6),
  title: text(120),
  org: z.string().trim().max(160),
  why: text(300),
  text: z.array(text(1200)).max(6),
  points: z.array(text(300)).max(10),
  photo: z.object({ file: z.string().regex(/^[a-z0-9][a-z0-9-]*\.(jpg|png)$/), alt: text(160), focus: opt(20) }).optional(),
  logo: file,
  icon: opt(20),
  links: z.array(z.object({ label: text(80), url: z.string().regex(/^https:\/\/[^\s"<>]+$/, "Links müssen mit https:// beginnen.") })).max(6),
  // Eigene Formulierung für das PDF (scripts/cv-pdf.mjs). Ohne diesen Eintrag würde Speichern ihn verwerfen.
  cv: z.object({
    title: opt(120), org: opt(160),
    points: z.array(text(300)).max(8).optional(), extra: z.array(text(300)).max(6).optional(),
    link: z.number().int().min(0).max(5).optional(), optional: z.boolean().optional(), hide: z.boolean().optional(),
  }).optional(),
});
const place = z.object({
  name: text(40), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), when: text(60), what: text(160),
  badge: z.enum(["home", "now"]).optional(), label: z.enum(["left", "none"]).optional(),
});
export const cvSchema = z.object({ places: z.record(z.string().regex(/^[a-z0-9]{2,30}$/), place), entries: z.array(entry).min(1).max(80) })
  .refine((c) => new Set(c.entries.map((e) => e.id)).size === c.entries.length, "Jede ID darf nur einmal vorkommen.")
  .refine((c) => c.entries.every((e) => !e.loc || e.loc in c.places), "Ein Kartenort existiert nicht.");
export type CvFile = z.infer<typeof cvSchema>;

export async function getCvFile() {
  await currentSession(false, true);
  const r = await gh({}, "?ref=main");
  if (r.status === 404) throw new AccessError(404, "Der Lebenslauf liegt noch nicht im Repo.");
  if (!r.ok) throw new AccessError(502, "GitHub antwortet nicht wie erwartet.");
  const j = (await r.json()) as { content: string; sha: string };
  const cv = JSON.parse(Buffer.from(j.content, "base64").toString("utf8")) as unknown;
  return { cv, sha: j.sha };
}

/** Nur Administratoren mit frischer Passkey-Bestätigung. sha verhindert, dass parallele Änderungen überschrieben werden. */
export async function saveCvFile(body: unknown) {
  const s = await currentSession(true, true);
  const b = (body ?? {}) as { cv?: unknown; sha?: unknown };
  if (typeof b.sha !== "string" || !/^[0-9a-f]{40}$/.test(b.sha)) throw new AccessError(400, "Versionsangabe fehlt. Bitte neu laden.");
  const parsed = cvSchema.safeParse(b.cv);
  if (!parsed.success) throw new AccessError(400, parsed.error.issues[0]?.message ?? "Angaben ungültig.");
  const content = Buffer.from(JSON.stringify(parsed.data, null, 2) + "\n", "utf8").toString("base64");
  const r = await gh({ method: "PUT", body: JSON.stringify({ message: "Lebenslauf aktualisiert (privater Bereich)", content, sha: b.sha, branch: "main" }) });
  if (r.status === 409 || r.status === 422) throw new AccessError(409, "Der Lebenslauf wurde inzwischen geändert. Bitte neu laden.");
  if (!r.ok) throw new AccessError(502, `GitHub hat das Speichern abgelehnt (${r.status}).`);
  const j = (await r.json()) as { content?: { sha?: string } };
  await query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)", [String(s.user_id), "CV:SAVE"]);
  return { sha: j.content?.sha ?? null };
}
