# Style Guide

Einzige Referenz für Aussehen und Verhalten der Website. Wird bei jeder Design-Änderung mitgepflegt (neue Komponente, geänderte Farbe, neuer Zustand). Quellen: `lib/design-tokens/src/tokens.css`, `docs/branding.md`. Stand: 19.11.2026: Hamburger-Menü auf dem Handy, Projekte auf der Startseite, neue Login-Seite, Übersetzungshinweis bei Essays, kompaktes CV-PDF. Alle Kontrastwerte sind selbst berechnet (WCAG-Formel); eine vollständige Messung aller gerenderten Zustände steht weiter aus.

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

Zeilenlänge 45–75 Zeichen. Navigation: alle Einträge Gewicht 400, aktuelle Seite mit 5px Himmelblau-Strich (siehe Navigation). Light (300) nie unter 18px. Schriftdateien: `lib/design-tokens/fonts` (TTF, lokal, OFL 1.1).

## 4. Buttons (ein System)

Alles Klickbare im Filter/Blog nutzt dieselbe Familie. **Ringlos**: kein Rand, Zustand nur über Fläche, Symbol und Hover.

| Zustand | Aussehen |
|---|---|
| Ruhe | Surface-Fläche (`#eef2f5`, dunkel `#2d4354`), Königsblau-Text, kein Rand |
| Hover | Verlauf `135deg, Babyblau 38 % → 10 %` (dunkel: einfarbig Babyblau 24 %), **kein Übergang** |
| Gewählt | Füllung `--active` (hell `#cfe5f7`, dunkel `#3b5a72`) **plus Häkchen**; der Zustand hängt am Häkchen, nicht nur an der Farbe. Dunklere Füllungen (3:1) wirkten zu schwer und wurden verworfen |
| Fokus (Tastatur) | 3px Glow `rgb(116 175 219 / .55)`, kein schwarzer Outline |
| Deaktiviert | 50 % Deckkraft |

Form: Pille (`border-radius: 999px`), Höhe 44px (Chips 40px). `transition: none` auf allen Buttons. Segment (Vorschau | Liste): Pille mit gleitender Markierung (`.ind`), Abstand zwischen den Knöpfen.

**Häkchen**: SVG als CSS-Maske (`currentColor`), 1em, `margin-right .4em`, `transform: translateY(-.06em)`. Catamaran hat Ascent 1,10 em, Descent 0,54 em, Versalhöhe 0,68 em; die Zeilenmitte liegt 0,06 em unter der Versalmitte, daher wirkt ein mittig gesetztes Symbol zu tief. Gemessen: vorher +1,75 px, nachher < 0,2 px bei 16 px. Gilt für jede neue Schrift: Metriken prüfen, Offset neu messen.

Gewählt-Zustand gilt auch für den Standard-Button (`.btn[aria-pressed="true"]`): aktive Fläche plus 2px Königsblau-Rand.

Varianten (nur diese): Standard-Button (Nav „Privater Bereich“ mit 2px Himmelblau-Rand, Menü, Lupe, Chips, Segment), Listenzeile (`.opt`, Abstand 4px), Icon-Schalter (`.tgl`), Text-Link-Button (`.reset`), Primär-CTA (`.btn--primary`, nur eine Hauptaktion pro Seite, nicht im Filter).

Nicht verwenden: gefüllte Königsblau-Auswahl-Buttons, Ringe um Auswahl, harte Rechtecke, Hover mit Bewegung.

## 5. Formularfelder

Suchfeld: Pille, 44px, 2px Himmelblau-Rand, Weiß-Hintergrund. Fokus: Rand Königsblau plus 3px Babyblau-Glow. Der Container lässt 4px Platz, damit der Glow nicht abgeschnitten wird. Nie ein dunkler Kasten, auch nicht aktiv.

## 6. Blog

