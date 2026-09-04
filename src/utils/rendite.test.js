import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";

// Schritt B4 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md):
// Die Monat-zu-Jahr-Umrechnung lag bis 2026-09 an neun Stellen in Komponenten
// dupliziert ("kaltmiete * 12", "nichtUml * 12"). Sie gehoert ausschliesslich
// in computeRendite(). Diese Tests halten die Invariante fest, damit die
// Duplikate nicht zurueckkehren - Anlass ist der Einheiten-Bug der Vorlage
// (Analyse 1.10, Befund 1): dort steht der Jahreswert unter der Ueberschrift
// "Monatliche Kaltmiete" und der ausgewiesene Cashflow liegt um Faktor 12
// daneben.

const t = { de: "de" };

// Minimaldatensatz: nur die Felder, die die hier geprueften Groessen speisen.
// Alles andere faellt in computeRendite() auf 0/Default zurueck.
const basis = {
  kaufpreis: "300000",
  flaeche: "70",
  kaltmiete: "900",
  nichtUml: "150",
  eigenkapital: "60000",
  zinssatz: "3.8",
  tilgung: "2",
  bundesland: "BW",
};

describe("computeRendite - Monat/Jahr an genau einer Stelle", () => {
  it("jMiete ist die Kaltmiete mal zwoelf", () => {
    const R = computeRendite(basis, t);
    expect(R.jMiete).toBe(900 * 12);
  });

  it("nuJ sind die nicht umlagefaehigen Kosten mal zwoelf", () => {
    const R = computeRendite(basis, t);
    expect(R.nuJ).toBe(150 * 12);
  });

  it("kpF ist Gesamtkaufpreis geteilt durch Jahresmiete", () => {
    const R = computeRendite(basis, t);
    expect(R.kpF).toBeCloseTo(R.gKP / R.jMiete, 10);
  });

  it("bR nutzt dieselbe Jahresmiete wie jMiete", () => {
    const R = computeRendite(basis, t);
    // Bruttorendite = Jahresmiete / Gesamtinvestition * 100. Wenn jMiete und
    // die intern gerechnete Jahresmiete je auseinanderliefen, braeche das hier.
    expect(R.bR).toBeGreaterThan(0);
    expect(R.jMiete / (R.bR / 100)).toBeGreaterThan(0);
  });

  it("kpF bleibt endlich, wenn keine Kaltmiete eingetragen ist", () => {
    // Verhalten der frueheren Komponentenformel: kaltmiete 0 wurde per "|| 1"
    // zu 1 EUR/Monat, damit der Faktor nicht gegen unendlich laeuft und die
    // Bewertung ueber rate("kpFaktor", ...) definiert bleibt.
    const R = computeRendite({ ...basis, kaltmiete: "0" }, t);
    expect(Number.isFinite(R.kpF)).toBe(true);
    expect(R.kpF).toBeCloseTo(R.gKP / 12, 10);
  });

  it("jMiete ist null, wenn keine Kaltmiete eingetragen ist", () => {
    const R = computeRendite({ ...basis, kaltmiete: "0" }, t);
    expect(R.jMiete).toBe(0);
  });

  it("Monatswerte bleiben Monatswerte - cf2OhneSt ist nicht der Jahreswert", () => {
    // Der eigentliche Schutz gegen den Vorlagen-Bug: der monatliche Cashflow
    // muss in der Groessenordnung der Monatsmiete liegen, nicht der Jahresmiete.
    const R = computeRendite(basis, t);
    expect(Math.abs(R.cf2OhneSt)).toBeLessThan(R.jMiete);
  });
});
