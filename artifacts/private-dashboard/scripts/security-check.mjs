// Read-only security smoke test for the private area. Safe to run against production:
// no login, no brute force, about 15 requests. Usage:
//   node artifacts/private-dashboard/scripts/security-check.mjs https://jonas-private.vercel.app
const base = (process.argv[2] ?? "https://jonas-private.vercel.app").replace(/\/+$/, "");
const origin = new URL(base).origin;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });
const req = (path, init = {}) => fetch(base + path, { redirect: "manual", ...init });
const post = (path, body, headers = {}) => req(path, { method: "POST", headers: { "content-type": "application/json", origin, ...headers }, body: JSON.stringify(body) });

const page = await req("/login");
const h = (k) => page.headers.get(k) ?? "";
check("CSP gesetzt", /default-src 'self'/.test(h("content-security-policy")) && /frame-ancestors 'none'/.test(h("content-security-policy")), h("content-security-policy").slice(0, 60));
check("HSTS aktiv", /max-age=\d{7,}/.test(h("strict-transport-security")), h("strict-transport-security"));
check("Kein Einbetten (X-Frame-Options)", h("x-frame-options") === "DENY", h("x-frame-options"));
check("nosniff", h("x-content-type-options") === "nosniff");
check("Kein Referrer", h("referrer-policy") === "no-referrer");
check("Kein X-Powered-By", !page.headers.has("x-powered-by"));
check("Nicht im Cache", /no-store/.test(h("cache-control")));

for (const p of ["/api/tools", "/api/admin", "/api/account"]) {
  const r = await req(p); check(`${p} ohne Login gesperrt`, r.status === 401, String(r.status));
}
let r = await post("/api/logout", {}, { origin: "https://evil.example" });
check("Fremde Origin abgelehnt (CSRF)", r.status === 403, String(r.status));
r = await req("/api/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
check("Fehlende Origin abgelehnt", r.status === 403, String(r.status));
r = await req("/api/logout", { method: "POST", headers: { "content-type": "text/plain", origin }, body: "{}" });
check("Nur JSON angenommen", r.status === 415, String(r.status));
r = await post("/api/invite/options", { token: "x".repeat(43) });
check("Falscher Einladungs-Token abgelehnt", r.status === 400, String(r.status));
r = await post("/api/access/view", { token: "y".repeat(43) });
check("Zugangslink ohne Login gesperrt", r.status === 401, String(r.status));
r = await post("/api/access-links", { toolId: "00000000-0000-0000-0000-000000000000" });
check("Neuer Zugangslink ohne Login gesperrt", r.status === 401, String(r.status));
r = await post("/api/admin/invitations", { name: "x" });
check("Admin-Aktion ohne Login gesperrt", r.status === 401, String(r.status));
r = await post("/api/auth/verify", { response: { id: "x" } });
check("Login ohne Challenge abgelehnt", r.status === 400, String(r.status));
r = await post("/api/auth/options", { pad: "z".repeat(40_000) });
check("Zu große Anfrage abgelehnt", r.status === 413, String(r.status));
r = await req("/_next/static/chunks/main.js.map");
check("Keine Source-Maps öffentlich", r.status !== 200, String(r.status));

const width = Math.max(...results.map((x) => x.name.length));
for (const x of results) console.log(`${x.ok ? "OK  " : "FAIL"}  ${x.name.padEnd(width)}  ${x.detail}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