- **Überschrift**: „Blog“ (Plus Jakarta 600) mit **eckigem, einfarbigem** Himmelblau-Strich darunter (5,5rem × 8px, kein Radius). Kein Verlauf in der Schrift (Kontrast).
- **Formate**: Essay (Titel, Vorschau 2–3 Zeilen, Lesezeit, optional Bild) und Gedanke (kein Titel, kein Bild, kein Icon, Himmelblau-Balken links, Abstand Balken–Text .9rem).
- **Pillen**: Nur **Tags** (TRM …) und **Neu** sind rund. **Thema** und „Gedanke“ bleiben eckig (3px Radius), so unterscheidet man Einordnung von Schlagwort. Höchstens drei Arten: **Neu** (≤ 7 Tage, Neon-Gelb mit Schwarz, 0,86rem), **Thema** (Kategorie) und **Tags**. Essay: Thema + Neu in der Kopfzeile, Tags darunter. Gedanke: „Gedanke“ + Neu + Thema, **keine freien Tags**.
- **Gedanke-Vorschau**: 3 Zeilen, beim Hover 6, der Pfeil klappt den ganzen Text auf. In der **Liste** nur 2 Zeilen und nur **ein** Schritt (kein Hover-Aufklappen), normaler Text (Catamaran 400, nicht fett, nicht unterstrichen).
- **Gedanke-Pfeil (Mac)**: steht in einer **eigenen Randspalte** rechts neben dem Text (Pfeil 2rem, Abstand 1,5rem), auf Höhe der letzten Ruhe-Zeile (Vorschau Zeile 3, Liste Zeile 2). Er überdeckt nie Text und bewegt sich weder beim Hover (6 Zeilen) noch beim Aufklappen. Fläche Surface (dunkel `#46657d`).
- **Filter-Pfeil (Mac)** bleibt unter der Vorschau stehen, weitere Zeilen erscheinen darunter.
- **Layout**: Mac: Filter links (16rem), Beiträge rechts. Handy: eine Spalte. Filterspalte 14,5rem; Auswahlzeilen füllen die Spalte, ihr rechtes Ende fluchtet mit dem Ende der Lupe, Zahlen rechtsbündig.
- **Filter**: „Filter“ ist die **Oberkategorie** (Plus Jakarta 600, 1,3rem, normale Schreibung, Zähler der aktiven Filter als Badge). „Format“, „Kategorie“, „Tags“, „Jahr“ sind **Unterkategorien** (Mukta, Großbuchstaben, gesperrt, 0,78rem). Gleiche Hierarchie auf dem Handy. Abstand innerhalb einer Gruppe 4px, zwischen Gruppen mehr (Nähe-Prinzip).
- **Anzahl** („9 Beiträge“) steht auf einer Ebene mit der Lupe, nicht bei den Optionen. Suche hinter der Lupe.
- **Eingeklappter Filter**: Format komplett, Mac erste 3 Kategorie-Zeilen, Handy erste Chip-Zeile; die letzte Zeile ausgegraut, **kein Verlauf**.
- Auswahl umschalten: erneuter Klick hebt auf. Ansicht Vorschau | Liste; bei Filter/Suche automatisch Liste, Umschalter bleibt bedienbar.
- Suchtreffer gelb. Laden: erste 3 Beiträge (Liste 10), weitere per Scroll.
- **Vorschautext**: Wiederholt die Zusammenfassung nur den Titel, zeigt die Vorschau stattdessen die ersten Sätze des Textes.
- **Übersetzte Essays**: Essays dürfen in jeder Sprache geschrieben sein (Original in `content/blog/`, Sprache aus `lang` im Frontmatter oder erkannt). Jede andere Sprache, auch Deutsch, bekommt eine Übersetzung (`content/<sprache>/blog/`, täglicher Übersetzungs-Workflow). Über dem Text steht dann eine Zeile zwischen zwei Hellgrau-Linien: „Automatisch übersetzt. Original: English.“ und rechts der Button **„Original lesen“** (Standard-Button, gewählt = aktive Fläche plus Königsblau-Rand, Text wechselt zu „Übersetzung lesen“). Beide Fassungen stehen im HTML, ohne JavaScript bleibt die Übersetzung.
- **Nachtmodus**: Hintergrund Königsblau, **keine Verläufe oder Ausblendungen** (Hover-Fläche durchgehend gefüllt). Markenfarben: Babyblau für Labels, Gedanke-Balken, Hover-Titel und Zähler-Badge; Himmelblau für Tag-Ränder; Pillen mit Babyblau-Tönung.

