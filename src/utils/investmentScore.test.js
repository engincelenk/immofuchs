import { describe, it, expect } from "vitest";
import { berechneScore, berechneSzenarien } from "./investmentScore.js";

// Dieselbe Basis wie rendite.test.js/kennzahlen.test.js, damit Abweichungen
// zwischen den drei Dateien sofort auffallen.
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

describe("berechneScore — Standardfall", () => {
  const S = berechneScore(baseD, {});

  it("liefert einen verfuegbaren Score zwischen 0 und 100", () => {
    expect(S.verfuegbar).toBe(true);
    expect(S.score).toBeGreaterThanOrEqual(0);
    expect(S.score).toBeLessThanOrEqual(100);
  });

  it("hat alle vier Stufe-2-Dimensionen mit auf 100 renormiertem Gewicht", () => {
    expect(S.dimensionen.map((x) => x.key).sort()).toEqual(["d1", "d2", "d3", "d7"]);
    const gewichtSumme = S.dimensionen.reduce((a, x) => a + x.gewichtNormiert, 0);
    expect(gewichtSumme).toBeCloseTo(100, 5);
  });

  it("loest keinen Hard Stop aus (solider Standardfall)", () => {
    expect(S.hardStops).toEqual([]);
  });
});

describe("berechneScore — Hard Stop Tilgungssatz 0", () => {
  it("kappt den Gesamtscore auf hoechstens 35", () => {
    const S = berechneScore({ ...baseD, tilgung: "0" }, {});
    expect(S.hardStops.some((h) => h.key === "hardStopTilgung0")).toBe(true);
    expect(S.score).toBeLessThanOrEqual(35);
  });
});

describe("berechneScore — Hard Stop Beleihung > 100%", () => {
  it("kappt den Gesamtscore auf hoechstens 40", () => {
    // Nebenkosten mitfinanziert treibt die Darlehenssumme ueber den Kaufpreis.
    const S = berechneScore({ ...baseD, eigenkapital: "0", nkFinanzieren: true }, {});
    expect(S.hardStops.some((h) => h.key === "hardStopBel")).toBe(true);
    expect(S.score).toBeLessThanOrEqual(40);
  });
});

describe("berechneScore — Hard Stop starker Zuzahlungsbedarf", () => {
  it("kappt den Gesamtscore auf hoechstens 55, wenn der Cashflow stark negativ ist", () => {
    const S = berechneScore({ ...baseD, kaltmiete: "0" }, {});
    expect(S.hardStops.some((h) => h.key === "hardStopCf")).toBe(true);
    expect(S.score).toBeLessThanOrEqual(55);
  });
});

describe("berechneScore — Vollfinanzierung ueber Eigenkapital (kein Bankdarlehen)", () => {
  it("stuerzt nicht ab, auch wenn DSCR/D2/D7 ohne Kapitaldienst nicht bestimmbar sind", () => {
    const S = berechneScore({ ...baseD, eigenkapital: "331710" }, {});
    expect(S.verfuegbar).toBe(true);
    expect(Number.isFinite(S.score)).toBe(true);
  });
});

describe("berechneScore — Randfall Kaufpreis 0", () => {
  it("stuerzt nicht ab und liefert entweder einen Score oder verfuegbar:false", () => {
    const S = berechneScore({ ...baseD, kaufpreis: "0", garage: "0", eigenkapital: "0" }, {});
    expect(() => S).not.toThrow();
    if (S.verfuegbar) {
      expect(Number.isFinite(S.score)).toBe(true);
    }
  });
});

