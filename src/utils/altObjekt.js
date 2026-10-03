// Bereinigung alter gespeicherter Objekte beim Laden (Konsistenzpruefung 2026-10-03).
//
// Ein gespeichertes Objekt ist ein Snapshot der Eingaben. Zwei Felder wurden bis
// 2026-10-03 mit einer festen Vorbelegung gespeichert, die nie bewusst gewaehlt
// wurde und die Werte aus dem Objekt verdeckte:
//  - sanFl (Wohnflaeche im Sanierungsrechner): fester Default "60" statt der
//    Wohnflaeche des Objekts.
//  - vfeRestschuld / vfeMonatsRate (Vorfaelligkeitsrechner): Vorbelegung "volles
//    Darlehen" und Rate aus Kaufpreis minus Eigenkapital, ohne Garage und
//    finanzierte Nebenkosten.
// Die Bereinigung ist bewusst eng: nur exakt diese alten Vorbelegungen werden
// geleert (die neuen Vorbelegungen rechnen dann neu), jeder andere Wert bleibt.

import { MARKET_RATES } from "../data.js";

export function bereinigeAltObjektDaten(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };

  // Sanierung: alter Default 60 m2, obwohl das Objekt eine andere Flaeche hat.
  const flaeche = String(out.flaeche ?? "").trim();
  if (String(out.sanFl) === "60" && flaeche !== "" && flaeche !== "60") out.sanFl = "";

  // Vorfaelligkeit: alte Vorbelegung exakt wiedererkennen.
  const da = Math.max(0, (+out.kaufpreis || 300000) - (+out.eigenkapital || 60000));
  const zP = +(out.zinssatz || MARKET_RATES.avg);
  const tP = +(out.tilgung || 1);
  const alteRate = Math.round((da * (zP + tP)) / 100 / 12);
  const alteRestschuld = String(da || 240000);
  if (
    alteRate > 0 &&
    String(out.vfeRestschuld ?? "") === alteRestschuld &&
    String(out.vfeMonatsRate ?? "") === String(alteRate)
  ) {
    out.vfeRestschuld = "";
    out.vfeMonatsRate = "";
  }
  return out;
}
