export const AMPEL = {
  bruttoR: (v) => (v >= 5 ? "#22c55e" : v >= 4 ? "#f59e0b" : "#ef4444"),
  nettoR: (v) => (v >= 3.5 ? "#22c55e" : v >= 2.5 ? "#f59e0b" : "#ef4444"),
  cfOhne: (v) => (v > 0 ? "#22c55e" : v >= -100 ? "#f59e0b" : "#ef4444"),
  cfMit: (v) => (v > 0 ? "#22c55e" : v >= -100 ? "#f59e0b" : "#ef4444"),
  bel: (v) => (v < 70 ? "#22c55e" : v < 85 ? "#f59e0b" : "#ef4444"),
  lz: (v) => (!isFinite(v) || v > 35 ? "#ef4444" : v > 25 ? "#f59e0b" : "#22c55e"),
};

export const BANDS = {
  bruttoR: { dir: "up", green: 5.0, yellow: 4.0, unit: "%" },
  nettoR: { dir: "up", green: 3.5, yellow: 2.5, unit: "%" },
  kpFaktor: { dir: "down", green: 25, yellow: 30, unit: "x" },
  cfOhne: { dir: "up", green: 0, yellow: -150, unit: "eur" },
  cfMit: { dir: "up", green: 0, yellow: -150, unit: "eur" },
  bel: { dir: "down", green: 70, yellow: 85, unit: "%" },
  ekQuote: { dir: "up", green: 20, yellow: 10, unit: "%" },
  laufzeit: { dir: "down", green: 25, yellow: 35, unit: "jahre" },
  steuerErsM: { dir: "up", green: 150, yellow: 75, unit: "eur" },
  nkAmort: { dir: "down", green: 10, yellow: 15, unit: "jahre" },
  ekRendite: { dir: "up", green: 6, yellow: 3, unit: "%" },
  gesamtSaldo: { dir: "up", green: 0, yellow: null, unit: "eur" },
  wertAnnahme: { dir: "down", green: 2.5, yellow: 4.0, unit: "%" },
  // ── Investment-Score Stufe 1 (2026-08-27) ──────────────────────────────
  // Schwellen aus dem Kalibrierungslauf ueber 16 Referenzobjekte, siehe
  // docs/technical_specs/kalibrierung-investment-score.md Abschnitt 5.
  // dscrIst bewusst NICHT die Bankgrenze 1,3/1,2/1,0 aus dem Nutzer-Konzept:
  // deutsche Bestandsobjekte liegen bei marktueblicher Finanzierung typisch
  // zwischen 0,5 und 0,9 (Tilgung ist hier Vermoegensbildung, keine Kosten
  // wie in der gewerblichen Finanzierung) - 1,3 waere fuer praktisch jedes
  // Objekt rot und der Wert damit ohne Aussagekraft.
  dscrIst: { dir: "up", green: 0.75, yellow: 0.58, unit: "x" },
  breakEvenLeerstand: { dir: "up", green: -25, yellow: -55, unit: "%" },

  // ── Investment-Score Stufe 2 (2026-08-27) ──────────────────────────────
  // Werte aus demselben Kalibrierungslauf wie Stufe 1, siehe
  // docs/technical_specs/investment-score.md Abschnitt 6.
  // "kpFaktorScore" statt des bestehenden Schluessels "kpFaktor": der
  // existiert schon als Ampelkarte in Sektion 2 mit einer anderen,
  // monoton fallenden Bewertung (Kaufpreisfaktor moeglichst niedrig). Ein
  // zweiter, plateau-foermiger Massstab fuer denselben Wert unter demselben
  // Schluessel wuerde die bereits ausgelieferte Karte stillschweigend
  // umfaerben - deshalb ein eigener Schluessel nur fuer den Score.
  kpFaktorScore: { typ: "trapez", von: 18, bis: 25, null0: 11, null1: 39 },
  anfangsrendite: { typ: "trapez", von: 3.0, bis: 4.5, null0: 1.7, null1: 7.0 },
  dscrObjekt: { typ: "trapez", von: 0.75, bis: 1.15, null0: 0.42, null1: 1.8 },
  icr: { dir: "up", green: 1.1, yellow: 0.9, unit: "x" },
  debtYield: { dir: "up", green: 4.4, yellow: 3.67, unit: "%" },
  restschuldZBQuote: { dir: "down", green: 50, yellow: 70, unit: "%" },
};
export function rate(kpi, wert) {
  const b = BANDS[kpi];
  if (!b) return { tier: "green", symbol: "✓", color: "green" };
  let tier;
  if (b.typ === "trapez") {
    tier =
      wert >= b.von && wert <= b.bis
        ? "green"
        : wert >= b.null0 && wert <= b.null1
          ? "yellow"
          : "red";
  } else if (b.dir === "up") {
    tier = wert >= b.green ? "green" : b.yellow != null && wert >= b.yellow ? "yellow" : "red";
  } else {
    tier = wert <= b.green ? "green" : b.yellow != null && wert <= b.yellow ? "yellow" : "red";
  }
  const symbol = tier === "green" ? "✓" : tier === "yellow" ? "~" : "⚠";
  const color = tier === "green" ? "green" : tier === "yellow" ? "yellow" : "red";
  return { tier, symbol, color };
}
export const vrd = (r) =>
  r.tier === "green" ? "gut" : r.tier === "yellow" ? "grenzwertig" : "kritisch";

// ═══ 0–100 Score für Radar-/Gauge-Darstellungen, abgeleitet aus denselben BANDS-Schwellen ═══
// Rein additiv — ändert nichts an AMPEL/BANDS/rate/vrd.
export function scoreKpi(kpi, value) {
  const b = BANDS[kpi];
  if (!b || value == null || !isFinite(value)) return 50;
  // Trapez-Baender (Stufe 2 des Investment-Score-Umbaus, 2026-08-27): 100
  // Punkte im Plateau [von, bis], linear fallend auf 0 an den Nullstellen
  // [null0, null1] - fuer Kennzahlen, bei denen zu wenig UND zu viel
  // schlecht sind (siehe investment-score.md Abschnitt 6, "trapez").
  if (b.typ === "trapez") {
    if (value >= b.von && value <= b.bis) return 100;
    if (value < b.von) {
      if (value <= b.null0) return 0;
      return ((value - b.null0) / (b.von - b.null0)) * 100;
    }
    if (value >= b.null1) return 0;
    return ((b.null1 - value) / (b.null1 - b.bis)) * 100;
  }
  const { dir, green, yellow } = b;
  if (yellow == null) {
    const spread = Math.abs(green) || 1;
    const s =
      dir === "up"
        ? ((value - green + spread) / spread) * 100
        : ((green + spread - value) / spread) * 100;
    return Math.max(0, Math.min(100, s));
  }
  let s;
  if (dir === "up") {
    const redAnchor = yellow - (green - yellow);
    s = ((value - redAnchor) / (green - redAnchor)) * 100;
  } else {
    const redAnchor = yellow + (yellow - green);
    s = ((redAnchor - value) / (redAnchor - green)) * 100;
  }
  return Math.max(0, Math.min(100, s));
}
