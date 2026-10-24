# Veröffentlichung

Stand 22.10.2026: Repository `jonasjuchelka/jonasjuchelka.github.io` ist inzwischen erreichbar. Vor dem Quellcode-Abgleich enthielt main nur README.md, index.html und einen Static-HTML-Workflow. Der vollständige Replit-Quellcode wird ausschließlich über `replit-website-sync` und einen Pull Request gegen main übertragen, nicht direkt nach main. Kein Force-Push und kein automatisches Merge.

Öffentlicher Build: `pnpm --filter @workspace/jonas-website build`; Ausgabe `artifacts/jonas-website/out`. `node scripts/verify-pages-export.mjs --manifest` prüft erlaubte öffentliche Pfade, Dateitypen und private Code-/Konfigurationsmarker. Der Workflow lädt ausschließlich diesen Ordner hoch, niemals das Repository. Deploy nur explizit via workflow_dispatch auf main im erwarteten Repository; Pushes und PRs führen nur Prüfungen aus. Der alte Root-Upload-Workflow wird erst nach erfolgreichem lokalem Next-Build und Exportprüfung entfernt. Kein CNAME. GitHub Pages steuert MIME-/Response-Header; nach einem separat freigegebenen Livegang feed.xml Content-Type prüfen.

Privater Build: `BASE_PATH='' pnpm --filter @workspace/private-dashboard build`; Start mit leerem BASE_PATH und PORT via `pnpm --filter @workspace/private-dashboard start`. Separates Replit-Deployment noch einzurichten. Produktionsmetadatenabfrage ergab kein bestehendes Deployment. Danach PRIVATE_APP_ORIGIN und AUTH_ENVIRONMENT=production im Secret-/Konfigurationssystem setzen; public NEXT_PUBLIC_PRIVATE_APP_ORIGIN erst danach setzen und Public neu bauen.

Entwicklungsdatenbank: `cd artifacts/private-dashboard && node scripts/migrate-dev.mjs`. Keine Startup-Migrationen. Replit Publish verwaltet die Schemaübernahme der verwalteten Datenbank; vor Publish Schema-Diff einschließlich private_area prüfen. Bootstrap erst nach fester Origin: `node scripts/bootstrap.mjs 'Adminname'` im privaten App-Verzeichnis. Ausgabe ist eine vertrauliche Einmaleinladung; nicht in Chat/Logs/Repository kopieren. Noch nicht ausgeführt.

Produktionsblocker: Rechtsangaben, reales Passkey-Gerät, vollständige Sicherheitsabnahme, Repository-Zugriff und getrennte private Produktionskonfiguration. Markenassets wurden inzwischen geliefert, siehe branding.md. Keine kostenpflichtige Ressource gebucht.

## Vercel Hobby + Neon (privater Bereich)

Nur für persönliche, nichtkommerzielle Nutzung (Vercel Hobby). Keine Secrets im Repository; Werte nur in den Vercel-/Neon-Einstellungen setzen.

**Vercel-Projekt:** Root Directory `artifacts/private-dashboard`; „Include source files outside of the Root Directory in the Build Step“ aktivieren; Node.js 24; pnpm 10. Install/Build stehen in `artifacts/private-dashboard/vercel.json` (`pnpm install --frozen-lockfile`, `pnpm run build:production`). Das Build setzt `BASE_PATH` leer.

**Variablen (Production):** `DATABASE_URL` (Neon, gepoolte Verbindung, Runtime-Rolle ohne Schemarechte), `AUTH_ENVIRONMENT=production`, `PRIVATE_APP_ORIGIN` (feste HTTPS-Origin, z. B. die stabile `…vercel.app`-Adresse oder eigene Domain; Passkeys sind daran gebunden). Preview-Deployments bekommen keine Produktionszugangsdaten. `DATABASE_URL_UNPOOLED` wird nur lokal/manuell für Migrationen genutzt und gehört nicht in die Vercel-Runtime.

**Migrationen (manuell, nie automatisch):** Mit einer direkten (nicht gepoolten) Neon-Verbindung und einer eigenen Migrationsrolle:

```
DATABASE_URL_UNPOOLED='…' CONFIRM_PRODUCTION_MIGRATION=yes pnpm --filter @workspace/private-dashboard migrate:production
```

Der Runner (`scripts/migrate-production.mjs`) führt `migrations/*.sql` in Reihenfolge aus, protokolliert sie samt SHA-256-Prüfsumme in `private_area.schema_migrations`, lehnt geänderte bereits angewendete Dateien ab und verhindert parallele Läufe per Advisory-Lock. Jede Migration läuft in einer Transaktion. Vorher auf einer isolierten Neon-Branch/Testdatenbank prüfen und Backup/Restore-Möglichkeit sicherstellen. `migrate-dev.mjs` bleibt für Produktion gesperrt.

**Reihenfolge:** Neon-Projekt anlegen → Migration → Vercel-Projekt mit Variablen → Deploy → feste Origin prüfen → `node scripts/bootstrap.mjs 'Adminname'` selbst ausführen (Ausgabe vertraulich) → Passkey auf realem Gerät testen → erst danach `NEXT_PUBLIC_PRIVATE_APP_ORIGIN` setzen und die öffentliche Seite per PR + manuellem Workflow neu veröffentlichen.

**Hinweis:** Neon (Free) fährt im Leerlauf herunter; die erste Anfrage danach kann einige Sekunden dauern (Pool-Timeout 15 s). Replit-Dateien (`.replit`, `artifacts/*/.replit-artifact`, `scripts/post-merge.sh`) werden für den Vercel-Betrieb nicht benötigt.

**Passworttresor-Button:** Optional `VAULTWARDEN_ORIGIN` (nur `https://`-Origin, z. B. die Vaultwarden-Adresse) in Vercel setzen; dann zeigt `/tools` einen aktiven Link "Tresor öffnen". Nur ein Link, keine Anmeldung und keine Zugangsdaten.

**Einladungs-Mail ("Jonas Support"):** Optional. Mit `RESEND_API_KEY` und `MAIL_FROM` (z. B. `Jonas Support <support@deine-domain.de>`) in Vercel verschickt das Admin-Formular die Einladung per Mail; optional `MAIL_REPLY_TO` für Antworten. Absender-Domain bei Resend verifizieren (DNS-Einträge SPF/DKIM). Mit Mail ist der Link 48 Stunden gültig (ohne Mail 1 Stunde), einmalig nutzbar. Die E-Mail-Adresse wird nicht gespeichert. Schlägt der Versand fehl, bleibt die Einladung bestehen und der Link wird im Admin angezeigt. Ohne diese Variablen ändert sich nichts; Env-Änderungen brauchen einen Redeploy.

**Tool-Dokumentation (Seitenfenster):** Migration `0002_tool_details.sql` ergänzt `plan`, `price` und `details` je Tool, `0003_tool_logo.sql` ein optionales `logo_url`. Wichtig: Der Admin-Bereich liest diese Spalten, er zeigt ohne Migration eine Fehlermeldung. Reihenfolge: PR mergen, Vercel-Deploy abwarten, dann `migrate:production` ausführen (additiv, `IF NOT EXISTS`). Die Tool-Seite funktioniert auch vor der Migration; Speichern im Admin braucht sie.
