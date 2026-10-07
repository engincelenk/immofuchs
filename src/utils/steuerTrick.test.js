import { describe, it, expect } from "vitest";
import { berechneSteuerTrick, GRENZE_QUOTE } from "./steuerTrick.js";

describe("berechneSteuerTrick (Befund H3)", () => {
  const e = berechneSteuerTrick({ lohnsteuer: 50000, grenzSatzProz: 42, grundstueck: 100000 });

  it("Rueckwaertsrechnung: Steuer / Grenzsatz, / 15 %, plus Grundstueck", () => {
    expect(e.sanK).toBeCloseTo(119047.62, 2);
    expect(e.gebW).toBeCloseTo(793650.79, 2);
    expect(e.gesKP).toBeCloseTo(893650.79, 2);
    expect(e.grenze15).toBeCloseTo(e.sanK, 6);
  });

  it("Sicherheitspuffer: Sanierung liegt wirklich bei 97 % des Limits, nicht wieder bei 15,00 %", () => {
    const quote = e.sanKS / e.gebWS;
    expect(quote).toBeCloseTo(GRENZE_QUOTE * 0.97, 8); // 14,55 %
    expect(quote).toBeLessThan(GRENZE_QUOTE);
    expect(e.sanKS / e.grenze15S).toBeCloseTo(0.97, 8);
  });

  it("Puffer gleicht weiterhin die volle Steuer aus (Sanierung wird nicht gekuerzt)", () => {
    expect(e.sanKS).toBeCloseTo(e.sanK, 6);
    expect(e.gebWS).toBeGreaterThan(e.gebW);
    expect(e.gesKPS).toBeCloseTo(e.gebWS + 100000, 6);
  });

  it("ungueltige Eingaben liefern Nullen", () => {
    expect(berechneSteuerTrick({ lohnsteuer: 0, grenzSatzProz: 42, grundstueck: 0 }).valid).toBe(false);
    expect(berechneSteuerTrick({ lohnsteuer: 50000, grenzSatzProz: 100, grundstueck: 0 }).sanK).toBe(0);
  });
});
