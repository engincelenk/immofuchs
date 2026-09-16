// Kaufpreis-Simulation fuer das KI-Produkt "Kaufpreis analysieren".
//
// Bisher bekam das Modell fuer die Preiseinordnung nur EINEN Vergleichsanker
// (den Preis bei ortsueblicher Miete, siehe preisSchaetzung.js). Diese Datei
// liefert zusaetzlich eine kleine, durchgerechnete Preistabelle - mehrere
// Kaufpreis-Punkte rund um den aktuell hinterlegten Preis, jeweils mit ihren
// tatsaechlichen Auswirkungen auf Cashflow, Rendite, DSCR, EK-Rendite und
// Kaufpreisfaktor. Wie bei loeseMaximalenKaufpreis() (aiTools.js) und
// szenario() (investmentScore.js) gilt: kein neues Rechenmodell, sondern
// derselbe kopiere-d-aendere-ein-Feld-rechne-neu-Ansatz auf der bestehenden,
// getesteten Rendite-/Kennzahlen-Engine.
import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";

// Rundung auf 1.000 € - fuer eine Preistabelle im Prompt/Zahlenblock reicht
// diese Genauigkeit, mehr waere Scheingenauigkeit (vgl. die 500-€-Rundung bei
// loeseMaximalenKaufpreis()).
function rundeAufTausend(wert) {
  return Math.round(wert / 1000) * 1000;
}

/**
 * @param {object} d - Formular-State (Strings), muss d.kaufpreis > 0 haben
 * @param {object} t - Uebersetzungen, nur durchgereicht an computeRendite
 * @param {object} [optionen]
 * @param {number} [optionen.anzahlPunkte=5] - Anzahl Preispunkte (ungerade
 *   sinnvoll, damit 0 % genau in der Mitte liegt)
 * @param {number} [optionen.schrittProz=0.05] - Schrittweite zwischen zwei
 *   benachbarten Punkten, als Anteil (0.05 = 5 %)
 * @returns {Array<object>} aufsteigend nach Kaufpreis sortierte Punkte, leer
 *   wenn kein plausibler Kaufpreis vorliegt
 */
export function berechneKaufpreisSimulation(d, t, optionen = {}) {
  const { anzahlPunkte = 5, schrittProz = 0.05 } = optionen;
  const kaufpreis = +d?.kaufpreis || 0;
  if (!(kaufpreis > 0) || !(anzahlPunkte > 0)) return [];

  const ek = +d?.eigenkapital || 0;
  const mitte = (anzahlPunkte - 1) / 2;

  const punkte = [];
  for (let i = 0; i < anzahlPunkte; i++) {
    const offsetProz = (i - mitte) * schrittProz;
    const kaufpreisPunkt = Math.max(1000, rundeAufTausend(kaufpreis * (1 + offsetProz)));

    const dPunkt = { ...d, kaufpreis: String(kaufpreisPunkt) };
    const R = computeRendite(dPunkt, t);
    const K = berechneKennzahlen(dPunkt, R);

    // EK-Rendite: kein eigenes Kennzahlen-Modell vorhanden - uebernimmt
    // exakt das Muster aus Detail.jsx (rendEKMit = totalMit/ek*100, wobei
    // totalMit = R.g der Gesamtsaldo inkl. Verkauf am Ende des
    // Betrachtungszeitraums ist). Ohne Eigenkapital ist eine EK-Rendite nicht
    // definiert -> null statt 0, damit "kein Wert" nicht als "0 %" erscheint.
    const ekRendite = ek > 0 ? (R.g / ek) * 100 : null;

    punkte.push({
      kaufpreis: kaufpreisPunkt,
      cashflowMon: R.cf2MitSt,
      nettoRendite: R.nR,
      bruttoRendite: R.bR,
      dscr: K.dscrIst,
      ekRendite,
      kaufpreisfaktor: R.kpF,
    });
  }

  return punkte.sort((a, b) => a.kaufpreis - b.kaufpreis);
}
