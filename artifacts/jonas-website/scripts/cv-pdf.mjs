// Erzeugt den Lebenslauf als kompaktes PDF (höchstens zwei Seiten) aus content/cv.json, bei jedem Build neu (postbuild).
// Ohne Abhängigkeiten: eigener kleiner PDF-Schreiber, Markenschriften (TTF) eingebettet, Logo als Vektor, Foto als JPEG.
// Inhalt: pro Station zählt der Block "cv" (eigene, kürzere Formulierung); fehlt er, nimmt das PDF die ersten zwei Punkte.
// Passt es nicht auf zwei Seiten, fallen zuerst optionale Stationen und Zusatzpunkte weg, dann wird alles leicht kleiner.
// Datenschutz: keine Telefonnummer, keine Adresse, kein Geburtsdatum, keine E-Mail (die steht nur auf /kontakt/ als Bild).
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
  koenig: hex("#1c2b36"), text: hex("#06060d"), muted: hex("#2d4354"), himmel: hex("#74afdb"),
  line: hex("#b0c4d4"), band: hex("#cfe5f7"), surface: hex("#eef2f5"), white: hex("#ffffff"),
};
const rgb = (c, stroke = false) => `${c.map((v) => v.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}`;

// ---------- Seite ----------
const W = 595.28, H = 841.89, ML = 40, MR = 40;
const DATE_W = 80, CX = ML + DATE_W + 10, CW = W - MR - CX;
const BAND = 152, KPI = 50, FOOT = 34;

