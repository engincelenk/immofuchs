# Finn Chip-Fragen — Kandidatenliste (2026-07-24)

Ziel: Vorschläge für zusätzliche/erweiterte Frage-Chips im Finn-Assistenten,
sortiert nach Rechner und Section. Diese Liste ist eine **Kandidatenliste**
zur Auswahl und Umsetzung — nicht alle Fragen müssen als Chip verdrahtet
werden.

## Kontext für die Umsetzung (für Claude Code)

- Die Chip-Texte selbst leben in `src/i18n/assistant.js`, Objekt `ASSISTANT_T`,
  pro Sprache (`de`, `en`, `tr`, `zh`, `hi`, …). Bestehende Keys:
  `suggested1..5` (Renditerechner), `finSuggested1..3` (Finanzierung),
  `mieteSuggested1..3` (Miete), `sanSuggested1..3` (Sanierung),
  `steuerSuggested1..3`, `vfeSuggested1..3`, `vglSuggested1..2`.
- Welche Chips tatsächlich sichtbar sind, wird **pro Rechner-Komponente**
  fest verdrahtet (nicht generisch), z. B.:
  - `src/components/calculators/Renditerechner.jsx` (~Zeile 1450): baut
    `suggested = [tpl(at.suggested1, {...}), at.suggested2, at.suggested4]`
  - `src/components/calculators/Finanzierung.jsx` (~Zeile 424):
    `suggested = [at.finSuggested1, at.finSuggested2, at.finSuggested3]`
  - `src/components/calculators/Miete.jsx` (~Zeile 364):
    `suggested = [at.mieteSuggested1, at.mieteSuggested2, at.mieteSuggested3]`
  - `src/components/calculators/Sanier.jsx` (~Zeile 1330):
    `suggested = [at.sanSuggested1, at.sanSuggested2, at.sanSuggested3]`
- Angezeigt werden die Chips in `src/components/assistant/AssistantSheet.jsx`
  über `SuggestedQuestionChip` — dort gilt eine harte Obergrenze von
  **3 sichtbaren Chips** (`visibleSuggested = suggested.slice(0, 3)`,
  bewusste Nutzer-Entscheidung vom 2026-07-22, nicht ohne Rücksprache ändern).
- Konsequenz: Wenn mehr als 3 Fragen pro Rechner gewünscht sind, braucht es
  entweder (a) eine Auswahl der 3 stärksten Fragen, oder (b) eine Rotation/
  Kontext-Logik, welche 3 von z. B. 6 Kandidaten gerade angezeigt werden.
  Das ist eine Design-Entscheidung, die vor der Umsetzung mit dem User
  geklärt werden sollte — nicht einfach alle Kandidaten reinschreiben.
- Freitext bleibt zusätzlich immer möglich — Chips sind nur Schnellstarter.
- **Kein Code wird geschrieben, ohne dass der User das für dieses Projekt
  explizit freigibt** (siehe `CLAUDE.md`, Abschnitt "Approval-Pflicht").
  Vor der Umsetzung: Auftrag beschreiben, ggf. Alternative vorschlagen,
  explizit "Soll ich umsetzen?" fragen.

---

## 1. Renditerechner

### Selbstträger-Check (Ja/Nein)
- Warum ist das Verdikt bei mir "Nein" (bzw. "Ja")?
- Was ist der Verhandlungs-Zielkaufpreis genau?
- Wie realistisch ist es, den Kaufpreis auf dieses Ziel zu drücken?
- Ab welchem Jahr trägt sich die Immobilie ohne Steuervorteil?
- Was ändert der Steuervorteil an meinem Ergebnis?
- Warum zählt der Cashflow ohne Steuer als "ehrliche" Antwort?
- Was, wenn die Miete schneller steigt als hier angenommen?
- Wie sicher ist die Break-Even-Jahr-Prognose?
- Was, wenn ich schon einen niedrigeren Preis verhandelt habe?

