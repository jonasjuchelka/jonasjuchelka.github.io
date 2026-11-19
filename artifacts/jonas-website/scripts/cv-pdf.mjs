// Erzeugt den Lebenslauf als PDF aus content/cv.json, bei jedem Build neu (postbuild), auf Deutsch und Englisch.
// Regeln nach dem Consulting-Leitfaden (docs/style-guide.md, Abschnitt PDF):
//   - genau eine A4-Seite; Schriftgröße 9 bis 11 pt; Ziel rund 600 Wörter (± 100), sonst Warnung im Build-Log
//   - nüchtern: weißes Blatt, schwarzer Text, Königsblau nur für Überschriften, Linien und Links
//   - je Station: Organisation (mit Link und Pfeil ↗) und Ort, darunter Rolle und Zeitraum, dann ergebnisorientierte Punkte
//     (Tätigkeit, Kontext, Ergebnis); die Punkte stehen im Block "cv" jeder Station, getrennt von der Website
//   - Abschnitte überschneidungsfrei: Ausbildung, Berufserfahrung, Gründungen und Engagement, Stipendien, Kenntnisse
//   - passt es nicht: erst Zusatzpunkte (cv.extra), dann optionale Stationen (cv.optional) weg, dann kleiner bis 9 pt
// Ohne Abhängigkeiten: eigener kleiner PDF-Schreiber, Markenschriften (TTF) eingebettet, Logo als Vektor, Foto als JPEG.
// Datenschutz: keine Telefonnummer, keine Adresse, kein Geburtsdatum. Die E-Mail steht nur als Bild darin (wie auf /kontakt/).
// Aufruf: node scripts/cv-pdf.mjs [ausgabe.pdf] [--lang de|en]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const FONTS = path.resolve(root, "../../lib/design-tokens/fonts");
const args = process.argv.slice(2);
const li = args.indexOf("--lang");
const lang = li >= 0 ? args[li + 1] : "de";
const out = args.find((a, i) => !a.startsWith("--") && (li < 0 || i !== li + 1)) ?? path.join(root, "out", "media", lang === "de" ? "lebenslauf.pdf" : `cv-${lang}.pdf`);

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const base = readJson(path.join(root, "content", "cv.json"));
let tr = base;
if (lang !== "de") {
  try {
    const t = readJson(path.join(root, "content", lang, "cv.json"));
    // Übersetzung nur nehmen, wenn sie dieselben Stationen in derselben Reihenfolge hat.
    if (t.entries.length === base.entries.length && t.entries.every((e, i) => e.id === base.entries[i].id)) tr = t;
  } catch { /* fehlt: deutsche Fassung */ }
}
const EXTRA = readJson(path.join(root, "content", "cv-extra.json"));
const X = EXTRA[lang] ?? EXTRA.de;
const SITE = { web: "https://jonasjuchelka.com/", linkedin: "https://www.linkedin.com/in/jonasjuchelka/", github: "https://github.com/jonasjuchelka" };

// ---------- TrueType: Breiten für WinAnsi lesen ----------
const WIN = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
const UNI = Object.fromEntries(Object.entries(WIN).map(([u, w]) => [w, +u]));
const winCode = (cp) => (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff) ? cp : WIN[cp] ?? 0x3f);
const uniOf = (code) => UNI[code] ?? code;

