import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";
import { immobilienEinsatz } from "./ekRendite.js";
import { ekRenditePa } from "./briefing.js";
import { berechneAlternativVergleich } from "./alternativInvestment.js";

// Befund H2 (docs/test-exposes/KONSISTENZPRUEFUNG_2026-10-03.md): Renditerechner,
// Briefing und Alternativ-Karte nannten drei verschiedene EK-Renditen.

const t = {};
const d = {
  kaufpreis: "450000",
  flaeche: "65",
  bundesland: "BY",
  kaltmiete: "1400",
  nichtUml: "114",
  leerstand: "0",
  eigenkapital: "90000",
  zinssatz: "3.7",
  tilgung: "2",
  zinsbindung: "15",
  gebAnteil: "80",
  afaSatz: "2",
  notar: "2",
  makler: "3.57",
  steuersatz: "42",
  jahre: "20",
  wertP: "0.6",
  sonder: "3000",
  renovierung: "15000",
  vergleichsmiete: "14",
};

describe("immobilienEinsatz / ekRenditePa", () => {
  it("Einsatz = EK + bar gezahlte Nebenkosten + Sonderumlage + Renovierung + Nachschuesse", () => {
    const R = computeRendite(d, t);
    const e = immobilienEinsatz(d, R);
    expect(e.start).toBeCloseTo(90000 + R.nbk + 3000 + 15000, 6);
    const nachschuss = R.yearRows.reduce((a, y) => a + (y.cf < 0 ? -y.cf : 0), 0);
    expect(e.nachschuss).toBeCloseTo(nachschuss, 6);
    expect(e.eingezahlt).toBeCloseTo(e.start + nachschuss, 6);
    expect(e.endvermoegen).toBeCloseTo(e.eingezahlt + R.g, 6);
  });

  it("Renditerechner/Briefing und Alternativ-Karte zeigen dieselbe EK-Rendite", () => {
    const R = computeRendite(d, t);
    const karte = berechneAlternativVergleich(d, t, 20);
    expect(ekRenditePa(R, d)).toBeCloseTo(karte.immobilie.rendite, 10);
  });

  it("ist deutlich vorsichtiger als der alte einfache Durchschnitt Gesamtsaldo / EK / Jahre", () => {
    const R = computeRendite(d, t);
    const alt = (R.g / 90000 / R.j) * 100;
    expect(ekRenditePa(R, d)).toBeLessThan(alt / 2);
  });

  it("ohne Steuer rechnet mit Cashflow und Gesamtsaldo ohne Steuerwirkung", () => {
    const R = computeRendite(d, t);
    const e = immobilienEinsatz(d, R, { ohneSteuer: true });
    expect(e.gewinn).toBeCloseTo(R.gOhne, 6);
    const nachschuss = R.yearRows.reduce((a, y) => a + (y.cfOhneSt < 0 ? -y.cfOhneSt : 0), 0);
    expect(e.nachschuss).toBeCloseTo(nachschuss, 6);
  });

  it("null ohne Startbetrag aus eigener Tasche", () => {
    const voll = { ...d, eigenkapital: "0", nkFinanzieren: true, sonder: "0", renovierung: "0" };
    const R = computeRendite(voll, t);
    expect(ekRenditePa(R, voll)).toBeNull();
  });
});
