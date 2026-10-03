// Rueckwaertsrechnung Steueroptimierung § 6 Abs. 1 Nr. 1a EStG (aus
// SteuerTrick.jsx ausgelagert, damit sie testbar ist - Konsistenzpruefung
// 2026-10-03, Befund H3).
//
// Vereinfachung (in der Oberflaeche als "Grobe Naeherung" benannt): benoetigte
// Sanierungskosten = Steuer / Grenzsteuersatz. Das setzt voraus, dass jeder Euro
// des Verlusts zum Grenzsatz erstattet wird; bei grossen Betraegen greifen auch
// niedrigere Tarifstufen und es bleibt eine Reststeuer.

export const GRENZE_QUOTE = 0.15; // § 6 Abs. 1 Nr. 1a EStG: 15 % der Gebaeude-AK
export const PUFFER_QUOTE = 0.97; // Sanierung soll hoechstens 97 % des Limits sein

/**
 * @param {{lohnsteuer:number, grenzSatzProz:number, grundstueck:number}} p
 */
export function berechneSteuerTrick({ lohnsteuer, grenzSatzProz, grundstueck }) {
  const valid = lohnsteuer > 0 && grenzSatzProz > 0 && grenzSatzProz < 100;
  const sanK = valid ? lohnsteuer / (grenzSatzProz / 100) : 0;
  const gebW = valid ? sanK / GRENZE_QUOTE : 0;
  const gesKP = valid ? gebW + (grundstueck || 0) : 0;
  // Mit Puffer: gleiche Sanierungskosten (die Steuer wird voll ausgeglichen), aber
  // ein groesseres Gebaeude, sodass sie nur 97 % des Limits ausmachen. Frueher
  // wurden die Kosten auf 97 % gekuerzt und der Gebaeudewert daraus neu mit 15 %
  // berechnet - die Quote blieb exakt 15 %, ohne Puffer.
  const sanKS = sanK;
  const gebWS = valid ? sanK / (GRENZE_QUOTE * PUFFER_QUOTE) : 0;
  const gesKPS = valid ? gebWS + (grundstueck || 0) : 0;
  return {
    valid,
    sanK,
    gebW,
    gesKP,
    sanKS,
    gebWS,
    gesKPS,
    grenze15: gebW * GRENZE_QUOTE,
    grenze15S: gebWS * GRENZE_QUOTE,
  };
}
