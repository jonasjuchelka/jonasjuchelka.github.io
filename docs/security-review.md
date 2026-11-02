# Security review – private area (2026-11-01)

Scope: login (invitation, passkeys, sessions), admin, shared logins / access links, Neon, Vercel, GitHub, mail.
Method: code review of `artifacts/private-dashboard`, read-only checks against https://jonas-private.vercel.app
(no login, no brute force), scan of the public Git history for secrets, GitHub settings via API.

## Ergebnis in einem Satz
Der Login ist solide gebaut; eine Person ohne gültige Einladung kann sich keinen Passkey anlegen.
Die größeren Risiken liegen außerhalb des Codes: Konten (Vercel, Neon, GitHub, Resend, Joker) und die Datenbank-Adresse.

## Was geprüft wurde und hält
| Frage | Ergebnis |
|---|---|
| Kann man sich mit einem Link selbst einen Passkey anlegen? | Nur mit gültiger Einladung: 256-Bit-Zufallstoken, nur als Hash gespeichert, einmalig, 1 h (Link) bzw. 48 h (Mail) gültig, wird in einer Transaktion verbraucht. Raten ist aussichtslos. |
| Weiteren Passkey an fremdes Konto hängen? | Nur eingeloggt und mit Passkey-Bestätigung der letzten 5 Minuten. |
| Passkey-Prüfung | Origin und RP-ID fest aus der Konfiguration, User Verification Pflicht, Challenge einmalig (Cookie + DB, 5 min), Zähler wird geprüft. Passkeys sind phishing-resistent. |
| Sitzung | `__Host-`-Cookie, HttpOnly, Secure, SameSite=Strict; nur als Hash in der DB; beim Sperren eines Kontos gelöscht. |
| CSRF | Jede ändernde Anfrage braucht exakt die eigene Origin und JSON. Live geprüft. |
| Admin | Rolle + Passkey-Bestätigung ≤ 5 min, serverseitig in einer Transaktion geprüft. Kein HTTP-Bootstrap. |
| SQL-Injection | Durchgehend parametrisierte Abfragen. |
| XSS | React escaped alles; Dokumentation wird ohne HTML gerendert. |
| Live ohne Login | `/api/tools`, `/api/admin`, `/api/account`, Zugangslinks, Admin-Aktionen → 401; falscher Einladungs-Token → 400; zu große Anfrage → 413; Source-Maps nicht öffentlich. |
| Secrets in der öffentlichen Git-Historie | Keine gefunden (64 Commits durchsucht). |

## Gefunden und in diesem PR behoben
1. **Login-Sperre für alle (DoS):** Das Rate-Limit war ein einziger Zähler für alle Besucher. Mit 61 Anfragen pro Minute konnte jeder den Login für alle blockieren. Jetzt: Limit pro Client (gehashte IP, von Vercel gesetzt) plus ein globales Limit als Backstop.
2. **Keine Content-Security-Policy:** Jetzt gesetzt (nur eigene Skripte, Styles, Fonts, API; kein Einbetten; keine Plugins).
3. **„Login öffnen“ ohne frische Bestätigung:** Ein neuer Zugangslink braucht jetzt eine Passkey-Bestätigung der letzten 5 Minuten (der offene Link des Browsers bleibt ohne nutzbar).
4. **Keine automatischen Tests für Verschlüsselung/2FA:** `tests/vault.test.ts` (RFC-6238-Testwerte, Bindung an das Tool, Fail-Closed) läuft jetzt in CI.
5. **Kein regelmäßiger Live-Check:** `scripts/security-check.mjs` + Workflow „Security check“ (montags und auf Knopfdruck).

## Deine To-dos – Stand 2026-11-01
1. ✅ **Eigene App-Rolle statt Owner.** `DATABASE_URL` in Vercel nutzt jetzt `private_app` (nur Zeilen lesen/schreiben in `private_area`, keine Tabellen anlegen/löschen). Per `pg_stat_activity` geprüft. Der Owner dient nur noch für Migrationen (lokal, nicht in Vercel).
2. ✅ **Owner-Passwort erneuert** und `~/.zsh_history` gelöscht. Die alte Adresse aus dem Terminal-Verlauf ist wertlos. Hinweis: Ältere Vercel-Deployments behalten ihre alten Variablen; auch deshalb war der Reset nötig.
3. ⬜ **Konten absichern:** Passkey oder 2FA bei GitHub, Vercel, Neon, Resend und Joker. Wer eines davon übernimmt, umgeht jeden Code-Schutz.
4. ✅ **GitHub:** Ruleset `main` aktiv (nur per PR, Check „public“ muss grün sein, kein Force-Push, kein Löschen). Dependabot-Alerts, -Security-Updates, Secret Protection und Push Protection an.
5. ✅ **DMARC** war bereits gesetzt: `v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s`. DKIM für Resend (`resend._domainkey`) und Proton (`dkim._domainkey`) vorhanden.
6. **Resend:** Die Einladungsmails (mit Link) sind dort im Log sichtbar. Konto mit 2FA schützen; ggf. Mail-Einladungen auf 24 h verkürzen.
7. **Optional:** Sitzungen von 365 auf z. B. 90 Tage verkürzen; Vercel-Firewall-Regel als zusätzlicher Schutz vor Lastspitzen; in GitHub „Grouped security updates“ und „Malware alerts“ einschalten.

### SQL für die App-Rolle (so ausgeführt, im Neon SQL Editor als Owner)
Wichtig: die Rolle per SQL anlegen, nicht über „Add role“ in der Neon Console. Rollen aus der Console bekommen automatisch `neon_superuser` (fast alle Rechte).
```sql
CREATE ROLE private_app LOGIN PASSWORD '<langes zufälliges Passwort, nur Buchstaben und Zahlen>';
GRANT USAGE ON SCHEMA private_area TO private_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private_area TO private_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA private_area TO private_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA private_area GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO private_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA private_area GRANT USAGE, SELECT ON SEQUENCES TO private_app;
REVOKE ALL ON private_area.schema_migrations FROM private_app;
```
Prüfen: `SELECT has_table_privilege('private_app','private_area.users','DELETE'), has_schema_privilege('private_app','private_area','CREATE');` → `t`, `f`.
Danach den SQL-Editor-Verlaufseintrag mit dem Passwort löschen. Neue Tabellen aus späteren Migrationen bekommt `private_app` automatisch (Default Privileges).

## Für deine Hacker-Freunde
Erlaubter Umfang: https://jonas-private.vercel.app. Bitte keine Last-/DoS-Tests, kein Social Engineering, keine Angriffe auf Vercel/Neon/GitHub selbst. Ein Testkonto per Einladung anlegen und danach sperren. Funde an Jonas, nicht öffentlich.
