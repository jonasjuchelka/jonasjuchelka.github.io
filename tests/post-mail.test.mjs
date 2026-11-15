import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEnvelope, cleanText, dmarcPass, sign, verify, underLimit, makeSlug, validSlug, frontmatter, publishGedanke, unpublishGedanke, MAX_PER_DAY, MAX_RAW_BYTES } from "../workers/post-mail/core.js";

const env = { ALLOWED_SENDERS: "me@example.test", SECRET_LOCAL_PART: "g-geheim123", GITHUB_TOKEN: "t", REPO: "o/r" };
const good = { rawSize: 2000, envelopeFrom: "me@example.test", headerFrom: "Me <me@example.test>", to: "g-geheim123@post.example.test", authResults: "mx.cloudflare.net; dkim=pass; spf=pass; dmarc=pass header.from=example.test" };

test("gültige Mail wird angenommen", () => assert.equal(checkEnvelope(good, env).ok, true));
test("gefälschter Absender (nicht auf der Liste) wird abgelehnt", () => {
  const r = checkEnvelope({ ...good, envelopeFrom: "evil@example.test", headerFrom: "evil@example.test" }, env);
  assert.deepEqual([r.ok, r.reason], [false, "sender"]);
});
test("Umschlag ≠ Header-Absender wird abgelehnt (Spoofing)", () => {
  const r = checkEnvelope({ ...good, envelopeFrom: "evil@example.test" }, env);
  assert.deepEqual([r.ok, r.reason], [false, "sender"]);
});
test("richtiger Absender, aber DMARC fail/none/fehlend wird abgelehnt", () => {
  for (const a of ["dmarc=fail", "dmarc=none", "dkim=pass", "", undefined, "dmarc=pass; dmarc=fail"]) {
    const r = checkEnvelope({ ...good, authResults: a }, env);
    assert.deepEqual([r.ok, r.reason], [false, "dmarc"], String(a));
  }
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
test("dmarcPass: nur eindeutiges pass", () => {
  assert.ok(dmarcPass("dmarc=pass")); assert.ok(!dmarcPass("dmarc=temperror"));
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
test("Zurücknehmen-Signatur: gültig nur für den eigenen Slug, Secret und 64 Hex", async () => {
  const slug = makeSlug(new Date("2026-11-15T08:00:00Z"), () => "abc123");
  assert.equal(slug, "g-20261115-080000-abc123"); assert.ok(validSlug(slug));
  const s = await sign(slug, "geheim");
  assert.ok(await verify(slug, s, "geheim"));
  assert.ok(!(await verify(slug, s, "anders")));
  assert.ok(!(await verify("g-20261115-080001-abc123", s, "geheim")));
  assert.ok(!(await verify("../../etc/passwd", s, "geheim")));
  assert.ok(!(await verify(slug, "x".repeat(64), "geheim")));
});
test("Frontmatter ist gültiges YAML-Muster mit kind gedanke und ohne Tags", () => {
  const f = frontmatter("g-20261115-080000-abc123", "Erste Zeile: mit \"Anführungszeichen\"\nZweite", new Date("2026-11-15T08:00:00Z"));
  assert.match(f, /^---\ntitle: "Erste Zeile: mit \\"Anführungszeichen\\""\n/);
  assert.match(f, /kind: gedanke\ntags: \[\]\ndraft: false\n---\n\nErste Zeile/);
});
test("GitHub: veröffentlichen schreibt nur nach content/gedanken, Zurücknehmen löscht mit sha", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push([init.method ?? "GET", String(url), init.body]);
    if ((init.method ?? "GET") === "GET") return new Response(JSON.stringify({ sha: "abc" }), { status: 200 });
    return new Response("{}", { status: 200 });
  };
  await publishGedanke(env, "g-20261115-080000-abc123", "x");
  assert.match(calls[0][1], /contents\/content\/gedanken\/g-20261115-080000-abc123\.md$/);
  assert.equal(await unpublishGedanke(env, "g-20261115-080000-abc123"), "removed");
  assert.equal(JSON.parse(calls[2][2]).sha, "abc");
  globalThis.fetch = async () => new Response("", { status: 404 });
  assert.equal(await unpublishGedanke(env, "g-20261115-080000-abc123"), "gone");
});
