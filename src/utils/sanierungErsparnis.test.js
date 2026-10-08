import { describe, it, expect } from "vitest";
import { verteileErsparnis } from "./sanierungErsparnis.js";

const ES = {
  fenster: { ek: 0.12, co2: 0.1 },
  fassade: { ek: 0.2, co2: 0.18 },
  heizung: { ek: 0.35, co2: 0.45 },
  dach: { ek: 0.08, co2: 0.07 },
};
const aktiv = Object.entries(ES).map(([k, v]) => ({ k, ...v }));

describe("verteileErsparnis (Befund M5)", () => {
  const kH = 1450;
  const co2H = 3160;
  const v = verteileErsparnis({ aktiv, kH, co2H });

  it("Zeilensumme = ausgewiesene Gesamtersparnis (Heizkosten und CO2)", () => {
    const sumEk = Object.values(v.zeilen).reduce((a, z) => a + z.ek, 0);
    const sumCo2 = Object.values(v.zeilen).reduce((a, z) => a + z.co2, 0);
    expect(sumEk).toBe(v.ekG);
    expect(sumCo2).toBe(v.co2G);
  });

  it("Gesamtersparnis stapelt multiplikativ (nicht additiv)", () => {
    const additiv = Math.round((kH * (0.12 + 0.2 + 0.35 + 0.08)) / 50) * 50;
    expect(v.ekG).toBeLessThan(additiv);
    expect(v.ekG).toBe(Math.round((kH * (1 - 0.88 * 0.8 * 0.65 * 0.92)) / 50) * 50);
  });

  it("jede Zeile bleibt nicht negativ, groessere Massnahme spart mehr", () => {
    for (const z of Object.values(v.zeilen)) expect(z.ek).toBeGreaterThanOrEqual(0);
    expect(v.zeilen.heizung.ek).toBeGreaterThan(v.zeilen.dach.ek);
  });

  it("PV: feste Stromersparnis steht in ihrer Zeile und fliesst nicht in die Heizkostenverteilung", () => {
    const mitPv = verteileErsparnis({
      aktiv: [...aktiv, { k: "pv", ek: 0, co2: 0.2 }],
      kH,
      co2H,
      fest: { k: "pv", wert: 1650 },
    });
    expect(mitPv.zeilen.pv.ek).toBe(1650);
    expect(mitPv.ekG).toBe(v.ekG);
    const sumOhnePv = Object.entries(mitPv.zeilen)
      .filter(([k]) => k !== "pv")
      .reduce((a, [, z]) => a + z.ek, 0);
    expect(sumOhnePv).toBe(mitPv.ekG);
  });

  it("PV allein spart keine Heizkosten (frueher: bis 25 % Heizkostenanteil zusaetzlich zum Strom)", () => {
    const nurPv = verteileErsparnis({ aktiv: [{ k: "pv", ek: 0, co2: 0.2 }], kH, co2H, fest: { k: "pv", wert: 1650 } });
    expect(nurPv.ekG).toBe(0);
    expect(nurPv.zeilen.pv.ek).toBe(1650);
  });

  it("ohne Massnahmen alles null", () => {
    const leer = verteileErsparnis({ aktiv: [], kH, co2H });
    expect(leer.ekG).toBe(0);
    expect(leer.co2G).toBe(0);
  });
});
