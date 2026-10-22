# Prüfnachweis, 22.10.2026

Erfolgreich:
- Beide Next.js-Produktionsbuilds einschließlich TypeScript-Prüfung.
- Öffentlicher Postbuild-Check: kein CNAME, kein altes Domainziel, keine erkannten Secret-Muster; Blogentwurf ausgeschlossen.
- Fünf automatisierte Policy-Tests: unkonfigurierte Auth gesperrt; Produktions-Origin/RP-ID-Validierung; erlaubte feste Origin; CSRF-Origin-Prüfung; externe URL-Schemata.
- Zusätzlicher transaktionaler Datenbanktest: Einladungs-/Challenge-Replay und Ablauf, fremde Sitzung, gesperrter Nutzer und nutzerbezogene Tool-Sichtbarkeit. Testdaten werden zurückgerollt. Kein Ersatz für API-/WebAuthn-E2E.
- Entwicklungsschema angelegt, keine echten Nutzer oder Bootstrap-Einladung erstellt.
- HTTP `/private/api/status`: configured=false; `/private/api/tools`: 503 ohne Daten.
- Vorschau `/feed.xml`: 200, application/rss+xml.
- Export-Dateien für Projekte, Details, Blog, Kontakt, Legal, Login und 404 vorhanden.
- Desktop- und Mobil-Screenshot öffentliche Startseite. Mobile Wortbindung in „Operations Research“ entfernt und im erneuten Mobil-Screenshot geprüft.
- Private Login-Oberfläche gerendert; Backend meldet ausdrücklich fehlende Konfiguration.
- SAST vollständig ohne Befunde; HoundDog ohne Befunde.

Abhängigkeitsscan fand 3 hohe und 2 mittlere Meldungen: vier davon betreffen PostCSS 8.4.31; auf 8.5.31 überschrieben, danach beide Builds erfolgreich. Verbleibender bekannter hoher Befund: braces 3.0.3 über fast-glob/micromatch im vorinstallierten Mockup-Sandbox-Devtool; aktuelle Registryversion weiterhin 3.0.3 ohne Fix. Keine Benutzereingaben werden an diese Glob-Verarbeitung übergeben; nicht pauschal als risikofrei bewerten. Scan nach Override nicht erneut ausgeführt.

Offen:
- Vollständige Passkey-/Einladungs-/Berechtigungs-Integrationstests einschließlich Replay, Parallelität und manipulierten Objekt-IDs.
- Echter Passkey-Ablauf auf geeignetem Gerät und stabiler privater Origin.
- E2E, manuelle Tastatur-/Screenreader-Prüfung, sämtliche Kontrastzustände und vollständige WCAG-2.2-AA-Abnahme.
- Separate Lint-Konfiguration über Build/TypeScript hinaus.
- GitHub-Pages-Liveprüfung von Deep Links, MIME- und Cache-Headern.
- Backup/Restoreprobe und Vaultwarden-Endabnahme.

Entwicklungs-HMR meldet im Screenshot-Browser eine Proxy-WebSocket-Warnung; HTML/API-Antworten laden. Kein Nachweis eines Produktionsfehlers.
