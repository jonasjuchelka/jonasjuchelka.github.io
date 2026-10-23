# Jonas Juchelka

Personal webpage source for GitHub Pages.

Zwei Next.js-Anwendungen: öffentliche statische Website und privater Passkey-Bereich. Noch nicht veröffentlicht. Produkt-/Abnahmestand in WEBSITE_SPEC.md.

Node 24 und pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/jonas-website build
pnpm --filter @workspace/jonas-website typecheck
pnpm --filter @workspace/private-dashboard build
pnpm --filter @workspace/private-dashboard typecheck
pnpm --filter @workspace/scripts exec tsx --test ../tests/policy.test.ts
node --test artifacts/jonas-website/scripts/dev-origins.test.mjs tests/pages-export.test.mjs
node scripts/verify-pages-export.mjs --manifest
```

Mit der eingerichteten Entwicklungsdatenbank: `cd artifacts/private-dashboard && node --test scripts/test-database.mjs`. Alle Testdatensätze werden zurückgerollt.

Entwicklung: pro Anwendung PORT setzen und `pnpm --filter @workspace/<name> dev`; öffentliche Site an `/`, private mit `BASE_PATH=/private`. Separate Produktionsanwendung mit leerem BASE_PATH bauen.

Migration/Bootstrap, Konfiguration und Veröffentlichung siehe docs/deployment.md; API in docs/private-api.md. `.env.example` ist ausschließlich Dokumentation, keine produktive Konfiguration. Niemals Secrets einchecken.

## GitHub Pages und Quellcode

Repository: https://github.com/jonasjuchelka/jonasjuchelka.github.io  
Der gesamte versionierte Projektquellcode wird über `replit-website-sync` und einen Pull Request gegen `main` synchronisiert. Abgleich und Sicherheitsgrenzen: docs/github-sync.md.

**Nur `artifacts/jonas-website/out` wird als Pages-Artefakt hochgeladen.** Die private Anwendung und Datenbankmodule bleiben Quellcode, werden aber nicht von Pages ausgeliefert. PRs/Pushes prüfen nur; Veröffentlichung erfolgt ausschließlich nach separat freigegebenem manuellem Workflow-Start auf main. Die alte generische `index.html` im Repository-Root ist unverändert erhalten, wird aber nicht veröffentlicht.
