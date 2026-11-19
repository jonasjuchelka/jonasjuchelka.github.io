"use client";
import { useEffect, useMemo, useState } from "react";
import { ActionStatus, Field, LoadError, PageHead, Skeleton, useAction, useResource } from "@/components/ui";
import { api } from "@/lib/client";

// Stationen und Stipendien der öffentlichen Projekte-Seite bearbeiten. Speichern = ein Commit; Seite und PDF sind
// ein bis zwei Minuten später neu. Logos und Fotos liegen im Repo unter public/media (logos/, fotos/).
type Link = { label: string; url: string };
type Entry = {
  id: string; kind: "station" | "award"; pinned?: boolean; now?: boolean; year: number; date: string; place?: string; loc?: string;
  tags: string[]; title: string; org: string; why: string; text: string[]; points: string[];
  photo?: { file: string; alt: string; focus?: string }; logo?: string; icon?: string; links: Link[];
  cv?: { title?: string; org?: string; points?: string[]; extra?: string[]; link?: number; optional?: boolean; hide?: boolean };
};
type Place = { name: string; lat: number; lon: number; when: string; what: string; badge?: "home" | "now"; label?: "left" | "none" };
type Cv = { places: Record<string, Place>; entries: Entry[] };

const ICONS = ["", "mic", "target", "briefcase", "heart", "globe", "school", "compass", "exchange", "cap", "book"];
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const paras = (s: string) => s.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "station";

type Form = { kind: Entry["kind"]; title: string; org: string; date: string; year: string; place: string; loc: string; tags: string; why: string; text: string; points: string; links: string; logo: string; icon: string; photo: string; photoAlt: string; pinned: boolean; now: boolean; cvPoints: string; cvHide: boolean };
const empty: Form = { kind: "station", title: "", org: "", date: "", year: String(new Date().getFullYear()), place: "", loc: "", tags: "", why: "", text: "", points: "", links: "", logo: "", icon: "", photo: "", photoAlt: "", pinned: false, now: false, cvPoints: "", cvHide: false };
const toForm = (e: Entry): Form => ({
  kind: e.kind, title: e.title, org: e.org, date: e.date, year: String(e.year), place: e.place ?? "", loc: e.loc ?? "", tags: e.tags.join(", "),
  why: e.why, text: e.text.join("\n\n"), points: e.points.join("\n"), links: e.links.map((l) => `${l.label} | ${l.url}`).join("\n"),
  logo: e.logo ?? "", icon: e.icon ?? "", photo: e.photo?.file ?? "", photoAlt: e.photo?.alt ?? "", pinned: !!e.pinned, now: !!e.now,
  cvPoints: (e.cv?.points ?? []).join("\n"), cvHide: !!e.cv?.hide,
});
function fromForm(f: Form, id: string, old?: Entry): Entry {
  const e: Entry = {
    id, kind: f.kind, year: Number(f.year) || new Date().getFullYear(), date: f.date.trim(), tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    title: f.title.trim(), org: f.org.trim(), why: f.why.trim(), text: paras(f.text), points: lines(f.points),
    links: lines(f.links).map((l) => { const [label, url] = l.split("|").map((x) => x.trim()); return { label: label || url, url: url || label }; }),
  };
  if (f.pinned) e.pinned = true;
  if (f.now) e.now = true;
  if (f.place.trim()) e.place = f.place.trim();
  if (f.loc) e.loc = f.loc;
  if (f.logo.trim()) e.logo = f.logo.trim(); else if (f.icon) e.icon = f.icon;
  if (f.photo.trim()) e.photo = { file: f.photo.trim(), alt: f.photoAlt.trim() || f.title.trim(), ...(old?.photo?.focus ? { focus: old.photo.focus } : {}) };
  // PDF-Fassung: übrige Angaben (eigener Titel, Link, optional) bleiben erhalten, Punkte und Ausblenden kommen aus dem Formular.
  const cv: NonNullable<Entry["cv"]> = { ...(old?.cv ?? {}) };
  const cvPoints = lines(f.cvPoints);
  if (cvPoints.length) cv.points = cvPoints; else delete cv.points;
  if (f.cvHide) cv.hide = true; else delete cv.hide;
  if (Object.keys(cv).length) e.cv = cv;
  return e;
}

