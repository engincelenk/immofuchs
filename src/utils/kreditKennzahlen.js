import { GREST } from "../data.js";

// Reduzierter Rechenkern nur fuer die Merkliste-Kartenvorschau (Konzept-Dok
// 8.3, Kredit-Karte: Darlehenssumme/Rate/Beleihung/Restschuld). Bewusst NICHT
// der volle Kreditrechner-Kern aus Finanzierung.jsx importiert/ausgelagert -
// der bleibt dort inline (keine Architekturaenderung an einem laufenden
// Rechner ohne eigenen Auftrag). Deckt nur die vier Basisgroessen ab, die
// sich aus den ohnehin gespeicherten Rohdaten (`d`) ableiten lassen, ohne
// zusaetzliche, nicht persistierte Eingaben (z. B. Sondertilgung) zu
// brauchen. Bei Formelaenderungen im Kreditrechner ggf. hier nachziehen.
// (gP/nP/mP - Grunderwerbsteuer/Notar/Makler - fliessen nur in die
// Nebenkosten-Summe ein, die wiederum nur bei nkFinanzieren=true das
// Darlehen erhoeht - siehe rendite.js/Finanzierung.jsx.)

export function computeKreditVorschau(d) {
  const kp = +d.kaufpreis || 0,
    ga = +d.garage || 0,
    gKP = kp + ga,
    ek = +d.eigenkapital || 0;
  if (kp <= 0) return null;
  const zP = +d.zinssatz || 0,
    tP = +d.tilgung || 0,
    zbJ = +d.zinsbindung || 10;
  const gP = GREST[d.bundesland] || 0,
    nP = +d.notar || 0,
    mP = +d.makler || 0,
    nbk = (gKP * (gP + nP + mP)) / 100;
  const finBasis = d.nkFinanzieren ? gKP + nbk : gKP;
  const da = Math.max(0, finBasis - ek);
  const bel = gKP > 0 ? (da / gKP) * 100 : 0;
  const mz = zP / 100 / 12;
  const ann = (da * (zP + tP)) / 100 / 12;
  let rs = da,
    rZB = da;
  for (let j = 1; j <= 60; j++) {
    for (let m = 0; m < 12 && rs > 0; m++) {
      const zm = rs * mz;
      const tm = Math.min(ann - zm, rs);
      if (tm <= 0) break;
      rs = Math.max(0, rs - tm);
    }
    if (j === zbJ) rZB = rs;
    if (rs <= 0) break;
  }
  return { da, ann, bel, rZB };
}
