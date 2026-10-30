#!/usr/bin/env node
// Pre-translates the site into fixed languages with the Claude API and writes static files:
//   src/i18n/dictionaries/<lang>.json   (UI texts, translated from de.json)
//   content/<lang>/{projects,blog}/*.md (content files, translated from content/{projects,blog})
// Usage: ANTHROPIC_API_KEY=... node scripts/translate.mjs [--langs es,fr] [--force] [--dry]
// Unchanged sources are skipped via src/i18n/.translation-cache.json (hashes only, no text).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse as parseYaml } from "yaml";

const root = path.resolve(import.meta.dirname, "..");
const DICT_DIR = path.join(root, "src/i18n/dictionaries");
const CONTENT = path.join(root, "content");
const CACHE_FILE = path.join(root, "src/i18n/.translation-cache.json");
const MODEL = process.env.TRANSLATE_MODEL || "claude-sonnet-5-5";

// Keep in sync with PREBUILT_CODES in src/i18n/config.ts (everything except de and the hand-written en).
const NAMES = {
  es: "Spanish", fr: "French", it: "Italian", pt: "Portuguese", nl: "Dutch", pl: "Polish", tr: "Turkish", ru: "Russian",
  uk: "Ukrainian", zh: "Chinese (Simplified)", ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
};

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const langs = (opt("langs")?.split(",").map((s) => s.trim()).filter(Boolean)) ?? Object.keys(NAMES);
const unknown = langs.filter((l) => !NAMES[l]);
if (unknown.length) { console.error(`Unknown language code(s): ${unknown.join(", ")}. Add them to NAMES here and LANGUAGES in src/i18n/config.ts.`); process.exit(1); }
if (!flag("dry") && !process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY (never commit it)."); process.exit(1); }

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + "\n");

const SYSTEM = (language) => `You are a professional translator for a personal academic website (deep learning student, TU Munich / UC Berkeley). Translate the German source into ${language}.
Rules:
- Natural, concise, neutral tone; keep the meaning exactly, add or remove nothing.
- Never translate or alter: proper names (Jonas Juchelka, Jacob Rossel, Cloyne Court, Future Founders Initiative, TU Munich/TU München, UC Berkeley, Keras, Notion, TRM), the paper title "Less is More: Recursive Reasoning with Tiny Networks", code, math symbols, URLs, email addresses.
- Keep placeholders like {n} and all Markdown syntax exactly as is.
- Output only the requested format, no commentary.`;

async function claude(language, user) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM(language), messages: [{ role: "user", content: user }] }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error("Claude API: retries exhausted");
}

const stripFence = (s) => s.replace(/^```(?:json|markdown|md)?\s*\n/, "").replace(/\n```\s*$/, "");

/** Same keys, same array lengths, strings stay strings, placeholders {x} are preserved. */
function sameShape(src, out, where = "") {
  if (typeof src === "string") {
    if (typeof out !== "string" || !out.trim()) throw new Error(`${where}: expected non-empty string`);
    const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    if (ph(src) !== ph(out)) throw new Error(`${where}: placeholders changed`);
  } else if (Array.isArray(src)) {
    if (!Array.isArray(out) || out.length !== src.length) throw new Error(`${where}: array length changed`);
    src.forEach((v, i) => sameShape(v, out[i], `${where}[${i}]`));
  } else if (src && typeof src === "object") {
    if (!out || typeof out !== "object") throw new Error(`${where}: expected object`);
    const a = Object.keys(src).sort().join(), b = Object.keys(out).sort().join();
    if (a !== b) throw new Error(`${where}: keys changed`);
    for (const k of Object.keys(src)) sameShape(src[k], out[k], `${where}.${k}`);
  }
}

async function translateDict(lang) {
  const srcText = fs.readFileSync(path.join(DICT_DIR, "de.json"), "utf8");
  const h = sha(srcText + MODEL);
  const file = path.join(DICT_DIR, `${lang}.json`);
  if (!flag("force") && cache[lang]?.dict === h && fs.existsSync(file)) return console.log(`  ui: up to date`);
  if (flag("dry")) return console.log(`  ui: would translate`);
  const out = JSON.parse(stripFence(await claude(NAMES[lang], `Translate all string values of this JSON from German. Keep every key unchanged. Return valid JSON only.\n\n${srcText}`)));
  sameShape(JSON.parse(srcText), out);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  (cache[lang] ??= {}).dict = h;
  saveCache();
  console.log(`  ui: written`);
}

function splitFile(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  return { fm: parseYaml(m[1]), body: m[2] };
}

async function translateContent(lang) {
  for (const dir of ["projects", "blog"]) {
    const srcDir = path.join(CONTENT, dir);
    if (!fs.existsSync(srcDir)) continue;
    for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))) {
      const raw = fs.readFileSync(path.join(srcDir, file), "utf8");
      const { fm } = splitFile(raw);
      if (dir === "blog" && fm.draft !== false) continue; // drafts are not published, so not translated either
      const key = `${dir}/${file}`;
      const h = sha(raw + MODEL);
      const outFile = path.join(CONTENT, lang, dir, file);
      if (!flag("force") && cache[lang]?.[key] === h && fs.existsSync(outFile)) { console.log(`  ${key}: up to date`); continue; }
      if (flag("dry")) { console.log(`  ${key}: would translate`); continue; }
      const text = stripFence(await claude(NAMES[lang],
        `Translate this Markdown file from German. Translate the frontmatter values of title, summary, role, context and every entry of tags, and the whole body. Keep all other frontmatter keys and values (slug, order, published, date, updated, draft) byte-identical. Return the complete file, starting with the --- frontmatter.\n\n${raw}`));
      const { fm: out } = splitFile(text);
      for (const k of ["slug", "order", "published", "date", "updated", "draft"]) {
        if (JSON.stringify(out[k]) !== JSON.stringify(fm[k])) throw new Error(`${key}: frontmatter field "${k}" changed`);
      }
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, text.endsWith("\n") ? text : text + "\n");
      (cache[lang] ??= {})[key] = h;
      saveCache();
      console.log(`  ${key}: written`);
    }
  }
}

for (const lang of langs) {
  console.log(`${lang} (${NAMES[lang]})`);
  try { await translateDict(lang); await translateContent(lang); }
  catch (e) { console.error(`  FAILED: ${e.message}`); process.exitCode = 1; }
}
