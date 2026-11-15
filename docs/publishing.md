# Veröffentlichen

Zwei Wege, ein Ziel: ein Commit nach `main` startet das Deployment der Website.

| Weg | Wer | Was entsteht |
| --- | --- | --- |
| Upload im privaten Bereich (`/publish`) | Admin mit frischer Passkey-Bestätigung | Essay (Seite + PDF) oder Gedanke |
| Mail an die geheime Adresse | nur erlaubte Absender mit DKIM + DMARC pass, danach Klick auf den Bestätigungslink | Gedanke (nur Klartext, ≤ 2000 Zeichen) |

## Upload (Essay und Gedanke)
1. `/publish` legt `inbox/<slug>/original.<ext>` und danach `inbox/<slug>/meta.json` per GitHub-API ab.
2. `.github/workflows/publish.yml` startet bei Änderungen unter `inbox/`, überspringt unvollständige Ordner und ruft `scripts/publish/build_post.py` auf.
3. Ergebnis: `artifacts/jonas-website/content/blog/<slug>.md` + `artifacts/jonas-website/public/blog/<slug>.pdf` (Essay) oder `artifacts/jonas-website/content/gedanken/<slug>.md` (Gedanke). Fehler landen in `inbox-failed/`.
4. Der Workflow pusht mit dem Repo-Secret `PUBLISH_TOKEN` (fine-grained, Contents: Read & write, unter deinem Konto, damit der Admin-Bypass der Branch-Regel greift). Ein Push mit einem eigenen Token startet `pages.yml` von selbst; mit `GITHUB_TOKEN` wäre er außerdem blockiert.

Grenzen: Upload bis 4 MB (Vercel Hobby), .docx/.doc/.md, Inhalt wird gegen die Endung geprüft. Bilder im Text werden entfernt. HTML wird entfernt. Gedanken haben keine Tags und kein Bild.
Zurücknehmen: Liste auf `/publish` löscht Beitrag und PDF per GitHub-API.

## Mail (Gedanke)
`workers/post-mail` (Cloudflare Email Worker). Ablauf:
1. Prüft der Reihe nach: Größe ≤ 100 KB, geheime Empfängeradresse, Umschlag- = Header-Absender auf der Liste, Authentifizierung, Tageslimit 10.
2. Authentifizierung: Nur der `Authentication-Results`-Header von `mx.cloudflare.net` zählt. Alle `dmarc`-Ergebnisse müssen `pass` sein (für die Absender-Domain), alle `dkim`-Ergebnisse `pass`, eines davon mit `header.d=<Absender-Domain>`. `policy.dmarc=none` ist nur die Richtlinie des Absenders (bei Gmail `none`), kein Ergebnis. Kommentare oder Quotes mit `;`/`=` und unausgeglichene Klammern → abgelehnt (Versuch, ein echtes `fail` zu verstecken).
3. Der Text wird als Entwurf im KV gespeichert (24 h) und **nicht** veröffentlicht. Antwort an den echten Absender mit zwei Links: „Veröffentlichen“ und „Später zurücknehmen“ (HMAC, Zweck ist Teil der Signatur).
4. GET auf einen Link zeigt nur eine Seite mit Knopf (Mail-Scanner öffnen Links), erst POST handelt.
Eine gefälschte Mail, die alle Header-Prüfungen überlistet, kommt trotzdem nie online: Der Bestätigungslink geht an das echte Postfach.
Der Worker schreibt nur nach `artifacts/jonas-website/content/gedanken/` und kann nur das, was der Token darf.
Fehlersuche: `npx wrangler tail` zeigt `abgelehnt: <grund> <detail>`, `antwort gesendet`/`antwort fehlgeschlagen`, `veröffentlicht` (ohne Adressen und Text).

## Einrichtung (einmalig)
**GitHub-Token** (fine-grained, nur dieses Repo, Contents: Read & write):
- Vercel (privater Bereich): `GITHUB_TOKEN`. Optional `GITHUB_REPO`.
- Cloudflare Worker: `wrangler secret put GITHUB_TOKEN`.
Nie in den Chat oder ins Repo.

**Worker** (`workers/post-mail/wrangler.toml`):
1. `wrangler kv namespace create STATE` (erledigt, die `id` steht in `wrangler.toml`).
2. Im Dashboard unter Settings → Variables setzen: `ALLOWED_SENDERS`, `SECRET_LOCAL_PART`, `PUBLIC_URL`. Diese Werte bleiben aus dem öffentlichen Repo heraus.
3. `wrangler secret put UNPUBLISH_SECRET` (lange Zufallszeichenfolge).
4. `pnpm install` in `workers/post-mail`, dann `wrangler deploy --keep-vars` (ohne `--keep-vars` löscht ein Deploy die Dashboard-Variablen).
5. Email Routing → Custom address `<SECRET_LOCAL_PART>@post.jonasjuchelka.com` → Action „Send to a Worker“ → `jonas-post-mail`.

## Tests
- `node --test tests/post-mail.test.mjs tests/post-mail-flow.test.mjs` (Worker-Logik und ganzer Ablauf: Spoofing, eingeschleuste Header, DKIM/DMARC, Größe, Limit, Signaturen, Bestätigung, Zurücknehmen)
- `tsx --test tests/publish.test.ts` (Upload-Prüfung)
- Umwandlung: Beispieldateien durch `python3 scripts/publish/build_post.py inbox/<slug> --root <ordner>` schicken (Pandoc, LibreOffice, Playwright nötig).