### Navigation
- Einträge: Home, Projekte, Blog, Kontakt, dazu „Login“ als Pille (2px Himmelblau, aktiv = aktive Fläche + Königsblau-Rand). „Privater Bereich“ heißt jetzt überall „Login“.
- Aktuelle Seite: **5px Himmelblau-Strich** unter dem Wort. Hover: derselbe Strich in Babyblau, **keine Fläche** (die Verlaufspille im Menü sah unruhig aus). Ein Unterstreichungsstil für die ganze Seite.
- Fokus: 3px Glow. Kein Übergang.
- Handy (bis 820px): oben nur Logo, Mond, Sprache und ein **Hamburger-Knopf** (44px, Surface-Fläche, rund). Das Menü ist anfangs nicht zu sehen (Wunsch 19.11.2026, ersetzt die feste Leiste unten). Der Knopf öffnet ein Blatt von oben (`<dialog>` modal, Seite abgedunkelt, unten 22px Radius): Home, Projekte, Blog, Kontakt als große Zeilen (Plus Jakarta 600, 60px hoch, Linien-Icon links), aktuelle Seite mit demselben 5px-Himmelblau-Strich unter dem Wort; darunter „Login“ als volle Pille. Schließen per X, Esc, Tippen auf die dunkle Fläche oder durch Navigieren; der Fokus kehrt zum Knopf zurück.

### Handy-Web (iPhone/Android)
- **Filter-Auslöser**: ein beschrifteter Pillen-Button „Filter ⌄“ (Label + Pfeil + Zähler-Badge in einem), Optik 38px, Trefferfläche 44px. Kein separater runder Pfeil-Knopf. Eingeklappt ist vom Filter nichts sichtbar oder per Tab erreichbar. (Mac bleibt: Vorschau mit Pfeil.)
- **Kopfzeile klebt** beim Scrollen oben (Filter · Anzahl · Lupe), mit feiner Trennlinie sobald sie klebt.
- **Essay mit Bild**: Bild klein (4,75rem, quadratisch) rechts **neben dem Titel**; Vorschau und Tags laufen darunter über die volle Breite, kein Leerraum unter dem Bild. Ohne Bild volle Breite.
- **Liste**: Text/Titel volle Breite, darunter eine Zeile „Datum · Neu · Typ“, Mini-Bild rechts.
- **Weniger Text**: Datum nur als Monat (`Nov. 26`, Mac `November 2026`), Lesezeit `ca. 8 Min.`, Gedanken nur Gedanke + Neu, Essay-Vorschau 2 Zeilen.
- **Schrift**: Fließtext und Gedanke 1rem (Catamaran 400), Meta .82rem, Pillen .72rem, H1 2,1rem; nichts unter 11px.
- **Gedanke auf dem Handy**: 3 Zeilen; Tippen auf Text oder Pfeil öffnet eine **Leseansicht** (Bottom Sheet, `<dialog>` modal): Griff oben, Meta-Zeile, X-Knopf oben rechts, voller Text; Seite dahinter abgedunkelt und gesperrt. Schließen per X, Esc oder Tippen auf die dunkle Fläche; Fokus kehrt zum Pfeil zurück. Kein zweistufiges Aufklappen.
- **Filter einklappen**: Am Ende des offenen Panels steht neben „Zurücksetzen“ ein Knopf „Einklappen ⌃“; er schließt das Panel, setzt den Fokus auf „Filter“ und scrollt zurück nach oben.
- **Kein Hover** auf dem Handy (keine Hover-Fläche, keine Titelfarbe beim Tippen).
- **iOS-Regeln**: Eingabefelder mind. 16px, Trefferflächen 44px (unsichtbar per `::after` vergrößern, Optik darf kleiner sein), `viewport-fit=cover` + `env(safe-area-inset-*)`, kein `user-scalable=no`, `touch-action: manipulation`, `prefers-reduced-motion` schaltet alle Übergänge ab.
- **Tests**: `tests/mobile.py` (320, 375, 390, 430 px, Querformat, hell/dunkel).

