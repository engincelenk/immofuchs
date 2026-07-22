import { tpl } from "../../utils/helpers.js";

// Waehlt aus, WAS Finn in der Sprechblase sagt (Nutzerwunsch 2026-07-22:
// "die Sprechblase soll intelligent sein und den Nutzer animieren").
//
// Vorher gab es nur zwei feste Texte und einen 5s-Timer, unabhaengig davon,
// was auf dem Bildschirm stand. Jetzt meldet Finn sich, wenn er tatsaechlich
// etwas zu sagen hat - und sagt dann etwas Konkretes zum Ergebnis.
//
// Rueckgabe: { id, text, delay } oder null.
//   id    - Dedup-Schluessel, jeder Hinweis erscheint 1x pro Sitzung
//           (siehe useFinnBubble.js)
//   delay - Wartezeit bis zum Einblenden in ms
const SOFORT = 3000; // ergebnisbezogene Hinweise: kurz nach dem Rendern
const IDLE = 30000; // generischer Anstupser: erst wenn wirklich nichts passiert

export function pickFinnHint(rechner, signale, t) {
  const s = signale || {};

  // Reihenfolge = Prioritaet. Das dringlichste Problem gewinnt, es wird nie
  // mehr als ein Hinweis gleichzeitig gezeigt.
  if (s.tier === "red") {
    return { id: rechner + ":tier-rot", text: t.hintTierRot, delay: SOFORT };
  }
  if (typeof s.cashflow === "number" && s.cashflow < 0) {
    return { id: rechner + ":cashflow-negativ", text: t.hintCashflowNegativ, delay: SOFORT };
  }
  if (typeof s.risiko === "number" && s.risiko > 60) {
    return { id: rechner + ":risiko-hoch", text: tpl(t.hintRisikoHoch, { wert: Math.round(s.risiko) }), delay: SOFORT };
  }
  // Praxisfehler, der bares Geld kostet - steht seit dem Erstkonzept als
  // proaktiver Hinweis drin (docs/plans/2026-07-19-ki-assistent-konzept.md),
  // war aber nie umgesetzt.
  if (rechner === "sanierung") {
    return { id: "sanierung:foerderantrag", text: t.hintFoerderantrag, delay: SOFORT };
  }
  return { id: rechner + ":idle", text: t.hintIdle, delay: IDLE };
}
