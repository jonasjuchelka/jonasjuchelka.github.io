"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, fmt, register, type Account } from "@/lib/client";
import { ActionStatus, Field, LoadError, PageHead, Skeleton, useAction, useResource } from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useResource<Account>("/account");
  const a = useAction(reload);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function addKey(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { a.setMsg({ tone: "error", text: "Bitte gib dem Passkey einen Namen." }); return; }
    const ok = await a.run(() => register("/passkeys/options", {}, "/passkeys/verify", newName.trim()), "Passkey hinzugefügt.");
    if (ok) setNewName("");
  }
  async function rename(id: string) {
    if (!editName.trim()) return;
    const ok = await a.run(() => api(`/passkeys/${encodeURIComponent(id)}`, { method: "PATCH", body: { name: editName.trim() } }), "Passkey umbenannt.");
    if (ok) setEditing(null);
  }
  async function removeKey(id: string, name: string) {
    if (!confirm(`Passkey „${name}“ wirklich löschen?`)) return;
    await a.run(() => api(`/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" }), "Passkey gelöscht.");
  }
  async function revoke(id: string, current: boolean) {
    if (!confirm(current ? "Diese Sitzung beenden? Du wirst abgemeldet." : "Diese Sitzung widerrufen?")) return;
    const ok = await a.run(() => api(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }), "Sitzung widerrufen.");
    if (ok && current) router.replace("/login");
  }

  return (
    <>
      <PageHead eyebrow="Konto" title={data ? data.user.name : "Dein Konto"}>
        {data ? <p>Rolle: {data.user.role === "admin" ? "Administration" : "Mitglied"}</p> : null}
      </PageHead>
      {loading && !data ? <Skeleton rows={5} /> : null}
      {error ? <LoadError error={error} retry={reload} /> : null}
      <ActionStatus a={a} />
      {data ? (
        <div className="split">
          <section aria-labelledby="pk-h">
            <h2 id="pk-h">Passkeys</h2>
            {data.passkeys.length < 2 ? <p className="status"><strong>Empfehlung:</strong> Lege einen zweiten, unabhängigen Passkey an (z. B. Sicherheitsschlüssel oder Gerät eines anderen Anbieters).</p> : null}
            <ul className="list">
              {data.passkeys.map((p) => (
                <li key={p.id}>
                  {editing === p.id ? (
                    <form className="row" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); void rename(p.id); }}>
                      <label className="sr-only" htmlFor={`r-${p.id}`}>Neuer Name</label>
                      <input id={`r-${p.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} style={{ flex: 1, minWidth: "10rem", width: "auto" }} autoFocus />
                      <button className="btn btn--small" disabled={a.busy}>Speichern</button>
                      <button type="button" className="btn btn--small btn--ghost" onClick={() => setEditing(null)}>Abbrechen</button>
                    </form>
                  ) : (
                    <>
                      <div><strong>{p.name}</strong><div className="meta">Angelegt {fmt(p.created_at)}</div></div>
                      <div className="row">
                        <button className="btn btn--small btn--ghost" onClick={() => { setEditing(p.id); setEditName(p.name); }}>Umbenennen</button>
                        <button className="btn btn--small btn--danger" disabled={a.busy || data.passkeys.length <= 1} title={data.passkeys.length <= 1 ? "Der letzte Passkey kann nicht gelöscht werden" : undefined} onClick={() => removeKey(p.id, p.name)}>Löschen</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <form className="form panel section" onSubmit={addKey} noValidate>
              <h3>Weiteren Passkey hinzufügen</h3>
              <Field id="pkname" label="Name des Passkeys" hint="Zum Beispiel „YubiKey Schlüsselbund“ oder „Laptop“.">
                <input id="pkname" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} aria-describedby="pkname-hint" />
              </Field>
              <div><button className="btn" disabled={a.busy}>{a.busy ? "Bitte warten..." : "Passkey hinzufügen"}</button></div>
            </form>
          </section>
          <section aria-labelledby="s-h">
            <h2 id="s-h">Sitzungen</h2>
            <ul className="list">
              {data.sessions.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.current ? "Diese Sitzung" : "Andere Sitzung"}</strong> {s.current ? <span className="pill pill--ok">Aktuell</span> : null}
                    <div className="meta">Seit {fmt(s.created_at)} · läuft ab {fmt(s.expires_at)}</div>
                  </div>
                  <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => revoke(s.id, s.current)}>Widerrufen</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
