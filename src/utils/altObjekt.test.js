import { describe, it, expect } from "vitest";
import { bereinigeAltObjektDaten } from "./altObjekt.js";

const basis = { kaufpreis: "450000", eigenkapital: "90000", zinssatz: "3.7", tilgung: "2", flaeche: "65" };

describe("bereinigeAltObjektDaten", () => {
  it("setzt die alte Sanierungs-Wohnflaeche 60 zurueck, wenn das Objekt eine andere Flaeche hat", () => {
    expect(bereinigeAltObjektDaten({ ...basis, sanFl: "60" }).sanFl).toBe("");
  });

  it("laesst eigene Werte und passende Flaechen unveraendert", () => {
    expect(bereinigeAltObjektDaten({ ...basis, sanFl: "72" }).sanFl).toBe("72");
    expect(bereinigeAltObjektDaten({ ...basis, flaeche: "60", sanFl: "60" }).sanFl).toBe("60");
    expect(bereinigeAltObjektDaten({ ...basis, sanFl: "" }).sanFl).toBe("");
  });

  it("leert die alte Vorfaelligkeits-Vorbelegung (voller Kaufpreis minus EK und Rate daraus)", () => {
    const alt = { ...basis, vfeRestschuld: "360000", vfeMonatsRate: "1710" };
    const neu = bereinigeAltObjektDaten(alt);
    expect(neu.vfeRestschuld).toBe("");
    expect(neu.vfeMonatsRate).toBe("");
  });

  it("laesst eigene Vorfaelligkeits-Eingaben stehen, auch wenn nur eines der Felder passt", () => {
    expect(bereinigeAltObjektDaten({ ...basis, vfeRestschuld: "320000", vfeMonatsRate: "1710" }).vfeRestschuld).toBe("320000");
    expect(bereinigeAltObjektDaten({ ...basis, vfeRestschuld: "360000", vfeMonatsRate: "1800" }).vfeMonatsRate).toBe("1800");
  });

  it("veraendert das uebergebene Objekt nicht und verschont andere Felder", () => {
    const alt = { ...basis, sanFl: "60", wertP: "1.8" };
    const neu = bereinigeAltObjektDaten(alt);
    expect(alt.sanFl).toBe("60");
    expect(neu.wertP).toBe("1.8");
    expect(neu.kaufpreis).toBe("450000");
  });

  it("toleriert fehlende Daten", () => {
    expect(bereinigeAltObjektDaten(null)).toBeNull();
    expect(bereinigeAltObjektDaten(undefined)).toBeUndefined();
  });
});
