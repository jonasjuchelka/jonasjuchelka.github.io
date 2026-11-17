// Erzeugt den Lebenslauf als PDF aus content/cv.json, bei jedem Build neu (postbuild).
// Ohne Abhängigkeiten: eigener kleiner PDF-Schreiber, Markenschriften (TTF) eingebettet.
// Datenschutz: keine Telefonnummer, keine Adresse, kein Geburtsdatum, keine E-Mail (die steht nur auf /kontakt/ als Bild).
// Aufruf: node scripts/cv-pdf.mjs [ausgabe.pdf]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const FONTS = path.resolve(root, "../../lib/design-tokens/fonts");
const out = process.argv[2] ?? path.join(root, "out", "media", "lebenslauf.pdf");
const cv = JSON.parse(fs.readFileSync(path.join(root, "content", "cv.json"), "utf8"));

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
  // cmap Format 4 (Unicode BMP)
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

const FACES = {
  H: readTtf(path.join(FONTS, "PlusJakartaSans-SemiBold.ttf")),
  R: readTtf(path.join(FONTS, "Catamaran-Regular.ttf")),
  L: readTtf(path.join(FONTS, "Catamaran-Light.ttf")),
};
const NAMES = { H: "PlusJakartaSans-SemiBold", R: "Catamaran-Regular", L: "Catamaran-Light" };
const width = (txt, f, size) => [...txt].reduce((w, ch) => w + (FACES[f].widths[winCode(ch.codePointAt(0)) - 32] ?? 500), 0) * size / 1000;
const enc = (txt) => Buffer.from([...txt].map((ch) => winCode(ch.codePointAt(0))));
const pdfStr = (txt) => "(" + enc(txt).toString("latin1").replace(/[\\()]/g, (m) => "\\" + m) + ")";

// ---------- Seiten setzen ----------
const W = 595.28, H = 841.89, M = 54, COL = 92;
const C = { koenig: [0.11, 0.169, 0.212], text: [0.024, 0.024, 0.051], muted: [0.176, 0.263, 0.329], himmel: [0.455, 0.686, 0.859], line: [0.69, 0.769, 0.831] };
const rgb = (c, stroke = false) => `${c.map((v) => v.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}`;
const pages = [];
let ops = [], y = 0;
function newPage() { ops = []; pages.push(ops); y = H - M; }
function text(x, yy, txt, f, size, color = C.text) { ops.push(`BT ${rgb(color)} /${f} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td ${pdfStr(txt)} Tj ET`); }
function rect(x, yy, w, h, color) { ops.push(`${rgb(color)} ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
function wrap(txt, f, size, maxW) {
  const lines = []; let cur = "";
  for (const word of txt.split(/\s+/)) {
    const t = cur ? `${cur} ${word}` : word;
    if (width(t, f, size) <= maxW || !cur) cur = t; else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function need(h) { if (y - h < M + 24) newPage(); }

newPage();
text(M, y - 26, "Jonas Juchelka", "H", 28, C.koenig);
y -= 40;
rect(M, y, 64, 5, C.himmel);
y -= 20;
text(M, y, "Management & Technology, TU München · Auslandssemester UC Berkeley", "R", 10.5, C.muted);
y -= 14;
text(M, y, "jonasjuchelka.com · linkedin.com/in/jonasjuchelka · github.com/jonasjuchelka", "R", 10.5, C.muted);
y -= 30;

function section(title) {
  need(60);
  text(M, y, title, "H", 13, C.koenig);
  y -= 7;
  rect(M, y, W - 2 * M, 0.8, C.line);
  y -= 16;
}
function entry(e) {
  const bodyW = W - 2 * M - COL;
  const title = wrap(e.title, "H", 10.5, bodyW);
  const org = wrap(e.org + (e.place ? ` · ${e.place}` : ""), "R", 9.5, bodyW);
  const items = (e.points.length ? e.points : [e.why]).map((p) => wrap(p, "L", 9.5, bodyW - 10));
  const h = title.length * 13.5 + org.length * 12.5 + items.reduce((s, l) => s + l.length * 12.2, 0) + 10;
  need(Math.min(h, 120));
  text(M, y, e.date, "R", 9, C.muted);
  for (const l of title) { text(M + COL, y, l, "H", 10.5, C.koenig); y -= 13.5; }
  for (const l of org) { text(M + COL, y, l, "R", 9.5, C.muted); y -= 12.5; }
  y -= 1.5;
  for (const lines of items) {
    need(lines.length * 12.2);
    rect(M + COL + 1, y + 2.6, 3, 3, C.himmel);
    for (const l of lines) { text(M + COL + 10, y, l, "L", 9.5, C.text); y -= 12.2; }
  }
  y -= 9;
}

const entries = [...cv.entries].sort((a, b) => b.year - a.year);
const pinned = entries.filter((e) => e.kind === "station" && e.pinned);
if (pinned.length) { section("Aktuelle Projekte"); pinned.forEach(entry); }
section("Werdegang");
entries.filter((e) => e.kind === "station" && !e.pinned).forEach(entry);
const awards = entries.filter((e) => e.kind === "award");
if (awards.length) { section("Stipendien und Auszeichnungen"); awards.forEach(entry); }

const stand = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date());
pages.forEach((p, i) => {
  p.push(`BT ${rgb(C.muted)} /R 8.5 Tf ${M} 30 Td ${pdfStr(`Jonas Juchelka · Lebenslauf · Stand ${stand}`)} Tj ET`);
  const n = `${i + 1} / ${pages.length}`;
  p.push(`BT ${rgb(C.muted)} /R 8.5 Tf ${(W - M - width(n, "R", 8.5)).toFixed(2)} 30 Td ${pdfStr(n)} Tj ET`);
});

// ---------- PDF schreiben ----------
const objs = [];
const add = (body) => { objs.push(body); return objs.length; };
const stream = (dict, data) => { const z = zlib.deflateSync(data); return Buffer.concat([Buffer.from(`<< ${dict} /Length ${z.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), z, Buffer.from("\nendstream", "latin1")]); };
const fontRefs = {};
for (const [k, face] of Object.entries(FACES)) {
  const file = add(stream(`/Length1 ${face.buf.length}`, face.buf));
  const desc = add(`<< /Type /FontDescriptor /FontName /${NAMES[k]} /Flags 32 /FontBBox [${face.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${face.ascent} /Descent ${face.descent} /CapHeight ${face.cap} /StemV 80 /FontFile2 ${file} 0 R >>`);
  fontRefs[k] = add(`<< /Type /Font /Subtype /TrueType /BaseFont /${NAMES[k]} /FirstChar 32 /LastChar 255 /Widths [${face.widths.join(" ")}] /Encoding /WinAnsiEncoding /FontDescriptor ${desc} 0 R >>`);
}
const res = `<< /Font << ${Object.entries(fontRefs).map(([k, r]) => `/${k} ${r} 0 R`).join(" ")} >> >>`;
const pagesId = objs.length + 1 + pages.length * 2 + 0;
const kids = [];
for (const p of pages) {
  const content = add(stream("", Buffer.from(p.join("\n"), "latin1")));
  kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources ${res} /Contents ${content} 0 R >>`));
}
const pagesObj = add(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`);
if (pagesObj !== pagesId) throw new Error("Seitenbaum falsch nummeriert");
const info = add(`<< /Title ${pdfStr("Jonas Juchelka - Lebenslauf")} /Author ${pdfStr("Jonas Juchelka")} >>`);
const catalog = add(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

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
console.log(`cv-pdf: ${pages.length} Seiten, ${out}`);