function readTtf(file) {
  const buf = fs.readFileSync(file);
  const tables = {};
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) { const o = 12 + i * 16; tables[buf.toString("latin1", o, o + 4)] = buf.readUInt32BE(o + 8); }
  const head = tables.head, hhea = tables.hhea, hmtx = tables.hmtx, cmap = tables.cmap, os2 = tables["OS/2"];
  const upem = buf.readUInt16BE(head + 18);
  const bbox = [buf.readInt16BE(head + 36), buf.readInt16BE(head + 38), buf.readInt16BE(head + 40), buf.readInt16BE(head + 42)];
  const ascent = buf.readInt16BE(hhea + 4), descent = buf.readInt16BE(hhea + 6), nh = buf.readUInt16BE(hhea + 34);
  const cap = os2 && buf.readUInt16BE(os2) >= 2 ? buf.readInt16BE(os2 + 88) : ascent;
  let sub = -1;
  for (let i = 0, cnt = buf.readUInt16BE(cmap + 2); i < cnt; i++) {
    const r = cmap + 4 + i * 8, pid = buf.readUInt16BE(r), eid = buf.readUInt16BE(r + 2), off = buf.readUInt32BE(r + 4);
    if (buf.readUInt16BE(cmap + off) === 4 && (pid === 3 && eid === 1 || pid === 0)) { sub = cmap + off; if (pid === 3) break; }
  }
  if (sub < 0) throw new Error(`${file}: keine cmap Format 4`);
  const segX2 = buf.readUInt16BE(sub + 6), ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
  const glyph = (cp) => {
    for (let s = 0; s < segX2; s += 2) {
      const end = buf.readUInt16BE(ends + s); if (cp > end) continue;
      const start = buf.readUInt16BE(starts + s); if (cp < start) return 0;
      const delta = buf.readInt16BE(deltas + s), ro = buf.readUInt16BE(ranges + s);
      if (!ro) return (cp + delta) & 0xffff;
      const g = buf.readUInt16BE(ranges + s + ro + (cp - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
  const adv = (g) => buf.readUInt16BE(hmtx + Math.min(g, nh - 1) * 4);
  const widths = [];
  for (let c = 32; c <= 255; c++) widths.push(Math.round((adv(glyph(uniOf(c))) * 1000) / upem));
  const s = (v) => Math.round((v * 1000) / upem);
  return { buf, widths, bbox: bbox.map(s), ascent: s(ascent), descent: s(descent), cap: s(cap) };
}

// Vier Rollen wie auf der Website: Überschriften, UI, Fließtext, Labels.
const FACES = {
  H: readTtf(path.join(FONTS, "PlusJakartaSans-SemiBold.ttf")),
  R: readTtf(path.join(FONTS, "Catamaran-Regular.ttf")),
  L: readTtf(path.join(FONTS, "Catamaran-Light.ttf")),
  M: readTtf(path.join(FONTS, "Mukta-Regular.ttf")),
};
const FONT_NAMES = { H: "PlusJakartaSans-SemiBold", R: "Catamaran-Regular", L: "Catamaran-Light", M: "Mukta-Regular" };
const width = (txt, f, size) => [...txt].reduce((w, ch) => w + (FACES[f].widths[winCode(ch.codePointAt(0)) - 32] ?? 500), 0) * size / 1000;
const enc = (txt) => Buffer.from([...txt].map((ch) => winCode(ch.codePointAt(0))));
const pdfStr = (txt) => "(" + enc(txt).toString("latin1").replace(/[\\()]/g, (m) => "\\" + m) + ")";

// ---------- Farben (Tokens aus lib/design-tokens) ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const C = {
  koenig: hex("#1c2b36"), text: hex("#06060d"), muted: hex("#2d4354"), line: hex("#b0c4d4"), white: hex("#ffffff"),
};
const rgb = (c, stroke = false) => `${c.map((v) => v.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}`;

// ---------- Seite ----------
const W = 595.28, H = 841.89, ML = 40, MR = 40, TOP = 32, BOTTOM = 28;
const CW = W - ML - MR;

let P = null; // aktuelle Seite { ops, annots }
const op = (s) => P.ops.push(s);
const text = (x, y, txt, f, size, color = C.text) => op(`BT ${rgb(color)} /${f} ${size.toFixed(2)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfStr(txt)} Tj ET`);
const textR = (xr, y, txt, f, size, color) => text(xr - width(txt, f, size), y, txt, f, size, color);
const rect = (x, y, w, h, color) => op(`${rgb(color)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
const link = (x, y, w, h, url) => P.annots.push({ rect: [x, y, x + w, y + h], url });
function arrow(x, y, s, color) {
  // kleiner Pfeil nach rechts oben (wie ↗ auf der Website), als Linien gezeichnet
  op(`${rgb(color, true)} 0.7 w 1 J 1 j ${x.toFixed(2)} ${y.toFixed(2)} m ${(x + s).toFixed(2)} ${(y + s).toFixed(2)} l ${(x + s * 0.3).toFixed(2)} ${(y + s).toFixed(2)} m ${(x + s).toFixed(2)} ${(y + s).toFixed(2)} l ${(x + s).toFixed(2)} ${(y + s * 0.3).toFixed(2)} l S`);
}
// Text mit Link: Wort(e) plus kleinem Pfeil; gibt die Breite zurück
function linkedText(x, y, txt, f, size, color, url) {
  const w = width(txt, f, size);
  text(x, y, txt, f, size, color);
  if (!url) return w;
  const a = size * 0.42;
  arrow(x + w + size * 0.22, y + size * 0.12, a, color);
  link(x - 1, y - size * 0.25, w + size * 0.3 + a + 2, size * 1.15, url);
  return w + size * 0.3 + a;
}
function wrap(txt, f, size, maxW) {
  const lines = []; let cur = "";
  for (const word of String(txt).split(/\s+/).filter(Boolean)) {
    const t = cur ? `${cur} ${word}` : word;
    if (width(t, f, size) <= maxW || !cur) cur = t; else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Logo: Originalpfade aus src/components/BrandLogo.tsx, als PDF-Vektor (viewBox 0 0 812.72 695.9).
const LOGO_PATHS = [...fs.readFileSync(path.join(root, "src/components/BrandLogo.tsx"), "utf8").matchAll(/"d":\s*"([^"]+)"/g)].map((m) => m[1]);
const LOGO_VB = [812.72, 695.9];
function svgToPdf(d, x0, yTop, k) {
  const tok = d.match(/[MmLlHhVvCcSsQqZz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  const P2 = (x, y) => `${(x0 + x * k).toFixed(2)} ${(yTop - y * k).toFixed(2)}`;
  const outOps = []; let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, lc = null;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), c = cmd.toUpperCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (c === "Z") { outOps.push("h"); cx = sx; cy = sy; lc = null; continue; }
    if (c === "M") { cx = ox + num(); cy = oy + num(); sx = cx; sy = cy; outOps.push(`${P2(cx, cy)} m`); cmd = rel ? "l" : "L"; lc = null; continue; }
    if (c === "L") { cx = ox + num(); cy = oy + num(); outOps.push(`${P2(cx, cy)} l`); lc = null; continue; }
    if (c === "H") { cx = (rel ? cx : 0) + num(); outOps.push(`${P2(cx, cy)} l`); lc = null; continue; }
    if (c === "V") { cy = (rel ? cy : 0) + num(); outOps.push(`${P2(cx, cy)} l`); lc = null; continue; }
    if (c === "C" || c === "S") {
      let x1, y1;
      if (c === "C") { x1 = ox + num(); y1 = oy + num(); } else { [x1, y1] = lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy]; }
      const x2 = ox + num(), y2 = oy + num(), x = ox + num(), y = oy + num();
      outOps.push(`${P2(x1, y1)} ${P2(x2, y2)} ${P2(x, y)} c`); lc = [x2, y2]; cx = x; cy = y; continue;
    }
    if (c === "Q") {
      const qx = ox + num(), qy = oy + num(), x = ox + num(), y = oy + num();
      outOps.push(`${P2(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy))} ${P2(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y))} ${P2(x, y)} c`);
      cx = x; cy = y; lc = null; continue;
    }
    throw new Error(`Logo: Pfadbefehl ${cmd} wird nicht unterstützt`);
  }
  return outOps.join(" ");
}
function logo(x, yTop, w, color) {
  const k = w / LOGO_VB[0];
  op(`${rgb(color)} ${LOGO_PATHS.map((d) => svgToPdf(d, x, yTop, k)).join(" ")} f`);
  return LOGO_VB[1] * k;
}

// Bilder: JPEG direkt einbetten (DCTDecode). Foto mit ganzer Schulterbreite, E-Mail als Bild.
function jpegSize(buf) {
  let o = 2;
  while (o < buf.length) {
    if (buf[o] !== 0xff) { o++; continue; }
    const m = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7), comps: buf[o + 9] };
    o += 2 + len;
  }
  throw new Error("JPEG ohne SOF");
}
const loadJpeg = (name) => { const f = path.join(root, "assets", "cv", name); if (!fs.existsSync(f)) return null; const buf = fs.readFileSync(f); return { buf, ...jpegSize(buf) }; };
const IMAGES = { Im1: loadJpeg("foto.jpg"), Im2: loadJpeg("mail.jpg") };
const image = (name, x, y, w, h) => { if (IMAGES[name]) op(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${name} Do Q`); };
function roundClip(x, y, w, h, r) {
  const c = 0.5523 * r;
  op(`q ${x + r} ${y} m ${x + w - r} ${y} l ${x + w - r + c} ${y} ${x + w} ${y + r - c} ${x + w} ${y + r} c ${x + w} ${y + h - r} l ${x + w} ${y + h - r + c} ${x + w - r + c} ${y + h} ${x + w - r} ${y + h} c ${x + r} ${y + h} l ${x + r - c} ${y + h} ${x} ${y + h - r + c} ${x} ${y + h - r} c ${x} ${y + r} l ${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c h W n`);
}

