// Eine einzige Definition der Eigenkapitalrendite (Befund H2,
// docs/test-exposes/KONSISTENZPRUEFUNG_2026-10-03.md).
//
// Vorher gab es drei Zahlen fuer dieselbe Frage: Gesamtsaldo / EK / Jahre
// (Renditerechner, Briefing: S1 8,0 %), die Rendite der Karte Alternativ-
// Investment (S1 2,6 %) und den Cashflow auf das EK (Objektseite). Der Nenner
// der ersten Zahl liess die bar gezahlten Nebenkosten, Sonderumlage, Renovierung
// und Nachschuesse weg und wurde als einfacher Durchschnitt statt mit
// Zinseszins gerechnet. Hier gilt wie in der Alternativ-Karte: der Nenner ist
// das, was der Nutzer insgesamt aus eigener Tasche einzahlt, die Rendite
// ist die jaehrliche Wachstumsrate (CAGR) vom Einsatz zum Endvermoegen.

/**
 * @param {object} d - Formular-State
 * @param {object} R - Rueckgabe von computeRendite(d, t)
 * @param {{ohneSteuer?: boolean}} [opt]
 * @returns {{start:number, nachschuss:number, eingezahlt:number, gewinn:number,
 *   endvermoegen:number, rendite:number|null}}
 */
export function immobilienEinsatz(d, R, { ohneSteuer = false } = {}) {
  // Nebenkosten nur als Barauslage, wenn sie nicht mitfinanziert werden
  // (gleiche Regel wie nkCash in rendite.js).
  const nkBar = d?.nkFinanzieren ? 0 : R.nbk || 0;
  const start = (+d?.eigenkapital || 0) + nkBar + (+d?.sonder || 0) + (+d?.renovierung || 0);

  // Nachschuesse: Jahre mit negativem Cashflow (nach bzw. ohne Steuer).
  let nachschuss = 0;
  for (const y of R.yearRows || []) {
    const cf = (ohneSteuer ? y.cfOhneSt : y.cf) || 0;
    if (cf < 0) nachschuss += -cf;
  }
  const eingezahlt = start + nachschuss;
  const gewinn = ohneSteuer ? R.gOhne || 0 : R.g;
  const endvermoegen = eingezahlt + gewinn;
  // Durchschnittliche Rendite p. a. auf das eingezahlte Kapital. Naeherung:
  // Nachschuesse werden wie der Startbetrag behandelt, daher eher vorsichtig.
  const vielfaches = eingezahlt > 0 ? endvermoegen / eingezahlt : null;
  const rendite =
    vielfaches && vielfaches > 0 && R.j > 0 ? (Math.pow(vielfaches, 1 / R.j) - 1) * 100 : null;

  return { start, nachschuss, eingezahlt, gewinn, endvermoegen, rendite };
}