export default function StationenPage() {
  const res = useResource<{ cv: Cv; sha: string }>("/cv");
  const [cv, setCv] = useState<Cv | null>(null);
  const [sha, setSha] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState<Form>(empty);
  const [dirty, setDirty] = useState(false);
  const act = useAction(async () => { await res.reload(); });

  useEffect(() => { if (res.data) { setCv(res.data.cv); setSha(res.data.sha); setDirty(false); } }, [res.data]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const places = useMemo(() => Object.entries(cv?.places ?? {}), [cv]);

  const pick = (id: string | null) => {
    setSel(id);
    const e = id ? cv?.entries.find((x) => x.id === id) : undefined;
    setF(e ? toForm(e) : empty);
    act.setMsg(null);
  };
  const apply = () => {
    if (!cv || !f.title.trim() || !f.why.trim() || !f.date.trim()) { act.setMsg({ tone: "error", text: "Titel, Zeitraum und „Das Wichtigste“ sind Pflicht." }); return; }
    const old = sel ? cv.entries.find((x) => x.id === sel) : undefined;
    let id = sel ?? slug(f.title);
    if (!sel) { let n = 2; while (cv.entries.some((x) => x.id === id)) id = `${slug(f.title)}-${n++}`; }
    const e = fromForm(f, id, old);
    setCv({ ...cv, entries: sel ? cv.entries.map((x) => (x.id === sel ? e : x)) : [e, ...cv.entries] });
    setSel(id); setDirty(true);
    act.setMsg({ tone: "success", text: "Übernommen. Zum Veröffentlichen unten auf „Speichern“ drücken." });
  };
  const remove = () => {
    if (!cv || !sel || !confirm("Diesen Eintrag löschen?")) return;
    setCv({ ...cv, entries: cv.entries.filter((x) => x.id !== sel) }); setDirty(true); pick(null);
  };
  const save = () => act.run(async () => {
    const r = await api<{ sha: string | null }>("/cv", { method: "PUT", body: { cv, sha } });
    if (r.sha) setSha(r.sha);
    setDirty(false);
  }, "Gespeichert. Die Seite und das PDF sind in ein bis zwei Minuten aktuell.");

  if (res.loading && !res.data) return <><PageHead eyebrow="Lebenslauf" title="Stationen" /><Skeleton /></>;
  if (res.error) return <><PageHead eyebrow="Lebenslauf" title="Stationen" /><LoadError error={res.error} retry={res.reload} /></>;
  if (!cv) return null;

  return (
    <>
      <PageHead eyebrow="Lebenslauf" title="Stationen">
        <p>Stationen und Stipendien der Projekte-Seite. Erst „Übernehmen“, dann „Speichern“. Das PDF entsteht automatisch neu, ohne Telefonnummer und Adresse.</p>
      </PageHead>

      <div className="row" style={{ marginBottom: "1rem" }}>
        <button className="btn" type="button" onClick={() => pick(null)}>Neuer Eintrag</button>
        <button className="btn btn--big" type="button" onClick={save} disabled={!dirty || act.busy}>{act.busy ? "Speichert …" : "Speichern"}</button>
        {dirty ? <span className="hint">Ungespeicherte Änderungen</span> : null}
      </div>
      <ActionStatus a={act} />

      <form className="form panel stack" onSubmit={(ev) => { ev.preventDefault(); apply(); }}>
        <h2>{sel ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>
        <fieldset className="chips" style={{ border: 0, padding: 0 }}>
          <legend className="sr-only">Art</legend>
          {(["station", "award"] as const).map((k) => (
            <button key={k} type="button" className={`btn btn--small ${f.kind === k ? "" : "btn--ghost"}`} aria-pressed={f.kind === k} onClick={() => set("kind", k)}>
              {f.kind === k ? "✓ " : ""}{k === "station" ? "Station" : "Stipendium oder Auszeichnung"}
            </button>
          ))}
        </fieldset>
        <Field id="cv-title" label="Titel"><input id="cv-title" value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} required /></Field>
        <Field id="cv-org" label="Organisation"><input id="cv-org" value={f.org} maxLength={160} onChange={(e) => set("org", e.target.value)} /></Field>
        <div className="row">
          <Field id="cv-date" label="Zeitraum" hint="z. B. 03.2027 – 05.2027"><input id="cv-date" value={f.date} maxLength={60} onChange={(e) => set("date", e.target.value)} required /></Field>
          <Field id="cv-year" label="Jahr im Zeitstrahl"><input id="cv-year" type="number" min={1990} max={2100} value={f.year} onChange={(e) => set("year", e.target.value)} /></Field>
        </div>
        <div className="row">
          <Field id="cv-place" label="Ort (Text)"><input id="cv-place" value={f.place} maxLength={80} onChange={(e) => set("place", e.target.value)} /></Field>
          <Field id="cv-loc" label="Punkt auf der Karte">
            <select id="cv-loc" value={f.loc} onChange={(e) => set("loc", e.target.value)}>
              <option value="">keiner</option>
              {places.map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
            </select>
          </Field>
        </div>
        <Field id="cv-tags" label="Tags" hint="Mit Komma trennen, z. B. Arbeit, Ausland"><input id="cv-tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
        <Field id="cv-why" label="Das Wichtigste" hint="Ein Satz. Steht ganz oben im Blatt."><textarea id="cv-why" rows={2} maxLength={300} value={f.why} onChange={(e) => set("why", e.target.value)} required /></Field>
        <Field id="cv-text" label="Text" hint="Absätze mit einer Leerzeile trennen."><textarea id="cv-text" rows={4} value={f.text} onChange={(e) => set("text", e.target.value)} /></Field>
        <Field id="cv-points" label="Was ich gemacht habe" hint="Ein Punkt pro Zeile."><textarea id="cv-points" rows={4} value={f.points} onChange={(e) => set("points", e.target.value)} /></Field>
        <Field id="cv-pdf" label="Im PDF-Lebenslauf" hint="Kürzer als auf der Website, ein Punkt pro Zeile. Ohne eigene Angaben nimmt das PDF die ersten zwei Punkte von oben."><textarea id="cv-pdf" rows={3} value={f.cvPoints} onChange={(e) => set("cvPoints", e.target.value)} /></Field>
        <label className="row"><input type="checkbox" checked={f.cvHide} onChange={(e) => set("cvHide", e.target.checked)} /> Nicht im PDF-Lebenslauf zeigen</label>
        <Field id="cv-links" label="Links" hint="Ein Link pro Zeile: Name | https://…"><textarea id="cv-links" rows={2} value={f.links} onChange={(e) => set("links", e.target.value)} /></Field>
        <div className="row">
          <Field id="cv-logo" label="Logo-Datei" hint="Aus public/media/logos, z. B. tum.svg"><input id="cv-logo" value={f.logo} onChange={(e) => set("logo", e.target.value)} /></Field>
          <Field id="cv-icon" label="Icon (ohne Logo)">
            <select id="cv-icon" value={f.icon} onChange={(e) => set("icon", e.target.value)}>{ICONS.map((i) => <option key={i} value={i}>{i || "keins"}</option>)}</select>
          </Field>
        </div>
        <div className="row">
          <Field id="cv-photo" label="Foto-Datei" hint="Aus public/media/fotos, ein Foto, auf dem du zu sehen bist"><input id="cv-photo" value={f.photo} onChange={(e) => set("photo", e.target.value)} /></Field>
          <Field id="cv-alt" label="Bildbeschreibung"><input id="cv-alt" value={f.photoAlt} maxLength={160} onChange={(e) => set("photoAlt", e.target.value)} /></Field>
        </div>
        <label className="row"><input type="checkbox" checked={f.pinned} onChange={(e) => set("pinned", e.target.checked)} /> Oben anpinnen (aktuelles Projekt)</label>
        <label className="row"><input type="checkbox" checked={f.now} onChange={(e) => set("now", e.target.checked)} /> „Aktuell“ anzeigen</label>
        <div className="row">
          <button className="btn" type="submit">Übernehmen</button>
          {sel ? <button className="btn btn--danger" type="button" onClick={remove}>Löschen</button> : null}
        </div>
      </form>

      <section className="stack" aria-labelledby="cv-list" style={{ marginTop: "2rem" }}>
        <h2 id="cv-list">Einträge ({cv.entries.length})</h2>
        <ul className="list">
          {cv.entries.map((e) => (
            <li key={e.id} className="row">
              <span><strong>{e.title}</strong> <span className="meta">{e.kind === "award" ? "Auszeichnung" : e.pinned ? "Station, angepinnt" : "Station"} · {e.date}</span></span>
              <button className="btn btn--small btn--ghost" type="button" onClick={() => pick(e.id)} aria-pressed={sel === e.id}>Bearbeiten</button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
