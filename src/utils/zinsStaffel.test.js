import { describe, expect, it } from "vitest";
import {
  aktiveStufe,
  eigenkapitalFuerAnteil,
  finanzierungsanteil,
  interpoliereZins,
  zinsFuerDaten,
  zinsHinweis,
  zinsInfo,
} from "./zinsStaffel.js";
import { MARKET_RATES, ZINS_ABSTAENDE, ZINS_NACH_FINANZIERUNG } from "../data.js";

const PUNKTE = [
  [60, 4.02],
  [70, 4.17],
  [80, 4.32],
  [90, 4.42],
  [100, 4.62],
];

const basis = {
  kaufpreis: "300000",
  garage: "20000",
  eigenkapital: "60000",
  bundesland: "Bayern",
  notar: "1.5",
  makler: "3.57",
  flaeche: "60",
  kaltmiete: "900",
  nkFinanzieren: false,
};

describe("interpoliereZins", () => {
  it("trifft die Stuetzpunkte exakt", () => {
    for (const [a, z] of PUNKTE) expect(interpoliereZins(a, PUNKTE)).toBeCloseTo(z, 10);
  });
  it("interpoliert stufenlos dazwischen", () => {
    expect(interpoliereZins(85, PUNKTE)).toBeCloseTo(4.37, 10); // Mitte 80 (4,32) und 90 (4,42)
    expect(interpoliereZins(95, PUNKTE)).toBeCloseTo(4.52, 10); // Mitte 90 (4,42) und 100 (4,62)
    expect(interpoliereZins(65, PUNKTE)).toBeCloseTo(4.095, 10);
    expect(interpoliereZins(80.1, PUNKTE)).toBeCloseTo(4.321, 10); // kein Sprung an der Grenze
  });
  it("ist ueber den ganzen Bereich nicht fallend", () => {
    let vorher = -Infinity;
    for (let a = 40; a <= 120; a += 0.5) {
      const z = interpoliereZins(a, PUNKTE);
      expect(z).toBeGreaterThanOrEqual(vorher);
      vorher = z;
    }
  });
  it("haelt ausserhalb der Stuetzpunkte den naechsten Wert", () => {
    expect(interpoliereZins(0, PUNKTE)).toBe(4.02);
    expect(interpoliereZins(50, PUNKTE)).toBe(4.02);
    expect(interpoliereZins(105, PUNKTE)).toBe(4.62);
    expect(interpoliereZins(140, PUNKTE)).toBe(4.62);
  });
  it("kommt mit unsortierten Punkten und Unsinn zurecht", () => {
    expect(interpoliereZins(85, [...PUNKTE].reverse())).toBeCloseTo(4.37, 10);
    expect(interpoliereZins(NaN, PUNKTE)).toBeNull();
    expect(interpoliereZins(80, [])).toBeNull();
    expect(interpoliereZins(80, null)).toBeNull();
  });
});

describe("finanzierungsanteil", () => {
  it("rechnet Bankdarlehen durch Kaufpreis plus Garage", () => {
    // 320.000 - 60.000 EK = 260.000 -> 81,25 %
    expect(finanzierungsanteil(basis)).toBeCloseTo(81.25, 6);
  });
  it("sinkt mit mehr Eigenkapital", () => {
    expect(finanzierungsanteil({ ...basis, eigenkapital: "128000" })).toBeCloseTo(60, 6);
    expect(finanzierungsanteil({ ...basis, eigenkapital: "0" })).toBeCloseTo(100, 6);
  });
  it("zaehlt Nebenkosten nur mit, wenn sie finanziert werden (dann ueber 100 % moeglich)", () => {
    const mit = finanzierungsanteil({ ...basis, eigenkapital: "0", nkFinanzieren: true });
    expect(mit).toBeGreaterThan(100);
  });
  it("laesst das KfW-Darlehen aussen vor", () => {
    const ohne = finanzierungsanteil(basis);
    const mitKfw = finanzierungsanteil({ ...basis, kfwAktiv: true, kfwBetrag: "50000", wohneinheiten: "1" });
    expect(mitKfw).toBeLessThan(ohne);
  });
  it("liefert 0 ohne Kaufpreis", () => {
    expect(finanzierungsanteil({ ...basis, kaufpreis: "", garage: "" })).toBe(0);
  });
});

describe("zinsFuerDaten", () => {
  it("gibt bei 80 % exakt den Marktzins", () => {
    // 20 % Eigenkapital auf 320.000 = 64.000
    expect(zinsFuerDaten({ ...basis, eigenkapital: "64000" }, {}, PUNKTE)).toBe("4.32");
  });
  it("kennt je Anteil den passenden Zins (60/70/90/100 %)", () => {
    const zins = (ek) => zinsFuerDaten({ ...basis, eigenkapital: String(ek) }, {}, PUNKTE);
    expect(zins(128000)).toBe("4.02"); // 60 %
    expect(zins(96000)).toBe("4.17"); // 70 %
    expect(zins(32000)).toBe("4.42"); // 90 %
    expect(zins(0)).toBe("4.62"); // 100 %
  });
  it("rundet auf zwei Nachkommastellen", () => {
    // 81,25 % -> 4,32 + 0,0125 * 10 = 4,325 (zwischen 80 und 90: 0,01 je Punkt) -> 4,33
    expect(zinsFuerDaten(basis, {}, PUNKTE)).toBe("4.33");
  });
  it("gibt null zurueck, wenn nichts zu berechnen ist", () => {
    expect(zinsFuerDaten({ ...basis, kaufpreis: "", garage: "" }, {}, PUNKTE)).toBeNull();
  });
});

