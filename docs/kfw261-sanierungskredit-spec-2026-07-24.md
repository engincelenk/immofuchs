# KfW-261-Sanierungskredit — Spec für spätere Umsetzung

> Status: **Spec, nicht freigegeben für Umsetzung.** Datum: 2026-07-24. Auslöser: Analyse des Videos „KfW-Förderung für Sanierung (Änderungen Juli 2026)" (Baufi Lab, YouTube, 22.07.2026) — die neuen KfW-261-Bedingungen (gültig seit 21.07.2026) sind im Sanierungsrechner aktuell nicht abgebildet (siehe Memory `immofuchs-kfw261-nicht-modelliert`).

## Ziel & Mehrwert für den Nutzer

Der bestehende Sanierungsrechner bildet nur Einzelmaßnahmen-Förderung (BAFA/BEG, z. B. Fenster, Heizung einzeln) ab. Nutzer, die ihr Haus **komplett** auf einen KfW-Effizienzhaus-Standard sanieren wollen (Kredit + Tilgungszuschuss, KfW-Programm 261 „Energieeffizient Sanieren"), finden dafür aktuell keine Berechnung.

Konkreter Mehrwert:

- Sofortige Einschätzung: Wie viel Tilgungszuschuss bekomme ich bei Standard 55/70/85 EE bzw. NH?
- Realistischer Vergleich KfW-Zins vs. Marktzins (nutzt bereits vorhandene `MARKET_RATES`-Daten)
- Sichtbarkeit der drei Bonus-Programme, die viele Nutzer übersehen: Baubegleitung, Worst-Performing-Building, serielle Sanierung
- Der im Video genannte Einliegerwohnung-Trick (2 Wohneinheiten statt 1 → fast doppelte Förderbasis) wird transparent gemacht
- Deutlicher Warnhinweis, dass seit 21.07.2026 eine EE- oder NH-Klasse **Pflichtvoraussetzung** ist — sonst keine Förderfähigkeit

## Datenquellen — was kommt woher

| Datenpunkt | Quelle | Update-Intervall | Status |
|---|---|---|---|
| Zins Standardvariante | kfw.de/261 | monatlich | bekannt: 2,89 % (Stand 24.07.2026) |
| Tilgungszuschuss 55EE/55NH | Video-Transkript, vor Umsetzung mit kfw.de verifizieren | bei Programmänderung | bekannt: 5 % |
| Tilgungszuschuss 70EE/70NH | Video-Transkript, vor Umsetzung mit kfw.de verifizieren | bei Programmänderung | bekannt: 0 % |
| Tilgungszuschuss 85EE/85NH | kfw.de (im Transkript nicht genannt) | bei Programmänderung | **fehlt — vor Umsetzung nachtragen** |
| Max. Kreditbetrag pro Wohneinheit | Video (150.000 €), mit kfw.de verifizieren | bei Programmänderung | bekannt |
| Baubegleitungs-Bonus (50 %, Caps 10.000 €/4.000 €) | Video, kfw.de | bei Programmänderung | bekannt |
| Worst-Performing-Building-Bonus (+10 %) | Video, kfw.de | bei Programmänderung | bekannt — Bedingung: Ausgangs-Energieklasse H |
| Serielle-Sanierung-Bonus (+15 %) | Video, kfw.de | bei Programmänderung | bekannt — Bedingung: Zielstandard ≥ 55 EE/NH |
| Marktzins-Vergleich | bereits vorhanden: `MARKET_RATES` in `src/data.js` | monatlich | vorhanden, keine neue Quelle nötig |

**Wichtig:** Das Video ist eine Sekundärquelle (Stand 22.07.2026). Alle Werte vor der Umsetzung direkt gegen kfw.de/261 verifizieren — insbesondere die fehlenden 85EE/85NH-Sätze.

## Umfang der Umsetzung

### Neuer Datenblock in `src/data.js`

Analog zum bestehenden `MARKET_RATES`/`KFW`-Muster (Kommentarkopf mit Intervall + Quelle, `stand`-Feld für die zentrale Datenstand-Anzeige):

```js
// ── KFW-261: ENERGIEEFFIZIENT SANIEREN (Kredit + Tilgungszuschuss) ──────
// Intervall: monatlich (Zins) / bei Programmänderung (Sätze, Boni)
// Quelle: kfw.de/261
export const KFW_261 = {
  stand: "Juli 2026",
  maxKreditProWE: 150000,
  zins: 2.89, // % — Standardvariante mit Mindestgeko
  tilgungszuschuss: {
    "55ee": 5, "55nh": 5,
    "70ee": 0, "70nh": 0,
    "85ee": null, // TODO: von kfw.de nachtragen
    "85nh": null, // TODO: von kfw.de nachtragen
  },
  bonusBaubegleitung: { quote: 50, capEFH: 10000, capWEinheit: 4000 },
  bonusWorstPerforming: 10,   // % zusätzlich, nur bei Ausgangsklasse H
  bonusSerielleSanierung: 15, // % zusätzlich, nur ab Zielstandard 55 EE/NH
};
```

### Neue Eingaben (eigener lokaler State in `Sanier.jsx`, kein Eingriff in bestehenden `s`/`act`/`tier`-State)

- Zielstandard: Select (55EE / 55NH / 70EE / 70NH / 85EE / 85NH)
- Anzahl Wohneinheiten: Zahleneingabe, Default 1, mit Tooltip zum Einliegerwohnung-Trick
- Serielle Sanierung: Checkbox (ja/nein)
- Worst-Performing-Building: **keine neue Eingabe** — wird automatisch aus der vorhandenen `getEkl(baujahr)`-Funktion abgeleitet (greift bei Klasse H)

### Berechnungslogik (neuer, additiver `useMemo`-Block — liest aus bestehendem `R`, schreibt nichts zurück)

- Kreditbetrag = `min(Gesamtsanierungskosten, KFW_261.maxKreditProWE × Wohneinheiten)`
- Tilgungszuschuss-Basis = Kreditbetrag × `tilgungszuschuss[zielstandard]`
- + Worst-Performing-Bonus (wenn Ausgangsklasse === "H"): Kreditbetrag × 10 %
- + Serielle-Sanierung-Bonus (wenn aktiv **und** Zielstandard ≥ 55): Kreditbetrag × 15 %
- Baubegleitungs-Zuschuss separat: 50 % der Energieberater-Kosten, gecappt je Gebäudetyp
- Zins-Vorteil ggü. Markt: `(MARKET_RATES.avg − KFW_261.zins) × Kreditbetrag` als grobe Jahresersparnis-Kennzahl

### Output (neuer Ergebnis-Block, gleiche Karten-Optik wie bestehend)

- Kreditbetrag, Tilgungszuschuss in €, Netto-Restschuld nach Zuschuss
- Zins-Vorteil ggü. Markt (mit Datenstand-Hinweis aus `KFW_261.stand`)
- Boni-Übersicht: welche greifen, welche nicht und warum
- Warnhinweis: EE-/NH-Klasse ist seit 21.07.2026 Pflichtvoraussetzung

## Integration in den Sanierungsrechner

- **Kein neuer Top-Level-Rechner.** Zusätzlicher Bereich/Tab innerhalb von `Sanier.jsx`, wählbar über einen Toggle am Anfang des Rechners: „Einzelmaßnahmen" vs. „Komplettsanierung (KfW-261)"
- Wiederverwendung bestehender Gebäudedaten aus dem `d`-State (React Context): Wohnfläche, Baujahr, Energieklasse, Bundesland — keine doppelte Eingabe
- Bestehende Logik (Einzelmaßnahmen-Förderquoten, Amortisationsrechnung, Annuität) bleibt **unverändert** — reines Additiv, kein Anfassen der laut `CLAUDE.md` eingefrorenen Berechnungen
- Bestehende Patterns (`SaveBtn`, `ExportPDF`, `Legal`) werden übernommen, damit Speichern/Export/Rechtstexte konsistent bleiben

## Übersetzungen (i18n)

Betrifft `src/i18n/translations.js` (Sprachen: de, en, tr, zh, hi) und `src/i18n/tips.js` für Tooltip-Texte. Neue Keys, Namensschema angelehnt an bestehende `san*`-Keys:

| Key | Beispiel (de) |
|---|---|
| `sanKfw261Tab` | „Komplettsanierung (KfW-261)" |
| `sanKfw261Standard` | „Ziel-Effizienzhaus-Standard" |
| `sanKfw261WE` | „Anzahl Wohneinheiten" |
| `sanKfw261WETip` | Tooltip: Einliegerwohnung-Trick erklärt |
| `sanKfw261Seriell` | „Serielle Sanierung (vorgefertigte Fassaden-/Dachelemente)" |
| `sanKfw261Kredit` | „KfW-Kredit" |
| `sanKfw261Tilgzuschuss` | „Tilgungszuschuss" |
| `sanKfw261NettoRest` | „Netto-Restschuld nach Zuschuss" |
| `sanKfw261ZinsVergleich` | „Zinsvorteil ggü. Markt" |
| `sanKfw261BonusWPB` | „Worst-Performing-Building-Bonus" |
| `sanKfw261BonusSeriell` | „Serielle-Sanierung-Bonus" |
| `sanKfw261BonusBaubegleitung` | „Baubegleitungs-Zuschuss" |
| `sanKfw261PflichtEE` | Warnhinweis-Text zur EE-/NH-Pflicht |
| `tip("kfw261standard")`, `tip("kfw261we")`, `tip("kfw261seriell")` | neue Tooltip-Einträge in `tips.js`, je 5 Sprachen |

Alle Keys müssen in **allen 5 Sprachen** vollständig vorliegen, bevor der Tab live geht — Teil-Übersetzungen sind im bestehenden `translations.js`-Muster nicht vorgesehen.

## Offene Punkte vor Umsetzungsstart

1. 85EE/85NH-Tilgungszuschuss-Sätze von kfw.de/261 nachtragen
2. Alle im Video genannten Werte gegen kfw.de verifizieren (Sekundärquelle, Stand 22.07.2026)
3. UX-Entscheidung: Position des neuen Tabs (vor oder nach dem Einzelmaßnahmen-Flow?)
4. Freigabe gemäß Approval-Pflicht (`CLAUDE.md`) vor jeder Code-Zeile

## Geschätzter Umfang

~250–350 Zeilen neuer Code (Datenblock in `data.js` + State + Berechnung + UI-Block in `Sanier.jsx`) plus Übersetzungs-Keys × 5 Sprachen. Kein Eingriff in bestehende Dateien außer additiven Ergänzungen.
