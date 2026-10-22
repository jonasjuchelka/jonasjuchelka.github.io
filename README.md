# Jonas Juchelka

Zwei Next.js-Anwendungen: öffentliche statische Website und privater Passkey-Bereich. Noch nicht veröffentlicht. Produkt-/Abnahmestand in WEBSITE_SPEC.md.

Node 24 und pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/jonas-website build
pnpm --filter @workspace/jonas-website typecheck
pnpm --filter @workspace/private-dashboard typecheck
pnpm --filter @workspace/private-dashboard build
pnpm --filter @workspace/scripts exec tsx --test ../tests/policy.test.ts
```

Mit der eingerichteten Entwicklungsdatenbank: `cd artifacts/private-dashboard && node --test scripts/test-database.mjs`. Alle Testdatensätze werden zurückgerollt.

Entwicklung über die vorhandenen Replit-Workflows. Außerhalb Replit: pro Anwendung PORT setzen und `pnpm --filter @workspace/<name> dev`; öffentliche Site an `/`, private mit `BASE_PATH=/private`. Separate Produktionsanwendung mit leerem BASE_PATH bauen.

Migration/Bootstrap, Konfiguration und Veröffentlichung siehe docs/deployment.md; API in docs/private-api.md. `.env.example` ist ausschließlich Dokumentation, keine produktive Konfiguration. Niemals Secrets einchecken.
