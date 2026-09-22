import { describe, it, expect } from "vitest";
import { berechneScore, berechneSzenarien, energieKlasse } from "./investmentScore.js";

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

  it("hat D1-D3, D6 und D7 mit auf 100 renormiertem Gewicht (D4/D5 ohne Datenbasis in baseD)", () => {
    // D4 braucht sanHa/sanIstVerbrauch/baujahr (baseD hat keins davon), D5
    // braucht opt.ref (nicht uebergeben) - beide fallen erwartungsgemaess aus
    // der Gewichtung. D6 ist auch ohne Regionaldaten teilweise berechenbar
    // (exitScore/spekulationsfristScore aus reinen R/K-Werten).
    expect(S.dimensionen.map((x) => x.key).sort()).toEqual(["d1", "d2", "d3", "d6", "d7"]);
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
  it("stuerzt nicht ab, auch wenn D7 (kein Kapitaldienst) unbestimmbar ist", () => {
    // Mit 7 statt 4 Dimensionen im Nenner (GEWICHT_GESAMT=100) reicht die
    // verbleibende Datenbasis (D1/D2/D3/D6) allein nicht mehr sicher ueber
    // die 60%-Schwelle - anders als im alten Stufe-2-Score. Das ist
    // beabsichtigt (siehe Neubau-Spec Abschnitt 2.1), der Test prueft nur
    // noch "kein Absturz", wie der Randfall-Test direkt darunter.
    const S = berechneScore({ ...baseD, eigenkapital: "331710" }, {});
    expect(() => S).not.toThrow();
    if (S.verfuegbar) {
      expect(Number.isFinite(S.score)).toBe(true);
    }
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

// ── D4 Objekt & Sanierung (objektseite-neubau-2026-09-22.md §2.2) ──────────
describe("berechneScore — D4 Objekt & Sanierung", () => {
  it("erscheint erst, sobald mindestens ein Sub-Score eine Datenbasis hat", () => {
    const S = berechneScore({ ...baseD, sanHa: "neu" }, {});
    const d4 = S.dimensionen.find((x) => x.key === "d4");
    expect(d4).toBeDefined();
    expect(d4.score).toBe(100); // nur heizungAlterScore verfuegbar, neu=100
  });

  it("ein neu saniertes Objekt schneidet besser ab als ein unsaniertes", () => {
    const gut = berechneScore(
      { ...baseD, sanHa: "neu", baujahr: "2020", sanIstVerbrauch: "40", nichtUml: "80" },
      {},
    );
    const schlecht = berechneScore(
      { ...baseD, sanHa: "alt", baujahr: "1960", sanIstVerbrauch: "220", nichtUml: "10" },
      {},
    );
    const d4Gut = gut.dimensionen.find((x) => x.key === "d4").score;
    const d4Schlecht = schlecht.dimensionen.find((x) => x.key === "d4").score;
    expect(d4Gut).toBeGreaterThan(d4Schlecht);
  });
});

describe("energieKlasse", () => {
  it("ordnet Verbrauchskennwerte der GEG-Skala zu", () => {
    expect(energieKlasse(40)).toBe("A");
    expect(energieKlasse(220)).toBe("G");
    expect(energieKlasse(300)).toBe("H");
    expect(energieKlasse(0)).toBeNull();
  });
});

// ── D5 Vermietung (objektseite-neubau-2026-09-22.md §2.3) ──────────────────
describe("berechneScore — D5 Vermietung", () => {
  const ref = { mieteWohnung: 15, kaufWohnung: 3500 };

  it("ohne opt.ref taucht D5 nicht in den Dimensionen auf", () => {
    const S = berechneScore(baseD, {});
    expect(S.dimensionen.find((x) => x.key === "d5")).toBeUndefined();
  });

  it("mit opt.ref und marktueblicher Miete erscheint D5 mit hohem Score", () => {
    // 900 / 60 = 15 EUR/qm, exakt die Referenz -> 0% Abweichung -> Plateau.
    const S = berechneScore(baseD, {}, { ref });
    const d5 = S.dimensionen.find((x) => x.key === "d5");
    expect(d5).toBeDefined();
    expect(d5.score).toBe(100);
  });

  it("eine Miete weit ueber Markt drueckt D5", () => {
    const S = berechneScore({ ...baseD, kaltmiete: "1800" }, {}, { ref }); // 30 EUR/qm
    const d5 = S.dimensionen.find((x) => x.key === "d5");
    expect(d5.score).toBeLessThan(50);
  });
});

// ── D6 Exit (objektseite-neubau-2026-09-22.md §2.4) ─────────────────────────
describe("berechneScore — D6 Exit", () => {
  it("ist auch ohne Regionaldaten teilweise berechenbar (exit/spekulationsfrist)", () => {
    const S = berechneScore(baseD, {});
    expect(S.dimensionen.find((x) => x.key === "d6")).toBeDefined();
  });

  it("ein Verkauf innerhalb der Spekulationsfrist senkt D6 gegenueber demselben Fall nach 10 Jahren", () => {
    const kurz = berechneScore({ ...baseD, jahre: "3" }, {});
    const lang = berechneScore({ ...baseD, jahre: "10" }, {});
    const d6Kurz = kurz.dimensionen.find((x) => x.key === "d6").score;
    const d6Lang = lang.dimensionen.find((x) => x.key === "d6").score;
    expect(d6Kurz).toBeLessThanOrEqual(d6Lang);
  });

  it("mit opt.proJahrTrend faellt eine stark ueberzogene Wertsteigerungsannahme auf", () => {
    const optimistisch = berechneScore({ ...baseD, wertP: "8" }, {}, { proJahrTrend: 1.5 });
    const realistisch = berechneScore({ ...baseD, wertP: "1.5" }, {}, { proJahrTrend: 1.5 });
    const d6Opt = optimistisch.dimensionen.find((x) => x.key === "d6").score;
    const d6Real = realistisch.dimensionen.find((x) => x.key === "d6").score;
    expect(d6Opt).toBeLessThan(d6Real);
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