// ---------- Inhalt ----------
const byId = new Map(tr.entries.map((e) => [e.id, e]));
const order = new Map(base.entries.map((e, i) => [e.id, i]));
const sorted = [...base.entries].sort((a, b) => b.year - a.year || order.get(a.id) - order.get(b.id));
const sectionOf = (e) => e.kind === "award" ? "awards"
  : e.tags.includes("Gründen") || e.tags.includes("Engagement") ? "founding"
  : e.tags.includes("Studium") || e.tags.includes("Schule") ? "education"
  : e.tags.includes("Arbeit") ? "experience" : "founding";
const SECTIONS = ["education", "experience", "founding"];
const linkOf = (b, t) => { const i = Number.isInteger(b.cv?.link) ? b.cv.link : null; return i === null ? null : t.links[i]?.url ?? null; };

// level 0: alles; 1: ohne Zusatzpunkte; 2: ohne optionale Stationen; 3: höchstens zwei Punkte je Station
function entryData(id, level) {
  const b = base.entries[order.get(id)], t = byId.get(id) ?? b;
  const cv = t.cv ?? {};
  if (b.cv?.hide || (level >= 2 && b.cv?.optional)) return null;
  let points = Array.isArray(cv.points) ? [...cv.points] : t.points.slice(0, 2);
  if (level < 1) points.push(...(cv.extra ?? []));
  if (level >= 3) points = points.slice(0, 2);
  return { org: cv.org ?? t.org, role: cv.title ?? t.title, place: t.place ?? "", date: t.date, points, url: linkOf(b, t) };
}

