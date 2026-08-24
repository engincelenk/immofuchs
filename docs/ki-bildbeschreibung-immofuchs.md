# ImmoFuchs.info — KI-Bildbeschreibung für Werbegrafiken

Diese Datei beschreibt die App, die Funktionen, den Kundennutzen und den Design-Stil von ImmoFuchs.info. Sie dient als Basis-Briefing für KI-Bildgeneratoren (Midjourney, DALL·E, Firefly, Ideogram etc.) zur Erstellung von Social-Media-Werbegrafiken.

---

## Was ist ImmoFuchs.info?

ImmoFuchs.info ist eine kostenlose, mobile-first Progressive Web App (PWA) für deutsche Immobilieninvestoren und Eigennutzer. Sie bündelt fünf professionelle Immobilien-Rechner in einer einzigen, app-ähnlichen Oberfläche — ohne Registrierung, ohne Backend, komplett offline nutzbar.

**Zielgruppe:** Privatanleger, Eigennutzer, Vermieter, Immobilienkäufer — Menschen, die kluge Immobilienentscheidungen ohne Berater-Kosten treffen wollen.

**Kernversprechen:** Professionelle Immobilien-Analyse, die früher nur Bankberater und Makler hatten — jetzt in der Hosentasche.

---

## Die 5 Rechner im Überblick

### 1. Renditerechner (Hauptrechner)
Der Kern der App. Berechnet ob sich eine Immobilie als Kapitalanlage lohnt.

**Eingaben:** Kaufpreis, Wohnfläche, Kaltmiete, PLZ/Ort (automatische Bundesland-Erkennung), Eigenkapital, Zinssatz, Tilgung, Zinsbindung, Grunderwerbsteuer, Notar/Grundbuch, Maklerprovision, Steuersatz, AfA-Satz, Grundstücksanteil, Wertsteigerung, Analysezeitraum (Jahre), Garage/Stellplatz

**Ergebnisse:**
- Bruttorendite & Nettorendite (mit Ampel-Bewertung Gut/Okay/Kritisch)
- Monatlicher Cashflow ohne und mit Steuervorteil
- Beleihungsauslauf mit Bankkonditionen-Einschätzung
- Kreditlaufzeit-Einschätzung
- Kaufnebenkosten-Berechnung
- Steuerliche Neutralitätspunkt: ab wann deckt die Steuerersparnis die Nebenkosten
- Interaktive Jahresgrafiken: Restschuld, kumulierter Cashflow, Jahresmiete
- Cashflow-Verlauf mit/ohne Steuervorteil über Zeit
- Verkaufsszenario: Was bleibt bei Verkauf nach X Jahren (inkl. EK-Rendite)
- Jahresentwicklungs-Tabelle
- Merkliste zum Speichern von Objekten

### 2. Finanzierungsrechner (Kredit / Annuität)
Berechnet Kreditkosten und Tilgungsplan.

**Ergebnisse:**
- Monatliche Rate
- Restschuld nach Zinsbindungsende
- Gesamtzinsen & Gesamtaufwand
- Tilgungsplan (Jahr für Jahr)
- Sondertilgung: Auswirkung auf Laufzeit und gesparte Zinsen
- Beleihungsauslauf mit Konditionen-Einschätzung

### 3. Mieterhöhungsrechner (§ 558 BGB)
Rechtssichere Berechnung von Mieterhöhungen nach deutschem Mietrecht.

**Eingaben:** Vergleichsmiete, Datum der letzten Erhöhung, damalige Miete, Kappungsgrenze (angespannter vs. Standardmarkt)

**Ergebnisse:**
- Nächst möglicher Erhöhungstermin
- Maximale Erhöhung (€ und %)
- Neue maximale Miete
- Ob eine Erhöhung jetzt möglich ist
- Mehrjähriger Mieterhöhungsplan mit Status pro Jahr

### 4. Sanierungsrechner (Energie & KfW/BAFA-Förderung)
Vollständige Sanierungs-Kosten- und Förderberechnung.

**Eingaben:** Baujahr, Heizungstyp/-alter, Gebäudestruktur (freistehend/Doppelhaus/Mittelhaus), Fassaden-/Dach-/Kellerfläche, Dachform, Fensteranzahl, Personen, Strompreis, Heizkosten, Energieklasse vorher/nachher

**Maßnahmen (wählbar, je 3 Ausstattungs-Tiers):**
Fenstertausch · Fassade dämmen · Heizung erneuern · Dach erneuern · Eingangstür · Photovoltaik · Kellerdecke · Oberste Geschossdecke · Batteriespeicher · Wohnraumlüftung

**Ergebnisse:**
- Gesamtkosten Sanierung (brutto, netto nach Förderung)
- Förderquote (BAFA/KfW) pro Maßnahme
- Jährliche Energieersparnis (€)
- CO₂-Reduktion
- Amortisationsrechnung
- Maßnahmen-Detail-Tabelle

