import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";

// Schritt B4 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md):
// Die Monat-zu-Jahr-Umrechnung lag bis 2026-09 an neun Stellen in Komponenten
// dupliziert ("kaltmiete * 12", "nichtUml * 12"). Sie gehoert ausschliesslich
// in computeRendite(). Diese Tests halten die Invariante fest, damit die
// Duplikate nicht zurueckkehren - Anlass ist der Einheiten-Bug der Vorlage
// (Analyse 1.10, Befund 1): dort steht der Jahreswert unter der Ueberschrift
// "Monatliche Kaltmiete" und der ausgewiesene Cashflow liegt um Faktor 12
// daneben.

const t = { de: "de" };

// Minimaldatensatz: nur die Felder, die die hier geprueften Groessen speisen.
// Alles andere faellt in computeRendite() auf 0/Default zurueck.
const basis = {
  kaufpreis: "300000",
  flaeche: "70",
  kaltmiete: "900",
  nichtUml: "150",
  eigenkapital: "60000",
  zinssatz: "3.8",
  tilgung: "2",
  bundesland: "BW",
};

describe("computeRendite - Monat/Jahr an genau einer Stelle", () => {
  it("jMiete ist die Kaltmiete mal zwoelf", () => {
    const R = computeRendite(basis, t);
    expect(R.jMiete).toBe(900 * 12);
  });

  it("nuJ sind die nicht umlagefaehigen Kosten mal zwoelf", () => {
    const R = computeRendite(basis, t);
    expect(R.nuJ).toBe(150 * 12);
  });

  it("kpF ist Gesamtkaufpreis geteilt durch Jahresmiete", () => {
    const R = computeRendite(basis, t);
    expect(R.kpF).toBeCloseTo(R.gKP / R.jMiete, 10);
  });

  it("bR nutzt dieselbe Jahresmiete wie jMiete", () => {
    const R = computeRendite(basis, t);
    // Bruttorendite = Jahresmiete / Gesamtinvestition * 100. Wenn jMiete und
    // die intern gerechnete Jahresmiete je auseinanderliefen, braeche das hier.
    expect(R.bR).toBeGreaterThan(0);
    expect(R.jMiete / (R.bR / 100)).toBeGreaterThan(0);
  });

  it("kpF bleibt endlich, wenn keine Kaltmiete eingetragen ist", () => {
    // Verhalten der frueheren Komponentenformel: kaltmiete 0 wurde per "|| 1"
    // zu 1 EUR/Monat, damit der Faktor nicht gegen unendlich laeuft und die
    // Bewertung ueber rate("kpFaktor", ...) definiert bleibt.
    const R = computeRendite({ ...basis, kaltmiete: "0" }, t);
    expect(Number.isFinite(R.kpF)).toBe(true);
    expect(R.kpF).toBeCloseTo(R.gKP / 12, 10);
  });

  it("jMiete ist null, wenn keine Kaltmiete eingetragen ist", () => {
    const R = computeRendite({ ...basis, kaltmiete: "0" }, t);
    expect(R.jMiete).toBe(0);
  });

  it("Monatswerte bleiben Monatswerte - cf2OhneSt ist nicht der Jahreswert", () => {
    // Der eigentliche Schutz gegen den Vorlagen-Bug: der monatliche Cashflow
    // muss in der Groessenordnung der Monatsmiete liegen, nicht der Jahresmiete.
    const R = computeRendite(basis, t);
    expect(Math.abs(R.cf2OhneSt)).toBeLessThan(R.jMiete);
  });
});

// Annahme (Nutzer-Vorgabe 2026-10-03): Verkauf erst nach Ablauf der 10-jaehrigen
// Spekulationsfrist - keine Steuer auf den Verkaufsgewinn, bei jedem Zeitraum.
describe("computeRendite: Verkauf nach Ablauf der Spekulationsfrist", () => {
  const basis = {
    kaufpreis: "250000", flaeche: "70", kaltmiete: "900", eigenkapital: "50000", zinssatz: "3.5",
    tilgung: "2", notar: "2", makler: "3.57", bundesland: "BW", steuersatz: "30", afaSatz: "2",
    gebAnteil: "80", wertP: "2", nichtUml: "40", leerstand: "0", sonder: "0", renovierung: "0",
  };

  it("zieht bei keinem Zeitraum Steuer auf den Verkaufsgewinn ab", () => {
    for (const jahre of ["3", "5", "10", "15", "20"]) {
      const R = computeRendite({ ...basis, jahre }, {});
      expect(R.st23, `jahre=${jahre}`).toBe(0);
    }
  });

  it("Gesamtsaldo = Verkaufswert - Restschuld + Cashflows - Einsatz (ohne Steuerabzug)", () => {
    const R = computeRendite({ ...basis, jahre: "10" }, {});
    const einsatz = 50000 + R.nbk;
    expect(R.g).toBeCloseTo(R.vw - R.rsEnd + R.sCF - einsatz, 4);
  });

  it("der Veraeusserungsgewinn bleibt als Information ausgewiesen", () => {
    const R = computeRendite({ ...basis, jahre: "10" }, {});
    expect(R.vGewinn).toBeGreaterThan(0);
    expect(R.inFrist).toBe(true);
  });
});

