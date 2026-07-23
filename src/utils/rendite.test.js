import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";

// Charakterisierungs-Tests: frieren die aktuellen Ergebnisse des Rechenkerns ein
// (Clean-Code-Review 2026-07-23). Sie sichern die datums-unabhaengigen Kern-
// kennzahlen ab — Rendite, Finanzierung, Risiko-Score. Die jahresweise Cashflow-/
// Steuer-Summierung haengt an `new Date()` (Mietprognose) und wird hier bewusst
// nur strukturell geprueft, nicht auf exakte Betraege.

// Ort bewusst nicht in der Kappungsgrenzen-15-Liste, damit k15=false deterministisch ist.
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
};

describe("computeRendite — Kernkennzahlen (Standardfall)", () => {
  const R = computeRendite(baseD, {});

  it("Preis/m² und Gesamtkaufpreis", () => {
    expect(R.pQm).toBe(5000);
    expect(R.gKP).toBe(300000);
  });

  it("Brutto- und Nettorendite", () => {
    expect(R.bR).toBeCloseTo(3.6, 5);
    expect(R.nR).toBeCloseTo(2.8941, 3);
  });

  it("Darlehen, Beleihung, EK-Quote", () => {
    expect(R.da).toBe(240000);
    expect(R.bel).toBe(80);
    expect(R.ekQ).toBe(20);
  });

  it("Annuitaet: Zins-/Tilgungsanteil und Nebenkosten", () => {
    expect(R.ann).toBeCloseTo(1200, 5);
    expect(R.z1).toBeCloseTo(800, 5);
    expect(R.t1).toBeCloseTo(400, 5);
    expect(R.nbk).toBeCloseTo(31710, 5);
  });

  it("Laufzeit bei 2% Tilgung", () => {
    expect(R.lz).toBeCloseTo(27.51, 1);
  });

  it("Monats-Cashflow ohne Steuer", () => {
    expect(R.cf2OhneSt).toBeCloseTo(-400, 5);
    expect(R.cf2).toBeCloseTo(-400, 5);
  });

  it("Kappungsgrenze / Milieuschutz-Flag", () => {
    expect(R.k15).toBe(false);
    expect(R.kP).toBe(20);
  });

  it("Risiko-Score und ausloesende Faktoren", () => {
    expect(R.rk).toBe(19);
    expect(R.rF).toEqual(["nR<3", "cf<0", "z≥4"]);
  });

  it("Jahrestabelle hat eine Zeile pro Jahr", () => {
    expect(R.yearRows).toHaveLength(10);
    expect(R.yearRows[0].j).toBe(1);
  });
});

describe("computeRendite — Vollfinanzierung (Risiko-Rotbereich)", () => {
  const R = computeRendite({ ...baseD, kaufpreis: "500000", eigenkapital: "0", tilgung: "1" }, {});

  it("Beleihung 100% und EK-Quote 0", () => {
    expect(R.bel).toBe(100);
    expect(R.ekQ).toBe(0);
  });

  it("Risiko-Score deckt viele Rotbereich-Faktoren ab", () => {
    // Deckt bel>95, nR<2, cf<-500, z≥4, t<2, lz>35, p>6k, ek<10 in exakter Reihenfolge ab.
    expect(R.rF).toEqual(["bel>95", "nR<2", "cf<-500", "z≥4", "t<2", "lz>35", "p>6k", "ek<10"]);
    expect(R.rk).toBe(100);
  });
});

describe("computeRendite — Randfall Kaufpreis 0", () => {
  it("liefert Nullwerte statt NaN/Absturz", () => {
    const R = computeRendite({ ...baseD, kaufpreis: "0", garage: "0", eigenkapital: "0" }, {});
    expect(Number.isNaN(R.bR)).toBe(false);
    expect(R.pQm).toBe(0);
    expect(R.bel).toBe(0);
  });
});
