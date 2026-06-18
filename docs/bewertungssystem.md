# Bewertungssystem (BANDS) — Spec für Renditerechner-Bullets & Ampel-Karten

> Status: **freigegeben** am 2026-06-18. Umfang **Scope B** (Bullets *und* AmpelKPI-Karten lesen aus zentraler `BANDS`-Config). Umsetzung in frischer Session, weil großer Umbau (~200 Zeilen, 7 Sektionen) + OneDrive-Sync den Sandbox-Build unzuverlässig macht. Nach Umbau: `npm run build` auf der Maschine verifizieren (settled OneDrive).

## Ziel

Die Bullet-Points in den `SectionExplain`-Blöcken sollen nicht mehr nur *erklären, was eine Kennzahl ist*, sondern *einordnen, wo der Nutzer steht* — Wert + Bewertungsband + Verdikt. Die ausführlichen Erklärtexte darunter bleiben **unverändert** (die sind gut). Die `AmpelKPI`-Karten ziehen ihre Schwellen künftig aus derselben Quelle → eine einzige Bewertungs-Wahrheit, keine Doppel-Schwellen mehr.

## Architektur

Eine zentrale `BANDS`-Config als alleinige Wahrheit. Pro Kennzahl: Richtung + Schwellen. Ein Helfer `rate(kpi, wert)` liefert `{tier, symbol, color, bandText}`.

```js
// dir:'up'   → höher ist besser (wert>=green → grün, >=yellow → gelb, sonst rot)
// dir:'down' → niedriger ist besser (wert<=green → grün, <=yellow → gelb, sonst rot)
const BANDS = {
  bruttoR:  { dir:'up',   green:5.0,  yellow:4.0,  unit:'%'    },
  nettoR:   { dir:'up',   green:3.5,  yellow:2.5,  unit:'%'    },
  kpFaktor: { dir:'down', green:25,   yellow:30,   unit:'x'    },
  cfOhne:   { dir:'up',   green:0,    yellow:-150, unit:'eur'  },
  cfMit:    { dir:'up',   green:0,    yellow:-150, unit:'eur'  },
  bel:      { dir:'down', green:70,   yellow:85,   unit:'%'    },
  ekQuote:  { dir:'up',   green:20,   yellow:10,   unit:'%'    },
  laufzeit: { dir:'down', green:25,   yellow:35,   unit:'jahre'},
  steuerErsM:{dir:'up',   green:150,  yellow:75,   unit:'eur'  },
  nkAmort:  { dir:'down', green:10,   yellow:15,   unit:'jahre'},
  ekRendite:{ dir:'up',   green:6,    yellow:3,    unit:'%'    },
  gesamtSaldo:{dir:'up',  green:0,    yellow:null, unit:'eur'  }, // gelb optional 0..+5% EK
  wertAnnahme:{dir:'down',green:2.5,  yellow:4.0,  unit:'%'    }, // Plausibilitäts-Flag
};

// tier: 'green'|'yellow'|'red'  symbol: '✓'|'~'|'⚠'
function rate(kpi, wert){
  const b = BANDS[kpi]; if(!b) return null;
  let tier;
  if(b.dir==='up')   tier = wert>=b.green ? 'green' : (b.yellow!=null && wert>=b.yellow) ? 'yellow' : 'red';
  else               tier = wert<=b.green ? 'green' : (b.yellow!=null && wert<=b.yellow) ? 'yellow' : 'red';
  const symbol = tier==='green'?'✓':tier==='yellow'?'~':'⚠';
  const color  = tier==='green'?'#22c55e':tier==='yellow'?'#f59e0b':'#ef4444';
  return { tier, symbol, color };
}
```

**Bullet-Grammatik:** `[Symbol] [Kennzahl] [Wert] — [Band] → [Verdikt]`
**Verdikt-Vokabular (i18n):** `✓ gut/stark` · `~ grenzwertig` · `⚠ kritisch` — deckungsgleich mit den Ampelfarben grün/gelb/rot.

Beispiel-Bullet (Cashflow, Nein-Fall):
`⚠ Cashflow o. Steuer −255 €/Mon. — tragbar bis −150 € → Puffer nötig`

## Das Bewertungssystem (freigegebene Bänder)

| Kennzahl | Einheit | Richtung | ✓ grün | ~ gelb | ⚠ rot | Quelle |
|---|---|---|---|---|---|---|
| Bruttorendite | % | ↑ | ≥ 5,0 | 4,0–4,9 | < 4,0 | Code |
| Nettorendite | % | ↑ | ≥ 3,5 | 2,5–3,4 | < 2,5 | Code-Karte |
| Netto vs. Zins | — | ↑ | nR ≥ Zins+1 | nR ≥ Zins | nR < Zins | neu |
| Kaufpreisfaktor | × Jahresmiete | ↓ | ≤ 25 | 25–30 | > 30 | Code-Text → fixiert |
| Cashflow o. Steuer | €/Mon | ↑ | ≥ 0 | −150…0 | < −150 | geändert (war −100) |
| Cashflow m. Steuer | €/Mon | ↑ | ≥ 0 | −150…0 | < −150 | geändert + Caveat |
| Beleihungsauslauf | % | ↓ | ≤ 70 | 70–85 | > 85 | Code |
| EK-Quote | % | ↑ | ≥ 20 | 10–20 | < 10 | neu |
| Laufzeit | Jahre | ↓ | ≤ 25 | 25–35 | > 35 / ∞ | Code |
| Steuerersparnis | €/Mon | ↑ | > 150 | 75–150 | < 75 | Code |
| NK-Amortisation | Jahre | ↓ | ≤ 10 | 10–15 | > 15 | Code |
| EK-Rendite p.a. | % | ↑ | ≥ 6 | 3–6 | < 3 | vereinheitlicht |
| Gesamtsaldo | € | ↑ | > 0 | 0…+5 % EK | < 0 | Code + gelb-Stufe |
| Wertsteigerungs-Annahme | % p.a. | Realismus | ≤ 2,5 | 2,5–4,0 | > 4,0 | neu (Plausibilität) |
| Spekulationsfrist | Jahre gehalten | ↑ | > 10 (steuerfrei) | — | ≤ 10 (steuerpflichtig) | Code |