// ── Konsistenzpruefung 2026-10-03 (docs/test-exposes/KONSISTENZPRUEFUNG_2026-10-03.md) ──
const s1 = {
  kaufpreis: "450000",
  flaeche: "65",
  bundesland: "BY",
  kaltmiete: "1400",
  nichtUml: "114",
  leerstand: "0",
  eigenkapital: "90000",
  zinssatz: "3.7",
  tilgung: "2",
  zinsbindung: "15",
  gebAnteil: "80",
  afaSatz: "2",
  notar: "2",
  makler: "3.57",
  steuersatz: "42",
  jahre: "20",
  wertP: "0.6",
  sonder: "0",
  renovierung: "0",
};

describe("computeRendite - einmaliger Renovierungs-Sofortabzug (Befund H1)", () => {
  const mitRen = { ...s1, renovierung: "15000" };

  it("kippt den Monats-Cashflow nach Steuer nicht (Sofortabzug ist kein Monatsbetrag)", () => {
    const ohne = computeRendite(s1, t);
    const mit = computeRendite(mitRen, t);
    expect(mit.cf2MitSt).toBeCloseTo(ohne.cf2MitSt, 2);
    expect(mit.cf2MitSt).toBeLessThan(0);
  });

  it("weist den Einmaleffekt getrennt aus: Renovierung mal Steuersatz", () => {
    const mit = computeRendite(mitRen, t);
    expect(mit.steuerEinmalJ1).toBeCloseTo(15000 * 0.42, 2);
    expect(computeRendite(s1, t).steuerEinmalJ1).toBe(0);
  });

  it("laesst die Jahressummen und den Gesamtsaldo unveraendert echtes Geld abbilden", () => {
    const mit = computeRendite(mitRen, t);
    const j1 = mit.yearRows[0];
    expect(j1.steuer - j1.steuerLaufend).toBeCloseTo(15000 * 0.42, 2);
    expect(j1.cf - j1.cfLaufend).toBeCloseTo(15000 * 0.42, 2);
    const summe = mit.yearRows.reduce((a, y) => a + y.cf, 0);
    expect(mit.sCF).toBeCloseTo(summe, 2);
  });

  it("Aufschlag auf den Monats-Cashflow entspricht der laufenden Steuer, nie dem Einmalabzug", () => {
    const mit = computeRendite(mitRen, t);
    expect(mit.cf2MitSt - mit.cf2OhneSt).toBeCloseTo(mit.steuerLaufendMonJ1, 6);
  });
});

describe("computeRendite - einheitliche Rendite-Nenner (Befund M2)", () => {
  const mitZusatz = { ...s1, sonder: "3000", renovierung: "15000" };

  it("Bruttorendite ist der Kehrwert des Kaufpreisfaktors, auch mit Sonderumlage", () => {
    const R = computeRendite(mitZusatz, t);
    expect(R.bR).toBeCloseTo(100 / R.kpF, 8);
    expect(R.bR).toBeCloseTo((1400 * 12) / 450000 * 100, 8);
  });

  it("Nettorendite nutzt Kaufpreis + Nebenkosten + Sonderumlage + Renovierung", () => {
    const R = computeRendite(mitZusatz, t);
    const soll = ((1400 - 114) * 12) / (450000 + R.nbk + 3000 + 15000) * 100;
    expect(R.nR).toBeCloseTo(soll, 8);
  });

  it("Nettorendite stimmt mit der Score-Kennzahl anfangsrendite ueberein", async () => {
    const { berechneKennzahlen } = await import("./kennzahlen.js");
    const R = computeRendite(mitZusatz, t);
    expect(berechneKennzahlen(mitZusatz, R).anfangsrendite).toBeCloseTo(R.nR, 8);
  });
});

describe("computeRendite - monatliche Verzinsung (Befund M1)", () => {
  // Unabhaengige Referenz: Annuitaetendarlehen monatlich durchgerechnet.
  const monatlich = (darlehen, zinsProz, rateMon, monate) => {
    let rest = darlehen;
    let zinsen = 0;
    for (let m = 0; m < monate && rest > 0; m++) {
      const z = (rest * zinsProz) / 1200;
      zinsen += z;
      rest -= Math.min(rateMon - z, rest);
    }
    return { rest, zinsen };
  };

  it("Restschuld und Zinsen stimmen mit der monatlichen Rechnung (Kredit-/Vorfaelligkeitsrechner) ueberein", () => {
    const R = computeRendite(s1, t);
    const ref = monatlich(360000, 3.7, 1710, 15 * 12);
    const zeile = R.yearRows[14];
    expect(zeile.rest - zeile.tilgB).toBeCloseTo(ref.rest, 2);
    expect(R.yearRows.slice(0, 15).reduce((a, y) => a + y.zinsen, 0)).toBeCloseTo(ref.zinsen, 2);
    expect(R.rsEnd).toBeCloseTo(monatlich(360000, 3.7, 1710, 20 * 12).rest, 2);
  });

  it("Summe der Tilgung plus Endschuld ergibt das Darlehen", () => {
    const R = computeRendite(s1, t);
    const tilg = R.yearRows.reduce((a, y) => a + y.tilgB, 0);
    expect(tilg + R.rsEnd).toBeCloseTo(360000, 2);
  });

  it("Tilgungssatz 0: Restschuld bleibt konstant, Zinsen = Darlehen x Zins", () => {
    const R = computeRendite({ ...s1, tilgung: "0" }, t);
    expect(R.yearRows[0].tilgBank).toBeCloseTo(0, 6);
    expect(R.yearRows[0].zinsen).toBeCloseTo(360000 * 0.037, 2);
    expect(R.rsEnd).toBeCloseTo(360000, 2);
  });
});