function build(sz, level) {
  const st = { body: sz, org: sz + 0.7, sec: sz + 1.6, lead: sz * 1.2 };
  const words = [];
  const count = (...t) => t.forEach((x) => x && words.push(...String(x).split(/\s+/).filter(Boolean)));
  const blocks = [];
  const sectionHead = (title) => ({
    h: st.sec + 9,
    draw: (y) => {
      text(ML, y - st.sec - 1, title.toUpperCase(), "H", st.sec * 0.9, C.koenig);
      rect(ML, y - st.sec - 4, CW, 0.8, C.koenig);
    },
  });
  const entryBlock = (e) => {
    const lh = st.lead;
    const placeW = width(e.place, "R", st.body);
    const dateW = width(e.date, "R", st.body);
    const orgLines = wrap(e.org, "H", st.org, CW - placeW - 24 - (e.url ? st.org : 0));
    const roleLines = wrap(e.role, "R", st.body, CW - dateW - 16);
    const pts = e.points.map((p) => wrap(p, "R", st.body, CW - 11));
    count(e.org, e.role, e.place, e.date, ...e.points);
    const h = orgLines.length * lh + roleLines.length * lh + pts.reduce((a, l) => a + l.length * lh, 0) + (pts.length ? 1 : 0) + sz * 0.45;
    return {
      h,
      draw: (y0) => {
        let y = y0;
        orgLines.forEach((l, i) => {
          y -= lh;
          if (i === orgLines.length - 1) linkedText(ML, y + 2, l, "H", st.org, C.koenig, e.url);
          else text(ML, y + 2, l, "H", st.org, C.koenig);
          if (i === 0 && e.place) textR(W - MR, y + 2, e.place, "R", st.body, C.muted);
        });
        roleLines.forEach((l, i) => {
          y -= lh;
          text(ML, y + 2, l, "R", st.body, C.muted);
          if (i === 0) textR(W - MR, y + 2, e.date, "R", st.body, C.muted);
        });
        if (pts.length) y -= 1;
        for (const lines of pts) {
          rect(ML + 1.5, y - lh + 2 + st.body * 0.3, st.body * 0.3, st.body * 0.3, C.koenig);
          for (const l of lines) { y -= lh; text(ML + 11, y + 2, l, "R", st.body, C.text); }
        }
      },
    };
  };
  for (const key of SECTIONS) {
    const list = sorted.filter((e) => e.kind === "station" && sectionOf(e) === key).map((e) => entryData(e.id, level)).filter(Boolean);
    if (!list.length) continue;
    const head = sectionHead(X.sections[key]);
    count(X.sections[key]);
    list.forEach((e, i) => {
      const b = entryBlock(e);
      blocks.push(i === 0 ? { h: head.h + b.h, draw: (y) => { head.draw(y); b.draw(y - head.h); } } : b);
    });
  }
  // Stipendien und Auszeichnungen: eine Zeile je Eintrag (Name mit Link, Beschreibung, Jahr rechts)
  const awards = sorted.filter((e) => e.kind === "award" && !e.cv?.hide).map((b) => {
    const t = byId.get(b.id) ?? b;
    return { org: t.cv?.org ?? t.title, desc: t.cv?.title ?? t.why, date: t.date, url: linkOf(b, t) };
  });
  if (awards.length) {
    const head = sectionHead(X.sections.awards);
    count(X.sections.awards);
    // Beschreibung in einer festen Spalte, damit die Zeilen ruhig untereinander stehen
    const col = Math.max(...awards.map((a) => width(a.org, "H", st.body) + (a.url ? st.body : 0))) + 16;
    const dw = Math.max(...awards.map((a) => width(a.date, "R", st.body)));
    const rows = awards.map((a) => {
      count(a.org, a.desc, a.date);
      const dl = wrap(a.desc, "R", st.body, CW - col - dw - 12);
      return { a, ow: col - 12, dl, h: Math.max(1, dl.length) * st.lead };
    });
    blocks.push({
      h: head.h + rows.reduce((x, r) => x + r.h, 0) + sz * 0.6,
      draw: (y0) => {
        head.draw(y0); let y = y0 - head.h;
        for (const r of rows) {
          const yy = y - st.lead + 2;
          linkedText(ML, yy, r.a.org, "H", st.body, C.koenig, r.a.url);
          r.dl.forEach((l, i) => text(ML + r.ow + 12, yy - i * st.lead, l, "R", st.body, C.muted));
          textR(W - MR, yy, r.a.date, "R", st.body, C.muted);
          y -= r.h;
        }
      },
    });
  }
  // Kenntnisse und Interessen: getrennte Zeilen, Bezeichnung fett
  {
    const head = sectionHead(X.sections.skills);
    count(X.sections.skills);
    const lw = Math.max(...X.skills.map(([k]) => width(`${k}:`, "H", st.body))) + 8;
    const rows = X.skills.map(([k, v]) => { count(k, v); return { k, lines: wrap(v, "R", st.body, CW - lw) }; });
    blocks.push({
      h: head.h + rows.reduce((x, r) => x + r.lines.length * st.lead, 0),
      draw: (y0) => {
        head.draw(y0); let y = y0 - head.h;
        for (const r of rows) {
          text(ML, y - st.lead + 2, `${r.k}:`, "H", st.body, C.koenig);
          for (const l of r.lines) { y -= st.lead; text(ML + lw, y + 2, l, "R", st.body, C.text); }
        }
      },
    });
  }
  return { blocks, words: words.length };
}

