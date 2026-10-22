# Sicherheitsmodell und verbleibende Abnahme

Keine öffentliche Registrierung. Einladungen: 256-Bit-Zufall, SHA-256-Hash in DB, eine Stunde TTL, atomarer Verbrauch innerhalb Registrierungstransaktion. Links verwenden Fragmente statt Queryparameter. Bootstrap nur im vertrauenswürdigen Terminal, dauerhafter atomarer Sentinel. Kein E-Mail-Reset.

WebAuthn: SimpleWebAuthn, UV und resident credentials erforderlich; Challenge an HttpOnly-Flow-Cookie, Zweck und bei Reauth/Kontoergänzung Sitzung gebunden. Fünf Minuten, DELETE RETURNING vor Verifikation verhindert Replay auch bei Fehlern. Origin und RP-ID aus expliziter Konfiguration, nicht Host-Header. Kein Produktionslogin auf Vorschau-Domain.

Sitzungen: gehashte 256-Bit-Tokens, __Host-Cookie, Secure/HttpOnly/SameSite=Strict, 12 Stunden Ablauf, Rotation bei Login. Sperren widerruft Sitzungen; jede API prüft Konto und Berechtigung. Sicherheitskritische Änderungen erfordern Bestätigung innerhalb fünf Minuten. Letzten Passkey schützt serverseitige Nutzersperre in Transaktion.

Origin-Abgleich auf jeder Mutation; HTTPS-URL-Validierung; Parametrisierung; no-store, noindex, no-referrer, nosniff und frame denial auf privater Runtime. Globale persistente Ratenlimits (60/min pro feste Kategorie) vertrauen keinen Client-IP-Headern, sind aber durch fremde Anfragen erschöpfbar. Vor größerem Betrieb vorgelagertes vertrauenswürdiges Rate Limiting ergänzen. Keine Drittanbieter-Secrets oder Tresorinhalte.

Noch ausstehend: vollständige adversariale Integrationstests, Race-Tests für Sperre versus gleichzeitige Kontomutation, reales Passkey-Gerät, Screenreader/Tastaturabnahme und produktionsbezogene Headerprüfung. Keine Aussage „produktionssicher“. Domainwechsel erfordert ggf. neue Passkeys.

Automatische Wiederherstellung bei Schlüsselverlust existiert nicht: Konto bleibt gesperrt, bis ein dokumentierter, personell verifizierter Prozess mit Sitzungswiderruf eingerichtet ist.
