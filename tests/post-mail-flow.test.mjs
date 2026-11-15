// Ende-zu-Ende-Test des Mail-Workers (index.js) ohne Cloudflare: "cloudflare:email" und "postal-mime" werden durch kleine Attrappen ersetzt,
// GitHub durch ein gefälschtes fetch. Geprüft wird der ganze Ablauf: Mail → Antwort mit Links → Klick → veröffentlicht → zurückgenommen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

const stubs = {
  "cloudflare:email": "export class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } }",
  "postal-mime": "export default { async parse(raw) { const t = typeof raw === 'string' ? raw : await new Response(raw).text(); return { text: t.split('\\r\\n\\r\\n').slice(1).join('\\r\\n\\r\\n') }; } };",
};
register("data:text/javascript," + encodeURIComponent(`
const stubs = ${JSON.stringify(stubs)};
export async function resolve(spec, ctx, next) {
  if (spec in stubs) return { url: "data:text/javascript," + encodeURIComponent(stubs[spec]), shortCircuit: true };
  return next(spec, ctx);
}`));
const { default: worker } = await import("../workers/post-mail/index.js");

const ME = "me@example.test", SECRET_ADDR = "abcdef0123456789abcdef0123456789";
const AUTH_OK = `mx.cloudflare.net; dkim=pass header.d=example.test header.s=s1 header.b=x; dmarc=pass header.from=example.test policy.dmarc=none; spf=pass (mx.cloudflare.net: domain of ${ME} designates 2001:db8::1 as permitted sender) smtp.mailfrom=${ME}; arc=none smtp.remote-ip="2001:db8::1"`;
const AUTH_SPOOF = "mx.cloudflare.net; dkim=none; dmarc=fail header.from=example.test policy.dmarc=none; spf=softfail smtp.mailfrom=" + ME;

function setup({ replyFails = 0 } = {}) {
  const kv = new Map();
  const env = {
    REPO: "o/r", BRANCH: "main", ALLOWED_SENDERS: ME, SECRET_LOCAL_PART: SECRET_ADDR, PUBLIC_URL: "https://w.example.test",
    GITHUB_TOKEN: "t", UNPUBLISH_SECRET: "z".repeat(64),
    STATE: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => void kv.set(k, v), delete: async (k) => void kv.delete(k) },
  };
  const gh = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method ?? "GET"; gh.push({ method, url: String(url), body: init.body ? JSON.parse(init.body) : null });
    if (method === "GET") return new Response(JSON.stringify({ sha: "abc" }), { status: 200 });
    return new Response("{}", { status: method === "PUT" ? 201 : 200 });
  };
  const replies = [];
  let fails = replyFails;
  const mail = ({ from = ME, auth = AUTH_OK, to = `${SECRET_ADDR}@post.example.test`, text = "Erste Zeile\r\nZweite Zeile" } = {}) => {
    const raw = `From: Me <${from}>\r\nSubject: x\r\n\r\n${text}`;
    return {
      from, to, raw, rawSize: raw.length, rejected: null,
      headers: new Headers({ from: `Me <${from}>`, "authentication-results": auth, "message-id": "<m1@mail.example.test>" }),
      setReject(r) { this.rejected = r; },
      async reply(m) { if (fails-- > 0) throw new Error("reply refused"); replies.push(m); },
    };
  };
  const decode = (raw) => new TextDecoder().decode(Uint8Array.from(atob(raw.split("\r\n\r\n")[1].replace(/\r\n/g, "")), (c) => c.charCodeAt(0)));
  const links = (raw) => [...decode(raw).matchAll(/https:\/\/w\.example\.test\/[cu]\/\S+/g)].map((m) => m[0]);
  const call = (url, method = "GET") => worker.fetch(new Request(url, { method }), env).then(async (r) => ({ status: r.status, html: await r.text() }));
  return { env, kv, gh, replies, mail, decode, links, call };
}