### Umsetzung auf der echten Seite (ab 15.11.2026)
- **Code**: `src/components/BlogIndex.tsx` (Filter, Liste, Gedanken, Leseansicht), `src/app/blog.css` (alles Blog-spezifische, gescoped unter `.blog` und `.article`), `ThemeToggle.tsx` im Kopf, Artikelseite in `src/views/blog.tsx`. Mockup und Seite teilen sich Tokens, nicht Dateien.
- **Inhalt**: Essays liegen in `artifacts/jonas-website/content/blog/*.md`, Gedanken in `artifacts/jonas-website/content/gedanken/*.md` (kurzer Text, kein eigener Seitenpfad, nicht im RSS-Feed). Frontmatter-Felder neu: `topic` (Kategorie, optional) und `image` (kleines Bild eines Essays, optional). Ohne `topic` gibt es keine Kategorie-Pille.
- **Ein Aufbau für Mac und Handy**: Elemente, die nur auf einem Gerät vorkommen, sind doppelt vorhanden und werden per CSS (Umbruch bei 720px) ein- oder ausgeblendet. So gibt es beim Laden kein Umspringen.
- **Neu-Pille** wird erst im Browser gesetzt (Datum von heute), nicht beim Bauen. Sonst stünde „Neu“ bis zum nächsten Deploy auf alten Beiträgen.
- **Dunkelmodus**: Schalter (Mond/Sonne, 44px, Surface-Fläche) im Kopf. Standard ist **hell**, nicht die Systemeinstellung, weil noch nicht jede Seite im Dunkeln geprüft ist. Die Wahl liegt nur im `localStorage` des Geräts (steht in der Datenschutzerklärung); ein kleines Skript im `<head>` setzt sie vor dem ersten Zeichnen. Dunkel überschreibt nur die semantischen Tokens (`html[data-theme="dark"]` in `blog.css`): Hintergrund `#1c2b36`, Fläche `#2d4354`, Text `#eef2f5`, gedämpft `#b0c4d4`, Überschrift `#fafafa`, Fokus Babyblau.
- **Artikelseite** (ruhig, Headspace-inspiriert): Leiste „‹ Blog“ und „PDF“ (PDF nur, wenn `public/blog/<slug>.pdf` existiert), Meta, H1, Einleitung 1,375rem, Fließtext 1,25rem/1,75 (Catamaran 300), Zitate als Fläche mit 28px Radius, am Ende Karte „Nächster Beitrag“. Auf dem Handy 20px Radien, Leiste klebt.
- **Teilweise feste Leiste (Handy)**: beim Runterscrollen weg, beim Hochscrollen in 0,32s zurück (Toleranz 6px hoch, 4px runter); bleibt sichtbar, solange etwas darin den Fokus hat.

## 6a. Startseite

- **Kopf**: nur Foto und Schriftzug. Das Foto ist voll breit (Mac `clamp(27rem, 82vh, 46rem)` hoch), dunkler Verlauf von links; der Schriftzug steht links auf Kopfhöhe. Handy: Bild so hoch, dass Leiste und Überschrift beim Öffnen schon sichtbar sind (`100svh − 15,5rem`), Foto steht fest, der Schriftzug sitzt unten am Bild und wandert mit der Leiste über das Foto.
- **Leiste unter dem Bild**: Die Kopfleiste klebt oben (`sticky`). Auf der Startseite liegt das Bild absolut oben und die Leiste bekommt per `body:has(.home-hero)` Abstand. Auf allen anderen Seiten steht die Leiste ganz oben.
- **Aussage**: `h1` auf Englisch in allen Sprachen: „Curious how the world works. / Driven to make it better.“ „better“ mit Markierung in aktiver Fläche. Darunter zwei Buttons: „Mein CV“ (Hauptaktion) und „Kontakt“. Keine Werte, kein Einleitungssatz.
- **Projekte** (wer runterscrollt, landet in den Projekten): Eyebrow „Projekte“, Überschrift „Daran arbeite ich gerade“, die Bühne der angepinnten Projekte wie auf /projects/. Darunter „Stationen der letzten Jahre“: die sechs neuesten Stationen als Karten (Surface, 22px Radius, Foto 16:10 oben, ohne Foto Babyblau-Fläche mit Logo-Feld; Meta, Titel, Organisation). Mac drei Spalten, Handy waagrecht wischen (Karte 78 % breit, Scroll-Snap). Karte öffnet dasselbe Blatt wie auf /projects/. Danach Button „Alle Projekte und der ganze Lebenslauf“ (Hauptaktion).
- **Karte** „Hier war ich zu Hause“: Natural Earth (gemeinfrei), Winkel-Tripel-Projektion mit Gradnetz, Arktis und Antarktis vollständig. Land als CSS-Maske (`public/media/welt.svg`), damit es im Dunkelmodus umfärbbar ist. Punkte: Babyblau mit Königsblau-Rand (dunkel: weißer Rand), aktueller Ort mit Hof. Kein Hinweistext, keine Hand, kein Pulsieren. Unter der Karte dieselben Orte als Chips; München mit Haus-Icon („Zuhause“), Berkeley mit Standort-Icon („Aktuell“). Klick öffnet das Orts-Blatt.
- **Blog**: die drei neuesten Essays als Liste (Monat, Titel, zwei Zeilen Vorschau).