## Inkonsistenzen im jetzigen Code, die das System heilt

1. **Nettorendite**: Karte bewertet bei 3,5/2,5 — der Erklärtext bei 5/3. → vereinheitlicht auf **3,5/2,5**.
2. **EK-Rendite p.a.**: Karte 5/3, Erklärtext 7/5/3. → vereinheitlicht auf **6/3** (schlägt Tagesgeld klar, bleibt unter dem ETF-Anspruch ~7 % als „stark").
3. **Cashflow**: Code −100 €, Vorgabe −150 €. → **−150** übernommen (≈ 1.800 €/Jahr Reserve noch tragbar).

## Realitäts-Check (Begründung neuer/geänderter Bänder)

- **Wertsteigerung > 4 % p.a. = rot**: deutsche Wohnimmobilien langfristig real eher 2–3 % p.a.; höhere Annahmen schönen das Ergebnis → bewusster Ehrlichkeits-Wächter.
- **EK-Quote < 10 % = rot**: Vollfinanzierungen teuer/fragil; 20 %+ solide.
- **Kaufpreisfaktor > 30 = rot**: 25× ≈ 4 % Brutto; 30–35× in A-Städten üblich, aber teuer — soll benannt, nicht beschönigt werden.
- **Cashflow −150 €**: stärkste Abhängigkeit von Einkommen/Reserven — der Wert, den der Nutzer (Profi) am ehesten justieren möchte.

## KPI → Code-Variable (Mapping für die Umsetzung)

| BANDS-Key | Wert im Code | Sektion |
|---|---|---|
| bruttoR | `R.bR` | 1 |
| nettoR | `R.nR` (vs. `+d.zinssatz`) | 1 |
| kpFaktor | `R.gKP / ((+d.kaltmiete||1)*12)` | 1 |
| cfOhne | `R.cf2OhneSt` | 2 / Selbstträger |
| cfMit | `R.cf2MitSt` | 2 / Selbstträger |
| bel | `R.bel` | 3 |
| ekQuote | `R.ekQ` | 3 |
| laufzeit | `R.lz` (`isFinite` prüfen) | 3 |
| steuerErsM | `R.sSt/R.j/12` | 4 |
| nkAmort | `R.beJ` | 4 |
| ekRendite | mit Steuer `R.g/(+d.eigenkapital)/R.j*100`; ohne `R.gOhne/(+d.eigenkapital)/R.j*100` | 6 |
| gesamtSaldo | `R.g` (`R.gOhne` für ohne-Steuer) | 6 |
| wertAnnahme | `+d.wertP` | 6 / 7 |
| spekulation | `R.j > 10` | 7 |

## Umsetzungs-Notizen

- **Bestehende Schwellen ersetzen** (jetzt verstreut, sollen auf `rate()` zeigen): Sec1 `brCol`/`nrCol` (bR 5/4, nR 3.5/2.5); Sec2 `cfOCol`/`cfMCol` (>0/−100); Sec3 `belCol` (<70/<85) / `lzCol` (>35/>25); Sec4 `stErsCol` (>150/>75) / `beJCol` (≤10/≤15); Sec6 `gCol` (≥0) / `ekRCol` (≥5/≥3).
- **AmpelKPI-Karten**: Farbe/`statusLabel` aus `rate()` ableiten statt eigener Ternaries (Single Source).
- **Bullets**: pro Sektion auf Befund-Format umstellen (Symbol + Wert + Band + Verdikt). Erklärtexte (`text={...}`) **nicht** anfassen.
- **i18n**: neue Band-Label-Keys (`gut`/`grenzwertig`/`kritisch`, „gut ab {x}", „tragbar bis {x}") in alle 5 Sprachen (de/en/tr/zh/hi). Zahlen-Bänder sind sprachneutral. Für die nicht-deutschen Bullet-Varianten (`s1b1` etc.) Band-Tokens via `tpl()` einsetzen.
- **Berechnungen** (`cf2OhneSt`, `beqKP`, §558, Annuität): **unberührt**. Reine Bewertungs-/Darstellungslogik.

## Offene Justierung (vom Nutzer noch finalisierbar)

Besonders zur Prüfung markiert: **Cashflow −150**, **EK-Rendite 6/3**, **Wertsteigerung 2,5/4**, **EK-Quote 20/10**. Werte hier in der Tabelle ändern → der Umbau übernimmt sie 1:1.