test("Ablauf: Mail → Bestätigungsmail → erst nach Klick + POST online → Zurücknehmen", async () => {
  const t = setup();
  const m = t.mail();
  await worker.email(m, t.env);
  assert.equal(m.rejected, null);
  assert.equal(t.gh.length, 0, "vor der Bestätigung darf nichts zu GitHub");
  assert.equal(t.replies.length, 1);
  assert.equal(t.replies[0].to, ME, "Antwort geht an den echten Absender");
  const [confirm, undo] = t.links(t.replies[0].raw);
  assert.match(confirm, /\/c\/g-\d{8}-\d{6}-[a-z0-9]{6}\/[0-9a-f]{64}$/);
  assert.match(undo, /\/u\//);

  const view = await t.call(confirm);                    // Mail-Scanner öffnet den Link: nichts passiert
  assert.match(view.html, /Erste Zeile/);
  assert.equal(t.gh.length, 0);

  const ok = await t.call(confirm, "POST");
  assert.match(ok.html, /Veröffentlicht/);
  assert.equal(t.gh.length, 1);
  assert.equal(t.gh[0].method, "PUT");
  assert.match(t.gh[0].url, /contents\/artifacts\/jonas-website\/content\/gedanken\/g-[\w-]+\.md$/);
  const md = new TextDecoder().decode(Uint8Array.from(atob(t.gh[0].body.content), (c) => c.charCodeAt(0)));
  assert.match(md, /^---\ntitle: "Erste Zeile"\n/);
  assert.match(md, /kind: gedanke\n/);
  assert.match(md, /\n\nErste Zeile\nZweite Zeile\n$/);

  const again = await t.call(confirm, "POST");           // Doppelklick: kein zweites Veröffentlichen
  assert.match(again.html, /Nichts zu bestätigen/);
  assert.equal(t.gh.length, 1);

  assert.match((await t.call(confirm.replace("/c/", "/u/"), "POST")).html, /Link ungültig/, "Bestätigungslink taugt nicht zum Löschen");
  const del = await t.call(undo, "POST");
  assert.match(del.html, /Zurückgenommen/);
  assert.deepEqual(t.gh.slice(1).map((c) => c.method), ["GET", "DELETE"]);
});

test("Gefälschte Mail (DMARC fail) wird abgelehnt: keine Antwort, kein Entwurf, nichts bei GitHub", async () => {
  const t = setup();
  const m = t.mail({ auth: AUTH_SPOOF });
  await worker.email(m, t.env);
  assert.equal(m.rejected, "Nicht angenommen");
  assert.equal(t.replies.length, 0);
  assert.equal(t.kv.size, 0);
  assert.equal(t.gh.length, 0);
});

test("Fremder Absender, falsche Adresse, nicht konfiguriert → abgelehnt", async () => {
  for (const [opts, envPatch] of [[{ from: "evil@example.test" }, {}], [{ to: "rate@post.example.test" }, {}], [{}, { ALLOWED_SENDERS: "ERSETZEN" }]]) {
    const t = setup(); Object.assign(t.env, envPatch);
    const m = t.mail(opts);
    await worker.email(m, t.env);
    assert.equal(m.rejected, "Nicht angenommen", JSON.stringify(opts));
    assert.equal(t.kv.size, 0);
  }
});

test("Antwort kommt von der Empfangsadresse (Cloudflare-Regel), genau ein Versuch", async () => {
  const t = setup();
  await worker.email(t.mail(), t.env);
  assert.equal(t.replies.length, 1);
  assert.equal(t.replies[0].from, `${SECRET_ADDR}@post.example.test`);
  assert.match(t.replies[0].raw, new RegExp(`^From: <${SECRET_ADDR}@post\\.example\\.test>\\r$`, "m"));
  const t2 = setup({ replyFails: 1 });                 // scheitert der Versuch: kein zweiter (Cloudflare würde ihn ablehnen)
  await worker.email(t2.mail(), t2.env);
  assert.equal(t2.replies.length, 0);
});

test("Ungültige oder manipulierte Links ändern nichts", async () => {
  const t = setup();
  await worker.email(t.mail(), t.env);
  const [confirm] = t.links(t.replies[0].raw);
  const bad = confirm.slice(0, -1) + (confirm.endsWith("0") ? "1" : "0");
  assert.match((await t.call(bad, "POST")).html, /Link ungültig/);
  assert.match((await t.call("https://w.example.test/c/../../x/" + "0".repeat(64), "POST")).html, /Link ungültig/);
  assert.equal(t.gh.length, 0);
});

test("Doppelt veröffentlicht (GitHub 422) → 'Schon veröffentlicht', kein Fehler", async () => {
  const t = setup();
  await worker.email(t.mail(), t.env);
  const [confirm] = t.links(t.replies[0].raw);
  globalThis.fetch = async () => new Response("{}", { status: 422 });
  assert.match((await t.call(confirm, "POST")).html, /Schon veröffentlicht/);
});

test("Leere und zu lange Mails: Antwort, aber kein Entwurf", async () => {
  const t = setup();
  await worker.email(t.mail({ text: "" }), t.env);
  await worker.email(t.mail({ text: "x".repeat(2001) }), t.env);
  assert.equal(t.replies.length, 2);
  assert.equal([...t.kv.keys()].filter((k) => k.startsWith("p:")).length, 0);
});
