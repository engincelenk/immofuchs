import { describe, it, expect } from "vitest";
import { berechneKaufpreisSimulation } from "./kaufpreisSimulation.js";
import { computeRendite } from "./rendite.js";

// Dieselbe Basis wie aiTools.test.js/preisSchaetzung.test.js, damit
// Abweichungen zwischen den Dateien sofort auffallen.
const baseD = {
  kaufpreis: "300000",
  garage: "0",
  flaeche: "60",
  kaltmiete: "900",
  eigenkapital: "60000",
  zinssatz: "4",
  tilgung: "2",
  notar: "2.0",
  makler: "3.57",
  bundesland: "BW",
  nichtUml: "100",
  leerstand: "0",
  steuersatz: "30",
  afaSatz: "2",
  gebAnteil: "80",
  grundAnteil: "20",
  wertP: "2",
  jahre: "10",
  sonder: "0",
  renovierung: "0",
  vergleichsmiete: "0",
  letzteErhDatum: "2099-01-01",
  letzteErhMiete: "0",
  ort: "Musterdorf",
  immLeer: "nein",
  zinsbindung: "10",
};

describe("berechneKaufpreisSimulation", () => {
  it("liefert die angeforderte Anzahl Punkte", () => {
    expect(berechneKaufpreisSimulation(baseD, {}).length).toBe(5);
    expect(berechneKaufpreisSimulation(baseD, {}, { anzahlPunkte: 3 }).length).toBe(3);
  });

  it("sortiert die Punkte aufsteigend nach Kaufpreis", () => {
    const punkte = berechneKaufpreisSimulation(baseD, {});
    for (let i = 1; i < punkte.length; i++) {
      expect(punkte[i].kaufpreis).toBeGreaterThan(punkte[i - 1].kaufpreis);
    }
  });

  it("ein hoeherer Kaufpreis fuehrt zu einem niedrigeren monatlichen Cashflow", () => {
    const punkte = berechneKaufpreisSimulation(baseD, {});
    for (let i = 1; i < punkte.length; i++) {
      expect(punkte[i].cashflowMon).toBeLessThan(punkte[i - 1].cashflowMon);
    }
  });

  it("der 0%-Punkt entspricht ungefaehr dem Originalergebnis", () => {
    const punkte = berechneKaufpreisSimulation(baseD, {});
    const mitte = punkte[Math.floor(punkte.length / 2)];
    const R = computeRendite(baseD, {});
    // Der Kaufpreis wird auf 1.000 € gerundet - bei 300.000 € trifft das
    // exakt, deshalb duerfen die Abweichungen minimal sein.
    expect(mitte.kaufpreis).toBe(300000);
    expect(mitte.cashflowMon).toBeCloseTo(R.cf2MitSt, 6);
    expect(mitte.nettoRendite).toBeCloseTo(R.nR, 6);
    expect(mitte.kaufpreisfaktor).toBeCloseTo(R.kpF, 6);
  });

  it("liefert eine leere Liste ohne plausiblen Kaufpreis", () => {
    expect(berechneKaufpreisSimulation({ ...baseD, kaufpreis: "0" }, {})).toEqual([]);
    expect(berechneKaufpreisSimulation({}, {})).toEqual([]);
  });

  it("laesst sich verlustfrei durch JSON schicken (geht so ins Netz)", () => {
    const punkte = berechneKaufpreisSimulation(baseD, {});
    expect(JSON.parse(JSON.stringify(punkte))).toEqual(punkte);
  });
});
