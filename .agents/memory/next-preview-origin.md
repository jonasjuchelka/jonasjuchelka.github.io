---
name: Next-Vorschau-Origin
description: Grenze zwischen Next-Entwicklungsassets und produktiver Auth-Origin.
---
Nexts Origin-Wildcard `*.replit.dev` deckt tiefer verschachtelte Preview-Hosts nicht ab. Für Entwicklungsassets den exakten aktuellen Workspace-Host erlauben, keine produktive Auth-Origin daraus ableiten.

**Why:** Verschachtelte Workspace-Hosts wurden mit HTTP 403 für Next-Assets abgewiesen; damit funktionierten Entwicklungsupdates im Browser nicht zuverlässig.

**How to apply:** Bei Preview-Hostwechseln und Next-Konfigurationsänderungen den tatsächlichen Host gegen Nexts Origin-Matcher prüfen. Development-Asset-Freigabe strikt getrennt von den fest konfigurierten WebAuthn-Origin-/RP-ID-Regeln halten.
