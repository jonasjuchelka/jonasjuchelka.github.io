# Veröffentlichen

Zwei Wege, ein Ziel: ein Commit nach `main` startet das Deployment der Website.

| Weg | Wer | Was entsteht |
| --- | --- | --- |
| Upload im privaten Bereich (`/publish`) | Admin mit frischer Passkey-Bestätigung | Essay (Seite + PDF) oder Gedanke |
| Mail an die geheime Adresse | nur erlaubte Absender mit DMARC pass | Gedanke (nur Klartext, ≤ 2000 Zeichen) |

## Upload (Essay und Gedanke)
1. `/publish` legt `inbox/<slug>/original.<ext>` und danach `inbox/<slug>/meta.json` per GitHub-API ab.
2. `.github/workflows/publish.yml` startet bei Änderungen unter `inbox/`, überspringt unvollständige Ordner und ruft `scripts/publish/build_post.py` auf.
3. Ergebnis: `content/blog/<slug>.md` + `artifacts/jonas-website/public/blog/<slug>.pdf` (Essay) oder `content/gedanken/<slug>.md` (Gedanke). Fehler landen in `inbox-failed/`.
4. Der Workflow stößt `pages.yml` an (Pushes mit `GITHUB_TOKEN` lösen sonst keine Workflows aus).

Grenzen: Upload bis 4 MB (Vercel Hobby), .docx/.doc/.md, Inhalt wird gegen die Endung geprüft. Bilder im Text werden entfernt. HTML wird entfernt. Gedanken haben keine Tags und kein Bild.
Zurücknehmen: Liste auf `/publish` löscht Beitrag und PDF per GitHub-API.

## Mail (Gedanke)
`workers/post-mail` (Cloudflare Email Worker). Prüft der Reihe nach: Größe ≤ 100 KB, geheime Empfängeradresse, Umschlag- = Header-Absender auf der Liste, `dmarc=pass`, Tageslimit 10. Antwort mit Zurücknehmen-Link (HMAC über den Slug; GET zeigt nur eine Bestätigung, erst POST löscht).
Der Worker schreibt nur nach `content/gedanken/` und kann nur das, was der Token darf.

## Einrichtung (einmalig)
**GitHub-Token** (fine-grained, nur dieses Repo, Contents: Read & write):
- Vercel (privater Bereich): `GITHUB_TOKEN`. Optional `GITHUB_REPO`.
- Cloudflare Worker: `wrangler secret put GITHUB_TOKEN`.
Nie in den Chat oder ins Repo.

**Worker** (`workers/post-mail/wrangler.toml`):
1. `wrangler kv namespace create STATE`, die `id` eintragen.
2. Im Dashboard unter Settings → Variables setzen: `ALLOWED_SENDERS`, `SECRET_LOCAL_PART`, `PUBLIC_URL`. Diese Werte bleiben aus dem öffentlichen Repo heraus.
3. `wrangler secret put UNPUBLISH_SECRET` (lange Zufallszeichenfolge).
4. `pnpm install` in `workers/post-mail`, dann `wrangler deploy`.
5. Email Routing → Custom address `<SECRET_LOCAL_PART>@post.jonasjuchelka.com` → Action „Send to a Worker“ → `jonas-post-mail`.

## Tests
- `node --test tests/post-mail.test.mjs` (Worker-Logik: Spoofing, DMARC, Größe, Limit, Signatur)
- `tsx --test tests/publish.test.ts` (Upload-Prüfung)
- Umwandlung: Beispieldateien durch `python3 scripts/publish/build_post.py inbox/<slug> --root <ordner>` schicken (Pandoc, LibreOffice, Playwright nötig).