### Section 1 — Lohnt sich das? (Brutto-/Nettorendite, Kaufpreisfaktor)
- Ist meine Rendite gut im Vergleich zu anderen Anlagen?
- Warum ist Brutto- und Nettorendite so unterschiedlich?
- Was bedeutet der Kaufpreisfaktor?
- Ist mein Kaufpreis zu hoch für die Miete?
- Was kann ich verbessern?
- Was bedeutet Kaufpreisfaktor? *(bestehend: `suggested3`)*
- Trägt sich das Objekt selbst? *(bestehend: `suggested4`)*

### Section 2 — Trage ich das monatlich? (Cashflow, Annuität)
- Wie viel zahle ich jeden Monat drauf?
- Was ist der Unterschied zwischen Cashflow mit und ohne Steuer?
- Wann sehe ich den Steuerbonus wirklich auf dem Konto?
- Was kann ich tun, wenn der Cashflow negativ ist?

### Section 3 — Was zahle ich der Bank? (Beleihung, Laufzeit, Rate)
- Ist mein Beleihungsauslauf zu hoch?
- Wie lange zahle ich noch ab?
- Was passiert, wenn ich mehr Eigenkapital einbringe?
- Lohnt sich eine Sondertilgung?

### Section 4 — Steuervorteil
- Wie viel spare ich durch die AfA?
- Wann hat sich die Steuerersparnis amortisiert?
- Was, wenn sich mein Steuersatz ändert?

### Section 5 — Zeitverlauf (Tabelle: Restschuld, Zinsen, Tilgung, Steuerersparnis, Jahresmiete, CF)
- Wann wird meine Restschuld null?
- Was passiert nach Ende der Zinsbindung?
- Warum steigt die Jahresmiete in der Tabelle?
- Ab welchem Jahr wird der Cashflow positiv?
- Was bedeutet die "◀ ZB"-Markierung?

### Section 6 — Investment-Check (Radar)
- Was zeigt mir der Radar auf einen Blick?
- Welcher Punkt im Radar ist mein schwächster?

### Section 7 — Verkaufsszenario (Detail-Tabelle)
- Was bleibt mir wirklich nach dem Verkauf übrig?
- Was, wenn die Restschuld höher ist als der Verkaufswert?
- Wie realistisch ist die Wertsteigerungsannahme?
- Muss ich den Verkaufsgewinn versteuern?
- Was ist meine EK-Rendite im Vergleich zu einem ETF?
- Was passiert nach Verkauf in {jahre} Jahren? *(bestehend: `suggested5`)*

### Risikogauge (immer sichtbar)
- Warum ist mein Risiko-Score so hoch/niedrig?
- Welcher Faktor treibt das Risiko am meisten?

---

## 2. Finanzierungsrechner

### Raten-Karte (Zins/Tilgung)
- Warum ist meine Rate so hoch?
- Was ist eigentlich der Unterschied zwischen Zins und Tilgung?

### Kennzahlen (Darlehen, Laufzeit, Gesamtzinsen, NBK, Gesamtaufwand, Restschuld nach Zinsbindung)
- Warum zahle ich am Ende viel mehr zurück, als ich mir geliehen habe?
- Was sind Nebenkosten und warum kommen die extra dazu?
- Was bedeutet "Restschuld nach Zinsbindung" für mich?
- Was passiert nach der Zinsbindung? *(bestehend: `finSuggested1`)*

### Beleihungsauslauf
- Was heißt Beleihungsauslauf überhaupt?
- Ist mein Wert gut oder schlecht?
- Wie komme ich auf bessere Konditionen?
- Was bedeutet mein Beleihungsauslauf für die Konditionen? *(bestehend: `finSuggested3`)*

### Sondertilgungs-Simulator
- Was ist eine Sondertilgung genau?
- Lohnt es sich für mich, mehr zurückzuzahlen?
- Muss ich das vorher mit der Bank vereinbaren?
- Wie viel spare ich dadurch wirklich an Zinsen?
- Lohnt sich eine Sondertilgung? *(bestehend: `finSuggested2`)*

### Tilgungsplan-Tabelle
- Warum sinkt die Restschuld am Anfang so langsam?
- Was passiert mit meiner Rate, wenn die Zinsbindung endet?

### Hinweise/Warnungen
- Ist meine Zinsbindung zu kurz gewählt?
- Ist 1–2 % Tilgung zu wenig?
- Was, wenn die Zinsen bei der Anschlussfinanzierung steigen?

