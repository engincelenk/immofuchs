import { describe, expect, it } from "vitest";
import {
  ersteTragendeStufe,
  hatMiete,
  maxKaufpreisFuerCashflow,
  stufenVergleich,
  stufenZeile,
} from "./finanzierungsVergleich.js";
import { finanzierungsanteil } from "./zinsStaffel.js";
import { ZINS_NACH_FINANZIERUNG } from "../data.js";

// Beispiel aus der Marktbeobachtung (Nutzer 2026-10-24): 66 qm, 310.000 Euro, ca. 900 Euro Kaltmiete.
const basis = {
  kaufpreis: "310000",
  garage: "0",
  eigenkapital: "0",
  bundesland: "Bayern",
  notar: "1.5",
  makler: "3.57",
  flaeche: "66",
  kaltmiete: "900",
  nkFinanzieren: false,
  tilgung: "2",
};
const PUNKTE = [
  [50, 3.97],
  [60, 4.02],
  [80, 4.32],
  [100, 4.62],
];

describe("Stufen-Tabelle", () => {
  it("enthaelt 50 % bis 100 % in aufsteigender Folge, 50 % als Schaetzwert", () => {
    const p = ZINS_NACH_FINANZIERUNG.punkte;
    expect(p.map(([a]) => a)).toEqual([50, 60, 70, 80, 90, 100]);
    expect(p[0][1]).toBeCloseTo(3.97, 10);
  });
});

describe("stufenZeile / stufenVergleich", () => {
  it("trifft den Finanzierungsanteil der Stufe und rechnet Zins plus Puffer", () => {
    const z = stufenZeile(basis, 80, 4.32, 0.3);
    expect(finanzierungsanteil({ ...basis, eigenkapital: String(z.eigenkapital) })).toBeCloseTo(80, 0);
    expect(z.zins).toBeCloseTo(4.62, 10);
  });
  it("mehr Eigenkapital: kleinere Rate, besserer Cashflow", () => {
    const zeilen = stufenVergleich(basis, PUNKTE);
    expect(zeilen).toHaveLength(4);
    for (let i = 1; i < zeilen.length; i++) {
      expect(zeilen[i].anteil).toBeGreaterThan(zeilen[i - 1].anteil);
      expect(zeilen[i].rate).toBeGreaterThan(zeilen[i - 1].rate);
      expect(zeilen[i].cashflow).toBeLessThan(zeilen[i - 1].cashflow);
      expect(zeilen[i].eigenkapital).toBeLessThan(zeilen[i - 1].eigenkapital);
    }
  });
  it("Rate stimmt mit Zins plus Tilgung ueberein (Beispiel 100 %: 4,62 + 2 = 6,62 %)", () => {
    const z = stufenZeile(basis, 100, 4.62);
    expect(z.eigenkapital).toBe(0);
    expect(z.rate).toBeCloseTo((310000 * 6.62) / 100 / 12, 0);
  });
  it("ohne Kaufpreis keine Zeilen", () => {
    expect(stufenVergleich({ ...basis, kaufpreis: "" }, PUNKTE)).toEqual([]);
  });
  it("Puffer macht den Cashflow schlechter", () => {
    const a = stufenZeile(basis, 80, 4.32, 0);
    const b = stufenZeile(basis, 80, 4.32, 0.5);
    expect(b.cashflow).toBeLessThan(a.cashflow);
  });
});

describe("ersteTragendeStufe", () => {
  it("nimmt die Stufe mit dem hoechsten Anteil, die traegt", () => {
    const zeilen = [
      { anteil: 50, cashflow: 100 },
      { anteil: 60, cashflow: 20 },
      { anteil: 80, cashflow: -300 },
    ];
    expect(ersteTragendeStufe(zeilen).anteil).toBe(60);
  });
  it("null, wenn keine Stufe traegt", () => {
    expect(ersteTragendeStufe([{ anteil: 50, cashflow: -1 }])).toBeNull();
  });
});

describe("maxKaufpreisFuerCashflow", () => {
  it("liefert einen Preis unter dem Angebot, bei dem der Cashflow ~0 ist", () => {
    const r = maxKaufpreisFuerCashflow(basis, 80, 4.32);
    expect(r.preis).toBeLessThan(310000);
    expect(r.abschlagProz).toBeLessThan(0);
    const z = stufenZeile({ ...basis, kaufpreis: String(r.preis) }, 80, 4.32);
    expect(z.cashflow).toBeGreaterThanOrEqual(0);
    expect(z.cashflow).toBeLessThan(60); // 500-Euro-Rundung, kaum Spielraum
    const drueber = stufenZeile({ ...basis, kaufpreis: String(r.preis + 2000) }, 80, 4.32);
    expect(drueber.cashflow).toBeLessThan(0);
  });
  it("weniger Fremdkapital erlaubt einen hoeheren Kaufpreis", () => {
    const p50 = maxKaufpreisFuerCashflow(basis, 50, 3.97).preis;
    const p80 = maxKaufpreisFuerCashflow(basis, 80, 4.32).preis;
    const p100 = maxKaufpreisFuerCashflow(basis, 100, 4.62).preis;
    expect(p50).toBeGreaterThan(p80);
    expect(p80).toBeGreaterThan(p100);
  });
  it("liegt der Preis schon darunter, ist der Spielraum positiv", () => {
    const r = maxKaufpreisFuerCashflow({ ...basis, kaufpreis: "150000" }, 80, 4.32);
    expect(r.abschlagProz).toBeGreaterThan(0);
  });
  it("ohne Kaufpreis oder Miete null", () => {
    expect(maxKaufpreisFuerCashflow({ ...basis, kaufpreis: "" }, 80, 4.32)).toBeNull();
    expect(maxKaufpreisFuerCashflow({ ...basis, kaltmiete: "" }, 80, 4.32)).toBeNull();
    expect(hatMiete({ kaltmiete: "0" })).toBe(false);
  });
  it("rechnet schnell genug fuer die Oberflaeche", () => {
    const t0 = Date.now();
    maxKaufpreisFuerCashflow(basis, 80, 4.32);
    maxKaufpreisFuerCashflow(basis, 50, 3.97);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});
