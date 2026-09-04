// Schritt B3 des Umbauplans - die Defaults an genau einer Stelle.
//
// Ein Objekt aus fuenf Feldern braucht Annahmen fuer alles Uebrige. Damit die
// Annahmen-Zeile im Ueberblick ("Gerechnet mit 3,8 % Zins ...") und die
// Vorbelegung nie auseinanderlaufen, kommen beide aus dieser Datei.
//
// Konzept 3.7, Punkt 5: Jedes Ergebnis nennt die verwendeten Defaults und
// laesst sie in einem Klick aendern - verschwiegene Annahmen sind der Grund,
// warum Rechner unglaubwuerdig wirken.
import { MARKET_RATES, GREST, AFA, WERTSTEIGERUNG } from "../data.js";
import { berechneNichtUml } from "./rendite.js";

export const STANDARD_ANNAHMEN = {
  tilgung: "2",
  zinsbindung: "10",
  notar: "2.0",
  makler: "3.57",
  steuersatz: "30",
  grundAnteil: "20",
  gebAnteil: "80",
  jahre: "10",
  leerstand: "0",
};

// Nicht umlagefaehige Kosten aus der Wohnflaeche ableiten - dieselbe Regel,
// die der Renditerechner beim Tippen anwendet (rendite.js/berechneNichtUml).
export function annahmenFuer({ bundesland, flaeche } = {}) {
  const zins = String(MARKET_RATES.avg);
  const grEst = bundesland && GREST[bundesland] != null ? String(GREST[bundesland]) : "5";
  // Nicht umlagefaehige Kosten aus der Wohnflaeche ableiten - dieselbe Regel,
  // die der Renditerechner beim Tippen anwendet. Ohne sie stuende in der
  // Objektkarte "Kosten / Monat 0 EUR", was den Cashflow zu guenstig zeigt.
  const nichtUml = berechneNichtUml(flaeche);
  return {
    ...STANDARD_ANNAHMEN,
    zinssatz: zins,
    grEst,
    afaSatz: String(AFA.standard),
    wertP: String(WERTSTEIGERUNG.pA),
    ...(nichtUml != null ? { nichtUml: String(nichtUml) } : {}),
  };
}

// Was in der Annahmen-Zeile unter dem Ergebnis steht. Bewusst kurz: die drei
// Groessen, die das Ergebnis am staerksten bewegen.
export function annahmenText(data) {
  const zins = String(data?.zinssatz ?? MARKET_RATES.avg).replace(".", ",");
  const tilg = String(data?.tilgung ?? STANDARD_ANNAHMEN.tilgung).replace(".", ",");
  const grEst = String(data?.grEst ?? "5").replace(".", ",");
  return `Gerechnet mit ${zins} % Zins, ${tilg} % Tilgung und ${grEst} % Grunderwerbsteuer.`;
}
