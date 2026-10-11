import { describe, expect, it } from "vitest";
import { begrenzeTokens, bewerteKiBudget, KI_DEFAULTS, monatsBeginn, schaetzeKostenMikro, type KiLimits } from "./kiBudget";

const limits = (enforce: boolean): KiLimits => ({
  enforce,
  budgetTagMikro: KI_DEFAULTS.budgetTagMikro,
  budgetMonatMikro: KI_DEFAULTS.budgetMonatMikro,
  notbremseTagMikro: KI_DEFAULTS.notbremseTagMikro,
});

describe("schaetzeKostenMikro", () => {
  it("liegt fuer einen Finn-Aufruf im erwarteten Bereich (ca. 0,003-0,005 EUR)", () => {
    // ca. 19.000 Zeichen Eingabe (Prompt + Kontext), 1.700 Zeichen Antwort
    const k = schaetzeKostenMikro(19_000, 1_700);
    expect(k).toBeGreaterThan(2_000);
    expect(k).toBeLessThan(8_000);
  });
  it("wird mit mehr Ausgabe teurer und ist nie negativ", () => {
    expect(schaetzeKostenMikro(1000, 5000)).toBeGreaterThan(schaetzeKostenMikro(1000, 100));
    expect(schaetzeKostenMikro(-5, -5)).toBe(0);
  });
  it("rechnet Bild-Token mit ein", () => {
    expect(schaetzeKostenMikro(1000, 1000, 4000)).toBeGreaterThan(schaetzeKostenMikro(1000, 1000));
  });
});

describe("bewerteKiBudget", () => {
  it("laesst normale Nutzung durch (ENFORCE aus und an)", () => {
    expect(bewerteKiBudget(5_000, 100_000, limits(false)).stufe).toBe("ok");
    expect(bewerteKiBudget(5_000, 100_000, limits(true)).stufe).toBe("ok");
  });
  it("Vielnutzer (0,95 EUR/Monat) bleibt unbehelligt", () => {
    expect(bewerteKiBudget(60_000, 950_000, limits(true)).stufe).toBe("ok");
  });
  it("ohne ENFORCE greift nur die Notbremse", () => {
    expect(bewerteKiBudget(300_000, 2_000_000, limits(false)).stufe).toBe("ok");
    expect(bewerteKiBudget(1_000_000, 0, limits(false)).stufe).toBe("erschoepft");
  });
  it("drosselt bei 80 % und stoppt bei 100 % (Tag und Monat)", () => {
    expect(bewerteKiBudget(120_000, 0, limits(true))).toEqual({ stufe: "gedrosselt", tokenFaktor: 0.6 });
    expect(bewerteKiBudget(0, 1_200_000, limits(true)).stufe).toBe("gedrosselt");
    expect(bewerteKiBudget(150_000, 0, limits(true)).stufe).toBe("erschoepft");
    expect(bewerteKiBudget(0, 1_500_000, limits(true)).stufe).toBe("erschoepft");
  });
});

describe("Hilfsfunktionen", () => {
  it("begrenzeTokens", () => {
    expect(begrenzeTokens(700, { stufe: "ok", tokenFaktor: 1 })).toBe(700);
    expect(begrenzeTokens(700, { stufe: "gedrosselt", tokenFaktor: 0.6 })).toBe(420);
    expect(begrenzeTokens(50, { stufe: "gedrosselt", tokenFaktor: 0.6 })).toBe(64);
  });
  it("monatsBeginn", () => {
    expect(monatsBeginn("2026-10-11")).toBe("2026-10-01");
  });
});
