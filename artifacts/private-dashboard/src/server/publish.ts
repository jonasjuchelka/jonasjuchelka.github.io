import "server-only";
import { currentSession } from "./auth";
import { AccessError } from "./policy";
import { EXTENSIONS, UploadError, checkContent, checkMeta, extOf, metaJson, metaSchema, slugify, validSlug } from "./publish-core";
import { query } from "./db";

// Token: fine-grained, nur dieses Repo, Contents: Read & write. Liegt nur als Vercel-Secret.
const repo = () => process.env.GITHUB_REPO ?? "jonasjuchelka/jonasjuchelka.github.io";
function token() { const t = process.env.GITHUB_TOKEN; if (!t) throw new AccessError(503, "GitHub-Zugang ist noch nicht eingerichtet."); return t; }
const gh = (path: string, init: RequestInit = {}) => fetch(`https://api.github.com/repos/${repo()}/contents/${path}`, {
  ...init, cache: "no-store",
  headers: { authorization: `Bearer ${token()}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "jj-private-area", ...(init.headers ?? {}) },
});
const exists = async (p: string) => (await gh(`${p}?ref=main`)).status === 200;
const put = async (p: string, content: Uint8Array | string, message: string) => {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const r = await gh(p, { method: "PUT", body: JSON.stringify({ message, content: Buffer.from(bytes).toString("base64"), branch: "main" }) });
  if (!r.ok) throw new AccessError(502, `GitHub hat das Speichern abgelehnt (${r.status}).`);
};
const audit = (actor: string, event: string) => query("INSERT INTO private_area.audit(actor_id,event) VALUES($1,$2)", [actor, event]);

/** Nur Administratoren, und nur mit Passkey-Bestätigung der letzten 5 Minuten. */
const adminFresh = () => currentSession(true, true);

export async function publishUpload(form: FormData) {
  const s = await adminFresh();
  const file = form.get("file");
  if (!(file instanceof File)) throw new UploadError(400, "Bitte eine Datei auswählen.");
  const ext = extOf(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkContent(ext, bytes);
  const parsed = metaSchema.safeParse({
    kind: form.get("kind"), title: form.get("title"), topic: form.get("topic") ?? "",
    tags: String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean), summary: form.get("summary") ?? "",
  });
  if (!parsed.success) throw new UploadError(400, parsed.error.issues[0]?.message ?? "Angaben ungültig.");
  const meta = parsed.data;
  checkMeta(meta, ext, bytes);
  const slug = slugify(meta.title);
  if (!validSlug(slug)) throw new UploadError(400, "Aus dem Titel lässt sich keine Adresse bilden.");
  const dir = meta.kind === "gedanke" ? "artifacts/jonas-website/content/gedanken" : "artifacts/jonas-website/content/blog";
  if ((await exists(`${dir}/${slug}.md`)) || (await exists(`inbox/${slug}/meta.json`)))
    throw new UploadError(409, "Es gibt schon einen Beitrag mit diesem Titel. Bitte den Titel ändern.");
  // Erst die Datei, dann meta.json: die Action startet erst, wenn beides da ist.
  await put(`inbox/${slug}/original.${ext}`, bytes, `Upload: ${slug}`);
  await put(`inbox/${slug}/meta.json`, metaJson(meta, slug, new Date().toISOString().slice(0, 10)), `Upload Angaben: ${slug}`);
  await audit(String(s.user_id), `PUBLISH:${slug}`);
  return { slug };
}

export type Published = { slug: string; kind: "essay" | "gedanke" };
export async function listPublished(): Promise<Published[]> {
  await currentSession(false, true);
  const one = async (dir: string, kind: Published["kind"]) => {
    const r = await gh(`${dir}?ref=main`);
    if (r.status === 404) return [];
    if (!r.ok) throw new AccessError(502, "Die Liste konnte nicht geladen werden.");
    return ((await r.json()) as { name: string }[]).filter((f) => f.name.endsWith(".md") && !f.name.startsWith("_"))
      .map((f) => ({ slug: f.name.slice(0, -3), kind }));
  };
  return [...(await one("artifacts/jonas-website/content/blog", "essay")), ...(await one("artifacts/jonas-website/content/gedanken", "gedanke"))];
}

export async function unpublish(slug: string) {
  const s = await adminFresh();
  if (!validSlug(slug)) throw new UploadError(400, "Ungültige Adresse.");
  let removed = 0;
  for (const path of [`artifacts/jonas-website/content/blog/${slug}.md`, `artifacts/jonas-website/content/gedanken/${slug}.md`, `artifacts/jonas-website/public/blog/${slug}.pdf`]) {
    const g = await gh(`${path}?ref=main`);
    if (g.status === 404) continue;
    if (!g.ok) throw new AccessError(502, "GitHub antwortet nicht wie erwartet.");
    const { sha } = (await g.json()) as { sha: string };
    const d = await gh(path, { method: "DELETE", body: JSON.stringify({ message: `Zurückgenommen: ${slug}`, sha, branch: "main" }) });
    if (!d.ok) throw new AccessError(502, `Zurücknehmen fehlgeschlagen (${d.status}).`);
    removed++;
  }
  if (!removed) throw new UploadError(404, "Diesen Beitrag gibt es nicht (mehr).");
  await audit(String(s.user_id), `UNPUBLISH:${slug}`);
  return { ok: true };
}
export { EXTENSIONS };
