import { describe, it, expect } from "vitest";
import {
  staffelGrenze,
  absenkSchritte,
  klimabonusAktuell,
  huelleFoerderung,
  heizungFoerderung,
} from "./begFoerderung.js";

const OKT26 = new Date(2026, 9, 1);

describe("BEG-Foerderung", () => {
  it("staffelt Hoechstgrenzen nach Wohneinheiten", () => {
    const g = { erste: 30000, zweiBisSechs: 15000, abSieben: 8000 };
    expect(staffelGrenze(g, 1)).toBe(30000);
    expect(staffelGrenze(g, 3)).toBe(60000);
    expect(staffelGrenze(g, 8)).toBe(30000 + 5 * 15000 + 2 * 8000);
  });

  it("senkt Klimabonus halbjaehrlich ab 01.02.2027", () => {
    expect(absenkSchritte(OKT26)).toBe(0);
    expect(klimabonusAktuell(OKT26)).toBe(16);
    expect(klimabonusAktuell(new Date(2027, 1, 1))).toBe(12);
    expect(klimabonusAktuell(new Date(2028, 7, 1))).toBe(0);
  });

  it("Huelle: gemeinsame Grenze, iSFP nur ueber Mindestinvestition", () => {
    expect(huelleFoerderung(50000).betrag).toBe(4500); // 15 % von 30.000
    expect(huelleFoerderung(50000, { isfp: true }).betrag).toBe(7500 + 1000);
    expect(huelleFoerderung(20000, { isfp: true }).betrag).toBe(3000);
  });

  it("Heizung: Vermieter nur 30 % auf 28.000", () => {
    expect(heizungFoerderung(40000, { klima: true, datum: OKT26 }).betrag).toBe(8400);
  });

  it("Heizung: Selbstnutzer EFH, Deckel 80 %", () => {
    const r = heizungFoerderung(40000, {
      selbst: true,
      klima: true,
      einkommensStufe: 3,
      datum: OKT26,
    });
    expect(r.betrag).toBe(Math.round(28000 * 0.8));
  });

  it("Heizung: Bonus im MFH nur auf Anteil der selbstgenutzten Einheit", () => {
    const r = heizungFoerderung(100000, { we: 3, selbst: true, klima: true, datum: OKT26 });
    // Grenze 28.000 + 2 * 15.000 = 58.000; Bonus 16 % auf 58.000 / 3
    expect(r.betrag).toBe(Math.round(58000 * 0.3 + (58000 / 3) * 0.16));
  });
});