describe("berechneSzenarien — Stress verschlechtert sich gegenueber Basis", () => {
  it("Stress-Cashflow ist nie besser als Negativ-Cashflow, Negativ nie besser als Basis", () => {
    const { basis, negativ, stress } = berechneSzenarien(baseD, {});
    expect(stress.R.cf2MitSt).toBeLessThanOrEqual(negativ.R.cf2MitSt);
    expect(negativ.R.cf2MitSt).toBeLessThanOrEqual(basis.R.cf2MitSt);
  });

  it("nutzt den Anschlusszins-Aufschlag unabhaengig von einem eigenen d.anschlussZins", () => {
    const { negativ, stress } = berechneSzenarien({ ...baseD, anschlussZins: "9" }, {});
    expect(negativ.d.anschlussZins).toBe("5"); // 4 + 1.0
    expect(stress.d.anschlussZins).toBe("6"); // 4 + 2.0
  });
});

// ── Best-Case (objektseite-neu.md §6.4) ─────────────────────────────────────
describe("berechneSzenarien — Best-Case", () => {
  it("liefert vier Szenarien", () => {
    const s = berechneSzenarien(baseD, {});
    expect(Object.keys(s).sort()).toEqual(["basis", "best", "negativ", "stress"]);
  });

  it("Best ist nie schlechter als Basis", () => {
    const { best, basis } = berechneSzenarien(baseD, {});
    expect(best.R.cf2MitSt).toBeGreaterThanOrEqual(basis.R.cf2MitSt);
    expect(best.R.g).toBeGreaterThanOrEqual(basis.R.g);
  });

  it("senkt den Anschlusszins — das war mit der alten Bedingung (> 0) nicht moeglich", () => {
    // Kernpunkt der Aenderung in szenario(): mit `zinsAufschlag > 0` fiel der
    // negative Aufschlag stillschweigend auf d.anschlussZins zurueck.
    const { best } = berechneSzenarien({ ...baseD, anschlussZins: "9" }, {});
    expect(best.d.anschlussZins).toBe("3.5"); // 4 - 0.5
  });

  it("spiegelt die Negativ-Parameter nach oben", () => {
    const { best } = berechneSzenarien(baseD, {});
    expect(+best.d.kaltmiete).toBeCloseTo(945, 6); // 900 * 1.05
    expect(+best.d.nichtUml).toBeCloseTo(95, 6); // 100 * 0.95
    expect(+best.d.leerstand).toBe(0);
    expect(+best.d.wertP).toBeCloseTo(2.5, 6); // 2 + 0.5
  });
});

// ── Regression zur Best-Case-Ergaenzung (objektseite-neu.md §11) ────────────
// berechneScore() liest aus berechneSzenarien() ausschliesslich negativ und
// stress (Dimension D7). Bleiben deren Eingaben unveraendert, kann der neue
// vierte Zweig den Score nicht bewegen. Genau das nagelt dieser Test fest —
// er schlaegt an, sobald jemand szenario() erneut anfasst.
describe("berechneScore — unveraendert durch den Best-Case", () => {
  it("die Szenario-Eingaben von negativ und stress sind exakt die alten", () => {
    const { negativ, stress } = berechneSzenarien(baseD, {});

    expect(+negativ.d.kaltmiete).toBeCloseTo(855, 6); // 900 * 0.95
    expect(+negativ.d.nichtUml).toBeCloseTo(110, 6); // 100 * 1.1
    expect(+negativ.d.leerstand).toBe(4); // round(120 * 0.03)
    expect(+negativ.d.wertP).toBeCloseTo(1.5, 6); // 2 - 0.5
    expect(negativ.d.anschlussZins).toBe("5");

    expect(+stress.d.kaltmiete).toBeCloseTo(810, 6); // 900 * 0.9
    expect(+stress.d.nichtUml).toBeCloseTo(120, 6); // 100 * 1.2
    expect(+stress.d.leerstand).toBe(10); // round(120 * 0.08)
    expect(+stress.d.wertP).toBeCloseTo(1, 6); // 2 - 1.0
    expect(stress.d.anschlussZins).toBe("6");
  });

  it("der Score bleibt verfuegbar und im gueltigen Bereich", () => {
    const S = berechneScore(baseD, {});
    expect(S.verfuegbar).toBe(true);
    expect(S.score).toBeGreaterThanOrEqual(0);
    expect(S.score).toBeLessThanOrEqual(100);
  });
});