const HEAD_H = 80;
function paginate(blocks) {
  const pages = [[]]; let y = H - TOP - HEAD_H;
  for (const b of blocks) {
    if (y - b.h < BOTTOM + 10) { pages.push([]); y = H - TOP - 20; }
    pages.at(-1).push({ y, h: b.h, draw: b.draw }); y -= b.h;
  }
  return pages;
}

// Suche: möglichst viel Inhalt, möglichst große Schrift; erst bis 9,5 pt mit allen Stufen, dann bis 9 pt.
let chosen = null;
const SIZES_A = [10.5, 10.25, 10, 9.75, 9.5], SIZES_B = [9.25, 9];
outer: for (const sizes of [SIZES_A, SIZES_B]) {
  for (let level = 0; level <= 3; level++) {
    for (const sz of sizes) {
      const r = build(sz, level);
      const pages = paginate(r.blocks);
      if (pages.length === 1) { chosen = { pages, sz, level, words: r.words }; break outer; }
    }
  }
}
if (!chosen) { const r = build(9, 3); chosen = { pages: paginate(r.blocks), sz: 9, level: 3, words: r.words }; console.warn("cv-pdf: passt nicht auf eine Seite"); }
if (chosen.words > 700 || chosen.words < 400) console.warn(`cv-pdf: ${chosen.words} Wörter (Ziel 500 bis 700)`);

