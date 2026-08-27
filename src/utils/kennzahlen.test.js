import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";

// Charakterisierungs-Tests fuer die Stufe-1-Kennzahlen (Investment-Score-Umbau,
// 2026-08-27). Nutzt dieselbe Basis wie rendite.test.js, damit beide Dateien
// denselben Standardfall pruefen und Abweichungen sofort auffallen.
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
};

function kz(overrides = {}) {
  const d = { ...baseD, ...overrides };
  const R = computeRendite(d, {});
  return { d, R, K: berechneKennzahlen(d, R) };
}

describe("berechneKennzahlen — Standardfall (identisch zu rendite.test.js baseD)", () => {
  const { K } = kz();

  it("NOI: Jahresmiete minus nicht umlagefaehige Kosten (kein Leerstand)", () => {
    expect(K.noi).toBeCloseTo(9600, 5); // 10.800 − 1.200
  });

  it("effektive Anfangsrendite: NOI durch Gesamtinvestition inkl. Nebenkosten", () => {
    expect(K.gesamtinvestition).toBeCloseTo(331710, 5); // 300.000 + 31.710 Nebenkosten
    expect(K.anfangsrendite).toBeCloseTo(2.8941, 3);
  });

  it("DSCR: NOI durch den tatsaechlichen Kapitaldienst (Jahr 1)", () => {
    expect(K.dscrIst).toBeCloseTo(0.6667, 3); // 9.600 / (1.200 × 12) = 9.600 / 14.400
  });

  it("dscrObjekt und dscrIst fallen bei marktueblicher Finanzierung zusammen", () => {
    // Standardfall finanziert selbst genau 80 % LTV / 2 % Tilgung -
    // dscrObjekt (Standardannahme) und dscrIst (tatsaechlich) muessen hier
    // identisch sein. Der Unterschied zeigt sich erst, wenn der Nutzer davon
    // abweicht (siehe Testfall "Tilgungssatz 0" unten).
    expect(K.dscrObjekt).toBeCloseTo(K.dscrIst, 5);
  });

  it("ICR: NOI durch die reinen Zinsen (ohne Tilgung)", () => {
    expect(K.icr).toBeCloseTo(1, 5); // 9.600 / 9.600 Zinsen Jahr 1
  });

  it("Debt Yield: NOI durch die Darlehenssumme", () => {
    expect(K.debtYield).toBeCloseTo(4, 5); // 9.600 / 240.000 × 100
  });

  it("Break-even-Miete und Break-even-Leerstand", () => {
    expect(K.breakEvenMiete).toBeCloseTo(1300, 1);
    // Aktuelle Kaltmiete 900 € liegt bereits unter der Break-even-Miete von
    // 1.300 € - der Puffer ist negativ, wie R.cf2OhneSt (-400 €) es zeigt.
    expect(K.breakEvenLeerstand).toBeCloseTo(-44.44, 1);
  });

  it("Restschuld bei Zinsbindungsende (Default 10 Jahre = Betrachtungszeitraum)", () => {
    expect(K.restschuldZB).toBeCloseTo(182370.69, 1);
    expect(K.restschuldZBQuote).toBeCloseTo(60.79, 1);
  });
});

describe("berechneKennzahlen — Zinsbindung kuerzer als der Betrachtungszeitraum", () => {
  it("liefert die Restschuld zum tatsaechlichen Zinsbindungsende, nicht zum Analyseende", () => {
    const { K } = kz({ zinsbindung: "5" });
    expect(K.restschuldZB).toBeCloseTo(214001.65, 1);
    expect(K.restschuldZBQuote).toBeCloseTo(71.33, 1);
    // Andere Kennzahlen haengen nicht von der Zinsbindung ab und bleiben
    // gegenueber dem Standardfall unveraendert.
    expect(K.dscrIst).toBeCloseTo(0.6667, 3);
  });
});

describe("berechneKennzahlen — Zinsbindung laenger als der Betrachtungszeitraum", () => {
  it("liefert null statt einer geschaetzten Restschuld", () => {
    const { K } = kz({ zinsbindung: "15", jahre: "10" });
    expect(K.restschuldZB).toBeNull();
    expect(K.restschuldZBQuote).toBeNull();
  });
});

describe("berechneKennzahlen — Tilgungssatz 0 (Darlehen wird nie zurueckgefuehrt)", () => {
  // Regressionsfall zum laufzeitJahre-Fix in rendite.js (Kalibrierung
  // 2026-08-27, Befund B6): dscrIst wird hier kuenstlich gut, weil kaum
  // Kapitaldienst anfaellt - deshalb muss dscrObjekt (Standardannahme 2 %
  // Tilgung) sichtbar schlechter bleiben. Genau diese Abweichung ist der
  // Grund, warum die Spec beide Kennzahlen getrennt fuehrt.
  it("dscrIst taeuscht Tragfaehigkeit vor, dscrObjekt bleibt ehrlich", () => {
    const { K, R } = kz({ eigenkapital: "0", tilgung: "0" });
    expect(R.lz).toBe(Infinity);
    expect(K.dscrIst).toBeCloseTo(0.8, 3);
    expect(K.dscrObjekt).toBeCloseTo(0.6667, 3);
    expect(K.dscrIst).toBeGreaterThan(K.dscrObjekt);
  });
});

describe("berechneKennzahlen — Randfall Kaufpreis 0", () => {
  it("liefert null statt NaN/Absturz fuer Kennzahlen ohne Finanzierungsgrundlage", () => {
    const { K } = kz({ kaufpreis: "0", garage: "0", eigenkapital: "0" });
    expect(K.gesamtinvestition).toBe(0);
    expect(K.anfangsrendite).toBeNull();
    expect(K.dscrIst).toBeNull();
    expect(K.dscrObjekt).toBeNull();
    expect(K.icr).toBeNull();
    expect(K.debtYield).toBeNull();
    expect(K.restschuldZBQuote).toBeNull();
    // NOI und Break-even-Groessen haengen nicht am Kaufpreis und bleiben
    // berechenbar.
    expect(Number.isNaN(K.noi)).toBe(false);
    expect(Number.isNaN(K.breakEvenLeerstand)).toBe(false);
  });
});

describe("berechneKennzahlen — Vollfinanzierung (Charakterisierung, deckt sich mit rendite.test.js)", () => {
  it("DSCR und Debt Yield fallen bei 100 % Beleihung deutlich", () => {
    const { K } = kz({ kaufpreis: "500000", eigenkapital: "0", tilgung: "1" });
    expect(K.dscrIst).toBeCloseTo(0.384, 3);
    expect(K.dscrObjekt).toBeCloseTo(0.4, 3);
    expect(K.debtYield).toBeCloseTo(1.92, 2);
    expect(K.restschuldZBQuote).toBeCloseTo(87.99, 1);
  });
});
