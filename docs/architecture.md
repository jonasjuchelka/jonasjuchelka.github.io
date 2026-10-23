# Architektur

Bestehende pnpm-Struktur beibehalten: `artifacts/jonas-website` entspricht apps/public, `artifacts/private-dashboard` apps/private; `lib/site-ui` und `lib/design-tokens` entsprechen gemeinsamen packages. Beide verwenden Next App Router; keine parallele HTML-Website.

Öffentlich: statischer Export, trailingSlash, feste Canonical-Origin https://jonasjuchelka.github.io. Nur öffentliche Markdown-Inhalte. Keine laufenden privaten API-Abfragen. GitHub Actions lädt ausschließlich `artifacts/jonas-website/out` hoch.

Privat: eigene Next Serverruntime mit PostgreSQL im Schema private_area. Der API-Vertrag steht in private-api.md. SQL-Migration ist maßgeblich, Drizzle wird für Tool-Abfragen eingesetzt. Kein Express-Proxy, keine geteilten Cookies mit Pages.

Workspace-Vorschau unter /private; eigenständiger Produktionshost muss mit leerem BASE_PATH gebaut/gestartet werden. Das aktuelle kombinierte Replit-Artefaktsetup ist noch **kein separat isoliertes Produktionsdeployment**. Vor Aktivierung isolierten privaten Produktionsbetrieb konfigurieren; nicht blind beide Website-Artefakte gemeinsam veröffentlichen.

Vaultwarden ist nicht eingerichtet. Erst nach bestandener Authentifizierungs-/Berechtigungsabnahme und mit eigenem Host behandeln.
