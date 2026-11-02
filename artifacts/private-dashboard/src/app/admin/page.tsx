"use client";
import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { LOCAL_LOGOS } from "@/lib/logos";
import { ToolLogo } from "@/components/ToolLogo";
import { ACCESS_LABEL, api, fmt, type Account, type AccessType, type AdminData, type AdminInvitation, type AdminUser, type LoginField, type NewToolMailResult, type Tool } from "@/lib/client";
import { ActionStatus, Field, LoadError, PageHead, Skeleton, useAction, useResource } from "@/components/ui";

type Tab = "invitations" | "users" | "groups" | "tools" | "links" | "mails";
const TABS: [Tab, string][] = [["invitations", "Einladungen"], ["users", "Nutzer"], ["groups", "Gruppen"], ["tools", "Tools & Freigaben"], ["links", "Zugangslinks"], ["mails", "Mails"]];
const enc = encodeURIComponent;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserState = "active" | "paused" | "deleted";
const userState = (u: AdminUser): UserState => (u.deleted_at ? "deleted" : u.blocked ? "paused" : "active");
const STATE: Record<UserState, { pill: string; label: string }> = {
  active: { pill: "pill--ok", label: "Aktiv" },
  paused: { pill: "pill--warn", label: "Temporär gesperrt" },
  deleted: { pill: "pill--muted", label: "Endgültig gelöscht" },
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
function mailSummary(m: NewToolMailResult) {
  const parts = [m.notified ? `Info-Mail an ${plural(m.notified, "Person", "Personen")} gesendet.` : "Keine Info-Mail gesendet."];
  if (m.failed) parts.push(`${m.failed} fehlgeschlagen.`);
  if (m.without_email) parts.push(`${plural(m.without_email, "Person", "Personen")} ohne E-Mail.`);
  return parts.join(" ");
}

/** Collapsed section for everything that is no longer active. */
function Former({ count, label = "Ehemalige", children }: { count: number; label?: string; children: ReactNode }) {
  if (!count) return null;
  return (
    <details className="former">
      <summary>{label} <span className="former__count">{count}</span></summary>
      <div className="former__body">{children}</div>
    </details>
  );
}

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
            {tab === "links" ? <Links d={data} a={a} /> : null}
            {tab === "mails" ? <Mails d={data} /> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

type P = { d: AdminData; a: ReturnType<typeof useAction> };

function invitationState(i: AdminInvitation, now: number) {
  if (!i.used_at) {
    const expired = new Date(i.expires_at).getTime() < now;
    return expired
      ? { label: "Abgelaufen", pill: "pill--bad", former: true, meta: `Abgelaufen ${fmt(i.expires_at)}` }
      : { label: "Offen", pill: "pill--warn", former: false, meta: `Gültig bis ${fmt(i.expires_at)}` };
  }
  if (i.user_deleted_at) return { label: STATE.deleted.label, pill: STATE.deleted.pill, former: true, meta: `Eingelöst ${fmt(i.used_at)} · gelöscht ${fmt(i.user_deleted_at)}` };
  if (i.user_blocked) return { label: STATE.paused.label, pill: STATE.paused.pill, former: true, meta: `Eingelöst ${fmt(i.used_at)}` };
  return { label: "Eingelöst", pill: "pill--ok", former: false, meta: `Eingelöst ${fmt(i.used_at)}` };
}

function Invitations({ d, a }: P) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [sendMail, setSendMail] = useState(true);
  const [touched, setTouched] = useState(false);
  const [mailed, setMailed] = useState<boolean | null>(null);
  const [hours, setHours] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mailBad = touched && !EMAIL_RE.test(email.trim());
  async function create(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!first.trim() || !last.trim() || !EMAIL_RE.test(email.trim())) { a.setMsg({ tone: "error", text: "Bitte Vorname, Nachname und eine gültige E-Mail angeben." }); return; }
    setUrl(null); setCopied(false); setMailed(null);
    await a.run(async () => {
      const r = await api<{ url: string; hours?: number; mailed?: boolean }>("/admin/invitations", { method: "POST", body: { first_name: first.trim(), last_name: last.trim(), email: email.trim(), send_mail: sendMail } });
      setUrl(r.url); setHours(r.hours ?? 1); setMailed(sendMail ? !!r.mailed : null);
      setFirst(""); setLast(""); setEmail(""); setTouched(false);
    }, "Einladung erstellt.");
  }
  const now = Date.now();
  const rows = d.invitations.map((i) => ({ i, st: invitationState(i, now) }));
  const active = rows.filter((r) => !r.st.former), former = rows.filter((r) => r.st.former);
  const item = ({ i, st }: (typeof rows)[number]) => {
    const person = d.users.find((u) => u.id === i.user_id);
    const mail = person?.email ?? i.email;
    return (
      <li key={i.id}>
        <div><strong>{i.name}</strong> {i.role === "admin" || person?.role === "admin" ? <span className="pill pill--admin">Admin</span> : null} <span className={`pill ${st.pill}`}>{st.label}</span>
          <div className="meta">{[mail, st.meta].filter(Boolean).join(" · ")}</div></div>
        {!i.used_at && st.label === "Offen" ? <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Einladung für ${i.name} widerrufen?`) && a.run(() => api(`/admin/invitations/${enc(i.id)}`, { method: "DELETE" }), "Einladung widerrufen.")}>Widerrufen</button> : null}
      </li>
    );
  };
  return (
    <div className="split">
      <section>
        <h2>Einladungen</h2>
        {active.length === 0 ? <p className="empty">Keine offenen oder aktiven Einladungen.</p> : <ul className="list">{active.map(item)}</ul>}
        <Former count={former.length} label="Ehemalige und abgelaufene"><ul className="list">{former.map(item)}</ul></Former>
      </section>
      <section className="stack">
        <form className="form form--grid panel" onSubmit={create} noValidate>
          <h3 className="full">Neue Einladung</h3>
          <Field id="inv-first" label="Vorname"><input id="inv-first" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} autoComplete="off" aria-invalid={touched && !first.trim()} required /></Field>
          <Field id="inv-last" label="Nachname"><input id="inv-last" value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} autoComplete="off" aria-invalid={touched && !last.trim()} required /></Field>
          <div className="full">
            <Field id="inv-mail" label="E-Mail" hint="Wird gespeichert, damit die Person Infos zu neuen Tools bekommt.">
              <input id="inv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && setTouched(true)} maxLength={254} autoComplete="off" aria-invalid={mailBad} aria-describedby="inv-mail-hint" required />
            </Field>
          </div>
          <label className="check full"><input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} /> Einladung direkt per Mail senden (48 Stunden gültig)</label>
          <div className="full"><button className="btn" disabled={a.busy}>{sendMail ? "Einladung senden" : "Link erstellen (1 Stunde)"}</button></div>
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

type Open = { id: string; mode: "edit" | "block" | "delete" } | null;

function Users({ d, a }: P) {
  const [open, setOpen] = useState<Open>(null);
  const [me, setMe] = useState<string | null>(null);
  const groupName = (id: string) => d.groups.find((g) => g.id === id)?.name ?? id;
  const groupsOf = (u: AdminUser) => d.memberships.filter((m) => m.user_id === u.id).map((m) => groupName(m.group_id)).join(", ") || "–";
  const active = d.users.filter((u) => userState(u) === "active");
  const former = d.users.filter((u) => userState(u) !== "active");
  const noMail = active.filter((u) => !u.email).length;
  useEffect(() => { api<Account>("/account").then((r) => setMe(r.user.id)).catch(() => setMe(null)); }, []);
  const toggle = (id: string, mode: NonNullable<Open>["mode"]) => setOpen((o) => (o && o.id === id && o.mode === mode ? null : { id, mode }));
  const block = (u: AdminUser, blocked: boolean) =>
    a.run(() => api(`/admin/users/${enc(u.id)}`, { method: "PATCH", body: { blocked } }), blocked ? `${u.name} ist temporär gesperrt.` : `${u.name} ist wieder aktiv.`).then((ok) => ok && setOpen(null));
  const remove = (u: AdminUser) =>
    a.run(() => api(`/admin/users/${enc(u.id)}`, { method: "DELETE" }), `${u.name} wurde endgültig gelöscht.`).then((ok) => ok && setOpen(null));
  const panel = (u: AdminUser) => {
    if (!open || open.id !== u.id) return null;
    return (
      <tr className="row-panel"><td colSpan={5}>
        {open.mode === "edit" ? <EditUser u={u} a={a} done={() => setOpen(null)} /> : null}
        {open.mode === "block" ? (
          <div className="choice">
            <p className="choice__q">Was soll mit <strong>{u.name}</strong> passieren?</p>
            <div className="choice__grid">
              <button className="choice__opt" disabled={a.busy} onClick={() => block(u, true)}>
                <span className="choice__title">Temporär sperren</span>
                <span className="choice__text">Anmelden geht nicht mehr, alle Sitzungen und Zugangslinks enden sofort. Jederzeit wieder entsperrbar.</span>
              </button>
              {u.role !== "admin" ? (
                <button className="choice__opt choice__opt--danger" disabled={a.busy} onClick={() => setOpen({ id: u.id, mode: "delete" })}>
                  <span className="choice__title">Endgültig löschen</span>
                  <span className="choice__text">Passkeys, Sitzungen, Gruppen, Freigaben und E-Mail werden gelöscht. Nur der Name bleibt als „Endgültig gelöscht“ stehen.</span>
                </button>
              ) : null}
            </div>
            <button className="btn btn--small btn--ghost" onClick={() => setOpen(null)}>Abbrechen</button>
          </div>
        ) : null}
        {open.mode === "delete" ? (
          <div className="choice choice--danger" role="alertdialog" aria-label={`${u.name} endgültig löschen`}>
            <p className="choice__q"><strong>{u.name}</strong> wirklich endgültig löschen? Das lässt sich nicht rückgängig machen.</p>
            <div className="row">
              <button className="btn btn--small btn--danger-solid" disabled={a.busy} onClick={() => remove(u)}>Ja, endgültig löschen</button>
              <button className="btn btn--small btn--ghost" onClick={() => setOpen(null)}>Abbrechen</button>
            </div>
          </div>
        ) : null}
      </td></tr>
    );
  };
  return (
    <section>
      <h2>Nutzer</h2>
      {noMail ? <p className="status status--warn" role="note">{plural(noMail, "aktive Person hat", "aktive Personen haben")} noch keine E-Mail und {noMail === 1 ? "bekommt" : "bekommen"} keine Infos zu neuen Tools. Über „Bearbeiten“ ergänzen.</p> : null}
      {active.length === 0 ? <p className="empty">Keine aktiven Nutzer.</p> : (
        <div className="tablewrap"><table className="users">
          <thead><tr><th scope="col">Name</th><th scope="col">Rolle</th><th scope="col">Gruppen</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>
            {active.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td><strong>{u.name}</strong>{u.role === "admin" ? <> <span className="pill pill--admin">Admin</span></> : null}<div className={`meta${u.email ? "" : " meta--warn"}`}>{u.email ?? "keine E-Mail"}</div></td>
                  <td>{u.role === "admin" ? "Administration" : "Mitglied"}</td>
                  <td>{groupsOf(u)}</td>
                  <td><span className={`pill ${STATE.active.pill}`}>{STATE.active.label}</span></td>
                  <td><div className="row row--end">
                    <button className="btn btn--small btn--ghost" aria-expanded={open?.id === u.id && open.mode === "edit"} onClick={() => toggle(u.id, "edit")}>Bearbeiten</button>
                    {u.id !== me ? <button className="btn btn--small btn--danger" aria-expanded={open?.id === u.id && open.mode !== "edit"} disabled={a.busy} onClick={() => toggle(u.id, "block")}>Sperren</button> : <span className="meta">Du</span>}
                  </div></td>
                </tr>
                {panel(u)}
              </Fragment>
            ))}
          </tbody>
        </table></div>
      )}
      <Former count={former.length}>
        <div className="tablewrap"><table className="users">
          <thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Seit</th><th scope="col" colSpan={2}><span className="sr-only">Aktionen</span></th></tr></thead>
          <tbody>
            {former.map((u) => {
              const st = userState(u);
              return (
                <Fragment key={u.id}>
                  <tr className={st === "deleted" ? "is-deleted" : ""}>
                    <td><strong>{u.name}</strong>{u.email ? <div className="meta">{u.email}</div> : null}</td>
                    <td><span className={`pill ${STATE[st].pill}`}>{STATE[st].label}</span></td>
                    <td>{st === "deleted" ? fmt(u.deleted_at) : ""}</td>
                    <td colSpan={2}>{st === "paused" ? (
                      <div className="row row--end">
                        <button className="btn btn--small" disabled={a.busy} onClick={() => block(u, false)}>Entsperren</button>
                        {u.role !== "admin" ? <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => toggle(u.id, "delete")}>Endgültig löschen</button> : null}
                      </div>
                    ) : null}</td>
                  </tr>
                  {panel(u)}
                </Fragment>
              );
            })}
          </tbody>
        </table></div>
      </Former>
      <p className="hint" style={{ marginTop: "1rem" }}>Sperren und Löschen entziehen keine Konten beim Anbieter selbst (z. B. Team-Plätze). Diese separat widerrufen.</p>
    </section>
  );
}

function EditUser({ u, a, done }: { u: AdminUser; a: P["a"]; done: () => void }) {
  const [f, setF] = useState({ first_name: u.first_name || u.name.split(" ")[0], last_name: u.last_name, email: u.email ?? "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const mailBad = f.email.trim() !== "" && !EMAIL_RE.test(f.email.trim());
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim() || !f.last_name.trim() || mailBad) { a.setMsg({ tone: "error", text: "Bitte Vorname, Nachname und eine gültige E-Mail angeben." }); return; }
    const ok = await a.run(() => api(`/admin/users/${enc(u.id)}`, { method: "PATCH", body: { first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim() } }), "Gespeichert.");
    if (ok) done();
  }
  return (
    <form className="form form--grid edit-user" onSubmit={save} noValidate>
      <Field id={`u-first-${u.id}`} label="Vorname"><input id={`u-first-${u.id}`} value={f.first_name} onChange={set("first_name")} maxLength={60} required /></Field>
      <Field id={`u-last-${u.id}`} label="Nachname"><input id={`u-last-${u.id}`} value={f.last_name} onChange={set("last_name")} maxLength={60} required /></Field>
      <div className="full"><Field id={`u-mail-${u.id}`} label="E-Mail"><input id={`u-mail-${u.id}`} type="email" value={f.email} onChange={set("email")} maxLength={254} aria-invalid={mailBad} /></Field></div>
      <div className="row full">
        <button className="btn btn--small" disabled={a.busy}>Speichern</button>
        <button type="button" className="btn btn--small btn--ghost" onClick={done}>Abbrechen</button>
      </div>
    </form>
  );
}

/** Which mail went to whom. Addresses and contents are not stored. */
function Mails({ d }: { d: AdminData }) {
  return (
    <section>
      <h2>Mails</h2>
      <p className="meta">Die letzten 100 Mails. „Gesendet“ heißt: Resend hat die Mail angenommen. Adressen und Inhalte werden hier nicht gespeichert.</p>
      {d.mails.length === 0 ? <div className="empty"><h3>Noch keine Mails</h3><p>Einladungen und Infos zu neuen Tools erscheinen hier.</p></div> : (
        <div className="tablewrap"><table>
          <thead><tr><th scope="col">Datum</th><th scope="col">Art</th><th scope="col">An</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {d.mails.map((m) => (
              <tr key={m.id}>
                <td>{fmt(m.created_at)}</td>
                <td>{m.kind === "invite" ? "Einladung" : `Neues Tool: ${m.tool_name}`}</td>
                <td>{m.recipient}</td>
                <td><span className={`pill ${m.ok ? "pill--ok" : "pill--bad"}`}>{m.ok ? "Gesendet" : "Fehlgeschlagen"}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
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
              const candidates = d.users.filter((u) => !u.deleted_at && !members.some((m) => m.user_id === u.id));
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

const EMPTY: Omit<Tool, "id"> = { name: "", provider: "", description: "", url: "https://", access_type: "own_account", instructions: "", plan: "", price: "", details: "", logo_url: "", category: "" };

function validUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}

function Tools({ d, a }: P) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [grantTarget, setGrantTarget] = useState<Record<string, string>>({});
  const [notify, setNotify] = useState(true);
  // New tools are granted to the group "Freunde", so its active members are who gets the mail.
  const friends = d.groups.find((g) => g.name === "Freunde");
  const reach = d.users.filter((u) => userState(u) === "active" && (!friends || d.memberships.some((m) => m.group_id === friends.id && m.user_id === u.id)));
  const reachMail = reach.filter((u) => u.email).length;
  const urlBad = touched && !validUrl(form.url);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault(); setTouched(true);
    if (!form.name.trim() || !form.provider.trim() || !validUrl(form.url)) { a.setMsg({ tone: "error", text: "Name, Anbieter und eine HTTPS-URL ohne Zugangsdaten sind Pflicht." }); return; }
    let mail = undefined as NewToolMailResult | undefined;
    const ok = await a.run(async () => {
      if (editId) await api(`/admin/tools/${enc(editId)}`, { method: "PATCH", body: form });
      else mail = (await api<{ mail?: NewToolMailResult }>("/admin/tools", { method: "POST", body: { ...form, notify } })).mail;
    }, editId ? "Tool aktualisiert." : "Tool angelegt.");
    if (ok && mail) a.setMsg({ tone: mail.failed ? "error" : "success", text: `Tool angelegt. ${mailSummary(mail)}` });
    if (ok) { setForm(EMPTY); setEditId(null); setTouched(false); setNotify(true); }
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
                    <div className="tool-head"><ToolLogo name={t.name} logo={t.logo_url} /><div><h3 style={{ margin: 0 }}>{t.name}</h3><div className="meta">{t.provider} · {ACCESS_LABEL[t.access_type]} · {categoryLabel(t.category)}</div></div></div>
                    <div className="row">
                      <button className="btn btn--small btn--ghost" onClick={() => { setEditId(t.id); setForm({ name: t.name, provider: t.provider, description: t.description, url: t.url, access_type: t.access_type, instructions: t.instructions, plan: t.plan ?? "", price: t.price ?? "", details: t.details ?? "", logo_url: t.logo_url ?? "", category: t.category ?? "" }); }}>Bearbeiten</button>
                      <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Tool ${t.name} löschen?`) && a.run(() => api(`/admin/tools/${enc(t.id)}`, { method: "DELETE" }), "Tool gelöscht.")}>Löschen</button>
                    </div>
                  </div>
                  <LoginEditor tool={t} d={d} a={a} />
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
                      <optgroup label="Personen">{d.users.filter((u) => !u.deleted_at && !grants.some((g) => g.user_id === u.id)).map((u) => <option key={u.id} value={`u:${u.id}`}>{u.name}</option>)}</optgroup>
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
        {!editId ? <p className="hint" style={{ marginTop: "-.5rem" }}>Neue Tools sind automatisch für alle freigegeben (Gruppe „Freunde“). Einzelne Freigaben kannst du links entziehen.</p> : null}
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
        <Field id="t-cat" label="Kategorie" hint="Genau eine Kategorie pro Tool. Danach wird links gefiltert.">
          <select id="t-cat" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-describedby="t-cat-hint">
            <option value="">Ohne Kategorie</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field id="t-desc" label="Beschreibung" hint="Kurz, in Stichwörtern. Erscheint klein auf der Karte."><textarea id="t-desc" value={form.description} onChange={set("description")} maxLength={500} /></Field>
        <Field id="t-ins" label="Kurze Anleitung" hint="Keine Passwörter, Schlüssel oder Codes eintragen.">
          <textarea id="t-ins" value={form.instructions} onChange={set("instructions")} maxLength={2000} aria-describedby="t-ins-hint" />
        </Field>
        <Field id="t-logo" label="Logo" hint="Vorhandenes Logo auswählen (/logos/…) oder eine https://-Adresse. Leer = Kachel mit Initialen.">
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <ToolLogo name={form.name || "?"} logo={form.logo_url} />
            <input id="t-logo" list="t-logo-list" value={form.logo_url ?? ""} onChange={set("logo_url")} maxLength={2000} aria-describedby="t-logo-hint" />
          </div>
          <datalist id="t-logo-list">{LOCAL_LOGOS.map((k) => <option key={k} value={`/logos/${k}.svg`} />)}</datalist>
        </Field>
        <Field id="t-plan" label="Plan / Tarif" hint="z. B. Creator. Erscheint im Seitenfenster."><input id="t-plan" value={form.plan ?? ""} onChange={set("plan")} maxLength={80} /></Field>
        <Field id="t-price" label="Preis bei Neukauf" hint="z. B. 22 $ pro Monat, Stand Datum."><input id="t-price" value={form.price ?? ""} onChange={set("price")} maxLength={160} /></Field>
        <Field id="t-det" label="Dokumentation" hint="Für das Seitenfenster. &#8222;## Titel&#8220; für Überschriften, &#8222;- &#8220; für Listen. Keine Passwörter oder Codes.">
          <textarea id="t-det" rows={10} value={form.details ?? ""} onChange={set("details")} maxLength={8000} />
        </Field>
        {!editId ? (
          <div className="field">
            <label className="check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Alle aktiven Nutzer per Mail informieren</label>
            <p className="hint">{notify ? `Geht an ${plural(reachMail, "Person", "Personen")} mit Zugriff und E-Mail${reach.length > reachMail ? `, ${reach.length - reachMail} ohne E-Mail` : ""}. Logindaten stehen nie in der Mail.` : "Es wird keine Mail verschickt."}</p>
          </div>
        ) : null}
        <div className="row">
          <button className="btn" disabled={a.busy}>{editId ? "Änderungen speichern" : notify ? "Tool anlegen und informieren" : "Tool anlegen"}</button>
          {editId ? <button type="button" className="btn btn--ghost" onClick={() => { setEditId(null); setForm(EMPTY); setTouched(false); }}>Abbrechen</button> : null}
        </div>
      </form>
    </div>
  );
}

