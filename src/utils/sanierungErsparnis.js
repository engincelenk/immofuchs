// Verteilung der Energie- und CO2-Ersparnis auf die gewaehlten Sanierungs-
// massnahmen (aus Sanier.jsx ausgelagert, Konsistenzpruefung 2026-10-03, Befund M5).
//
// Die Gesamtersparnis stapelt die Massnahmen multiplikativ: jede spart nur vom
// verbleibenden Rest. Zeigt man je Zeile den linearen Anteil, uebersteigt die
// Zeilensumme die Gesamtersparnis (Hülle + Heizung komplett: 1.350 €/J in den
// Zeilen gegen 950 €/J ausgewiesen). Deshalb werden die Zeilen proportional auf die
// Gesamtersparnis skaliert und ueber kumulierte Rundung verteilt, sodass
// Zeilensumme = Gesamtersparnis exakt gilt.

/**
 * @param {Array<{k:string, ek:number, co2:number}>} aktiv  aktive Massnahmen (Reihenfolge = Anzeige),
 *        ek/co2 = Einzelanteil 0..1 an den Heizkosten bzw. am CO2
 * @param {number} kH     Heizkosten pro Jahr (EUR)
 * @param {number} co2H   CO2 pro Jahr (kg)
 * @param {{k:string, wert:number}|null} [fest]  Massnahme mit festem EUR-Wert (PV: Stromersparnis), nimmt
 *        nicht an der Heizkosten-Verteilung teil
 */
export function verteileErsparnis({ aktiv, kH, co2H, fest = null }) {
  const ekProd = aktiv.reduce((p, m) => p * (1 - m.ek), 1);
  const co2Prod = aktiv.reduce((p, m) => p * (1 - m.co2), 1);
  const ekLinear = aktiv.reduce((a, m) => a + kH * m.ek, 0);
  const co2Linear = aktiv.reduce((a, m) => a + co2H * m.co2, 0);
  const skalaEk = ekLinear > 0 ? (kH * (1 - ekProd)) / ekLinear : 0;
  const skalaCo2 = co2Linear > 0 ? (co2H * (1 - co2Prod)) / co2Linear : 0;

  const zeilen = {};
  let kumEk = 0,
    kumCo2 = 0,
    vorEk = 0,
    vorCo2 = 0;
  for (const m of aktiv) {
    kumEk += kH * m.ek * skalaEk;
    kumCo2 += co2H * m.co2 * skalaCo2;
    const kumEkR = Math.round(kumEk / 50) * 50;
    const kumCo2R = Math.round(kumCo2);
    zeilen[m.k] = {
      ek: fest && fest.k === m.k ? fest.wert : kumEkR - vorEk,
      co2: kumCo2R - vorCo2,
    };
    vorEk = kumEkR;
    vorCo2 = kumCo2R;
  }
  return {
    zeilen,
    ekG: Math.round((kH * (1 - ekProd)) / 50) * 50,
    co2G: Math.round(co2H * (1 - co2Prod)),
    eM: ekProd,
    cM: co2Prod,
  };
}
