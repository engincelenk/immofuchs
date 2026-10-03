import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";
import { berechneBriefing } from "./briefing.js";
import { berechneAlternativVergleich } from "./alternativInvestment.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import { ekRenditePa } from "./briefing.js";
import { restschuldNachMonaten } from "./vorfaelligkeit.js";

// Querbezuege zwischen den Ausgaben (Konsistenzpruefung 2026-10-03,
// docs/test-exposes/KONSISTENZPRUEFUNG_2026-10-03.md). Die Objekte entsprechen den
// Test-Exposes S1/G1/G3/T1 mit den App-Vorbelegungen fuer alle Felder, die ein Exposé
// nicht nennt (Sonderumlage 3.000, Renovierung 15.000, Vergleichsmiete 14, 20 Jahre).
const t = {};
const vorbelegung = {
  nkFinanzieren: false,
  zinsbindung: "10",
  gebAnteil: "80",
  afaSatz: "2",
  afaModus: "linear",
  notar: "2",
  makler: "3.57",
  wertP: "0.6",
  sonder: "3000",
  renovierung: "15000",
  vergleichsmiete: "14",
  leerstand: "0",
  garage: "0",
  jahre: "20",
  steuersatz: "42",
  plz: "80331",
  wohneinheiten: "1",
};
const objekte = {
  S1: { kaufpreis: "450000", flaeche: "65", bundesland: "BY", kaltmiete: "1400", nichtUml: "114", eigenkapital: "90000", zinssatz: "3.7", tilgung: "2", zinsbindung: "15" },
  G1: { kaufpreis: "750000", flaeche: "70", bundesland: "BY", kaltmiete: "1388", nichtUml: "123", eigenkapital: "75000", zinssatz: "4", tilgung: "2" },
  G3: { kaufpreis: "300000", flaeche: "80", bundesland: "BE", kaltmiete: "900", nichtUml: "140", eigenkapital: "60000", zinssatz: "3.9", tilgung: "0", zinsbindung: "15" },
  T1: { kaufpreis: "480000", flaeche: "90", bundesland: "SN", kaltmiete: "1350", nichtUml: "158", eigenkapital: "96000", zinssatz: "3.7", tilgung: "2", zinsbindung: "15", gebAnteil: "90", afaSatz: "3", sonderAfa: true, qng: true, bauantragAb2023: true, anschaffungMonat: "3", kfwAktiv: true, kfwBetrag: "150000", kfwZins: "2.0", kfwLaufzeit: "25", kfwTilgungsfrei: "2" },
};

describe.each(Object.entries(objekte))("Querbezuege %s", (name, fix) => {
  const d = { ...vorbelegung, ...fix };
  const R = computeRendite(d, t);

  it("Bruttorendite ist der Kehrwert des Kaufpreisfaktors", () => {
    expect(R.bR).toBeCloseTo(100 / R.kpF, 8);
  });

  it("Nettorendite = Score-Kennzahl anfangsrendite (Rechner = Briefing = Objektseite)", () => {
    expect(berechneKennzahlen(d, R).anfangsrendite).toBeCloseTo(R.nR, 8);
  });

  it("Cashflow nach Steuer = Cashflow vor Steuer + LAUFENDE Steuerwirkung (kein Einmaleffekt)", () => {
    expect(R.cf2MitSt).toBeCloseTo(R.cf2OhneSt + R.yearRows[0].steuerLaufend / 12, 8);
    expect(R.yearRows[0].steuer - R.yearRows[0].steuerLaufend).toBeCloseTo(R.steuerEinmalJ1, 8);
  });

  it("Briefing-Zeitraum summiert sich zum Gesamtsaldo", () => {
    const B = berechneBriefing(d, t);
    expect(B.zeitraum.zeilen.reduce((a, z) => a + z.wert, 0)).toBeCloseTo(R.g, 2);
  });

  it("EK-Rendite im Briefing = Rendite der Alternativ-Karte", () => {
    const karte = berechneAlternativVergleich(d, t, 20);
    expect(ekRenditePa(R, d)).toBeCloseTo(karte.immobilie.rendite, 6);
    expect(karte.immobilie.gewinn).toBeCloseTo(R.g, 2);
  });

  it("Restschuld nach Zinsbindung = monatliche Rechnung (Kredit-/Vorfaelligkeitsrechner)", () => {
    if (R.kfwDa > 0) return; // KfW hat eigene Laufzeit, dort nur Bankdarlehen vergleichbar
    const zb = +d.zinsbindung;
    const zeile = R.yearRows[zb - 1];
    const ref = restschuldNachMonaten({ darlehen: R.bankDa, zinsProz: +d.zinssatz, rateMon: R.ann, monate: zb * 12 });
    expect(zeile.restBank - zeile.tilgBank).toBeCloseTo(ref, 2);
  });
});

describe("Renovierung darf die Empfehlung nicht kippen (Befund H1)", () => {
  it("G1 (Score 35, Cashflow vor Steuer rund -1.700 EUR): mit und ohne Renovierung dieselbe Ampel", () => {
    const mit = { ...vorbelegung, ...objekte.G1 };
    const ohne = { ...mit, renovierung: "0" };
    const bMit = berechneBriefing(mit, t);
    const bOhne = berechneBriefing(ohne, t);
    expect(bMit.ampel.stufe).toBe(bOhne.ampel.stufe);
    expect(bMit.ampel.stufe).not.toBe("gruen");
    expect(bMit.empfehlung.wort).toBe(bOhne.empfehlung.wort);
  });

  it("S1: Vorbelegung (Renovierung 15.000) ergibt denselben Monats-Cashflow wie ohne", () => {
    const mit = computeRendite({ ...vorbelegung, ...objekte.S1 }, t);
    const ohne = computeRendite({ ...vorbelegung, ...objekte.S1, renovierung: "0" }, t);
    expect(mit.cf2MitSt).toBeCloseTo(ohne.cf2MitSt, 6);
    expect(mit.cf2MitSt).toBeLessThan(0);
  });
});