const FIELD_LABEL: Record<LoginField, string> = { email: "E-Mail", username: "Nutzername", password: "Passwort", totp: "2FA-Schlüssel", website: "Website" };

/** Shared login of one tool. Write-only: stored values are never sent back to the browser. */
function LoginEditor({ tool, d, a }: { tool: Tool; d: AdminData; a: P["a"] }) {
  const stored = d.credentials.find((c) => c.tool_id === tool.id);
  const [open, setOpen] = useState(false);
  const empty = { email: "", username: "", password: "", totp: "", website: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await a.run(() => api(`/admin/credentials/${enc(tool.id)}`, { method: "PATCH", body: f }), "Logindaten gespeichert.");
    if (ok) { setF(empty); setOpen(false); }
  }
  const has = (k: LoginField) => stored?.fields.includes(k);
  const ph = (k: LoginField) => (has(k) ? "Hinterlegt. Leer lassen = unverändert" : "");
  return (
    <div className="login-admin">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="meta" style={{ margin: 0 }}>
          Login: {stored ? stored.fields.map((k) => FIELD_LABEL[k]).join(", ") : "keine Logindaten"}
          {stored ? ` · aktualisiert ${fmt(stored.updated_at)}` : ""}
        </p>
        <div className="row">
          <button className="btn btn--small btn--ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{stored ? "Logindaten ändern" : "Logindaten hinterlegen"}</button>
          {stored ? <button className="btn btn--small btn--danger" disabled={a.busy} onClick={() => confirm(`Logindaten von ${tool.name} löschen? Offene Links werden widerrufen.`) && a.run(() => api(`/admin/credentials/${enc(tool.id)}`, { method: "DELETE" }), "Logindaten gelöscht.")}>Löschen</button> : null}
        </div>
      </div>
      {open ? (
        <form className="form form--grid login-form" onSubmit={save} noValidate autoComplete="off">
          {!d.vaultReady ? <p className="status full" role="alert">Auf dem Server fehlt noch CREDENTIALS_KEY. Speichern klappt erst danach.</p> : null}
          <Field id={`l-mail-${tool.id}`} label="E-Mail"><input id={`l-mail-${tool.id}`} value={f.email} onChange={set("email")} placeholder={ph("email")} autoComplete="off" /></Field>
          <Field id={`l-user-${tool.id}`} label="Nutzername"><input id={`l-user-${tool.id}`} value={f.username} onChange={set("username")} placeholder={ph("username")} autoComplete="off" /></Field>
          <Field id={`l-pw-${tool.id}`} label="Passwort"><input id={`l-pw-${tool.id}`} type="password" value={f.password} onChange={set("password")} placeholder={ph("password")} autoComplete="new-password" /></Field>
          <Field id={`l-totp-${tool.id}`} label="2FA-Schlüssel" hint="Base32-Code oder otpauth://-Link aus der 2FA-Einrichtung (nicht der 6-stellige Code).">
            <input id={`l-totp-${tool.id}`} type="password" value={f.totp} onChange={set("totp")} placeholder={ph("totp")} autoComplete="off" aria-describedby={`l-totp-${tool.id}-hint`} />
          </Field>
          <Field id={`l-web-${tool.id}`} label="Login-Website" hint="Optional. Leer = Tool-URL."><input id={`l-web-${tool.id}`} value={f.website} onChange={set("website")} placeholder={ph("website") || tool.url} autoComplete="off" aria-describedby={`l-web-${tool.id}-hint`} /></Field>
          <div className="row full">
            <button className="btn btn--small" disabled={a.busy}>Speichern</button>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => { setOpen(false); setF(empty); }}>Abbrechen</button>
          </div>
          <p className="hint full">Wird verschlüsselt gespeichert und nie wieder angezeigt. Freunde sehen die Daten nur über „Login öffnen“.</p>
        </form>
      ) : null}
    </div>
  );
}

