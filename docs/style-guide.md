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

Alles Klickbare im Filter/Blog nutzt dieselbe Familie. **Ringlos**: kein Rand, Zustand nur über Fläche, Symbol und Hover.

| Zustand | Aussehen |
|---|---|
| Ruhe | Surface-Fläche (`#eef2f5`, dunkel `#2d4354`), Königsblau-Text, kein Rand |
| Hover | Verlauf `135deg, Babyblau 38 % → 10 %` (dunkel: einfarbig Babyblau 24 %), **kein Übergang** |
| Gewählt | Füllung `--active` (hell `#6295ba`, dunkel `#4f7797`, je 3:1 gegen den Seitengrund) **plus Häkchen** |
| Fokus (Tastatur) | 3px Glow `rgb(116 175 219 / .55)`, kein schwarzer Outline |
| Deaktiviert | 50 % Deckkraft |

Form: Pille (`border-radius: 999px`), Höhe 44px (Chips 40px). `transition: none` auf allen Buttons. Segment (Vorschau | Liste): Pille mit gleitender Markierung (`.ind`), Abstand zwischen den Knöpfen.

**Häkchen**: SVG als CSS-Maske (`currentColor`), 1em, `margin-right .4em`, `transform: translateY(-.06em)`. Catamaran hat Ascent 1,10 em, Descent 0,54 em, Versalhöhe 0,68 em; die Zeilenmitte liegt 0,06 em unter der Versalmitte, daher wirkt ein mittig gesetztes Symbol zu tief. Gemessen: vorher +1,75 px, nachher < 0,2 px bei 16 px. Gilt für jede neue Schrift: Metriken prüfen, Offset neu messen.

Varianten (nur diese): Standard-Button (Nav „Privater Bereich“ mit 2px Himmelblau-Rand, Menü, Lupe, Chips, Segment), Listenzeile (`.opt`, Abstand 4px), Icon-Schalter (`.tgl`), Text-Link-Button (`.reset`), Primär-CTA (`.btn--primary`, nur eine Hauptaktion pro Seite, nicht im Filter).

Nicht verwenden: gefüllte Königsblau-Auswahl-Buttons, Ringe um Auswahl, harte Rechtecke, Hover mit Bewegung.

## 5. Formularfelder

Suchfeld: Pille, 44px, 2px Himmelblau-Rand, Weiß-Hintergrund. Fokus: Rand Königsblau plus 3px Babyblau-Glow. Der Container lässt 4px Platz, damit der Glow nicht abgeschnitten wird. Nie ein dunkler Kasten, auch nicht aktiv.

## 6. Blog

- **Überschrift**: „Blog“ (Plus Jakarta 600) mit **eckigem** Markenstrich darunter (Königsblau 0–18 %, Himmelblau 18–58 %, Babyblau 58–100 %, Höhe 8px, kein Radius). Dunkel: Strich beginnt mit `#4f7797`. Kein Verlauf in der Schrift (Kontrast).
- **Formate**: Essay (Titel, Vorschau 2–3 Zeilen, Lesezeit, optional Bild) und Gedanke (kein Titel, kein Bild, kein Icon, Himmelblau-Balken links, Abstand Balken–Text .9rem).
- **Pillen („Tags“)**: immer rund. Höchstens drei Arten: **Neu** (≤ 7 Tage, Neon-Gelb mit Schwarz, 0,86rem), **Thema** (Kategorie) und **Tags**. Essay: Thema + Neu in der Kopfzeile, Tags darunter. Gedanke: „Gedanke“ + Neu + Thema, **keine freien Tags**.
- **Gedanke-Vorschau**: 3 Zeilen, beim Hover 6, der Pfeil klappt den ganzen Text auf. Der Pfeil sitzt direkt am Ende der letzten sichtbaren Zeile; ein Spacer hält dort Platz frei, damit immer so viel Text abgeschnitten wird, dass der Pfeil sauber hineinpasst.
- **Layout**: Mac: Filter links (16rem), Beiträge rechts. Handy: eine Spalte.
- **Filter**: „Filter“ ist die **Oberkategorie** (Plus Jakarta 600, 1,3rem, normale Schreibung, Zähler der aktiven Filter als Badge). „Format“, „Kategorie“, „Tags“, „Jahr“ sind **Unterkategorien** (Mukta, Großbuchstaben, gesperrt, 0,78rem). Gleiche Hierarchie auf dem Handy. Abstand innerhalb einer Gruppe 4px, zwischen Gruppen mehr (Nähe-Prinzip).
- **Anzahl** („9 Beiträge“) steht auf einer Ebene mit der Lupe, nicht bei den Optionen. Suche hinter der Lupe.
- **Eingeklappter Filter**: Format komplett, Mac erste 3 Kategorie-Zeilen, Handy erste Chip-Zeile; die letzte Zeile ausgegraut, **kein Verlauf**.
- Auswahl umschalten: erneuter Klick hebt auf. Ansicht Vorschau | Liste; bei Filter/Suche automatisch Liste, Umschalter bleibt bedienbar.
- Suchtreffer gelb. Laden: erste 3 Beiträge (Liste 10), weitere per Scroll.
- **Nachtmodus**: Hintergrund Königsblau, **keine Verläufe oder Ausblendungen** (Hover-Fläche durchgehend gefüllt). Markenfarben: Babyblau für Labels, Gedanke-Balken, Hover-Titel und Zähler-Badge; Himmelblau für Tag-Ränder; Pillen mit Babyblau-Tönung.

## 7. Bewegung

Erlaubt: Einblenden von Beiträgen, Aufklappen des Filters (0,45s), Aufgleiten des Suchfelds (0,3s), gleitende Segment-Markierung. Verboten: Übergänge auf Buttons. Immer `prefers-reduced-motion` respektieren.

## 8. Barrierefreiheit (Pflicht beim Umsetzen)

- Zugeklapptes Filterpanel für Tastatur und Screenreader unerreichbar (`inert`), Schalter mit `aria-expanded` und `aria-controls`.
- Anzahl mit `aria-live="polite"`; Filter-Badge mit verstecktem Text „aktiv“.
- Zielgröße mindestens 24px (WCAG 2.5.8), Filter-Buttons 44px.
- Zustand nie nur über Farbe: gewählt = Füllung (3:1) **und** Häkchen.
- Kontrast: Text AA (APCA Lc ≥ 60 für UI-Text, ≥ 75 für Fließtext), Dunkelmodus eigens messen. Bekannt offen: Himmelblau-Rand der Nav-Pille 2,26:1.
- Gleichnamige Buttons („Alle“) mit eindeutigem `aria-label` versehen.

## 9. Pflege

Neue Komponente oder neuer Zustand: erst hier eintragen, dann bauen. Abweichungen nur mit Begründung im Pull Request.