let P = null; // aktuelle Seite { ops, annots }
const op = (s) => P.ops.push(s);
const text = (x, y, txt, f, size, color = C.text) => op(`BT ${rgb(color)} /${f} ${size.toFixed(2)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfStr(txt)} Tj ET`);
const rect = (x, y, w, h, color) => op(`${rgb(color)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
const link = (x, y, w, h, url) => P.annots.push({ rect: [x, y, x + w, y + h], url });
function arrow(x, y, s, color) {
  // kleiner Pfeil nach rechts oben (wie ↗ auf der Website), als Linien gezeichnet
  op(`${rgb(color, true)} 0.75 w 1 J 1 j ${x.toFixed(2)} ${y.toFixed(2)} m ${(x + s).toFixed(2)} ${(y + s).toFixed(2)} l ${(x + s * 0.3).toFixed(2)} ${(y + s).toFixed(2)} m ${(x + s).toFixed(2)} ${(y + s).toFixed(2)} l ${(x + s).toFixed(2)} ${(y + s * 0.3).toFixed(2)} l S`);
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

// Foto: JPEG direkt einbetten (DCTDecode). Hintergrund ist schon in Bandfarbe.
const PHOTO_FILE = path.join(root, "assets", "cv", "foto.jpg");
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
const PHOTO = fs.existsSync(PHOTO_FILE) ? (() => { const buf = fs.readFileSync(PHOTO_FILE); return { buf, ...jpegSize(buf) }; })() : null;

// ---------- Inhalt ----------
const byId = new Map(tr.entries.map((e) => [e.id, e]));
const order = new Map(base.entries.map((e, i) => [e.id, i]));
const sorted = [...base.entries].sort((a, b) => b.year - a.year || order.get(a.id) - order.get(b.id));
const sectionOf = (e) => e.kind === "award" ? "awards"
  : e.tags.includes("Gründen") ? "founding"
  : e.tags.includes("Studium") || e.tags.includes("Schule") ? "education"
  : e.tags.includes("Arbeit") ? "experience" : "engagement";
const SECTIONS = ["education", "experience", "founding", "engagement"];

function entryData(id, drop) {
  const b = base.entries[order.get(id)], t = byId.get(id) ?? b;
  const cv = t.cv ?? {};
  if (b.cv?.hide || (drop && b.cv?.optional)) return null;
  const points = Array.isArray(cv.points) ? cv.points : t.points.slice(0, 2);
  const extra = drop ? [] : (cv.extra ?? []);
  const lk = Number.isInteger(b.cv?.link) ? t.links[b.cv.link] : null;
  return { date: t.date, title: cv.title ?? t.title, sub: [cv.org ?? t.org, t.place].filter(Boolean).join(" · "), points: [...points, ...extra], link: lk };
}

function build(s, drop) {
  const st = {
    date: 7.4 * s, title: 10.2 * s, sub: 8.5 * s, pt: 8.5 * s, lead: 11.4 * s, sec: 12.5 * s,
  };
  const blocks = [];
  const sectionHead = (title) => ({
    h: st.sec + 10 * s,
    draw: (y) => {
      text(ML, y - st.sec, title, "H", st.sec, C.koenig);
      rect(ML, y - st.sec - 5 * s, W - ML - MR, 0.9, C.line);
      rect(ML, y - st.sec - 5.6 * s, 28, 2.2, C.himmel);
    },
  });
  const entryBlock = (e) => {
    const titleLines = wrap(e.title, "H", st.title, CW);
    const linkW = e.link ? width(e.link.label, "R", st.sub) + 9 * s : 0;
    const linkInline = e.link && width(titleLines.at(-1), "H", st.title) + 10 + linkW <= CW;
    const subLines = wrap(e.sub, "R", st.sub, CW);
    const pts = e.points.map((p) => wrap(p, "R", st.pt, CW - 10 * s));
    const lh = st.title * 1.22, sh = st.sub * 1.3, ph = st.lead;
    const h = titleLines.length * lh + (e.link && !linkInline ? sh : 0) + subLines.length * sh + (pts.length ? 2 * s : 0) + pts.reduce((a, l) => a + l.length * ph, 0) + 7.5 * s;
    return {
      h,
      draw: (y0) => {
        let y = y0;
        text(ML, y - st.date - 1.2 * s, e.date, "M", st.date, C.muted);
        titleLines.forEach((l, i) => {
          y -= lh;
          text(CX, y + 2.4 * s, l, "H", st.title, C.koenig);
          if (i === titleLines.length - 1 && linkInline) {
            const lx = CX + width(l, "H", st.title) + 10;
            text(lx, y + 2.4 * s, e.link.label, "R", st.sub, C.muted);
            const aw = width(e.link.label, "R", st.sub);
            arrow(lx + aw + 2.5 * s, y + 2.6 * s, 4.2 * s, C.muted);
            link(lx - 2, y, aw + 9 * s, lh, e.link.url);
          }
        });
        for (const l of subLines) { y -= sh; text(CX, y + 2 * s, l, "R", st.sub, C.muted); }
        if (e.link && !linkInline) {
          y -= sh; const aw = width(e.link.label, "R", st.sub);
          text(CX, y + 2 * s, e.link.label, "R", st.sub, C.muted); arrow(CX + aw + 2.5 * s, y + 2.2 * s, 4.2 * s, C.muted); link(CX - 2, y, aw + 9 * s, sh, e.link.url);
        }
        if (pts.length) y -= 2 * s;
        for (const lines of pts) {
          rect(CX + 0.5, y - ph + 2.6 * s + st.pt * 0.28, 3 * s, 3 * s, C.himmel);
          for (const l of lines) { y -= ph; text(CX + 10 * s, y + 2.6 * s, l, "R", st.pt, C.text); }
        }
      },
    };
  };
  for (const key of SECTIONS) {
    const list = sorted.filter((e) => e.kind === "station" && sectionOf(e) === key).map((e) => entryData(e.id, drop)).filter(Boolean);
    if (!list.length) continue;
    const head = sectionHead(X.sections[key]);
    list.forEach((e, i) => {
      const b = entryBlock(e);
      // Überschrift nie allein am Seitenende: mit dem ersten Eintrag zusammen setzen
      blocks.push(i === 0 ? { h: head.h + b.h, draw: (y) => { head.draw(y); b.draw(y - head.h); } } : b);
    });
  }
  // Stipendien und Auszeichnungen: eine Zeile pro Eintrag
  const awards = sorted.filter((e) => e.kind === "award").map((b) => {
    const t = byId.get(b.id) ?? b;
    if (b.cv?.hide) return null;
    return { title: t.cv?.title ?? t.title, desc: t.cv?.org ?? t.why, date: t.date, link: Number.isInteger(b.cv?.link) ? t.links[b.cv.link] : null };
  }).filter(Boolean);
  if (awards.length) {
    const head = sectionHead(X.sections.awards);
    const LW = 196 * s, DW = 64 * s;
    const rows = awards.map((a) => {
      const tl = wrap(a.title, "R", st.sub, LW - (a.link ? 10 * s : 0));
      const dl = wrap(a.desc, "R", st.sub, W - MR - (ML + LW + 12) - DW - 8);
      return { a, tl, dl, h: Math.max(tl.length, dl.length) * st.sub * 1.32 + 3.5 * s };
    });
    blocks.push({
      h: head.h + rows.reduce((x, r) => x + r.h, 0) + 5 * s,
      draw: (y0) => {
        head.draw(y0); let y = y0 - head.h;
        for (const r of rows) {
          const lh = st.sub * 1.32;
          r.tl.forEach((l, i) => text(ML, y - lh * (i + 1) + 2.2 * s, l, "R", st.sub, C.koenig));
          if (r.a.link) {
            const last = r.tl.at(-1), lx = ML + width(last, "R", st.sub) + 3 * s, ly = y - lh * r.tl.length + 2.4 * s;
            arrow(lx, ly, 4.2 * s, C.muted); link(ML - 2, y - lh * r.tl.length, width(last, "R", st.sub) + 10 * s, lh * r.tl.length, r.a.link.url);
          }
          r.dl.forEach((l, i) => text(ML + LW + 12, y - lh * (i + 1) + 2.2 * s, l, "R", st.sub, C.muted));
          const dw = width(r.a.date, "M", st.date);
          text(W - MR - dw, y - lh + 2.4 * s, r.a.date, "M", st.date, C.muted);
          y -= r.h;
        }
      },
    });
  }
  // Kenntnisse
  {
    const head = sectionHead(X.sections.skills);
    const rows = X.skills.map(([k, v]) => ({ k, lines: wrap(v, "R", st.pt, CW) }));
    blocks.push({
      h: head.h + rows.reduce((x, r) => x + r.lines.length * st.lead + 2.5 * s, 0) + 4 * s,
      draw: (y0) => {
        head.draw(y0); let y = y0 - head.h;
        for (const r of rows) {
          text(ML, y - st.lead + 2.6 * s, r.k.toUpperCase(), "M", st.date, C.muted);
          for (const l of r.lines) { y -= st.lead; text(CX, y + 2.6 * s, l, "R", st.pt, C.text); }
          y -= 2.5 * s;
        }
      },
    });
  }
  return blocks;
}

function paginate(blocks) {
  const top1 = H - BAND - KPI - 26, top2 = H - 60, bottom = FOOT + 14;
  const pages = [[]]; let y = top1;
  for (const b of blocks) {
    if (y - b.h < bottom) { pages.push([]); y = top2; }
    pages.at(-1).push({ y, h: b.h, draw: b.draw }); y -= b.h;
  }
  return { pages, free: y - bottom };
}

let chosen = null;
for (const drop of [false, true]) {
  for (let s = 1.06; s >= (drop ? 0.86 : 0.92) - 1e-9; s -= 0.02) {
    const r = paginate(build(s, drop));
    if (r.pages.length <= 2) { chosen = { ...r, s, drop }; break; }
  }
  if (chosen) break;
}
if (!chosen) { const r = paginate(build(0.86, true)); chosen = { ...r, s: 0.86, drop: true }; console.warn("cv-pdf: passt nicht auf zwei Seiten"); }

// ---------- Kopf, Kennzahlen, Orte, Fußzeile ----------
function drawHead() {
  rect(0, H - BAND, W, BAND, C.band);
  if (PHOTO) {
    const ph = BAND - 6, pw = ph * PHOTO.w / PHOTO.h;
    op(`q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} ${(W - MR - pw + 8).toFixed(2)} ${(H - BAND).toFixed(2)} cm /Im1 Do Q`);
  }
  logo(ML, H - 22, 38, C.koenig);
  text(ML, H - 92, "Jonas Juchelka", "H", 27, C.koenig);
  text(ML, H - 110, X.headline, "L", 12, C.koenig);
  // Kontaktzeile: Website, LinkedIn, GitHub (alle klickbar), Orte
  let x = ML; const y = H - 132, fs_ = 8.8;
  for (const [label, url] of [["jonasjuchelka.com", SITE.web], ["LinkedIn", SITE.linkedin], ["GitHub", SITE.github]]) {
    const w = width(label, "R", fs_);
    text(x, y, label, "R", fs_, C.koenig);
    arrow(x + w + 2.5, y + 0.6, 4.4, C.koenig);
    link(x - 2, y - 3, w + 11, 13, url);
    x += w + 20;
  }
  text(x, y, X.place, "R", fs_, C.muted);
}
function drawKpis() {
  const y0 = H - BAND - 16, n = X.kpis.length, cw = (W - ML - MR) / n;
  X.kpis.forEach(([num, l1, l2], i) => {
    const x = ML + i * cw;
    rect(x, y0, 22, 2.2, C.himmel);
    text(x, y0 - 19, num, "H", 17, C.koenig);
    text(x, y0 - 30, l1, "R", 7.4, C.muted);
    if (l2) text(x, y0 - 39, l2, "R", 7.4, C.muted);
  });
}
function drawSmallHead() {
  const h = logo(ML, H - 24, 22, C.koenig);
  text(ML + 30, H - 24 - h + 5, "Jonas Juchelka", "H", 10.5, C.koenig);
  rect(ML, H - 46, W - ML - MR, 0.9, C.line);
}
function drawPlaces(yTop) {
  const order = X.placesOrder.filter((k) => tr.places[k]);
  const bh = 64;
  if (order.length < 2 || yTop - 10 - bh < FOOT + 14) return;
  const y0 = yTop - 10 - bh;
  op(`${rgb(C.band)} ${ML} ${y0.toFixed(2)} ${W - ML - MR} ${bh} re f`);
  text(ML + 14, y0 + bh - 17, X.sections.places.toUpperCase(), "M", 7.4, C.muted);
  const x1 = ML + 34, x2 = W - MR - 34, ly = y0 + 22, step = (x2 - x1) / (order.length - 1);
  op(`${rgb(C.himmel, true)} 1.4 w ${x1} ${ly} m ${x2} ${ly} l S`);
  order.forEach((k, i) => {
    const p = tr.places[k], x = x1 + i * step, last = i === order.length - 1;
    const circle = (r) => { const c = 0.5523 * r; return `${x + r} ${ly} m ${x + r} ${ly + c} ${x + c} ${ly + r} ${x} ${ly + r} c ${x - c} ${ly + r} ${x - r} ${ly + c} ${x - r} ${ly} c ${x - r} ${ly - c} ${x - c} ${ly - r} ${x} ${ly - r} c ${x + c} ${ly - r} ${x + r} ${ly - c} ${x + r} ${ly} c`; };
    op(`${rgb(last ? C.koenig : C.white)} ${rgb(C.koenig, true)} 1.1 w ${circle(3.4)} B`);
    const nw = width(p.name, "H", 8.4), ww = width(p.when, "R", 7);
    text(x - nw / 2, ly + 8, p.name, "H", 8.4, C.koenig);
    text(x - ww / 2, ly - 13, p.when, "R", 7, C.muted);
  });
}
const stand = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-US", { month: "long", year: "numeric" }).format(new Date());
function drawFooter(i, n) {
  text(ML, 22, `jonasjuchelka.com  ·  ${X.updated} ${stand}`, "R", 7.2, C.muted);
  const t = `${i} / ${n}`;
  text(W - MR - width(t, "R", 7.2), 22, t, "R", 7.2, C.muted);
}

const pages = chosen.pages.map((blocks, i) => {
  P = { ops: [], annots: [] };
  if (i === 0) { drawHead(); drawKpis(); } else drawSmallHead();
  for (const b of blocks) b.draw(b.y);
  if (i === chosen.pages.length - 1) drawPlaces(blocks.length ? blocks.at(-1).y - blocks.at(-1).h : H - 60);
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
let xobj = "";
if (PHOTO) {
  const img = add(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${PHOTO.w} /Height ${PHOTO.h} /ColorSpace /${PHOTO.comps === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${PHOTO.buf.length} >>\nstream\n`, "latin1"),
    PHOTO.buf, Buffer.from("\nendstream", "latin1"),
  ]));
  xobj = ` /XObject << /Im1 ${img} 0 R >>`;
}
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
console.log(`cv-pdf (${lang}): ${pages.length} Seiten, Maßstab ${chosen.s.toFixed(2)}${chosen.drop ? ", optionale Punkte weggelassen" : ""}, ${out}`);
