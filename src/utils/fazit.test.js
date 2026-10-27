import { describe, expect, it } from "vitest";
import { fazitZeilen } from "./fazit.js";
import { fazitSaetze, fazitTeile } from "../components/ui/FazitKarte.jsx";
import { T as TRANSLATIONS } from "../i18n/translations.js";

// Beispiel wie in finanzierungsVergleich.test.js: 66 qm, 310.000 Euro, 900 Euro Kaltmiete.
const basis = {
  kaufpreis: "310000",
  garage: "0",
  eigenkapital: "62000",
  bundesland: "Bayern",
  notar: "1.5",
  makler: "3.57",
  flaeche: "66",
  kaltmiete: "900",
  nkFinanzieren: false,
  tilgung: "2",
  zinssatz: "4.32",
};

describe("fazitZeilen", () => {
  it("traegt sich nicht: negativer Cashflow, Eigenkapital der tragenden Stufe, Verhandlungsziel unter dem Angebot", () => {
    const f = fazitZeilen(basis);
    expect(f.traegt).toBe(false);
    expect(f.cashflow).toBeLessThan(0);
    expect(f.anteil).toBeCloseTo(80, 0);
    expect(f.ek ?? 0).toBeGreaterThanOrEqual(0);
    expect(f.kaufpreis).toBeLessThan(310000);
    expect(f.abschlagProz).toBeLessThan(0);
  });
  it("der Zielpreis der Objektseite hat Vorrang", () => {
    expect(fazitZeilen(basis, { zielKaufpreis: 250000 }).kaufpreis).toBe(250000);
  });
  it("traegt sich: nur der Cashflow, keine weiteren Zeilen", () => {
    const f = fazitZeilen({ ...basis, kaltmiete: "2500" });
    expect(f.traegt).toBe(true);
    expect(f.ek).toBeNull();
    expect(f.kaufpreis).toBeNull();
  });
  it("ohne Kaufpreis oder Miete nichts", () => {
    expect(fazitZeilen({ ...basis, kaufpreis: "" })).toBeNull();
    expect(fazitZeilen({ ...basis, kaltmiete: "" })).toBeNull();
  });
});

describe("fazitSaetze / fazitTeile", () => {
  const t = TRANSLATIONS.de;
  it("liefert drei Zeilen, wenn es sich nicht traegt, und faerbt die Zahlen", () => {
    const zeilen = fazitSaetze(fazitZeilen(basis), t);
    expect(zeilen.length).toBeGreaterThanOrEqual(2);
    expect(zeilen[0].teile.some((x) => x.farbe && x.text.startsWith("−"))).toBe(true);
    expect(zeilen[0].kreis).toBe("var(--bad-tx)");
  });
  it("traegt sich: eine Zeile mit Pluszeichen in Gruen", () => {
    const zeilen = fazitSaetze(fazitZeilen({ ...basis, kaltmiete: "2500" }), t);
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0].kreis).toBe("var(--ok-tx)");
    expect(zeilen[0].teile.find((x) => x.farbe).text.startsWith("+")).toBe(true);
  });
  it("Platzhalter ohne Wert bleiben stehen, nichts bricht", () => {
    expect(fazitTeile("a {x} b", {}).map((p) => p.text).join("")).toBe("a {x} b");
  });
  it("alle fuenf Sprachen haben alle Fazit-Texte", () => {
    for (const lang of ["de", "en", "tr", "zh", "hi"]) {
      for (const k of ["fazitTitel", "fazitTraegtNicht", "fazitTraegt", "fazitEk", "fazitKeineStufe", "fazitZiel"]) {
        expect(TRANSLATIONS[lang][k], `${lang}.${k}`).toBeTruthy();
      }
    }
  });
});
