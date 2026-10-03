// Vergleichsanlagen fuer die Karte "Alternativ-Investment" (Objektseite).
//
// Was hier steht und was NICHT: Die Szenarien sind ANNAHMEN fuer einen
// Rechenvergleich, keine Prognose. Sie liegen bewusst deutlich unter den
// juengsten Renditen (5 Jahre Aktienrally, Gold seit 2021 fast verdoppelt) -
// wer diese Spitzenwerte fortschriebe, wuerde die Alternative schoener
// rechnen, als sie ehrlich zu begruenden ist. `historie` zeigt die
// tatsaechlichen Werte mit Quelle und Stand, damit der Nutzer den Abstand
// zwischen Rueckblick und Annahme sieht.
//
// Pflege: gehoert zur monatlichen Datenpflege (scripts/datenpflege_erinnerung.py,
// Thema "Alternativ-Investment"). ALTERNATIV_STAND mitfuehren.
//
// Recherche 2026-10-03: justETF-Profile (Stand 31.08.2026, Wertentwicklung in
// EUR), MSCI (Index-Factsheet, USD), goldavenue.com / gold.de (Gold in EUR),
// onvista (Tagesgeld, Festgeld), Bundesbank (Bundesanleihe, automatisch), Fidelity Digital
// Assets / bestbrokers (Bitcoin, USD). Die Werte stammen aus Zusammenfassungen
// der Quellseiten und sind vor einer Aenderung der Szenarien gegenzupruefen.

import { BUNDESANLEIHE_10J } from "../data.js";

export const ALTERNATIV_STAND = "03.10.2026";

// Bundesanleihe: die Szenarien haengen am monatlich automatisch gepflegten
// Wert (BUNDESANLEIHE_10J in src/data.js). Mitte = aktuelle Rendite, vorsichtig
// 1 Punkt darunter (Wiederanlage bei sinkenden Zinsen), guenstig 0,4 Punkte
// darueber - dieselben Abstaende wie bei der Einfuehrung am 2026-10-03.
const rund1 = (x) => Math.round(x * 10) / 10;
const BUND = BUNDESANLEIHE_10J.rendite;
const BUND_TEXT = String(BUND).replace(".", ",");

// Steuerlogik je Anlage (siehe alternativInvestment.js):
//   "etf"     Abgeltungsteuer 26,375 % auf den Gewinn bei Verkauf, davon 30 %
//             Teilfreistellung (Aktienfonds). Vorabpauschale vereinfachend
//             ausgeklammert.
//   "ende"    26,375 % auf den Gewinn bei Verkauf, ohne Teilfreistellung
//             (physisch besicherter Gold-ETC, laut justETF keine Freistellung).
//   "frei"    steuerfrei - Bitcoin nach mehr als einem Jahr Haltedauer
//             (privates Veraeusserungsgeschaeft, § 23 EStG). Beitraege der
//             letzten 12 Monate waeren noch steuerpflichtig, vereinfachend
//             ignoriert.
//   "laufend" Zinsen werden jaehrlich mit 26,375 % besteuert und mindern so
//             den Zinseszins.
export const ABGELTUNGSTEUER = 0.26375;
export const TEILFREISTELLUNG_AKTIENFONDS = 0.3;

