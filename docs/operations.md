# Betrieb

Täglich im privaten Serverkontext `node scripts/cleanup.mjs`: abgelaufene Challenges/Sitzungen sofort, Einladungen nach sieben Tagen, Audit nach 30 Tagen. Keine Tokeninhalte protokollieren. Administrator muss diesen Job außerhalb des Entwicklungsprozesses planen.

Offboarding: Konto sperren, Sitzungen widerrufen, Gruppen/Freigaben entziehen; Anbieter-Teamplatz separat entfernen. Später zusätzlich Vaultwarden-Mitgliedschaft entfernen, geteilte Geheimnisse rotieren und Anbietersitzungen widerrufen. Website-Login ist kein Anbieterlogin.

Datenbank-Backup: Betreiber legt verschlüsselte, außerhalb des Hosts verwahrte Sicherung mit getrenntem Schlüssel fest; Ziel zunächst täglich/RPO 24 Stunden, RTO vor Inbetriebnahme vereinbaren. Restore in isolierter Umgebung und mit deaktivierter Auth-Origin prüfen. Noch keine Backupautomation oder Restoreprobe durchgeführt.

Vaultwarden bleibt bewusst deaktiviert: Authentifizierungsabnahme ist noch nicht abgeschlossen, Host fehlt. Kein Container in Replit gestartet, keine behauptete VPN-/DNS-/TLS-Einrichtung. Deployment-Dateien, Version/Digest-Pinning, separate verschlüsselte Backups und Restoretest gehören zur anschließenden letzten Etappe.
