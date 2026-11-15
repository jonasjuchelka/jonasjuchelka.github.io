# Style Guide

Einzige Referenz für Aussehen und Verhalten der Website. Wird bei jeder Design-Änderung mitgepflegt (neue Komponente, geänderte Farbe, neuer Zustand). Quellen: `lib/design-tokens/src/tokens.css`, `docs/branding.md`. Stand: 14.11.2026, entstanden beim Blog-Entwurf. Alle Kontrastwerte sind selbst berechnet (WCAG-Formel); eine vollständige Messung aller gerenderten Zustände steht weiter aus.

## 1. Grundsätze

1. Eigenes CSS plus Brand-Tokens, kein UI-Framework. Höchstens headless Primitives (z. B. Radix) für Dialoge und Menüs.
2. Eine Sache, ein Aussehen: Gleiche Funktion bekommt immer dieselbe Komponente.
3. Ruhig: wenig Elemente, viel Weißraum, Übergänge nur für Inhalte (Einblenden, Aufklappen), nie für Buttons.
4. Runde Formen statt harter Ecken.
5. Nur die vier Originalschriften. Kein Faux-Bold, keine Fallback-Gewichte.

## 2. Farben und Rollen

| Token | Hex | Rolle |
|---|---|---|
| Weiß | #FAFAFA | Seitenhintergrund |
| Schwarz | #06060D | Fließtext |
| Königsblau | #1C2B36 | Überschriften, UI-Text, dunkle Flächen (Footer), Rand des aktiven Zustands |
| Himmelblau | #74AFDB | Akzent: Button-Rand, Nav-Unterstreichung, Eyebrow-Linie, Streifen, Gedanke-Balken, Fokus-Glow |
| Babyblau | #82C4F5 | Hover-Verlauf, aktive Fläche (40 %), Streifen-Ende, Text auf dunklem Grund |
| Dunkel-sekundär | #2D4354 | Sekundärtext, Metadaten, Zähler |
| Surface | #EEF2F5 | Flächen für Kategorie-Label |
| Hellgrau / Mittelgrau / Dunkelgrau | #B0C4D4 / #9DAFBD / #8595A1 | Linien, passive Trennungen. Nie als kleiner Fließtext |
| Neon-Gelb | #FFDF56 | **Nur** Suchtreffer (`mark`) und „Neu“-Pille (Beitrag ≤ 7 Tage). Sonst nirgends |

Streifen: `linear-gradient(90deg, Königsblau 0–18 %, Himmelblau 18–58 %, Babyblau 58–100 %)`.