---

## 3. Mieterhöhungsrechner

### Kappungsgrenze-Karte
- Was ist die Kappungsgrenze überhaupt?
- Warum gelten bei mir 15 % und nicht 20 %?
- Was bedeutet "angespannter Wohnungsmarkt"?
- Woher weiß ich, was die Vergleichsmiete für meine Wohnung ist?
- Wie kommt die Kappungsgrenze zustande? *(bestehend: `mieteSuggested2`)*

### Nächste-Erhöhung-Karte
- Wann darf ich das nächste Mal erhöhen? *(bestehend: `mieteSuggested1`)*
- Wie viel darf ich maximal draufschlagen?
- Muss ich die Erhöhung schriftlich ankündigen?
- Was, wenn ich erst vor Kurzem erhöht habe?

### Mieterhöhungsplan-Tabelle
- Warum ändert sich die Vergleichsmiete in der Tabelle immer wieder?
- Was heißt der Status "möglich"/"nicht möglich" genau?

### Hinweise/Warnungen
- Liegt meine Miete wirklich deutlich unter dem Marktniveau?
- Warum darf ich trotzdem nicht sofort erhöhen?
- Was, wenn der Mieter der Erhöhung widerspricht? *(bestehend: `mieteSuggested3`)*

---

## 4. Sanierungsrechner

### Kosten-Hero (Gesamtkosten, Förderung, Nettokosten, Amortisation)
- Was bleibt nach Abzug der Förderung wirklich übrig, was ich zahlen muss?
- Was ist der Unterschied zwischen BAFA und KfW?
- Bekomme ich die Förderung automatisch oder muss ich was tun?
- Was ist der Landesbonus, und gilt der für mein Bundesland?

### Förderprogramm & gesetzliche Pflichten (GEG)
- Bin ich gesetzlich verpflichtet, überhaupt zu sanieren?
- Was passiert, wenn ich nichts mache?
- Was bedeutet GEG?
- Muss ich den Förderantrag vor Beauftragung stellen? *(bestehend: `sanSuggested3`)*

### Maßnahmen-Details
- Welche Maßnahme bringt mir am meisten? *(bestehend: `sanSuggested1`)*
- Warum ist die Förderquote bei jeder Maßnahme unterschiedlich?
- Was bedeutet die CO2-Reduktion konkret für mich?

### Energieeffizienzklasse vorher/nachher
- Was heißt Energieeffizienzklasse überhaupt?
- Wie viel verbessert sich meine Klasse durch die Maßnahmen?
- Muss ich einen bestimmten Standard gesetzlich erreichen?

### Kennzahlen (Energieeinsparung, CO2, jährliche Ersparnis, Förderquote)
- Wie viel spare ich wirklich im Jahr an Heizkosten?
- Ist die Förderquote realistisch oder nur ein Durchschnittswert?

### iSFP-Hinweis (Sanierungsfahrplan)
- Was ist ein Sanierungsfahrplan, und bringt er mir mehr Förderung?

### Amortisationsrechner
- Ab wann hat sich die Sanierung finanziell gelohnt? *(bestehend: `sanSuggested2`, "Wie lange dauert die Amortisation?")*
- Was, wenn die Energiepreise weiter steigen?

### Beratungstipps
- Sollte ich schrittweise sanieren oder alles auf einmal?
- Brauche ich einen Energieberater?
- Was, wenn meine Heizung schon über 30 Jahre alt ist?
- Lohnt sich eine PV-Anlage mit Batteriespeicher zusätzlich?

---

## Offene Fragen vor Umsetzung

1. Wie viele Fragen sollen pro Rechner tatsächlich als Chips verdrahtet
   werden — weiterhin fix 3, oder soll es eine größere Pool-Logik geben?
2. Sollen die "bestehend"-markierten Fragen (bereits im Code vorhanden)
   unverändert bleiben, oder umformuliert werden?
3. Übersetzung: Alle Sprachen (`de`, `en`, `tr`, `zh`, `hi`) müssen für neue
   Keys nachgezogen werden — reicht vorerst Deutsch + Englisch, Rest folgt?
