import { describe, it, expect } from "vitest";
import { cockpitEinschaetzung } from "./objektCockpit.js";

const teuer = { abw: 367, status: "rot" };
const imRahmen = { abw: 4, status: "neutral" };

describe("cockpitEinschaetzung (Ueberschrift der Objektseite)", () => {
  it("ungueltiger Cashflow -> null", () => {
    expect(cockpitEinschaetzung({ cashflow: null }, {})).toBeNull();
    expect(cockpitEinschaetzung({ cashflow: NaN }, {})).toBeNull();
  });

  it("Cashflow positiv, Preis weit ueber Markt -> 'traegt, aber teuer'", () => {
    const r = cockpitEinschaetzung({ cashflow: 709, preis: teuer }, {});
    expect(r.fall).toBe("traegtTeuer");
    expect(r.satz).toContain("367");
    expect(r.satz).toContain("Markt");
  });

  it("Cashflow positiv, Preis im Rahmen -> rechnerisch traegt es sich", () => {
    const r = cockpitEinschaetzung({ cashflow: 312, preis: imRahmen }, {});
    expect(r.fall).toBe("traegt");
    expect(r.negativ).toBe(false);
  });

  it("ohne Marktvergleich bleibt nur der Cashflow-Teil (kein Preis-Chip)", () => {
    const r = cockpitEinschaetzung({ cashflow: 100, preis: null }, {});
    expect(r.fall).toBe("traegt");
    expect(r.chips.map((c) => c.key)).toEqual(["cashflow"]);
  });

  it("Zuzahlung mit Tilgung, Preis im Rahmen -> Vermoegensaufbau + Tilgung in der Hinweiszeile", () => {
    const r = cockpitEinschaetzung({ cashflow: -250, preis: imRahmen, tilgung: 190 }, {});
    expect(r.fall).toBe("zuzahlungVermoegen");
    expect(r.hinweis).toContain("Tilgung");
  });

  it("Zuzahlung ohne Tilgung -> kein Vermoegensversprechen", () => {
    const r = cockpitEinschaetzung({ cashflow: -250, preis: imRahmen, tilgung: 0 }, {});
    expect(r.fall).toBe("zuzahlung");
    expect(r.satz).not.toContain("Vermögen");
  });

  it("Zuzahlung und teuer", () => {
    const r = cockpitEinschaetzung({ cashflow: -410, preis: { abw: 40, status: "rot" }, tilgung: 100 }, {});
    expect(r.fall).toBe("teuerZuzahlung");
    expect(r.teuer).toBe(true);
  });

  it("guenstiger Preis (abw < 0) zaehlt nie als teuer", () => {
    const r = cockpitEinschaetzung({ cashflow: 50, preis: { abw: -20, status: "rot" } }, {});
    expect(r.teuer).toBe(false);
  });

  it("Chips: Stufen aus Cashflow-Urteil, Preisstatus und Score-Tier", () => {
    const r = cockpitEinschaetzung(
      { cashflow: 709, cashflowStufe: "gruen", preis: teuer, scoreWert: 75, scoreTier: "green" },
      {},
    );
    expect(r.chips.map((c) => [c.key, c.stufe])).toEqual([
      ["cashflow", "gruen"],
      ["preis", "rot"],
      ["score", "gruen"],
    ]);
    expect(cockpitEinschaetzung({ cashflow: 1, scoreWert: 40, scoreTier: "orange" }, {}).chips[1].stufe).toBe("gelb");
  });

  it("Hinweiszeile: groesster Punkt der Analyse ersetzt den Standardhinweis", () => {
    const ohne = cockpitEinschaetzung({ cashflow: 1 }, {});
    expect(ohne.hinweis).toContain("Lage, Zustand");
    const mit = cockpitEinschaetzung({ cashflow: 1, topRisiko: "Heizung ist alt" }, {});
    expect(mit.hinweis).toContain("Heizung ist alt");
    expect(mit.hinweis).not.toContain("Lage, Zustand");
  });

  it("nutzt uebersetzte Vorlagen aus t", () => {
    const r = cockpitEinschaetzung({ cashflow: 10 }, { cockEinschTraegt: "OK {betrag}" });
    expect(r.satz).toMatch(/^OK /);
  });
});
