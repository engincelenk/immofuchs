// Tests zum Rechenkern des Investment-Briefings (Spec docs/technical_specs/
// investment-briefing.md, Abschnitt 5). Angelegt in Stufe 1; ausgefuehrt wird
// die Suite nur auf ausdrueckliche Anweisung (Spec Abschnitt 12).
import { describe, it, expect } from "vitest";
import {
  briefingAmpel,
  vergleichStatus,
  energieKlasse,
  briefingZeitraum,
  ZUZAHLUNG_GELB_QUOTE,
  TOLERANZ_PROZENT,
} from "./briefing.js";

describe("briefingAmpel", () => {
  const d = { kaltmiete: "500", tilgung: "2" };

  it("gruen bei nicht negativem Cashflow nach Steuer", () => {
    expect(briefingAmpel(d, { cf2MitSt: 0, bankDa: 200000, bel: 80 }).stufe).toBe("gruen");
  });

  it("gelb, solange die Zuzahlung die Quote der Kaltmiete nicht ueberschreitet", () => {
    const grenze = -500 * ZUZAHLUNG_GELB_QUOTE;
    expect(briefingAmpel(d, { cf2MitSt: grenze, bankDa: 200000, bel: 80 }).stufe).toBe("gelb");
    expect(briefingAmpel(d, { cf2MitSt: grenze - 1, bankDa: 200000, bel: 80 }).stufe).toBe("rot");
  });

  it("Hard-Stop Tilgung 0 schlaegt den Cashflow", () => {
    const a = briefingAmpel({ ...d, tilgung: "0" }, { cf2MitSt: 500, bankDa: 200000, bel: 80 });
    expect(a).toEqual({ stufe: "rot", key: "brfAmpelHartStop" });
  });

  it("Hard-Stop Beleihung ueber 100 Prozent", () => {
    const a = briefingAmpel(d, { cf2MitSt: 500, bankDa: 200000, bel: 101 });
    expect(a.key).toBe("brfAmpelHartStop");
  });

  it("kein Hard-Stop bei Tilgung 0 ohne Bankdarlehen", () => {
    const a = briefingAmpel({ ...d, tilgung: "0" }, { cf2MitSt: 500, bankDa: 0, bel: 0 });
    expect(a.stufe).toBe("gruen");
  });
});

describe("vergleichStatus", () => {
  const ueber = { status: "rot", key: "brfStatusUeberMarkt" };
  const unter = { status: "gruen", key: "brfStatusUnterMarkt" };

  it("innerhalb der Toleranz neutral", () => {
    expect(vergleichStatus(TOLERANZ_PROZENT, ueber, unter).status).toBe("neutral");
    expect(vergleichStatus(-TOLERANZ_PROZENT, ueber, unter).status).toBe("neutral");
  });

  it("ausserhalb der Toleranz richtungsabhaengig", () => {
    expect(vergleichStatus(6, ueber, unter)).toBe(ueber);
    expect(vergleichStatus(-6, ueber, unter)).toBe(unter);
  });

  it("ohne Abweichung kein Status", () => {
    expect(vergleichStatus(null, ueber, unter)).toBe(null);
  });
});

describe("energieKlasse", () => {
  it("bildet die GEG-Skala ab", () => {
    expect(energieKlasse(29)).toBe("A+");
    expect(energieKlasse(77.4)).toBe("C");
    expect(energieKlasse(250)).toBe("H");
  });

  it("ohne Kennwert keine Klasse", () => {
    expect(energieKlasse(0)).toBe(null);
    expect(energieKlasse(undefined)).toBe(null);
  });
});

describe("briefingZeitraum", () => {
  const R = { sCF: -8000, da: 200000, rsEnd: 170000, w: 40000, st23: 0, g: 62000, j: 10 };

  it("zeigt nur vorhandene Werte und uebernimmt R.g als Summe", () => {
    const z = briefingZeitraum(R);
    expect(z.zeilen.map((x) => x.key)).toEqual(["zuzahlungen", "getilgt", "wertzuwachs"]);
    expect(z.zeilen[1].wert).toBe(30000);
    expect(z.summe).toBe(62000);
  });

  it("nimmt die Steuer nach Paragraf 23 nur auf, wenn sie anfaellt", () => {
    const z = briefingZeitraum({ ...R, st23: 4000 });
    expect(z.zeilen.at(-1)).toEqual({ key: "steuer23", wert: -4000 });
  });
});