Kontraste (berechnet): Königsblau auf Weiß 13,89; Sekundär auf Weiß 9,85; Königsblau auf aktiver Button-Fläche (#CAE4F8) 11,02; Königsblau auf Hover-Fläche 11,14; Königsblau auf Gelb 11,01; Babyblau auf Königsblau 7,71.

**Offen:** Der Himmelblau-Rand (2px) hat gegen Weiß nur 2,26:1 und liegt damit unter den 3:1 für Bedienelemente (WCAG 1.4.11). Das gilt auch für „Privater Bereich“ auf der Live-Seite. Der Text trägt die Bedeutung; trotzdem entscheiden, ob der Ruhe-Rand dunkler wird (z. B. Himmelblau-dunkel oder Sekundär).

## 3. Typografie

| Verwendung | Schrift | Gewicht | Größe / Zeilenhöhe |
|---|---|---|---|
| Überschriften, Titel in Listen | Plus Jakarta Sans | 600 | Zeilenhöhe ~1,15–1,2, Laufweite −0,02em |
| UI, Buttons, Navigation, Metadaten | Catamaran | 400 | 0,95–1,05rem |
| Langtext, Vorschau Mac | Catamaran | 300 (nur ab 18px) | 1,125–1,25rem / 1,55–1,6 |
| Langtext Handy | Catamaran | 400 | 1,0625–1,125rem / 1,55 |
| Labels, Eyebrow, Zähler, Datum | Mukta | 400 | 0,82–0,95rem, Versalien mit 0,1–0,12em |

Zeilenlänge 45–75 Zeichen. Navigation: alle Einträge Gewicht 400, aktuelle Seite mit 3px Himmelblau-Unterstreichung. Light (300) nie unter 18px. Schriftdateien: `lib/design-tokens/fonts` (TTF, lokal, OFL 1.1).

## 4. Buttons (ein System)

Referenz ist „Privater Bereich“. Alles Klickbare im Filter/Blog nutzt dieselbe Familie:

| Zustand | Aussehen |
|---|---|
| Ruhe | 2px Himmelblau-Rand, Königsblau-Text, kein Hintergrund |
| Hover | Verlauf `135deg, Babyblau 38 % → 10 %`, Rand bleibt, **kein Übergang** |
| Aktiv / gewählt | Babyblau-Fläche 40 %, 2px **Königsblau**-Rand |
| Fokus (Tastatur) | 3px Glow `rgb(116 175 219 / .55)`, kein schwarzer Outline |
| Deaktiviert | 50 % Deckkraft |

Form: Pille (`border-radius: 999px`), Höhe 44px (Chips 40px). Kein Übergang auf Buttons (`transition: none`), auch nicht für den Pfeil-Schalter.

Varianten (nur diese):
- **Standard-Button**: Nav-Eintrag „Privater Bereich“, Menü, Lupe, Chips, Segment-Schalter (Vorschau | Liste).
- **Listenzeile** (`.opt`): gleiche Zustände, transparenter Rand in Ruhe, damit nichts springt.
- **Icon-Schalter** (`.tgl`): nur Symbol, kein Rand, Sekundärfarbe bei 75 % Deckkraft, Hover Verlauf. Einziger Schalter zum Auf- und Zuklappen des Filters, sitzt am Ende der sichtbaren Vorschau bzw. am Ende des ganzen Filters.
- **Text-Link-Button** (`.reset`): unterstrichen, Hover dickere Linie.
- **Primär-CTA** (`.btn--primary`, Himmelblau-Fläche mit Königsblau-Text): nur für die eine Hauptaktion einer Seite, nicht im Filter.

Nicht verwenden: gefüllte Königsblau-Buttons für Auswahl, harte Rechtecke, Pfeile als Dreiecke, Hover mit Bewegung (`translateY`).

## 5. Formularfelder

Suchfeld: Pille, 44px, 2px Himmelblau-Rand, Weiß-Hintergrund. Fokus: Rand Königsblau plus 3px Babyblau-Glow. Der Container lässt 4px Platz, damit der Glow nicht abgeschnitten wird. Nie ein dunkler Kasten, auch nicht aktiv.

## 6. Blog

- Zwei Formate: **Essay** (Titel, Vorschau 2–3 Zeilen, Lesezeit) und **Gedanke** (kein Titel, voller Text, Himmelblau-Balken links).
- Layout Mac: Filter links (16rem), Beiträge rechts. Handy: eine Spalte, Lupe und Anzahl in einer Zeile, Filter darunter.
- Filter: Lupe oben (Suchfeld gleitet darunter auf), Anzahl der Beiträge im Filterbereich, ein Icon-Schalter. Zugeklappt sind die ersten Einträge sichtbar und laufen mit einem Verlauf aus; der Schalter steht direkt darunter.
- Auswahl umschalten: erneuter Klick auf einen gewählten Eintrag hebt die Auswahl auf.
- Ansicht: Vorschau | Liste. Sobald gefiltert oder gesucht wird, wechselt die Ansicht automatisch auf die Liste; der Umschalter bleibt bedienbar.
- Suchtreffer in Gelb markiert. „Neu“-Pille bei Beiträgen ≤ 7 Tage.
- Laden: erste 3 Beiträge (Liste 10), weitere per Scroll; der letzte sichtbare Beitrag läuft aus. Neue Beiträge blenden 0,5s ein (`prefers-reduced-motion`: keine Animation).
- Keine Linie zwischen Ansicht-Umschalter und Beiträgen.

## 7. Bewegung

Erlaubt: Einblenden von Beiträgen, Aufklappen des Filters (0,45s), Aufgleiten des Suchfelds (0,3s). Verboten: Übergänge auf Buttons. Immer `prefers-reduced-motion` respektieren.

## 8. Barrierefreiheit (Pflicht beim Umsetzen)

- Zugeklapptes Filterpanel für Tastatur und Screenreader unerreichbar machen (`inert` oder `hidden` nach dem Zuklappen), Schalter mit `aria-expanded` und `aria-controls`.
- Anzahl mit `aria-live="polite"`.
- Zielgröße mindestens 44px.
- Zustand nie nur über Farbe: aktiv = Fläche **und** Königsblau-Rand.

## 9. Pflege

Neue Komponente oder neuer Zustand: erst hier eintragen, dann bauen. Abweichungen nur mit Begründung im Pull Request.