export const ALTERNATIV_ANLAGEN_DATEN = [
  {
    key: "msciWorld",
    name: "MSCI World ETF",
    beispiel: "z. B. iShares Core MSCI World (IE00B4L5Y983), Kosten 0,20 % p. a.",
    steuer: "etf",
    szenarien: { pess: 3, basis: 6, opt: 8 },
    historie:
      "Letzte 5 Jahre ca. 12,3 % p. a. in EUR (justETF, 31.08.2026); seit 2000 ca. 7,5 % p. a. in USD (MSCI-Index, 31.08.2026).",
    risiko: "Schwankung ca. 11 % p. a.; größter Rückgang seit Auflage ca. −34 %.",
  },
  {
    key: "ftseAllWorld",
    name: "FTSE All-World ETF",
    beispiel: "z. B. Vanguard FTSE All-World (IE00B3RBWM25), Kosten 0,14 % p. a.",
    steuer: "etf",
    szenarien: { pess: 3, basis: 6, opt: 8 },
    historie: "Letzte 5 Jahre ca. 12,0 % p. a. in EUR (justETF, 31.08.2026).",
    risiko: "Schwankung ca. 10–14 % p. a.; größter Rückgang seit Auflage ca. −33 %.",
  },
  {
    key: "sp500",
    name: "S&P 500 ETF",
    beispiel: "z. B. iShares Core S&P 500 (IE00B5BMR087), Kosten 0,07 % p. a.",
    steuer: "etf",
    szenarien: { pess: 2.5, basis: 6.5, opt: 8.5 },
    historie: "Letzte 5 Jahre ca. 13,9 % p. a. in EUR (justETF, 31.08.2026).",
    risiko:
      "Nur US-Großunternehmen, hohe Konzentration auf wenige Titel; größter Rückgang seit Auflage ca. −34 %.",
  },
  {
    key: "gold",
    name: "Gold",
    beispiel: "z. B. iShares Physical Gold ETC (IE00B4ND3602), Kosten 0,12 % p. a.",
    steuer: "ende",
    szenarien: { pess: 0, basis: 3.5, opt: 6 },
    historie:
      "In EUR ca. 12,3 % p. a. über 10 Jahre und ca. 10,9 % p. a. über 20 Jahre (Gesamtanstieg +218 % bzw. +685 %, goldavenue.com, 10/2026); letzte 5 Jahre ca. 18,9 % p. a. (justETF).",
    risiko:
      "Schwankung ca. 25 % p. a.; keine laufenden Erträge. Physisches Gold (Barren/Münzen) ist nach einem Jahr steuerfrei, kostet aber Aufschlag und Lagerung.",
  },
  {
    key: "bitcoin",
    name: "Bitcoin",
    beispiel: "Kryptowährung, z. B. über eine regulierte Börse",
    steuer: "frei",
    szenarien: { pess: -10, basis: 5, opt: 20 },
    historie:
      "In USD ca. 70 % p. a. über 10 Jahre (2016–2026) und ca. 25 % p. a. über 5 Jahre (Fidelity Digital Assets, bestbrokers.com); 2026 bisher ca. −3,6 % (Stand 27.09.2026).",
    risiko:
      "Schwankung ca. 54 % p. a.; Rückgänge von über 70 % kamen mehrfach vor (2011: −94 %, 2016–2026: −78 %). Totalverlust ist möglich.",
  },
  {
    key: "bundesanleihe",
    name: "Bundesanleihe (10 Jahre)",
    beispiel: `Staatsanleihe Deutschland, Rendite aktuell ca. ${BUND_TEXT} % (${BUNDESANLEIHE_10J.stand})`,
    steuer: "laufend",
    szenarien: { pess: rund1(BUND - 1), basis: rund1(BUND), opt: rund1(BUND + 0.4) },
    historie: `Umlaufrendite zehnjähriger Bundeswertpapiere laut Bundesbank: ${BUND_TEXT} % (Stand ${BUNDESANLEIHE_10J.stand}, monatlich automatisch aktualisiert).`,
    risiko:
      "Kursverluste bei steigenden Zinsen, wenn vor Laufzeitende verkauft wird; bei Halten bis Ende der Laufzeit planbar.",
  },
  {
    key: "tagesgeld",
    name: "Tages-/Festgeld",
    beispiel: "Einlagensicherung bis 100.000 € je Bank und Kunde",
    steuer: "laufend",
    szenarien: { pess: 1.5, basis: 2.5, opt: 3.5 },
    historie:
      "Bestes unbefristetes Tagesgeld ca. 2,5 %, Festgeld 1 Jahr bis ca. 3,4 % (onvista, 02.10.2026). Hohe Aktionszinsen gelten meist nur für wenige Monate.",
    risiko: "Kaum Schwankung, aber Zinsen können sinken und liegen oft nahe an der Inflation.",
  },
];

export const SZENARIO_LABEL = { pess: "Vorsichtig", basis: "Mittel", opt: "Günstig" };
