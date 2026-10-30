"use client";
import { useState, type FormEvent } from "react";
import { ACCESS_LABEL, api, fmt, type AccessType, type AdminData, type Tool } from "@/lib/client";
import { ActionStatus, Field, LoadError, PageHead, Skeleton, useAction, useResource } from "@/components/ui";

type Tab = "invitations" | "users" | "groups" | "tools";
const TABS: [Tab, string][] = [["invitations", "Einladungen"], ["users", "Nutzer"], ["groups", "Gruppen"], ["tools", "Tools & Freigaben"]];
const enc = encodeURIComponent;

export default function AdminPage() {
  const { data, error, loading, reload } = useResource<AdminData>("/admin");
  const a = useAction(reload);
  const [tab, setTab] = useState<Tab>("invitations");
  return (
    <>
      <PageHead eyebrow="Administration" title="Zugänge verwalten">
        <p>Alle Änderungen erfordern eine Passkey-Bestätigung der letzten 5 Minuten. Der Server prüft jede Aktion.</p>
      </PageHead>
      {loading && !data ? <Skeleton rows={6} /> : null}
      {error ? <LoadError error={error} retry={reload} /> : null}
      {data ? (
        <>
          <div className="tabs" role="tablist" aria-label="Bereiche">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" id={`tab-${k}`} aria-controls="panel" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <ActionStatus a={a} />
          <div role="tabpanel" id="panel" aria-labelledby={`tab-${tab}`}>
            {tab === "invitations" ? <Invitations d={data} a={a} /> : null}
            {tab === "users" ? <Users d={data} a={a} /> : null}
            {tab === "groups" ? <Groups d={data} a={a} /> : null}
            {tab === "tools" ? <Tools d={data} a={a} /> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

type P = { d: AdminData; a: ReturnType<typeof useAction> };

function Invitations({ d, a }: P) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mailed, setMailed] = useState<boolean | null>(null);
  const [hours, setHours] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { a.setMsg({ tone: "error", text: "Bitte einen Namen angeben." }); return; }
    setUrl(null); setCopied(false); setMailed(null);
    const to = email.trim();
    await a.run(async () => {
      const r = await api<{ url: string; hours?: number; mailed?: boolean }>("/admin/invitations", { method: "POST", body: { name: name.trim(), ...(to ? { email: to } : {}) } });
      setUrl(r.url); setHours(r.hours ?? 1); setMailed(to ? !!r.mailed : null); setName(""); setEmail("");
    }, "Einladung erstellt.");
  }
  const now = Date.now();
  return (
    <div className="split">
      <section>
        <h2>Offene und vergangene Einladungen</h2>
        {d.invitations.length === 0 ? <p className="empty">Noch keine Einladungen.</p> : (
          <ul className="list">
            {d.invitations.map((i) => {
              const used = !!i.used_at; const expired = !used && new Date(i.expires_at).getTime() < now;
              return (
                <li key={i.id}>
                  <div><strong>{i.name}</strong> <span className={`pill ${used ? "pill--ok" : expired ? "pill--bad" : "pill--warn"}`}>{used ? "Eingelöst" : expired ? "Abgelaufen" : "Offen"}</span>
                    <div className="meta">{used ? `Eingelöst ${fmt(i.used_at)}` : `Gültig bis ${fmt(i.expires_at)}`}</div></div>
                  {!used ? <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Einladung für ${i.name} widerrufen?`) && a.run(() => api(`/admin/invitations/${enc(i.id)}`, { method: "DELETE" }), "Einladung widerrufen.")}>Widerrufen</button> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="stack">
        <form className="form panel" onSubmit={create} noValidate>
          <h3>Neue Einladung</h3>
          <Field id="inv-name" label="Name der eingeladenen Person"><input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
          <Field id="inv-mail" label="E-Mail (optional)" hint="Wenn ausgefüllt, bekommt die Person die Einladung als Mail von Jonas Support. Die Adresse wird nicht gespeichert."><input id="inv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" aria-describedby="inv-mail-hint" /></Field>
          <div><button className="btn" disabled={a.busy}>{email.trim() ? "Einladung senden" : "Einladung erstellen"}</button></div>
        </form>
        {url ? (
          <div className="panel panel--dark" role="status">
            <h3>{mailed === true ? "Mail ist raus 🎉" : "Einladungslink, nur jetzt sichtbar"}</h3>
            {mailed === false ? <p><strong>Die Mail konnte nicht gesendet werden.</strong> Gib den Link selbst weiter oder prüfe die Mail-Einrichtung.</p> : null}
            <p>Einmalig nutzbar, {hours === 1 ? "1 Stunde" : `${hours} Stunden`} gültig. {mailed === true ? "Der Link steht auch in der Mail." : "Über einen vertrauenswürdigen Kanal weitergeben."}</p>
            <div className="copy">
              <label className="sr-only" htmlFor="inv-url">Einladungslink</label>
              <input id="inv-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Kopiert" : "Kopieren"}</button>
            </div>
            <p style={{ marginTop: "1rem" }}><button className="btn btn--ghost" style={{ color: "inherit", borderColor: "currentColor" }} onClick={() => setUrl(null)}>Ausblenden</button></p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Users({ d, a }: P) {
  const groupName = (id: string) => d.groups.find((g) => g.id === id)?.name ?? id;
  return (
    <section>
      <h2>Nutzer</h2>
      {d.users.length === 0 ? <p className="empty">Keine Nutzer.</p> : (
        <div className="tablewrap"><table>
          <thead><tr><th scope="col">Name</th><th scope="col">Rolle</th><th scope="col">Gruppen</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>
            {d.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.role === "admin" ? "Administration" : "Mitglied"}</td>
                <td>{d.memberships.filter((m) => m.user_id === u.id).map((m) => groupName(m.group_id)).join(", ") || "–"}</td>
                <td><span className={`pill ${u.blocked ? "pill--bad" : "pill--ok"}`}>{u.blocked ? "Gesperrt" : "Aktiv"}</span></td>
                <td>
                  <button className={`btn btn--small ${u.blocked ? "" : "btn--danger"}`} disabled={a.busy}
                    onClick={() => confirm(u.blocked ? `${u.name} entsperren?` : `${u.name} sperren? Alle Sitzungen werden widerrufen.`) &&
                      a.run(() => api(`/admin/users/${enc(u.id)}`, { method: "PATCH", body: { blocked: !u.blocked } }), u.blocked ? "Nutzer entsperrt." : "Nutzer gesperrt.")}>
                    {u.blocked ? "Entsperren" : "Sperren"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <p className="hint" style={{ marginTop: "1rem" }}>Eine Sperre hier entzieht keine Anbieterzugänge. Diese separat widerrufen.</p>
    </section>
  );
}

function Groups({ d, a }: P) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const userName = (id: string) => d.users.find((u) => u.id === id)?.name ?? id;
  return (
    <div className="split">
      <section>
        <h2>Gruppen</h2>
        {d.groups.length === 0 ? <p className="empty">Noch keine Gruppen.</p> : (
          <ul className="list">
            {d.groups.map((g) => {
              const members = d.memberships.filter((m) => m.group_id === g.id);
              const candidates = d.users.filter((u) => !members.some((m) => m.user_id === u.id));
              return (
                <li key={g.id} style={{ display: "block" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0 }}>{g.name}</h3>
                    <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Gruppe ${g.name} löschen?`) && a.run(() => api(`/admin/groups/${enc(g.id)}`, { method: "DELETE" }), "Gruppe gelöscht.")}>Gruppe löschen</button>
                  </div>
                  <ul className="row" style={{ listStyle: "none", padding: 0, margin: ".75rem 0" }}>
                    {members.length === 0 ? <li className="meta">Keine Mitglieder</li> : members.map((m) => (
                      <li key={m.user_id} className="pill" style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
                        {userName(m.user_id)}
                        <button className="btn btn--small btn--ghost" style={{ minHeight: 28, padding: "0 .5rem" }} aria-label={`${userName(m.user_id)} aus ${g.name} entfernen`} disabled={a.busy}
                          onClick={() => a.run(() => api("/admin/memberships", { method: "DELETE", body: { userId: m.user_id, groupId: g.id } }), "Mitglied entfernt.")}>Entfernen</button>
                      </li>
                    ))}
                  </ul>
                  {candidates.length ? (
                    <form className="row" onSubmit={(e) => { e.preventDefault(); const uid = sel[g.id]; if (uid) void a.run(() => api("/admin/memberships", { method: "POST", body: { userId: uid, groupId: g.id } }), "Mitglied hinzugefügt."); }}>
                      <label className="sr-only" htmlFor={`m-${g.id}`}>Nutzer zu {g.name} hinzufügen</label>
                      <select id={`m-${g.id}`} style={{ width: "auto", flex: 1 }} value={sel[g.id] ?? ""} onChange={(e) => setSel({ ...sel, [g.id]: e.target.value })}>
                        <option value="">Nutzer wählen</option>
                        {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <button className="btn btn--small" disabled={a.busy || !sel[g.id]}>Hinzufügen</button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <form className="form panel" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; if (await a.run(() => api("/admin/groups", { method: "POST", body: { name: name.trim() } }), "Gruppe erstellt.")) setName(""); }}>
        <h3>Neue Gruppe</h3>
        <Field id="g-name" label="Gruppenname"><input id="g-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <div><button className="btn" disabled={a.busy || !name.trim()}>Gruppe erstellen</button></div>
      </form>
    </div>
  );
}

const EMPTY: Omit<Tool, "id"> = { name: "", provider: "", description: "", url: "https://", access_type: "own_account", instructions: "", plan: "", price: "", details: "", logo_url: "" };

function validUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}

function Tools({ d, a }: P) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [grantTarget, setGrantTarget] = useState<Record<string, string>>({});
  const urlBad = touched && !validUrl(form.url);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!form.name.trim() || !form.provider.trim() || !validUrl(form.url)) { a.setMsg({ tone: "error", text: "Name, Anbieter und eine HTTPS-URL ohne Zugangsdaten sind Pflicht." }); return; }
    const ok = await a.run(() => editId
      ? api(`/admin/tools/${enc(editId)}`, { method: "PATCH", body: form })
      : api("/admin/tools", { method: "POST", body: form }), editId ? "Tool aktualisiert." : "Tool angelegt.");
    if (ok) { setForm(EMPTY); setEditId(null); setTouched(false); }
  }
  const label = (g: AdminData["grants"][number]) => g.user_id
    ? `Person: ${d.users.find((u) => u.id === g.user_id)?.name ?? g.user_id}`
    : `Gruppe: ${d.groups.find((x) => x.id === g.group_id)?.name ?? g.group_id}`;

  return (
    <div className="split">
      <section>
        <h2>Tools</h2>
        {d.tools.length === 0 ? <div className="empty"><h3>Noch keine Tools</h3><p>Lege das erste echte Tool rechts an und gib es danach gezielt frei.</p></div> : (
          <ul className="list">
            {d.tools.map((t) => {
              const grants = d.grants.filter((g) => g.tool_id === t.id);
              return (
                <li key={t.id} style={{ display: "block" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div><h3 style={{ margin: 0 }}>{t.name}</h3><div className="meta">{t.provider} · {ACCESS_LABEL[t.access_type]}</div></div>
                    <div className="row">
                      <button className="btn btn--small btn--ghost" onClick={() => { setEditId(t.id); setForm({ name: t.name, provider: t.provider, description: t.description, url: t.url, access_type: t.access_type, instructions: t.instructions, plan: t.plan ?? "", price: t.price ?? "", details: t.details ?? "", logo_url: t.logo_url ?? "" }); }}>Bearbeiten</button>
                      <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Tool ${t.name} löschen?`) && a.run(() => api(`/admin/tools/${enc(t.id)}`, { method: "DELETE" }), "Tool gelöscht.")}>Löschen</button>
                    </div>
                  </div>
                  <p className="meta" style={{ marginTop: ".75rem" }}>Freigaben</p>
                  <ul className="row" style={{ listStyle: "none", padding: 0, margin: "0 0 .75rem" }}>
                    {grants.length === 0 ? <li className="meta">Für niemanden freigegeben</li> : grants.map((g) => (
                      <li key={g.id} className="pill" style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
                        {label(g)}
                        <button className="btn btn--small btn--ghost" style={{ minHeight: 28, padding: "0 .5rem" }} aria-label={`Freigabe ${label(g)} entziehen`} disabled={a.busy}
                          onClick={() => a.run(() => api(`/admin/grants/${enc(g.id)}`, { method: "DELETE" }), "Freigabe entzogen.")}>Entziehen</button>
                      </li>
                    ))}
                  </ul>
                  <form className="row" onSubmit={(e) => {
                    e.preventDefault();
                    const v = grantTarget[t.id]; if (!v) return;
                    const [kind, id] = v.split(":");
                    void a.run(() => api("/admin/grants", { method: "POST", body: kind === "u" ? { toolId: t.id, userId: id } : { toolId: t.id, groupId: id } }), "Freigabe erteilt.");
                  }}>
                    <label className="sr-only" htmlFor={`gr-${t.id}`}>Freigeben für</label>
                    <select id={`gr-${t.id}`} style={{ width: "auto", flex: 1 }} value={grantTarget[t.id] ?? ""} onChange={(e) => setGrantTarget({ ...grantTarget, [t.id]: e.target.value })}>
                      <option value="">Freigeben für...</option>
                      <optgroup label="Personen">{d.users.filter((u) => !grants.some((g) => g.user_id === u.id)).map((u) => <option key={u.id} value={`u:${u.id}`}>{u.name}</option>)}</optgroup>
                      <optgroup label="Gruppen">{d.groups.filter((x) => !grants.some((g) => g.group_id === x.id)).map((x) => <option key={x.id} value={`g:${x.id}`}>{x.name}</option>)}</optgroup>
                    </select>
                    <button className="btn btn--small" disabled={a.busy || !grantTarget[t.id]}>Freigeben</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <form className="form panel" onSubmit={save} noValidate>
        <h3>{editId ? "Tool bearbeiten" : "Neues Tool"}</h3>
        <Field id="t-name" label="Name"><input id="t-name" value={form.name} onChange={set("name")} maxLength={80} required /></Field>
        <Field id="t-prov" label="Anbieter"><input id="t-prov" value={form.provider} onChange={set("provider")} maxLength={80} required /></Field>
        <Field id="t-url" label="Externe URL" hint="Nur HTTPS, keine Zugangsdaten in der URL.">
          <input id="t-url" type="url" inputMode="url" value={form.url} onChange={set("url")} onBlur={() => setTouched(true)} aria-invalid={urlBad} aria-describedby="t-url-hint" required />
        </Field>
        {urlBad ? <p className="status" role="alert" style={{ margin: 0 }}>Bitte eine gültige https://-Adresse ohne Benutzername oder Passwort angeben.</p> : null}
        <Field id="t-type" label="Zugangsart">
          <select id="t-type" value={form.access_type} onChange={(e) => setForm({ ...form, access_type: e.target.value as AccessType })}>
            {(Object.keys(ACCESS_LABEL) as AccessType[]).map((k) => <option key={k} value={k}>{ACCESS_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field id="t-desc" label="Beschreibung"><textarea id="t-desc" value={form.description} onChange={set("description")} maxLength={500} /></Field>
        <Field id="t-ins" label="Kurze Anleitung" hint="Keine Passwörter, Schlüssel oder Codes eintragen.">
          <textarea id="t-ins" value={form.instructions} onChange={set("instructions")} maxLength={2000} aria-describedby="t-ins-hint" />
        </Field>
        <Field id="t-logo" label="Logo-Adresse (optional)" hint="https://… zu einem Bild oder ein Pfad wie /logos/name.svg. Leer = Favicon des Tools."><input id="t-logo" value={form.logo_url ?? ""} onChange={set("logo_url")} maxLength={2000} /></Field>
        <Field id="t-plan" label="Plan / Tarif" hint="z. B. Creator. Erscheint im Seitenfenster."><input id="t-plan" value={form.plan ?? ""} onChange={set("plan")} maxLength={80} /></Field>
        <Field id="t-price" label="Preis bei Neukauf" hint="z. B. 22 $ pro Monat, Stand Datum."><input id="t-price" value={form.price ?? ""} onChange={set("price")} maxLength={160} /></Field>
        <Field id="t-det" label="Dokumentation" hint="Für das Seitenfenster. &#8222;## Titel&#8220; für Überschriften, &#8222;- &#8220; für Listen. Keine Passwörter oder Codes.">
          <textarea id="t-det" rows={10} value={form.details ?? ""} onChange={set("details")} maxLength={8000} />
        </Field>
        <div className="row">
          <button className="btn" disabled={a.busy}>{editId ? "Änderungen speichern" : "Tool anlegen"}</button>
          {editId ? <button type="button" className="btn btn--ghost" onClick={() => { setEditId(null); setForm(EMPTY); setTouched(false); }}>Abbrechen</button> : null}
        </div>
      </form>
    </div>
  );
}
