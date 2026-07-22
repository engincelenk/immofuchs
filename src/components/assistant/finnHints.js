import { tpl } from "../../utils/helpers.js";

// Was Finn in der Sprechblase sagt - drei Texte je Flaeche, die nacheinander
// durchlaufen (Nutzerwunsch 2026-07-22: "seiten- und rechnerspezifisch und
// oefter"). Das Timing steckt in useFinnBubble.js.
//
// Vorher gab es genau zwei feste Saetze fuer die ganze App und einen Timer,
// der nicht wusste, was auf dem Bildschirm steht.
const FLAECHEN_TEXTE = {
  landing: ["hintLanding1", "hintLanding2", "hintLanding3"],
  renditerechner: ["hintRendite1", "hintRendite2", "hintRendite3"],
  finanzierung: ["hintKredit1", "hintKredit2", "hintKredit3"],
  miete: ["hintMiete1", "hintMiete2", "hintMiete3"],
  sanierung: ["hintSanier1", "hintSanier2", "hintSanier3"],
  steuertrick: ["hintSteuer1", "hintSteuer2", "hintSteuer3"],
  vorfaelligkeit: ["hintVfe1", "hintVfe2", "hintVfe3"],
};

// Ergebnisbezogene Warnung - schlaegt eine an, ersetzt sie den ERSTEN Text
// der Sequenz. Reihenfolge = Dringlichkeit, es gewinnt immer nur eine.
function pickDringend(signale, t) {
  const s = signale || {};
  if (s.tier === "red") return t.hintTierRot;
  if (typeof s.cashflow === "number" && s.cashflow < 0) return t.hintCashflowNegativ;
  if (typeof s.risiko === "number" && s.risiko > 60) return tpl(t.hintRisikoHoch, { wert: Math.round(s.risiko) });
  return null;
}

/**
 * Liefert die Textsequenz fuer eine Flaeche.
 * @returns string[] - leer, wenn die Flaeche keine Texte hat
 */
export function buildFinnHints(rechner, signale, t) {
  const texte = (FLAECHEN_TEXTE[rechner] || []).map((k) => t[k]).filter(Boolean);
  if (texte.length === 0) return [];
  const dringend = pickDringend(signale, t);
  if (dringend) texte[0] = dringend;
  return texte;
}
