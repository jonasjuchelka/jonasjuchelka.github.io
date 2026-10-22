# Veröffentlichung

Stand 22.10.2026: GitHub-Verbindung funktioniert. GET auf Repository, Inhalte und Pages von jonasjuchelka/jonasjuchelka.github.io liefert 404. Nicht zwischen fehlendem Repo und fehlender Einzelrepo-Berechtigung unterscheidbar. Keine Remote-Dateien verändert, kein Repo angelegt und keine Veröffentlichung durchgeführt.

Öffentlicher Build: `pnpm --filter @workspace/jonas-website build`; Ausgabe `artifacts/jonas-website/out`. Workflow vorbereitet, Deploy nur explizit via workflow_dispatch im erwarteten Repository. Vor Übernahme vorhandenes Repository/Workflow erneut prüfen und zusammenführen. Keine Force-Pushes, kein CNAME. GitHub Pages steuert MIME-/Response-Header; nach Livegang feed.xml Content-Type separat prüfen.

Privater Build: `BASE_PATH='' pnpm --filter @workspace/private-dashboard build`; Start mit leerem BASE_PATH und PORT via `pnpm --filter @workspace/private-dashboard start`. Separates Replit-Deployment noch einzurichten. Produktionsmetadatenabfrage ergab kein bestehendes Deployment. Danach PRIVATE_APP_ORIGIN und AUTH_ENVIRONMENT=production im Secret-/Konfigurationssystem setzen; public NEXT_PUBLIC_PRIVATE_APP_ORIGIN erst danach setzen und Public neu bauen.

Entwicklungsdatenbank: `cd artifacts/private-dashboard && node scripts/migrate-dev.mjs`. Keine Startup-Migrationen. Replit Publish verwaltet die Schemaübernahme der verwalteten Datenbank; vor Publish Schema-Diff einschließlich private_area prüfen. Bootstrap erst nach fester Origin: `node scripts/bootstrap.mjs 'Adminname'` im privaten App-Verzeichnis. Ausgabe ist eine vertrauliche Einmaleinladung; nicht in Chat/Logs/Repository kopieren. Noch nicht ausgeführt.

Produktionsblocker: Rechtsangaben, reales Passkey-Gerät, vollständige Sicherheitsabnahme, Repository-Zugriff und getrennte private Produktionskonfiguration. Markenassets wurden inzwischen geliefert, siehe branding.md. Keine kostenpflichtige Ressource gebucht.
