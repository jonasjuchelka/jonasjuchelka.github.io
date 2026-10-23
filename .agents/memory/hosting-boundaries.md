---
name: Hosting- und Sicherheitsgrenzen
description: Verbindliche Trennung der öffentlichen Website, privaten Anwendung und späteren Passwortverwaltung.
---
Öffentliche Inhalte bleiben statisch auf GitHub Pages; private Passkey-Prüfung und PostgreSQL gehören auf einen separaten stabilen HTTPS-Produktionshost. Kein Cookie-Sharing, Login-Iframe oder Passwort-/Social-/Magic-Link-Fallback.

**Why:** Das Nutzerbriefing schreibt diese Sicherheits- und Hostinggrenzen ausdrücklich vor.

**How to apply:** Produktions-Origin niemals aus Vorschau oder Host-Header erfinden. Original-Markenassets nicht ersetzen oder als geprüft ausgeben, solange sie fehlen. Vaultwarden erst nach abgeschlossener Authentifizierungs-/Berechtigungsabnahme beginnen; kein Betrieb im Entwicklungsprozess.
