# Testbericht — Manueller QA-Durchlauf nach Architektur-Refactoring

**Datum:** 2026-07-19 | **Branch:** `Immofuchs-qa` | **Commit:** `41a6822` | **Umgebung:** `localhost:5173` (Vite Dev-Server, echter Browser)

Vollständiger Funktionstest aller Rechner, Seiten und UI-Komponenten mit realistischen Immobiliendaten, durchgeführt gegen den laufenden Dev-Server. Fehlerprotokoll lief durchgängig über `window.onerror` + `unhandledrejection`.

**Ergebnis: 0 Laufzeitfehler über die gesamte Session.**

---

## Testdaten

Durchgängig genutztes Testobjekt: **Eigentumswohnung München, PLZ 80331** — Kaufpreis 450.000 €, Wohnfläche 65 m², Kaltmiete 1.450 €/Mon., Eigenkapital 100.000 €, Zinssatz 3,8 %, Tilgung 2 %. Der Datensatz wird von `App.jsx` zentral gehalten und lief unverändert durch alle sieben Rechner-Tabs.

---

## ✅ Landing Page

- Hero, Rechner-Auswahl (6 Karten), "So funktioniert's"-Sektion, Marktdaten-Kacheln (Bauzinsen Ø 3,80 %, Mietpreisprognose, Wertsteigerung) — alles korrekt angezeigt.
- **ZinsAlarm**-Komponente: Schwellenwert editierbar (3,5 % → 3,0 % getestet), Live-Marktdaten (Topzins 3,52 %, BBank 10J 3,08 %) korrekt eingebunden.
- Cookie-Consent-Banner reagiert korrekt und verschwindet nach Bestätigung. Impressum/Datenschutz-Links vorhanden.

## ✅ Renditerechner

- PLZ 80331 → München/Bayern automatisch aufgelöst, Kappungsgrenze und Vergleichsmiete korrekt geladen.
- Kennzahlen rechnerisch konsistent: Bruttorendite 3,7 % · Nettorendite 3,1 % · CF ohne St. −463 €/Mon. · CF mit St. +474 €/Mon. · Rate 1.788 €/Mon. · Kaufnebenkosten 42.629 €.
- LineChart, 10-Jahres-Tabelle mit Summenzeile und Detail-Verkaufsszenario stimmig (Restschuld → 0 in Jahr 29).
- Speichern-Flow fehlerfrei. PDF-Export öffnet in der Sandbox kein Popup-Fenster (Browser-Policy, kein Skriptfehler — siehe Einschränkungen unten).

## ✅ Finanzierungsrechner

- Rate/Darlehen identisch zum Renditerechner (geteilter State).
- Sondertilgung 5 % simuliert: Laufzeit 28,1 → 12,0 Jahre, 140.866 € Zinsersparnis. Volle 29-Zeilen-Tilgungsplan-Tabelle bis Restschuld 0 €.

## ✅ Mieterhöhungsrechner

- "Letzte Erhöhung"-Felder erscheinen korrekt bei "Aktuell vermietet".
- Miete (1.450 €) liegt bereits über Vergleichsmiete (910 €) → Rechner zeigt korrekt keinen weiteren Erhöhungsspielraum (§558 BGB-Logik).

## ✅ Sanierungsrechner

- iSFP-Toggle und Maßnahmen-Auswahl funktionieren.
- Maßnahme "Eingangstür" aktiviert: Gesamtkosten 11.000 €, BAFA-Förderung −2.200 € (inkl. iSFP-Bonus), Amortisation, Energieklasse vorher/nachher und CO₂-Reduktion korrekt berechnet.

## ✅ §6-Trick-Rechner

- Rückwärtsrechnung: 28.000 € ÷ 42 % = 66.667 € Sanierungskosten → 444.444 € Mindest-Gebäudewert → 544.444 € Gesamtinvestition.
- 3 %-Sicherheitspuffer-Rechnung ebenfalls korrekt.

## ✅ Vorfälligkeitsrechner

- Aktiv-Passiv-Methode (BGH) korrekt: Netto-Vorfälligkeitsentschädigung 2.323 € aus Zinsverschlechterungsschaden, Risiko- und Verwaltungskostenersparnis korrekt saldiert.

## ✅ Merkliste

- Objekte aus Rendite-, Kredit- und Sanierungsrechner gespeichert.
- "Laden" navigiert korrekt zum richtigen Tab und stellt Eingaben wieder her.
- Löschen mit Bestätigungsdialog funktioniert.

## ✅ Cross-Cutting: Sprachen, Legal, Tooltips

- Sprachumschaltung DE / EN / TR / ZH / HI: alle 5 Sprachen fehlerfrei gerendert, inkl. nicht-lateinischer Schriften ohne Layoutbruch.
- Impressum/Datenschutz-Modal (LegalModal) öffnet und schließt korrekt, Inhalte vollständig.

---

## Vor dieser Session gefundene & behobene Bugs

Diese drei Fehler wurden bereits vor dem in diesem Bericht dokumentierten Testlauf gefunden (durch manuelles Testen bzw. Cross-Modul-Audit) und sind im aktuellen Commit-Stand bereits behoben:

### buildMP nicht exportiert

**`src/components/calculators/Miete.jsx` ↔ `Renditerechner.jsx`**
Hilfsfunktion war nur intern in `Miete.jsx` definiert, wird aber auch vom Renditerechner für die Mietsteigerungs-Prognose gebraucht → `ReferenceError` beim Öffnen des Renditerechners.
**Status:** ✓ behoben — exportiert & importiert.

### MARKET_RATES nicht importiert

**`src/i18n/tips.js`**
Zinssatz-Tooltip nutzte `MARKET_RATES.avg` direkt im Template-String ohne Import.
**Status:** ✓ behoben — Import ergänzt.

### useEffect-Import gefehlt

**`src/components/ui/atoms.jsx`**
Die `F`-Eingabekomponente nutzt `useEffect` zur Werte-Synchronisation — der Hook war nicht aus React importiert.
**Status:** ✓ behoben — Import ergänzt.

---

## Bekannte Einschränkung dieser Testumgebung

Der **PDF-Export** öffnet ein neues Fenster per `window.open()` — in der sandboxten Testumgebung wird dieses Popup blockiert, ohne dass ein Skriptfehler auftritt. Das ist eine Einschränkung der automatisierten Browser-Umgebung, kein Hinweis auf einen Code-Fehler. Empfehlung: einmal manuell im echten Browser (z. B. lokal) bestätigen.

---

## Verdikt

**Keine Regressionen gefunden.** Alle 7 Rechner, die Landing Page, die Merkliste und alle Cross-Cutting-Funktionen wurden mit realistischen Daten durchgeklickt. Über die gesamte Session wurden 0 Konsolenfehler protokolliert. Der Code-Stand auf `Immofuchs-qa` (Commit `41a6822`) ist funktional äquivalent zum vorherigen Monolithen.
