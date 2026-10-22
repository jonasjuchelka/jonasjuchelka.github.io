# Verbindlicher Umsetzungsstand

Öffentliche Zieladresse: https://jonasjuchelka.github.io/. Keine .com-Ziele, kein CNAME. Deutsche Website mit Projekten, sicherem Markdown-Blog, Kontakt, Zugangserklärung, rechtlichen Entwurfsseiten und 404.

Zwei getrennte Next-Anwendungen im vorhandenen Artefaktlayout; gemeinsame UI/Tokens. Öffentliche Ausgabe statisch; private Daten nur aus geschützten Runtime-APIs. Passkey-only, Einladungen, widerrufbare Sitzungen, Gruppen-/Tool-Berechtigungen. Kein Passwort-/Social-/Magic-Link-Fallback. Keine Anbieter-Secrets.

Implementiert: öffentliche Seiten/Export, private Oberflächen/API, Entwicklungsschema, kontrollierter Bootstrap, CI-/Pages-Vorbereitung. Originalbranding inzwischen geliefert; Integration und Quellen in docs/branding.md. Nicht aktiviert: GitHub Pages, private Produktion und Admin. Nicht fertig abgenommen: Rechtsangaben, reales WebAuthn/E2E, vollständige Accessibility/Sicherheitsprüfung. Vaultwarden erst nach dieser Abnahme; gegenwärtig deaktivierte Konfigurationsgrenze.

Details und Prüfstatus: docs/branding.md, docs/architecture.md, docs/security.md, docs/deployment.md, docs/operations.md, docs/assumptions.md, docs/verification.md. Keine pauschale Sicherheits- oder WCAG-Zertifizierung.