## 6a2. Fußzeile

- Unter dem Namen steht der Leitsatz „Curious how the world works. Driven to make it better.“ (Englisch in allen Sprachen). Kein Studiengang: Die Seite wird nicht auf „Management & Technology“ gebrandet.

## 6b. Logo in der Kopfleiste

- Nur das Logo, ohne Namen daneben. Auf der Startseite erscheint es erst, wenn der Schriftzug aus dem Bild gescrollt ist; auf allen anderen Seiten bei jedem Aufruf.
- **Animation**: erst wird „Jonas“ geschrieben (Tinte aus dem Schriftzug, ca. 0,8 s), dann kommt das große J von rechts herein und wird dabei in einem Zug geschrieben: linke Spitze, oben über den Bogen, Schaft, Schweif links unten. „nas“ blendet aus, „Jo“ bleibt unter dem J. Nur Masken über den Originalpfaden, keine neuen Formen. `prefers-reduced-motion`: Logo sofort fertig.

## 6c. Projekte (Lebenslauf)

- **Daten**: `artifacts/jonas-website/content/cv.json` (Deutsch). Übersetzungen erzeugt `scripts/translate.mjs` nach `content/<lang>/cv.json`; nur Texte werden übersetzt, IDs, Jahre, Links und Dateien bleiben gleich. Bearbeiten im privaten Bereich unter „Stationen“ (ein Commit auf main, danach baut Pages neu).
- **Kopf**: voll breite Königsblau-Fläche ohne Fotos (dunkel Schwarz), Eyebrow, „Projekte“, ein Satz, Button „Lebenslauf als PDF“ (Variante auf Dunkel: Rand Babyblau).
- **Angepinnt** („Daran arbeite ich gerade“): Bühne mit großem Bild (4:3, 28px Radius) und Text rechts; Reiter für die angepinnten Projekte darunter. Handy: Reiter oben, gleich breit, aktiver Reiter mit Königsblau-Rand. Ohne Foto: ruhige Babyblau-Fläche mit Logo-Feld.
- **Zeitstrahl** („Der Weg bis hierher“): Jahr als **Königsblau-Pille mit weißer Schrift** (13,9:1; vorher Königsblau auf Himmelblau, zu schwach zu erkennen), dunkel Babyblau mit Schwarz, Linie in Hellgrau, je Station Logo-Feld, Meta (Zeitraum · Ort), Titel, Organisation, Tags; hat die Station ein Foto, steht es am Mac als kleines Bild (132×92, 18px Radius) vor dem Pfeil, auf dem Handy nicht. Themen-Chips filtern (erneuter Klick hebt auf), Anzahl rechts. Ortsfilter kommt von der Karte (`?ort=muenchen`) und steht als eigener Chip mit ×.
- **Stipendien und Auszeichnungen**: eigene Liste unter dem Zeitstrahl, Himmelblau-Linie oben, Zeile mit Logo, Titel, Satz, Zeitraum.
- **Logo-Felder**: gleicher weißer Rand für alle (Mac 132×92, Handy 76×60, Radius 18/14). Die Größe jedes Logos ist so gewählt, dass alle **gleich schwer** wirken: gleiche Fläche bei jedem Seitenverhältnis (Breite ∝ √Seitenverhältnis) und ausgeglichene Tintendeckung (dichte Logos wie TUM kleiner, dünne Schriftzüge größer, Faktor (0,28/Deckung)^0,45, begrenzt auf 0,8–1,2). Werte in `src/data/logos.json`; neue Logos ohne Eintrag nehmen 70 %. Logos immer als echte Datei (SVG, sonst PNG mit transparentem Hintergrund, ohne Rand und ohne weiße Schrift); lieber die Bildmarke als einen langen Schriftzug (wie auf LinkedIn).
- **Icons** für Stationen ohne Logo: Linien-Icons im 24er Raster, 1,6px, runde Enden, Königsblau auf Surface (Mikrofon, Zielscheibe, Koffer, Herz, Globus, Schule, Kompass, Tausch, Doktorhut, Buch).
- **Blatt** (Station oder Ort): `<dialog>`, am Mac von rechts (36rem), auf dem Handy von unten (bis 92 % Höhe, Griff oben). Oben ein Titelbild, auf dem man Jonas sieht (16:9); ohne Foto eine flache Babyblau-Fläche. Darunter klein das Logo, dann Meta, Titel, Organisation, Tags, „Das Wichtigste“ (Himmelblau-Balken links), Text, „Was ich gemacht habe“, „Weiterlesen“ (nur geprüfte Links). **Keine weiteren Bilder.** Unten immer ein klebender Zurück-Knopf. Orts-Blatt: Stationen dort und „Im Lebenslauf zeigen“.
- **PDF**: entsteht bei jedem Build aus `cv.json` (`scripts/cv-pdf.mjs`, Markenschriften eingebettet), auf Deutsch (`/media/lebenslauf.pdf`) und Englisch (`/media/cv-en.pdf`, für alle anderen Sprachen). Ohne Telefonnummer, Adresse, Geburtsdatum und E-Mail. **Immer höchstens zwei Seiten**: erst fallen Stationen mit `cv.optional` und Zusatzpunkte (`cv.extra`) weg, dann wird alles schrittweise kleiner (bis 86 %).
  - Aufbau: Kopfband in aktiver Fläche (#cfe5f7) mit Logo (Königsblau, Originalpfade), Name (Plus Jakarta 600), Leitsatz (Catamaran 300), klickbare Zeile Website · LinkedIn · GitHub (Pfeil ↗ als Linie gezeichnet) und Orten; rechts das Brustbild (`assets/cv/foto.jpg`, Hintergrund in Bandfarbe). Darunter sechs Kennzahlen (Himmelblau-Strich, Zahl Plus Jakarta 17pt). Dann Ausbildung, Erfahrung, Gründen, Stipendien und Auszeichnungen (eine Zeile je Eintrag), Kenntnisse und, wenn Platz ist, ein Band „Wo ich gelebt und gelernt habe“.
  - Abschnitts-Überschrift mit Hellgrau-Linie und kurzem Himmelblau-Strich; Datum links in Mukta, Punkte mit kleinem Himmelblau-Quadrat. Nur Tokens: Königsblau, Schwarz, Dunkel-sekundär, Himmelblau, Hellgrau, aktive Fläche.
  - Inhalt: pro Station der Block `cv` (eigener `title`, `org`, kürzere `points`, `extra`, `link` = Index eines Links, `optional`, `hide`). Website und PDF dürfen also unterschiedlich formuliert sein. Ohne `cv` nimmt das PDF die ersten zwei Punkte. Kennzahlen, Kenntnisse und Leitsatz stehen in `content/cv-extra.json`.

## 6d. Login

- Eine ruhige Karte in der Mitte (Surface, 28px Radius, max. 34rem): Logo, Eyebrow „Privater Bereich“, „Login“ mit Strich, ein Satz, dann **„Mit Passkey anmelden“** (Hauptaktion, volle Breite) und **„Zur Startseite“** (Standard-Button). Darunter drei kurze Fakten mit Linien-Icons (Schlüssel, Brief, Schild), Mac nebeneinander, Handy untereinander.
- Nur die Markenschriften: keine Monospace-Adresse, keine technische Domain, kein fettes Catamaran (Hervorhebung in Plus Jakarta 600).

## 6e. Kontakt

- Links „Schreib mir.“ (mit Strich), darunter die Adresse **als Bild** in einer Surface-Fläche mit „Kopieren“ und „Mail schreiben“ (setzen die Adresse erst beim Klick zusammen, damit einfache Bots sie nicht im HTML finden), dann „Termin buchen“ (Reclaim) und Chips LinkedIn und GitHub. Rechts ein Foto (4:5, 28px), auf dem Handy oben (16:10). Kein weiterer Text. Im Dunkelmodus wird das Adressbild invertiert. Das Impressum nennt die Adresse weiter als Text (Pflichtangabe).

## 7. Bewegung

Erlaubt: Blatt von rechts bzw. unten (0,35s), Logo-Animation (2,2s, bei jedem Seitenaufruf), Einblenden von Beiträgen, Aufklappen des Filters (0,45s), Aufgleiten des Suchfelds (0,3s), gleitende Segment-Markierung, Schreib-Animation des Schriftzugs und Signal im Rekursions-Diagramm (je einmal beim Laden der Startseite). Verboten: Übergänge auf Buttons. Immer `prefers-reduced-motion` respektieren.

### Schriftzug (Startseite)

- **Ort**: im Foto-Kopf der Startseite (Mac links auf Kopfhöhe, max. 30rem; Handy unten mittig). Auf dunklem Grund ist die nasse Tinte Weiß statt dunkler Markenstufe.
- **Form**: die Originalpfade aus `@jonasjuchelka_logo.ai` (Zeichenfläche 2), unverändert. „Jonas“ in Babyblau, „JUCHELKA“ in Himmelblau (beides Token, nicht fest codiert). Die Pfade nicht bearbeiten.
- **Animation (Füller)**: Erst „Jonas“, dann „JUCHELKA“, jeweils Buchstabe für Buchstabe und Strich für Strich in Schreibrichtung, mit Absetzen zwischen den Strichen (auch Serifen und Querstriche sind eigene Striche). Kein Aufdecken per Wischer. Etwa 5,7 s, einmal, keine Schleife.
  - **Feder**: Vor dem vollen Strich läuft eine dünne Spitze (35 % und 70 % der Strichbreite, 36 ms und 18 ms voraus), die Linie schwillt also an wie Tinte aus der Feder.
  - **Rhythmus**: Die Feder ist in Kurven langsamer, läuft am Strichanfang an und bremst am Ende; kurze Striche (Serifen) sind schneller.
  - **Nasse Tinte**: Frisch Geschriebenes ist eine Markenstufe dunkler und trocknet in 0,8 s auf die Endfarbe (Jonas: Himmelblau → Babyblau; JUCHELKA: Dunkel-sekundär → Himmelblau). Nur Tokens, kein `color-mix` (in Chrome beim Animieren von `stroke` fehlerhaft).
  - **Technik**: Der Schreibstrich ist nur eine Maske (Pinsel entlang der Strichmitte, begrenzt auf die Originalform des Buchstabens), keine neue Form. Reine CSS-Animation (`stroke-dashoffset`), Zeiten pro Strichstück als `--d` und `--t`, kein JavaScript.
- **Bewegung reduziert**: `prefers-reduced-motion` zeigt den fertigen Schriftzug sofort (die globale Regel schaltet die Animation ab; der Grundzustand ist „fertig“, der Anfangszustand steht nur in den Keyframes).
- **Barrierefreiheit**: `role="img"` mit `aria-label` = Seitenname. Der Schriftzug ist Logo (Logotypen sind von der Kontrastpflicht ausgenommen); der Seitentitel bleibt die `h1` im Hero. Babyblau auf Weiß hat nur 1,8:1 (berechnet) und darf deshalb nie Fließtext tragen.
- **Pflege**: Wird der Schriftzug geändert, müssen Pfade und Schreibstriche neu erzeugt werden (Strichmitten neu legen, Abdeckung prüfen: Der Endzustand muss pixelgleich mit dem Original sein, geprüft per Bildvergleich in Chrome: keine Lücken).

## 8. Barrierefreiheit (Pflicht beim Umsetzen)

- Handy: zugeklapptes Filterpanel für Tastatur und Screenreader unerreichbar (`visibility:hidden`), Schalter mit `aria-expanded` und `aria-controls`. Mac: Fokus auf eine Option unterhalb der Vorschau klappt das Panel automatisch auf.
- Anzahl mit `aria-live="polite"`; Filter-Badge mit verstecktem Text „aktiv“.
- Zielgröße mindestens 24px (WCAG 2.5.8), Filter-Buttons 44px.
- Zustand nie nur über Farbe: gewählt = Füllung (3:1) **und** Häkchen.
- Kontrast: Text AA (APCA Lc ≥ 60 für UI-Text, ≥ 75 für Fließtext), Dunkelmodus eigens messen. Bekannt offen: Himmelblau-Rand der Nav-Pille 2,26:1.
- Gleichnamige Buttons („Alle“) mit eindeutigem `aria-label` versehen.

## 9. Pflege

Neue Komponente oder neuer Zustand: erst hier eintragen, dann bauen. Abweichungen nur mit Begründung im Pull Request.
