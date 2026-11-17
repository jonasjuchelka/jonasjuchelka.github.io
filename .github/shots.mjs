import { chromium } from "playwright-core";
import fs from "node:fs";
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const B = "http://localhost:4000";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
async function shot(name, w, h, path, fn, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  if (opts.dark) await p.addInitScript(() => localStorage.setItem("theme", "dark"));
  await p.goto(B + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  if (fn) { await fn(p); await p.waitForTimeout(700); }
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: !!opts.full });
  await ctx.close();
}
const D = [1440, 900], P = [390, 844];
await shot("m-home", ...D, "/");
await shot("m-home-say", ...D, "/", (p) => p.evaluate(() => window.scrollTo(0, 620)));
await shot("m-home-map", ...D, "/", (p) => p.evaluate(() => document.getElementById("map-h").scrollIntoView()));
await shot("m-home-place", ...D, "/", (p) => p.click(".map-chips li:first-child button"));
await shot("m-proj", ...D, "/projects/");
await shot("m-proj-full", 1440, 900, "/projects/", null, { full: true });
await shot("m-proj-sheet", ...D, "/projects/", (p) => p.click(".tl .st >> nth=1"));
await shot("m-proj-dark", ...D, "/projects/", (p) => p.evaluate(() => document.getElementById("weg").scrollIntoView()), { dark: true });
await shot("m-kontakt", ...D, "/kontakt/");
await shot("m-blog", ...D, "/blog/");
await shot("m-en-proj", ...D, "/en/projects/");
await shot("p-home", ...P, "/");
await shot("p-home-scroll", ...P, "/", (p) => p.evaluate(() => window.scrollTo(0, 320)));
await shot("p-home-map", ...P, "/", (p) => p.evaluate(() => document.getElementById("map-h").scrollIntoView()));
await shot("p-proj", ...P, "/projects/", (p) => p.evaluate(() => window.scrollTo(0, 330)));
await shot("p-proj-tl", ...P, "/projects/", (p) => p.evaluate(() => document.getElementById("weg").scrollIntoView()));
await shot("p-proj-sheet", ...P, "/projects/", (p) => p.click(".tl .st >> nth=2"));
await shot("p-proj-aw", ...P, "/projects/", (p) => p.evaluate(() => document.getElementById("aw-h").scrollIntoView()));
await shot("p-kontakt", ...P, "/kontakt/");
await shot("p-home-dark", ...P, "/", (p) => p.evaluate(() => window.scrollTo(0, 320)), { dark: true });
fs.copyFileSync("artifacts/jonas-website/out/media/lebenslauf.pdf", `${out}/lebenslauf.pdf`);
await b.close();
console.log("ok", fs.readdirSync(out).length);
