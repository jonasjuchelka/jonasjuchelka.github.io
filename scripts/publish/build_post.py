#!/usr/bin/env python3
"""Wandelt einen Upload (inbox/<slug>/) in einen Beitrag und ein PDF um.

Eingabe:  inbox/<slug>/meta.json  +  inbox/<slug>/original.(docx|doc|md)
Ausgabe:  artifacts/jonas-website/content/blog/<slug>.md (Essay) oder .../content/gedanken/<slug>.md,
          artifacts/jonas-website/public/blog/<slug>.pdf (nur Essays)

Aufruf:   python3 scripts/publish/build_post.py inbox/<slug> [--root .]
Nur feste Argumentlisten, nie eine Shell: Dateinamen und Metadaten sind fremde Eingaben.
"""
import argparse, html, json, re, shutil, subprocess, sys, tempfile
from datetime import date
from pathlib import Path

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KINDS = {"essay", "gedanke"}
MAX_UPLOAD = 15 * 1024 * 1024
MAX_GEDANKE = 2000
HERE = Path(__file__).resolve().parent


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=180, **kw)


def load_meta(folder: Path) -> dict:
    m = json.loads((folder / "meta.json").read_text("utf8"))
    slug = str(m.get("slug", ""))
    if not SLUG_RE.match(slug) or slug != folder.name:
        raise SystemExit(f"Ungültiger Slug: {slug!r}")
    if m.get("kind") not in KINDS:
        raise SystemExit("kind muss essay oder gedanke sein")
    title = str(m.get("title", "")).strip()
    if not title or len(title) > 160:
        raise SystemExit("Titel fehlt oder ist zu lang")
    tags = [str(t).strip() for t in m.get("tags", []) if str(t).strip()][:8]
    if m["kind"] == "gedanke":
        tags = []  # Gedanken haben keine freien Tags
    return {
        "title": title, "slug": slug, "kind": m["kind"],
        "topic": str(m.get("topic", "")).strip()[:40],
        "tags": tags, "summary": str(m.get("summary", "")).strip()[:300],
        "date": str(m.get("date") or date.today().isoformat()),
    }


def find_original(folder: Path) -> Path:
    for ext in ("docx", "doc", "md"):
        p = folder / f"original.{ext}"
        if p.exists():
            if p.stat().st_size > MAX_UPLOAD:
                raise SystemExit("Datei ist größer als 15 MB")
            return p
    raise SystemExit("Keine original.docx/.doc/.md gefunden")


def to_markdown(src: Path, work: Path) -> str:
    fmt = "markdown-raw_html-raw_attribute" if src.suffix == ".md" else "docx"
    if src.suffix == ".doc":  # altes Word-Format zuerst nach .docx
        run(["soffice", "--headless", "--convert-to", "docx", "--outdir", str(work), str(src)])
        src = work / "original.docx"
    if src.suffix == ".md":  # Skript-/Style-Blöcke samt Inhalt entfernen, bevor pandoc sie sieht
        txt = src.read_text("utf8", errors="replace")
        txt = re.sub(r"<(script|style)\b[\s\S]*?</\1\s*>", "", txt, flags=re.I)
        src = work / "clean.md"
        src.write_text(txt, "utf8")
    out = run(["pandoc", "-f", fmt, "-t", "gfm-raw_html", "--wrap=none", "--markdown-headings=atx", str(src)])
    body = out.stdout
    body = re.sub(r"^\s*# [^\n]*\n", "", body, count=1)  # erste H1 = Titel, steht schon in den Angaben
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)   # Bilder im Text: nein, nur das Titelbild über meta
    body = re.sub(r"^(Bild|Image|Figure)\s*$", "", body, flags=re.M)  # pandoc-Ersatztext für nicht ladbare Bilder
    body = re.sub(r"<[^>]+>", "", body)                 # übrig gebliebenes HTML weg
    return re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"


def front(meta: dict, draft: bool) -> str:
    q = lambda s: json.dumps(s, ensure_ascii=False)
    lines = ["---", f"title: {q(meta['title'])}", f"slug: {meta['slug']}", f"date: {meta['date']}",
             f"summary: {q(meta['summary'] or meta['title'])}", f"kind: {meta['kind']}"]
    if meta["topic"]:
        lines.append(f"topic: {q(meta['topic'])}")
    lines += ["tags: [" + ", ".join(q(t) for t in meta["tags"]) + "]", f"draft: {str(draft).lower()}", "---", ""]
    return "\n".join(lines)


def make_pdf(meta: dict, body_md: str, out_pdf: Path, root: Path):
    fonts = (root / "lib/design-tokens/fonts").resolve()
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        (td / "b.md").write_text(body_md, "utf8")
        inner = run(["pandoc", "-f", "gfm-raw_html", "-t", "html5", str(td / "b.md")]).stdout
        css = (HERE / "pdf.css").read_text("utf8").replace("{{FONTS}}", fonts.as_uri())
        e = html.escape
        d = date.fromisoformat(meta["date"]).strftime("%d.%m.%Y")
        top = f'<span class="topic">{e(meta["topic"])}</span> · ' if meta["topic"] else ""
        doc = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><title>{e(meta["title"])}</title>
<style>{css}</style></head><body>
<header><p class="eyebrow">{top}{d}</p><h1>{e(meta["title"])}</h1><div class="stripe"></div>
{f'<p class="lede">{e(meta["summary"])}</p>' if meta["summary"] else ''}</header>
<main>{inner}</main></body></html>'''
        (td / "p.html").write_text(doc, "utf8")
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page()
            pg.goto((td / "p.html").as_uri())
            pg.evaluate("document.fonts.ready")
            foot = ('<div style="width:100%;font:9px Mukta,sans-serif;color:#1c2b36;padding:0 18mm;display:flex;justify-content:space-between">'
                    '<span>Jonas Juchelka · jonasjuchelka.com</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>')
            out_pdf.parent.mkdir(parents=True, exist_ok=True)
            pg.pdf(path=str(out_pdf), format="A4", print_background=True, prefer_css_page_size=True,
                   display_header_footer=True, header_template="<span></span>", footer_template=foot)
            b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--root", default=".")
    a = ap.parse_args()
    root, folder = Path(a.root).resolve(), Path(a.folder).resolve()
    meta = load_meta(folder)
    src = find_original(folder)
    with tempfile.TemporaryDirectory() as w:
        body = to_markdown(src, Path(w))
    if meta["kind"] == "gedanke":
        if len(body) > MAX_GEDANKE:
            raise SystemExit(f"Gedanke zu lang ({len(body)} > {MAX_GEDANKE} Zeichen)")
        dest = root / "artifacts/jonas-website/content/gedanken" / f"{meta['slug']}.md"
        meta["summary"] = meta["summary"] or body.strip().split("\n")[0][:160]
    else:
        dest = root / "artifacts/jonas-website/content/blog" / f"{meta['slug']}.md"
        pdf = root / "artifacts/jonas-website/public/blog" / f"{meta['slug']}.pdf"
        make_pdf(meta, body, pdf, root)
        print(f"PDF: {pdf}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(front(meta, draft=False) + body, "utf8")
    print(f"Beitrag: {dest}")


if __name__ == "__main__":
    main()