### 5. §6-Trick-Rechner & Vorfälligkeitsentschädigung
Zwei Spezialrechner für fortgeschrittene Investoren.

---

## Kundennutzen auf einen Blick

- **Kostenlos** — keine Abo-Falle, keine versteckten Kosten
- **Offline-fähig** — funktioniert als installierte App, auch ohne Internet
- **Kein Login** — keine Datenweitergabe, alles lokal gespeichert
- **5 Sprachen** — Deutsch, Englisch, Türkisch, Chinesisch, Hindi
- **PLZ-Erkennung** — automatisches Bundesland inkl. Grunderwerbsteuersatz
- **PDF-Export** — professioneller Report mit Logo für Bankgespräche
- **Merkliste** — mehrere Objekte vergleichen und speichern
- **Rechtssicher** — §558 BGB Logik, GEG-Paragraphen, BAFA/KfW-Richtlinien

---

## Design-Stil von ImmoFuchs.info

### Farben (exakt)
| Rolle | Farbe | Hex |
|---|---|---|
| Primärfarbe | Tiefes Marineblau | `#1E3A5F` |
| Akzentfarbe | Fuchs-Orange | `#E8650A` |
| Hintergrund/Surface | Helles Off-White | `#F8F9FA` |
| Text | Fast-Schwarz/Dunkelblau | `#1A1A2E` |

### Typografie
- Font: **Inter** (clean, modern, sans-serif)
- Sauber, viel Weißraum
- Klare Hierarchie durch Schriftgrößen

### Design-Sprache
- **Modern & seriös** — kein verspielter Startup-Look, sondern vertrauenswürdig wie eine Bank-App, aber zugänglicher
- **Mobile-first** — alles optimiert für Smartphone
- **Card-basiertes Layout** — abgerundete Karten (border-radius 12px), klare Sektionen
- **Ampel-System** — Grün/Gelb/Rot für schnelle Einschätzung von Kennzahlen
- **Fuchs als Maskottchen** — der Fuchs symbolisiert Schlauheit, Taktik, Immobilien-Know-how
- **Minimalistisch** — kein Overdesign, jedes Element hat eine Funktion

### Stimmung / Mood
Professionell · Intelligent · Vertrauenswürdig · Modern · Zugänglich · Deutsch-Qualität · Finanzwelt trifft Alltagsnutzer

---

## KI-Prompt-Bausteine für Bildgeneratoren

### Farb-Prompt (immer einbauen)
```
deep navy blue #1E3A5F, fox orange accent #E8650A, clean white #F8F9FA, dark text #1A1A2E
```

### Stil-Prompt (immer einbauen)
```
modern fintech UI design, mobile app screenshot, clean minimal layout, card-based design with rounded corners, German real estate calculator app, professional yet accessible, Inter font, lots of white space, ampel traffic light indicators green/yellow/red
```

### Subjekt-Varianten (je nach Post-Ziel)

**App-Preview / Produkt-Post:**
```
Smartphone mockup showing a real estate yield calculator app called "immofuchs.info", navy blue and orange color scheme, clean card UI with metrics like Bruttorendite 6.2%, Nettorendite 4.1%, green indicator badges, German text, professional fintech aesthetic
```

**Fuchs-Maskottchen / Branding:**
```
A clever fox character in a business suit or with a house, navy blue and orange color palette, modern flat illustration style, confident and smart expression, real estate investor theme, minimal background
```

**Feature-Highlight: Rendite:**
```
Real estate investment return calculator on smartphone screen, showing yield metrics with green "Gut" badges, chart with debt reduction and cashflow curves, navy blue UI, orange accent elements, German financial app
```

**Feature-Highlight: Sanierung/KfW:**
```
Home renovation cost calculator app screenshot, energy efficiency upgrade planning, BAFA/KfW funding badges, before/after energy class visualization, navy blue and orange UI, German real estate app
```

**Feature-Highlight: Mieterhöhung:**
```
Rent increase legal calculator for German landlords, §558 BGB compliance, timeline showing next rent raise date, professional legal fintech app, navy blue UI, smartphone mockup
```

**Lifestyle / Zielgruppe:**
```
Young German real estate investor sitting in modern apartment, using smartphone app to analyze property investment returns, confident expression, modern interior, shallow depth of field, warm lighting, professional yet approachable atmosphere
```

**Abstract / Konzept:**
```
Abstract visualization of real estate returns and financial analysis, navy blue and orange color scheme, flowing data charts, house icons, percentage symbols, modern geometric design, premium financial brand aesthetic
```

---

## Instagram-Caption-Tonalität
- Direkt und auf den Punkt
- Kein Buzzword-Bingo
- Emoji sparsam einsetzen (🦊 🏠 📊 ✅)
- Hashtags: #Immobilien #Kapitalanlage #Rendite #ImmoFuchs #Immoinvestor #Vermieter #KfW #Mietrecht #FinanzielleFreiheit #Immobilieninvestor

---

*Stand: Juni 2026 | immofuchs.info*
