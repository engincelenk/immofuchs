import { describe, it, expect } from "vitest";
import {
  endwertAnlage,
  berechneAlternativVergleich,
  alternativZahlenFuerKi,
} from "./alternativInvestment.js";
import { computeRendite } from "./rendite.js";
import { ABGELTUNGSTEUER, TEILFREISTELLUNG_AKTIENFONDS } from "../data/alternativAnlagen.js";

const OBJEKT = {
  kaufpreis: "250000",
  flaeche: "70",
  kaltmiete: "900",
  eigenkapital: "50000",
  zinssatz: "3.5",
  tilgung: "2",
  notar: "2",
  makler: "3.57",
  bundesland: "BW",
  steuersatz: "30",
  afaSatz: "2",
  gebAnteil: "80",
  wertP: "2",
  jahre: "10",
  nichtUml: "40",
  leerstand: "0",
  sonder: "0",
  renovierung: "0",
};

describe("endwertAnlage", () => {
  it("verzinst einen Startbetrag ohne Steuer bei steuerfrei", () => {
    const e = endwertAnlage([1000, 0, 0], 10, "frei");
    expect(e.endwert).toBeCloseTo(1210, 6);
    expect(e.steuer).toBe(0);
  });
  it("besteuert ETF-Gewinn mit Teilfreistellung", () => {
    const e = endwertAnlage([1000, 0], 10, "etf");
    expect(e.steuer).toBeCloseTo(100 * ABGELTUNGSTEUER * (1 - TEILFREISTELLUNG_AKTIENFONDS), 6);
  });
  it("besteuert Gold-ETC-Gewinn ohne Teilfreistellung", () => {
    expect(endwertAnlage([1000, 0], 10, "ende").steuer).toBeCloseTo(100 * ABGELTUNGSTEUER, 6);
  });
  it("besteuert Zinsen laufend (kleinerer Zinseszins)", () => {
    const e = endwertAnlage([1000, 0, 0], 4, "laufend");
    expect(e.endwert).toBeCloseTo(1000 * Math.pow(1 + 0.04 * (1 - ABGELTUNGSTEUER), 2), 6);
  });
  it("zahlt keine Steuer bei Verlust", () => {
    const e = endwertAnlage([1000, 0], -10, "etf");
    expect(e.steuer).toBe(0);
    expect(e.endwert).toBeCloseTo(900, 6);
  });
  it("nimmt Nachschuesse zum Jahresende auf", () => {
    expect(endwertAnlage([0, 100, 100], 0, "frei").endwert).toBe(200);
  });
});

describe("berechneAlternativVergleich", () => {
  it("liefert null ohne Kaufpreis oder ohne Einsatz", () => {
    expect(berechneAlternativVergleich({}, {}, 10)).toBeNull();
    expect(
      berechneAlternativVergleich({ ...OBJEKT, eigenkapital: "0", nkFinanzieren: true }, {}, 10),
    ).toBeNull();
  });
  it("Immobilien-Gewinn entspricht dem Gesamtsaldo des Renditerechners", () => {
    const v = berechneAlternativVergleich(OBJEKT, {}, 10);
    expect(v.immobilie.gewinn).toBeCloseTo(computeRendite(OBJEKT, {}).g, 6);
  });
  it("Einsatz = Eigenkapital + bar gezahlte Nebenkosten", () => {
    const v = berechneAlternativVergleich(OBJEKT, {}, 10);
    expect(v.start).toBeCloseTo(50000 + computeRendite(OBJEKT, {}).nbk, 6);
  });
  it("finanzierte Nebenkosten zaehlen nicht zum Einsatz", () => {
    const v = berechneAlternativVergleich({ ...OBJEKT, nkFinanzieren: true }, {}, 10);
    expect(v.start).toBe(50000);
  });
  it("rechnet 3 Szenarien je Anlage, aufsteigend mit der Annahme", () => {
    const v = berechneAlternativVergleich(OBJEKT, {}, 15);
    for (const a of v.anlagen) {
      expect(a.szenarien.pess.endvermoegen).toBeLessThan(a.szenarien.basis.endvermoegen);
      expect(a.szenarien.basis.endvermoegen).toBeLessThan(a.szenarien.opt.endvermoegen);
    }
  });
  it("Zahlen fuer die KI sind gerundet und vollstaendig", () => {
    const z = alternativZahlenFuerKi(berechneAlternativVergleich(OBJEKT, {}, 10));
    expect(z.horizontJahre).toBe(10);
    expect(Number.isInteger(z.einsatzStart)).toBe(true);
    expect(z.anlagen.length).toBe(7);
    expect(alternativZahlenFuerKi(null)).toBeNull();
  });
});