// ---------- Kopf und Fußzeile ----------
function drawHead() {
  const top = H - TOP;
  // Foto rechts oben, ganze Schulterbreite, leicht gerundet
  const photo = IMAGES.Im1;
  const ph = 74, pw = photo ? ph * photo.w / photo.h : 0;
  if (photo) { roundClip(W - MR - pw, top - ph, pw, ph, 6); image("Im1", W - MR - pw, top - ph, pw, ph); op("Q"); }
  const lh = logo(ML, top, 32, C.koenig);
  const x0 = ML + 46;
  text(x0, top - 19, "Jonas Juchelka", "H", 21, C.koenig);
  text(x0, top - 33, X.headline, "L", 10.5, C.koenig);
  // Kontakt: E-Mail (Bild), Website, LinkedIn, GitHub (klickbar mit Pfeil), Orte
  let x = x0; const y = top - 50, fs_ = 9;
  const mail = IMAGES.Im2;
  // mail.jpg: Catamaran Regular in 140 px, Bildhöhe = Ascent 154 + Descent 76 px; Grundlinie liegt 76 px über der Unterkante
  if (mail) { const k = fs_ / 140, mh = mail.h * k, mw = mail.w * k; image("Im2", x - 4 * k, y - 76 * k, mw, mh); x += mw + 12; }
  for (const [label, url] of [["jonasjuchelka.com", SITE.web], ["LinkedIn", SITE.linkedin], ["GitHub", SITE.github]]) {
    x += linkedText(x, y, label, "R", fs_, C.koenig, url) + 12;
  }
  text(x0, y - 12.5, X.place, "R", fs_, C.muted);
  void lh;
}
const stand = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", { month: "long", year: "numeric" }).format(new Date());
function drawFooter(i, n) {
  text(ML, 20, `${X.updated} ${stand}`, "R", 7, C.muted);
  if (n > 1) { const t = `${i} / ${n}`; textR(W - MR, 20, t, "R", 7, C.muted); }
}

