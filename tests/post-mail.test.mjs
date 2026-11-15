import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEnvelope, cleanText, dmarcPass, authCheck, sign, verify, underLimit, makeSlug, validSlug, frontmatter, publishGedanke, unpublishGedanke, savePending, takePending, replyMime, MAX_PER_DAY, MAX_RAW_BYTES } from "../workers/post-mail/core.js";

const env = { ALLOWED_SENDERS: "me@example.test", SECRET_LOCAL_PART: "g-geheim123", GITHUB_TOKEN: "t", REPO: "o/r" };
// So sieht Cloudflares Header bei einer echten Gmail-Mail aus (Adressen und IPs ersetzt). policy.dmarc=none ist Googles Richtlinie, kein Ergebnis.
const REAL = (d = "example.test") => `mx.cloudflare.net; dkim=pass header.d=${d} header.s=20260707 header.b=thyxyvnJ; dmarc=pass header.from=${d} policy.dmarc=none; spf=none (mx.cloudflare.net: no SPF records found for postmaster@mail-pj1-x102e.google.com) smtp.helo=mail-pj1-x102e.google.com; spf=pass (mx.cloudflare.net: domain of me@${d} designates 2001:db8::1 as permitted sender) smtp.mailfrom=me@${d}; arc=pass smtp.remote-ip="2001:db8::1"`;
const good = { rawSize: 2000, envelopeFrom: "me@example.test", headerFrom: "Me <me@example.test>", to: "g-geheim123@post.example.test", authResults: REAL() };
const SECRET = "x".repeat(64);

