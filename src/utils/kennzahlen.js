// Zusaetzliche Investment-Kennzahlen fuer den Renditerechner (Stufe 1 des
// Investment-Score-Umbaus, 2026-08-27). Reine Funktion ohne React, nach dem
// Muster von afa.js/mietprognose.js/kfwDarlehen.js: nimmt den Formular-State
// `d` und das bereits berechnete Ergebnis `R` aus computeRendite() entgegen,
// fuegt keine eigene Finanzmathematik hinzu, sondern kombiniert vorhandene
// Zwischenwerte neu (NOI, DSCR, Debt Yield, Break-even-Groessen).
//
// Spec: docs/technical_specs/investment-score.md Abschnitt 4.
// Kalibrierung/Begruendung der Formeln:
//   docs/technical_specs/kalibrierung-investment-score.md
//
// Diese Stufe liefert bewusst NUR Kennzahlen - keinen Score, keine
// Gewichtung, keine Aggregation ueber mehrere Dimensionen. Das folgt erst in
// Stufe 2, und laut Kalibrierung erst mit Objekt- und Exit-Dimension (Stufe 3)
// unter dem Namen "Investment Score" (vorher "Finanz-Score").

/**
 * @param {object} d - Formular-State aus dem Renditerechner (Strings)
 * @param {object} R - Rueckgabe von computeRendite(d, t)
 * @returns {object} Kennzahlen; null bei fehlender Datengrundlage statt 0,
 *   damit der Aufrufer "kein Wert" von "Wert ist 0" unterscheiden kann.
 */
export function berechneKennzahlen(d, R) {
  const kaltmiete = +d.kaltmiete || 0;
  const nichtUmlagbarMon = +d.nichtUml || 0;
  const nichtUmlagbarJahr = nichtUmlagbarMon * 12;
  const jahresMiete = kaltmiete * 12;
  const jahre = +d.jahre || 10;
  const leerstandMon = +d.leerstand || 0;
  const analyseMonate = jahre * 12;
  const leerstandsFaktor =
    analyseMonate > 0 ? Math.max(0, (analyseMonate - leerstandMon) / analyseMonate) : 1;

  // ── NOI (Net Operating Income) ──────────────────────────────────────────
  // Effektive Jahresmiete (nach dem eingestellten Leerstand) abzueglich der
  // nicht umlagefaehigen Kosten. Bewusst VOR Zins und Tilgung - der
  // Kapitaldienst wird erst gegen den NOI gepruepft (DSCR), nicht darin
  // vorweggenommen.
  const noi = jahresMiete * leerstandsFaktor - nichtUmlagbarJahr;

  // ── Effektive Anfangsrendite ─────────────────────────────────────────────
  // Anders als R.nR (Nettorendite, unveraendert) bezieht diese Kennzahl
  // Sonderumlage und Renovierung mit in die Investitionsbasis ein - siehe
  // investment-score.md Abschnitt 4, Hinweis zu R.nR.
  const gesamtinvestition = R.gKP + R.nbk + (+d.sonder || 0) + (+d.renovierung || 0);
  const anfangsrendite = gesamtinvestition > 0 ? (noi / gesamtinvestition) * 100 : null;

  // ── DSCR, zweimal gerechnet (Kalibrierung 2026-08-27) ────────────────────
  // dscrIst: NOI gegen den TATSAECHLICHEN Kapitaldienst des Nutzers. Bei
  // Tilgungssatz 0 faellt kaum Kapitaldienst an und dscrIst wird kuenstlich
  // gut, obwohl das Darlehen nie zurueckgefuehrt wird (deckt sich mit dem
  // laufzeitJahre-Fix in rendite.js). Deshalb IMMER zusammen mit dem
  // Zinsdeckungsgrad (icr) lesen, der die Tilgung herausrechnet.
  const kapitaldienstIst = R.rateJ1 * 12;
  const dscrIst = kapitaldienstIst > 0 ? noi / kapitaldienstIst : null;

  const zinsenJ1 = R.yearRows[0]?.zinsen || 0;
  const icr = zinsenJ1 > 0 ? noi / zinsenJ1 : null;

  // dscrObjekt: NOI gegen den Kapitaldienst einer STANDARDFINANZIERUNG
  // (80 % Beleihung, 2 % Tilgung, aktueller Zinssatz des Formulars) - also
  // unabhaengig davon, wie der Nutzer tatsaechlich finanziert. Beantwortet
  // "traegt sich die Immobilie", nicht "traegt sich meine Finanzierung".
  // Noch ohne UI-Anbindung in Stufe 1 (siehe investment-score.md Abschnitt 6),
  // hier bereits verfuegbar fuer Stufe 2.
  const zinsProz = +d.zinssatz || 0;
  const kapitaldienstStandard = R.gKP * 0.8 * ((zinsProz + 2) / 100);
  const dscrObjekt = kapitaldienstStandard > 0 ? noi / kapitaldienstStandard : null;

  // ── Debt Yield ────────────────────────────────────────────────────────────
  // NOI gegen die Darlehenssumme - anders als DSCR unabhaengig vom Zinssatz,
  // daher als Ergaenzung gedacht (noch ohne UI-Anbindung in Stufe 1).
  const debtYield = R.da > 0 ? (noi / R.da) * 100 : null;

  // ── Break-even-Miete ──────────────────────────────────────────────────────
  // Welche NOMINALE Kaltmiete (vor Leerstand) waere minimal noetig, damit die
  // Rate plus die nicht umlagefaehigen Kosten gerade gedeckt sind. Division
  // durch den Leerstandsfaktor, weil R.rateJ1 gegen die EFFEKTIVE (um
  // Leerstand geminderte) Miete kalkuliert - siehe cfMonOhneSt in rendite.js.
  const breakEvenMiete = leerstandsFaktor > 0 ? (R.rateJ1 + nichtUmlagbarMon) / leerstandsFaktor : null;

  // ── Break-even-Leerstand ──────────────────────────────────────────────────
  // Bei welcher Leerstandsquote (bezogen auf die aktuelle Kaltmiete) kippt
  // der Cashflow. Negativ heisst: bereits bei 0 % Leerstand negativ.
  const breakEvenLeerstand =
    kaltmiete > 0 ? (1 - (R.rateJ1 + nichtUmlagbarMon) / kaltmiete) * 100 : null;

  // ── Restschuld bei Zinsbindungsende ──────────────────────────────────────
  // yearRows[j].rest ist die Restschuld (Bank + KfW) am ANFANG von Jahr j,
  // yearRows[j].tilgB die Tilgung WAEHREND Jahr j - die Differenz ist damit
  // die Restschuld am ENDE von Jahr j, also am Ende der Zinsbindung. Liegt
  // die Zinsbindung ausserhalb des Betrachtungszeitraums, ist der Wert nicht
  // bekannt: null statt eine falsche Naeherung (Absprache 2026-08-27).
  const zinsbindung = Math.max(1, Math.round(+d.zinsbindung) || 10);
  let restschuldZB = null;
  let restschuldZBQuote = null;
  if (zinsbindung <= jahre) {
    const zeile = R.yearRows[zinsbindung - 1];
    if (zeile) {
      restschuldZB = zeile.rest - zeile.tilgB;
      restschuldZBQuote = R.gKP > 0 ? (restschuldZB / R.gKP) * 100 : null;
    }
  }

  return {
    noi,
    gesamtinvestition,
    anfangsrendite,
    dscrIst,
    dscrObjekt,
    icr,
    debtYield,
    breakEvenMiete,
    breakEvenLeerstand,
    restschuldZB,
    restschuldZBQuote,
  };
}
