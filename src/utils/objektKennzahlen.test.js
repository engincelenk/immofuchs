import { describe, it, expect } from "vitest";
import {
  berechneObjektKennzahlen,
  berechneVollstaendigkeit,
  fehlendeFelder,
  tierZuLabel,
  toResultData,
} from "./objektKennzahlen.js";

// Schritt A2 des Umbauplans: jedes Objekt bekommt eine Ampel, nicht nur die
// aus dem Exposé-Scan. Diese Tests decken den Pruefpunkt A2 ab.

const vollstaendig = {
  kaufpreis: "300000",
  flaeche: "70",
  kaltmiete: "900",
  eigenkapital: "60000",
  zinssatz: "3.8",
  tilgung: "2",
  nichtUml: "150",
  bundesland: "BW",
  zinsbindung: "10",
  baujahr: "1996",
  plz: "74379",
};

describe("berechneObjektKennzahlen", () => {
  it("liefert fuer ein manuell angelegtes Objekt eine Ampel", () => {
    const kz = berechneObjektKennzahlen(vollstaendig);
    expect(kz.verfuegbar).toBe(true);
    expect(kz.score).toBeTypeOf("number");
    expect(["gut", "grenzwertig", "kritisch"]).toContain(kz.scoreLabel);
  });

  it("ohne Kaufpreis ist nichts berechenbar", () => {
    const kz = berechneObjektKennzahlen({ ...vollstaendig, kaufpreis: "0" });
    expect(kz.verfuegbar).toBe(false);
    expect(kz.score).toBeNull();
  });

  it("liefert die sechs Kennzahlen der Objektkarte", () => {
    const kz = berechneObjektKennzahlen(vollstaendig);
    for (const feld of ["kaufpreis", "mieteMon", "faktor", "rateMon", "kostenMon", "cashflowMon"]) {
      expect(Number.isFinite(kz[feld]), feld).toBe(true);
    }
  });

  it("Monatswerte bleiben Monatswerte", () => {
    // Schutz gegen den Einheiten-Bug der Analyse-Vorlage (Befund 1): die
    // Monatsmiete darf nicht versehentlich der Jahreswert sein.
    const kz = berechneObjektKennzahlen(vollstaendig);
    expect(kz.mieteMon).toBe(900);
    expect(kz.jahresMiete).toBe(900 * 12);
  });

  it("Ausgaben sind Rate plus nicht umlagefaehige Kosten", () => {
    const kz = berechneObjektKennzahlen(vollstaendig);
    expect(kz.ausgabenMon).toBeCloseTo(kz.rateMon + 150, 6);
  });

  it("toResultData bleibt bei fehlenden Daten leer", () => {
    expect(toResultData(berechneObjektKennzahlen({ kaufpreis: "0" }))).toEqual({});
  });
});

describe("tierZuLabel", () => {
  it("bildet die vier Score-Stufen auf die drei Badge-Label ab", () => {
    expect(tierZuLabel("green")).toBe("gut");
    expect(tierZuLabel("yellow")).toBe("grenzwertig");
    expect(tierZuLabel("orange")).toBe("grenzwertig");
    expect(tierZuLabel("red")).toBe("kritisch");
    expect(tierZuLabel(undefined)).toBeNull();
  });
});

describe("Vollstaendigkeit", () => {
  it("ein vollstaendiger Datensatz ergibt 100", () => {
    expect(berechneVollstaendigkeit(vollstaendig)).toBe(100);
  });

  it("ein leerer Datensatz ergibt 0", () => {
    expect(berechneVollstaendigkeit({})).toBe(0);
  });

  it("gewichtet nach Ergebnisrelevanz statt nach Feldanzahl", () => {
    // Kaufpreis (20) wiegt schwerer als Baujahr (3) - beide sind ein Feld.
    const nurKaufpreis = berechneVollstaendigkeit({ kaufpreis: "300000" });
    const nurBaujahr = berechneVollstaendigkeit({ baujahr: "1996" });
    expect(nurKaufpreis).toBeGreaterThan(nurBaujahr);
  });

  it("null und undefined ergeben 0 statt eines Absturzes", () => {
    expect(berechneVollstaendigkeit(null)).toBe(0);
    expect(berechneVollstaendigkeit(undefined)).toBe(0);
  });
});

describe("fehlendeFelder", () => {
  it("nennt das wichtigste fehlende Feld zuerst", () => {
    // Speist den lehrenden Empty-State: sagen, was fehlt, statt nur zu melden,
    // dass nichts da ist.
    const fehlt = fehlendeFelder({ baujahr: "1996" });
    expect(fehlt[0]).toBe("kaufpreis");
    expect(fehlt).not.toContain("baujahr");
  });

  it("meldet bei vollstaendigen Daten nichts", () => {
    expect(fehlendeFelder(vollstaendig)).toEqual([]);
  });
});