/** All access links with click counter; revoke any of them. */
function Links({ d, a }: P) {
  const now = Date.now();
  const status = (l: AdminData["links"][number]) => l.revoked_at ? "Widerrufen" : new Date(l.expires_at).getTime() <= now ? "Abgelaufen" : "Aktiv";
  return (
    <section>
      <h2>Zugangslinks</h2>
      <p className="meta">Jeder Klick auf „Login öffnen“ nutzt den offenen Link des Browsers oder erstellt einen neuen. Gültig 6 Stunden, nur in dem Browser, in dem er erstellt wurde.</p>
      {d.links.length === 0 ? <div className="empty"><h3>Noch keine Links</h3><p>Sobald jemand „Login öffnen“ nutzt, erscheint der Link hier.</p></div> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Tool</th><th>Person</th><th>Erstellt</th><th>Gültig bis</th><th>Aufrufe</th><th>Status</th><th><span className="sr-only">Aktion</span></th></tr></thead>
            <tbody>
              {d.links.map((l) => (
                <tr key={l.id}>
                  <td>{l.tool_name}</td><td>{l.user_name}</td><td>{fmt(l.created_at)}</td><td>{fmt(l.expires_at)}</td>
                  <td><strong>{l.views}</strong>{l.last_viewed_at ? <span className="meta"> · zuletzt {fmt(l.last_viewed_at)}</span> : null}</td>
                  <td><span className={`pill ${status(l) === "Aktiv" ? "pill--ok" : ""}`}>{status(l)}</span></td>
                  <td>{status(l) === "Aktiv" ? <button className="btn btn--small btn--ghost" disabled={a.busy} onClick={() => a.run(() => api(`/admin/links/${enc(l.id)}`, { method: "DELETE" }), "Link widerrufen.")}>Widerrufen</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