test("gültige Mail wird angenommen", () => assert.equal(checkEnvelope(good, env).ok, true));
test("gefälschter Absender (nicht auf der Liste) wird abgelehnt", () => {
  const r = checkEnvelope({ ...good, envelopeFrom: "evil@example.test", headerFrom: "evil@example.test" }, env);
  assert.deepEqual([r.ok, r.reason], [false, "sender"]);
});
test("Umschlag ≠ Header-Absender wird abgelehnt (Spoofing)", () => {
  const r = checkEnvelope({ ...good, envelopeFrom: "evil@example.test" }, env);
  assert.deepEqual([r.ok, r.reason], [false, "sender"]);
});
test("echte Gmail-Mail (policy.dmarc=none) wird angenommen – Regression 15.11.", () => {
  assert.deepEqual(authCheck(REAL("gmail.com"), "gmail.com"), { ok: true });
  assert.equal(checkEnvelope({ ...good, envelopeFrom: "a@gmail.com", headerFrom: "A <a@gmail.com>", authResults: REAL("gmail.com") }, { ...env, ALLOWED_SENDERS: "a@gmail.com" }).ok, true);
});
test("richtiger Absender, aber Authentifizierung fehlt/scheitert → abgelehnt", () => {
  const cases = {
    "kein Header": undefined, "leer": "",
    "dmarc fail": "mx.cloudflare.net; dkim=pass header.d=example.test; dmarc=fail header.from=example.test",
    "dmarc none": "mx.cloudflare.net; dkim=pass header.d=example.test; dmarc=none header.from=example.test",
    "dmarc fehlt": "mx.cloudflare.net; dkim=pass header.d=example.test; spf=pass",
    "dkim fehlt (nur SPF)": "mx.cloudflare.net; spf=pass smtp.mailfrom=me@example.test; dmarc=pass header.from=example.test",
    "dkim none": "mx.cloudflare.net; dkim=none; dmarc=pass header.from=example.test",
    "dkim fremde Domain": "mx.cloudflare.net; dkim=pass header.d=evil.test; dmarc=pass header.from=example.test",
    "dmarc fremde Domain": "mx.cloudflare.net; dkim=pass header.d=example.test; dmarc=pass header.from=evil.test",
    "fremder Server": "mx.evil.test; dkim=pass header.d=example.test; dmarc=pass header.from=example.test",
    "pass und fail gemischt": "mx.cloudflare.net; dkim=pass header.d=example.test; dmarc=pass header.from=example.test; dmarc=fail header.from=example.test",
  };
  for (const [name, a] of Object.entries(cases)) {
    const r = checkEnvelope({ ...good, authResults: a }, env);
    assert.deepEqual([r.ok, r.reason], [false, "auth"], name);
  }
});
test("Fälschung: eingeschleuster zweiter Header mit pass hebt Cloudflares fail nicht auf", () => {
  const cf = "mx.cloudflare.net; dkim=none; dmarc=fail header.from=example.test policy.dmarc=none; spf=softfail smtp.mailfrom=me@example.test";
  const fake = "mx.cloudflare.net; dkim=pass header.d=example.test; dmarc=pass header.from=example.test";
  assert.equal(dmarcPass(`${cf}, ${fake}`, "example.test"), false);   // so verbindet Headers.get() mehrere Header
  assert.equal(dmarcPass(`${fake}, ${cf}`, "example.test"), false);
});
test("Fälschung: echtes Ergebnis in Kommentar oder Anführungszeichen verstecken wird abgelehnt", () => {
  const tricks = [
    'mx.cloudflare.net; dkim=pass header.d=evil.test header.s=x(; dmarc=fail header.from=example.test; spf=none smtp.helo=y); dmarc=pass header.from=example.test; dkim=pass header.d=example.test',
    'mx.cloudflare.net; dkim=pass header.d=evil.test header.s="; dmarc=fail header.from=example.test"; dmarc=pass header.from=example.test; dkim=pass header.d=example.test',
    'mx.cloudflare.net; dkim=pass header.d=example.test header.s=x(; dmarc=pass header.from=example.test',
    'mx.cloudflare.net; dkim=pass header.d=example.test x="; dmarc=pass header.from=example.test',
    'mx.cloudflare.net; dkim=pass header.d=example.test) dmarc=pass header.from=example.test',
  ];
  for (const t of tricks) assert.equal(authCheck(t, "example.test").why, "header_kaputt", t);
  // Eingeschleust ohne Klammern (z. B. über HELO): das echte fail bleibt stehen → abgelehnt
  assert.equal(authCheck("mx.cloudflare.net; dkim=none; dmarc=fail header.from=example.test; spf=none smtp.helo=x;dmarc=pass header.from=example.test;dkim=pass header.d=example.test", "example.test").ok, false);
});
test("falsche Empfängeradresse wird abgelehnt", () => {
  assert.equal(checkEnvelope({ ...good, to: "post@post.example.test" }, env).reason, "wrong_recipient");
});
test("zu große Mail wird abgelehnt", () => {
  assert.equal(checkEnvelope({ ...good, rawSize: MAX_RAW_BYTES + 1 }, env).reason, "too_large");
  assert.equal(checkEnvelope({ ...good, rawSize: 0 }, env).reason, "too_large");
});
test("nicht konfigurierter Worker (ERSETZEN) nimmt nichts an", () => {
  assert.equal(checkEnvelope(good, { ...env, ALLOWED_SENDERS: "ERSETZEN" }).reason, "not_configured");
  assert.equal(checkEnvelope(good, { ...env, SECRET_LOCAL_PART: "ERSETZEN" }).reason, "wrong_recipient");
});
test("dmarcPass: nur Cloudflare-Header mit eindeutigem pass", () => {
  assert.ok(dmarcPass(REAL(), "example.test")); assert.ok(!dmarcPass("dmarc=pass", "example.test"));
  assert.ok(!dmarcPass(REAL().replace("dmarc=pass", "dmarc=temperror"), "example.test"));
});
test("HTML/Skript im Text wird maskiert, Steuerzeichen und Signatur entfernt", () => {
  const t = cleanText("Hallo <script>alert(1)</script> <b>fett</b>‮\u0007\n\n\n\nZeile\n-- \nSignatur");
  assert.ok(!t.includes("<")); assert.ok(!t.includes("‮")); assert.ok(!t.includes("Signatur"));
  assert.match(t, /&lt;script>/);
});
test("Tageslimit: ab dem 11. Mail abgelehnt", async () => {
  const m = new Map(); const kv = { get: async (k) => m.get(k), put: async (k, v) => void m.set(k, v) };
  for (let i = 0; i < MAX_PER_DAY; i++) assert.equal(await underLimit(kv), true);
  assert.equal(await underLimit(kv), false);
});
test("Signaturen: nur eigener Slug, eigenes Secret, eigener Zweck, 64 Hex", async () => {
  const slug = makeSlug(new Date("2026-11-15T08:00:00Z"), () => "abc123");
  assert.equal(slug, "g-20261115-080000-abc123"); assert.ok(validSlug(slug));
  const s = await sign(slug, SECRET);
  assert.ok(await verify(slug, s, SECRET));
  assert.ok(!(await verify(slug, s, "y".repeat(64))));
  assert.ok(!(await verify("g-20261115-080001-abc123", s, SECRET)));
  assert.ok(!(await verify("../../etc/passwd", s, SECRET)));
  assert.ok(!(await verify(slug, "x".repeat(64), SECRET)));
  const c = await sign(slug, SECRET, "confirm");
  assert.notEqual(c, s);
  assert.ok(await verify(slug, c, SECRET, "confirm"));
  assert.ok(!(await verify(slug, c, SECRET)));            // Bestätigungslink taugt nicht zum Zurücknehmen
  assert.ok(!(await verify(slug, s, SECRET, "confirm"))); // und umgekehrt
  await assert.rejects(() => sign(slug, "kurz"));          // zu kurzes Secret wird nicht benutzt
});
test("Entwurf: einmal abholbar, danach weg", async () => {
  const m = new Map(); const kv = { get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v), delete: async (k) => void m.delete(k) };
  await savePending(kv, "g-20261115-080000-abc123", "inhalt");
  assert.equal(await takePending(kv, "g-20261115-080000-abc123"), "inhalt");
  assert.equal(await takePending(kv, "g-20261115-080000-abc123"), null);
});
test("Antwortmail: Umlaute im Betreff kodiert, Text base64, Threading-Header gesetzt", () => {
  const raw = replyMime({ from: "antwort@post.example.test", to: "me@example.test", subject: "Gedanke bestätigen", inReplyTo: "<abc@mail.gmail.com>", body: "Grüße\nZeile", messageId: "x@post.example.test" });
  assert.match(raw, /^Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r$/m);
  assert.match(raw, /^In-Reply-To: <abc@mail\.gmail\.com>\r$/m);
  assert.match(raw, /^References: <abc@mail\.gmail\.com>\r$/m);
  assert.match(raw, /^Date: /m);
  const body = raw.split("\r\n\r\n")[1].replace(/\r\n/g, "");
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))), "Grüße\nZeile");
  assert.ok(!/[^\x00-\x7f]/.test(raw));   // nur ASCII auf der Leitung
});
test("Frontmatter ist gültiges YAML-Muster mit kind gedanke und ohne Tags", () => {
  const f = frontmatter("g-20261115-080000-abc123", "Erste Zeile: mit \"Anführungszeichen\"\nZweite", new Date("2026-11-15T08:00:00Z"));
  assert.match(f, /^---\ntitle: "Erste Zeile: mit \\"Anführungszeichen\\""\n/);
  assert.match(f, /kind: gedanke\ntags: \[\]\ndraft: false\n---\n\nErste Zeile/);
});
test("GitHub: veröffentlichen schreibt nur nach artifacts/jonas-website/content/gedanken, Zurücknehmen löscht mit sha", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push([init.method ?? "GET", String(url), init.body]);
    if ((init.method ?? "GET") === "GET") return new Response(JSON.stringify({ sha: "abc" }), { status: 200 });
    return new Response("{}", { status: 200 });
  };
  await publishGedanke(env, "g-20261115-080000-abc123", "x");
  assert.match(calls[0][1], /contents\/artifacts\/jonas-website\/content\/gedanken\/g-20261115-080000-abc123\.md$/);
  assert.equal(await unpublishGedanke(env, "g-20261115-080000-abc123"), "removed");
  assert.equal(JSON.parse(calls[2][2]).sha, "abc");
  globalThis.fetch = async () => new Response("", { status: 404 });
  assert.equal(await unpublishGedanke(env, "g-20261115-080000-abc123"), "gone");
});
