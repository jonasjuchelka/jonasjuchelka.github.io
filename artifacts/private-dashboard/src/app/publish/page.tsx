"use client";
import { useMemo, useRef, useState } from "react";
import { ApiError, BASE } from "@/lib/client";
import { ActionStatus, Field, LoadError, PageHead, Skeleton, useAction, useResource } from "@/components/ui";

type Item = { slug: string; kind: "essay" | "gedanke" };
const MAX = 4 * 1024 * 1024;
const OK_EXT = ["docx", "doc", "md"];

async function send(method: string, body?: FormData | object) {
  const form = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/publish`, {
      method, credentials: "same-origin", cache: "no-store",
      headers: body && !form ? { "Content-Type": "application/json" } : undefined,
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
  } catch { throw new ApiError(0, "Der Server ist gerade nicht erreichbar."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, typeof data?.error === "string" ? data.error : "Das hat nicht geklappt.");
  return data;
}

export default function PublishPage() {
  const list = useResource<{ items: Item[] }>("/publish");
  const act = useAction(async () => { await list.reload(); });
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"essay" | "gedanke">("essay");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState("");
  const [summary, setSummary] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const ext = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const fileError = file && (!OK_EXT.includes(ext) ? "Nur .docx, .doc und .md." : file.size > MAX ? "Größer als 4 MB." : kind === "gedanke" && ext !== "md" ? "Ein Gedanke ist reiner Text (.md)." : "");
  const tagList = useMemo(() => tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8), [tags]);
  const ready = !!file && !fileError && title.trim().length > 0;

  const submit = () => act.run(async () => {
    const f = new FormData();
    f.set("file", file!); f.set("kind", kind); f.set("title", title); f.set("topic", topic); f.set("summary", summary);
    f.set("tags", kind === "gedanke" ? "" : tags);
    const r = await send("POST", f) as { slug: string };
    setDone(r.slug); setFile(null); setTitle(""); setTopic(""); setTags(""); setSummary("");
    if (fileRef.current) fileRef.current.value = "";
  }, "Hochgeladen. Der Beitrag geht in ein bis zwei Minuten live.");

  return (
    <>
      <PageHead eyebrow="Blog" title="Veröffentlichen">
        <p>Datei hochladen, Angaben prüfen, veröffentlichen. Aus .docx, .doc oder .md entsteht die Seite und bei Essays ein PDF im JJ-Stil.</p>
      </PageHead>

      <form className="form panel stack" onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}>
        <h2>1 · Datei</h2>
        <Field id="pub-file" label="Datei (.docx, .doc oder .md, bis 4 MB)">
          <input id="pub-file" ref={fileRef} type="file" accept=".docx,.doc,.md" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDone(null); }} aria-invalid={!!fileError} />
        </Field>
        {fileError ? <p className="hint" role="alert">{fileError}</p> : null}

        <h2>2 · Angaben</h2>
        <fieldset className="chips" style={{ border: 0, padding: 0 }}>
          <legend className="sr-only">Art</legend>
          {(["essay", "gedanke"] as const).map((k) => (
            <button key={k} type="button" className={`btn btn--small ${kind === k ? "" : "btn--ghost"}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {kind === k ? "✓ " : ""}{k === "essay" ? "Essay" : "Gedanke"}
            </button>
          ))}
        </fieldset>
        <Field id="pub-title" label="Titel"><input id="pub-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field id="pub-topic" label="Thema" hint="Ein Wort, z. B. Netzwerke."><input id="pub-topic" value={topic} maxLength={40} onChange={(e) => setTopic(e.target.value)} /></Field>
        {kind === "essay" ? (
          <>
            <Field id="pub-tags" label="Tags" hint="Mit Komma trennen, höchstens 8."><input id="pub-tags" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
            <Field id="pub-sum" label="Einleitung (1–2 Sätze)"><textarea id="pub-sum" rows={3} maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          </>
        ) : <p className="hint">Gedanken haben keine Tags und kein Bild, höchstens 2000 Zeichen.</p>}

        <h2>3 · Vorschau</h2>
        <div className="panel panel--dark" aria-live="polite">
          <p className="meta">{kind === "essay" ? "Essay" : "Gedanke"}{topic ? ` · ${topic}` : ""}</p>
          <h3>{title || "Titel"}</h3>
          {kind === "essay" && summary ? <p>{summary}</p> : null}
          {kind === "essay" && tagList.length ? <p className="chips">{tagList.map((t) => <span className="pill" key={t}>{t}</span>)}</p> : null}
          <p className="meta">{file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : "Noch keine Datei"}</p>
        </div>
        <p className="hint">Die fertige Seite siehst du nach dem Veröffentlichen. Mit „Zurücknehmen“ ist sie wieder weg.</p>

        <h2>4 · Veröffentlichen</h2>
        <div className="row">
          <button className="btn btn--big" type="submit" disabled={!ready || act.busy}>{act.busy ? "Wird hochgeladen …" : "Veröffentlichen"}</button>
        </div>
        <ActionStatus a={act} />
        {done ? <p className="hint">Adresse: <code>/blog/{done}/</code></p> : null}
      </form>

      <section className="stack" aria-labelledby="pub-list">
        <h2 id="pub-list">Veröffentlicht</h2>
        {list.loading && !list.data ? <Skeleton /> : list.error ? <LoadError error={list.error} retry={list.reload} /> : (
          list.data!.items.length === 0 ? <p className="empty">Noch nichts veröffentlicht.</p> : (
            <ul className="list">
              {list.data!.items.map((i) => (
                <li className="row" key={`${i.kind}-${i.slug}`}>
                  <span><strong>{i.slug}</strong> <span className="meta">{i.kind === "essay" ? "Essay" : "Gedanke"}</span></span>
                  <button className="btn btn--small btn--danger" disabled={act.busy}
                    onClick={() => { if (confirm(`„${i.slug}“ zurücknehmen?`)) void act.run(() => send("DELETE", { slug: i.slug }), "Zurückgenommen. Die Seite ist in ein bis zwei Minuten weg."); }}>
                    Zurücknehmen
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </>
  );
}