describe("data.js: Tabelle und Abstaende passen zusammen", () => {
  it("ZINS_NACH_FINANZIERUNG = MARKET_RATES.avg + ZINS_ABSTAENDE (auf 2 Stellen gerundet)", () => {
    expect(ZINS_NACH_FINANZIERUNG.punkte.map(([a]) => a)).toEqual(ZINS_ABSTAENDE.punkte.map(([a]) => a));
    ZINS_ABSTAENDE.punkte.forEach(([a, abstand], i) => {
      const erwartet = Math.round((MARKET_RATES.avg + abstand) * 100) / 100;
      expect(ZINS_NACH_FINANZIERUNG.punkte[i][1], `Anteil ${a} %`).toBeCloseTo(erwartet, 10);
    });
  });
  it("hat bei 80 % den Abstand 0 und damit den Marktzins", () => {
    const p80 = ZINS_NACH_FINANZIERUNG.punkte.find(([a]) => a === 80);
    expect(p80[1]).toBe(MARKET_RATES.avg);
    expect(ZINS_ABSTAENDE.punkte.find(([a]) => a === 80)[1]).toBe(0);
  });
  it("steigt mit dem Finanzierungsanteil", () => {
    const zinsen = ZINS_NACH_FINANZIERUNG.punkte.map(([, z]) => z);
    expect([...zinsen].sort((a, b) => a - b)).toEqual(zinsen);
  });
  it("hat Stand-Angaben im selben Monat (der Monatsjob schreibt beide)", () => {
    expect(typeof ZINS_NACH_FINANZIERUNG.stand).toBe("string");
    expect(typeof ZINS_ABSTAENDE.stand).toBe("string");
  });
});

describe("eigenkapitalFuerAnteil (Auswahl Finanzierungsanteil)", () => {
  it("liefert das Eigenkapital, bei dem das Darlehen dem Anteil entspricht", () => {
    // 320.000 Kaufpreis plus Garage: 80 % Darlehen -> 64.000 Eigenkapital
    expect(eigenkapitalFuerAnteil(basis, 80)).toBe(64000);
    expect(eigenkapitalFuerAnteil(basis, 60)).toBe(128000);
    expect(eigenkapitalFuerAnteil(basis, 90)).toBe(32000);
  });
  it("trifft den Anteil nach dem Zuruecksetzen genau (Hin- und Rueckrechnung)", () => {
    for (const anteil of [60, 70, 80, 90, 100]) {
      const ek = eigenkapitalFuerAnteil(basis, anteil);
      expect(finanzierungsanteil({ ...basis, eigenkapital: String(ek) })).toBeCloseTo(anteil, 1);
    }
  });
  it("100 % bedeutet ohne finanzierte Nebenkosten 0 Eigenkapital", () => {
    expect(eigenkapitalFuerAnteil(basis, 100)).toBe(0);
  });
  it("beruecksichtigt finanzierte Nebenkosten: dann braucht 80 % mehr Eigenkapital", () => {
    const mit = { ...basis, nkFinanzieren: true };
    const ek = eigenkapitalFuerAnteil(mit, 80);
    expect(ek).toBeGreaterThan(64000);
    expect(finanzierungsanteil({ ...mit, eigenkapital: String(ek) })).toBeCloseTo(80, 1);
  });
  it("kommt mit einer KfW-Foerderung zurecht", () => {
    const kfw = { ...basis, kfwAktiv: true, kfwBetrag: "40000", wohneinheiten: "1" };
    const ek = eigenkapitalFuerAnteil(kfw, 80);
    expect(finanzierungsanteil({ ...kfw, eigenkapital: String(ek) })).toBeCloseTo(80, 1);
  });
  it("gibt null ohne Kaufpreis zurueck", () => {
    expect(eigenkapitalFuerAnteil({ ...basis, kaufpreis: "", garage: "" }, 80)).toBeNull();
  });
});

describe("aktiveStufe", () => {
  it("erkennt Stuetzpunkte mit Toleranz, sonst null", () => {
    expect(aktiveStufe(80, PUNKTE)).toBe(80);
    expect(aktiveStufe(80.4, PUNKTE)).toBe(80);
    expect(aktiveStufe(81.25, PUNKTE)).toBeNull();
    expect(aktiveStufe(85, PUNKTE)).toBeNull();
    expect(aktiveStufe(NaN, PUNKTE)).toBeNull();
  });
});

describe("zinsHinweis: feste Texte ohne wechselnde Zahlen", () => {
  const t = { zinsAutoHinweis: "Automatisch nach Eigenkapital", zinsEigenHinweis: "Eigener Wert (Automatik aus)" };
  it("meldet automatisch, solange der automatische Zins im Feld steht", () => {
    const info = zinsInfo({ ...basis, eigenkapital: "64000" }, {}, PUNKTE);
    expect(zinsHinweis(info, info.zins, t)).toBe("Automatisch nach Eigenkapital");
  });
  it("meldet eigenen Wert, sobald der Zins abweicht, und nennt dabei keine Zahl", () => {
    const info = zinsInfo({ ...basis, eigenkapital: "64000" }, {}, PUNKTE);
    const text = zinsHinweis(info, "3.9", t);
    expect(text).toBe("Eigener Wert (Automatik aus)");
    expect(text).not.toMatch(/\d/);
  });
  it("gibt ohne Info oder ohne Text nichts zurueck", () => {
    expect(zinsHinweis(null, "4.3", t)).toBeUndefined();
    expect(zinsHinweis({ anteil: 80, zins: "4.32" }, "4.32", {})).toBeUndefined();
  });
});
