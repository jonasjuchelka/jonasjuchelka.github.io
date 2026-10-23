// Ensure GitHub Pages serves 404.html, remove blog placeholder route, and guard against private leaks.
import fs from "node:fs";
import path from "node:path";
const out = path.resolve("out");
const p404 = path.join(out, "404", "index.html");
if (!fs.existsSync(path.join(out, "404.html")) && fs.existsSync(p404)) fs.copyFileSync(p404, path.join(out, "404.html"));
fs.rmSync(path.join(out, "blog", "_none"), { recursive: true, force: true });
fs.rmSync(path.join(out, "blog", "_none.txt"), { force: true });
fs.writeFileSync(path.join(out, ".nojekyll"), "");
if (fs.existsSync(path.join(out, "CNAME"))) throw new Error("Unexpected CNAME in export");
const bad = /DATABASE_URL|SESSION_SECRET|PRIVATE_KEY|jonasjuchelka\.com/;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name);
  if (e.isDirectory()) walk(f); else if (/\.(html|js|json|xml|txt)$/.test(f) && bad.test(fs.readFileSync(f, "utf8"))) throw new Error("Forbidden content in " + f); } })(out);
console.log("postbuild ok:", out);