const pages = chosen.pages.map((blocks, i) => {
  P = { ops: [], annots: [] };
  if (i === 0) drawHead();
  for (const b of blocks) b.draw(b.y);
  drawFooter(i + 1, chosen.pages.length);
  return P;
});

// ---------- PDF schreiben ----------
const objs = [];
const add = (body) => { objs.push(body); return objs.length; };
const set = (id, body) => { objs[id - 1] = body; };
const stream = (dict, data) => { const z = zlib.deflateSync(data); return Buffer.concat([Buffer.from(`<< ${dict} /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), z, Buffer.from("\nendstream", "latin1")]); };
const fontRefs = {};
for (const [k, face] of Object.entries(FACES)) {
  const file = add(stream(`/Length1 ${face.buf.length}`, face.buf));
  const desc = add(`<< /Type /FontDescriptor /FontName /${FONT_NAMES[k]} /Flags 32 /FontBBox [${face.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${face.ascent} /Descent ${face.descent} /CapHeight ${face.cap} /StemV 80 /FontFile2 ${file} 0 R >>`);
  fontRefs[k] = add(`<< /Type /Font /Subtype /TrueType /BaseFont /${FONT_NAMES[k]} /FirstChar 32 /LastChar 255 /Widths [${face.widths.join(" ")}] /Encoding /WinAnsiEncoding /FontDescriptor ${desc} 0 R >>`);
}
const imgRefs = Object.entries(IMAGES).filter(([, im]) => im).map(([name, im]) => [name, add(Buffer.concat([
  Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /${im.comps === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.buf.length} >>\nstream\n`, "latin1"),
  im.buf, Buffer.from("\nendstream", "latin1"),
]))]);
const xobj = imgRefs.length ? ` /XObject << ${imgRefs.map(([n, r]) => `/${n} ${r} 0 R`).join(" ")} >>` : "";
const res = `<< /Font << ${Object.entries(fontRefs).map(([k, r]) => `/${k} ${r} 0 R`).join(" ")} >>${xobj} >>`;
const pagesId = add(null);
const kids = [];
const uriStr = (u) => "(" + u.replace(/[\\()]/g, (m) => "\\" + m) + ")";
for (const p of pages) {
  const content = add(stream("", Buffer.from(p.ops.join("\n"), "latin1")));
  const annots = p.annots.map((a) => add(`<< /Type /Annot /Subtype /Link /Rect [${a.rect.map((v) => v.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /Type /Action /S /URI /URI ${uriStr(a.url)} >> >>`));
  kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources ${res} /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(" ")}]` : ""} >>`));
}
set(pagesId, `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`);
const info = add(`<< /Title ${pdfStr(X.fileTitle)} /Author ${pdfStr("Jonas Juchelka")} >>`);
const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R /Lang (${lang}) >>`);

const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
const offsets = [];
let pos = chunks[0].length;
objs.forEach((body, i) => {
  const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), Buffer.isBuffer(body) ? body : Buffer.from(body, "latin1"), Buffer.from("\nendobj\n", "latin1")]);
  offsets.push(pos); chunks.push(b); pos += b.length;
});
const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat(chunks));
console.log(`cv-pdf (${lang}): ${pages.length} Seite(n), ${chosen.sz} pt, Stufe ${chosen.level}, ${chosen.words} Wörter, ${out}`);
