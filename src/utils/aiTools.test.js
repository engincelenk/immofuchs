import { describe, it, expect } from "vitest";
import { hebelVarianten, berechneHebelAnalyse, loeseZielKaufpreis } from "./aiTools.js";
import { berechneScore } from "./investmentScore.js";
import { computeRendite } from "./rendite.js";

// Dieselbe Basis wie investmentScore.test.js/rendite.test.js, damit
// Abweichungen zwischen den Dateien sofort auffallen.
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

describe("hebelVarianten — Nutzlast fuer die AI-Engine", () => {
  const varianten = hebelVarianten(baseD, {});

  it("liefert ueberhaupt Varianten (der eigentliche Bug: es kamen nie welche an)", () => {
    expect(varianten.length).toBeGreaterThan(0);
  });

  it("traegt in jeder Variante genau die Felder, die der Worker validiert", () => {
    for (const v of varianten) {
      expect(typeof v.feld).toBe("string");
      expect(typeof v.aenderung).toBe("string");
      expect(typeof v.neuerWert).toBe("string");
      expect(Number.isFinite(v.score)).toBe(true);
      expect(Number.isFinite(v.deltaScore)).toBe(true);
    }
  });

  it("haelt die Worker-Grenzen ein: hoechstens 6 Eintraege, Texte <= 40 Zeichen, keine Zeilenumbrueche", () => {
    expect(varianten.length).toBeLessThanOrEqual(6);
    for (const v of varianten) {
      for (const s of [v.feld, v.aenderung, v.neuerWert]) {
        expect(s.length).toBeLessThanOrEqual(40);
        expect(s).not.toMatch(/[\r\n]/);
      }
    }
  });

  it("uebersetzt Feldschluessel in deutsche Labels", () => {
    const felder = varianten.map((v) => v.feld);
    expect(felder).toContain("Kaufpreis");
    expect(felder).not.toContain("kaufpreis");
  });

  it("rechnet neuerWert als Ausgangswert plus Delta", () => {
    const kp = varianten.find((v) => v.feld === "Kaufpreis");
    const roh = berechneHebelAnalyse(baseD, {}, berechneScore(baseD, {}));
    const rohKp = roh.varianten.find((v) => v.feld === "kaufpreis");
    const erwartet = 300000 + rohKp.delta;
    expect(kp.neuerWert).toBe(`${erwartet.toLocaleString("de-DE")} €`);
  });

  it("zeigt eine Kaufpreissenkung als Minus, nicht als Plus", () => {
    const kp = varianten.find((v) => v.feld === "Kaufpreis");
    expect(kp.aenderung.startsWith("−")).toBe(true);
  });

  it("haengt bei Monatswerten die Periode an beide Betraege", () => {
    const miete = varianten.find((v) => v.feld === "Kaltmiete");
    expect(miete.aenderung).toMatch(/\/Monat$/);
    expect(miete.neuerWert).toMatch(/\/Monat$/);
  });

  it("liefert eine leere Liste statt zu werfen, wenn kein Score moeglich ist", () => {
    expect(hebelVarianten({ kaufpreis: "0" }, {})).toEqual([]);
    expect(hebelVarianten({}, {})).toEqual([]);
  });

  it("laesst sich verlustfrei durch JSON schicken (geht so ins Netz und in resultData)", () => {
    expect(JSON.parse(JSON.stringify(varianten))).toEqual(varianten);
  });
});

describe("berechneHebelAnalyse — Cashflow und DSCR je Variante", () => {
  it("traegt cashflowMon und dscr in jeder Variante", () => {
    const roh = berechneHebelAnalyse(baseD, {}, berechneScore(baseD, {}));
    for (const v of roh.varianten) {
      expect(Number.isFinite(v.cashflowMon)).toBe(true);
      // dscr kann null sein (kein Bankdarlehen) - hier ist eins vorhanden.
      expect(v.dscr === null || Number.isFinite(v.dscr)).toBe(true);
    }
  });

  it("eine Kaufpreissenkung erhoeht den monatlichen Cashflow gegenueber dem Basiswert", () => {
    const roh = berechneHebelAnalyse(baseD, {}, berechneScore(baseD, {}));
    const kpVariante = roh.varianten.find((v) => v.feld === "kaufpreis");
    const basisCf = computeRendite(baseD, {}).cf2MitSt;
    expect(kpVariante.cashflowMon).toBeGreaterThan(basisCf);
  });
});

describe("loeseZielKaufpreis", () => {
  // baseD hat bei 300.000 € bereits einen negativen Cashflow (-267 €/Monat,
  // siehe cf2MitSt) - fuer diesen Test also eine Variante mit hoeherer Miete,
  // die beim aktuellen Kaufpreis noch positiv daliegt (Voraussetzung dafuer,
  // dass "wie weit darf der Preis steigen" ueberhaupt eine sinnvolle Frage ist).
  const dPositiverCf = { ...baseD, kaltmiete: "1400" };

  it("findet einen Kaufpreis oberhalb des aktuellen, bei dem der Cashflow gerade noch nicht negativ ist", () => {
    expect(computeRendite(dPositiverCf, {}).cf2MitSt).toBeGreaterThan(0);
    const kp = loeseZielKaufpreis(dPositiverCf, {}, { typ: "cashflowNull" });
    expect(kp).toBeGreaterThanOrEqual(+dPositiverCf.kaufpreis);
    const cfAmZiel = computeRendite({ ...dPositiverCf, kaufpreis: String(kp) }, {}).cf2MitSt;
    expect(cfAmZiel).toBeGreaterThanOrEqual(-50); // Rundung auf 500 €, plus Annuitaetsrundung
    const cfDarueber = computeRendite({ ...dPositiverCf, kaufpreis: String(kp + 5000) }, {}).cf2MitSt;
    expect(cfDarueber).toBeLessThan(cfAmZiel);
  });

  it("findet einen Kaufpreis, bei dem der Score gerade noch das aktuelle Niveau erreicht", () => {
    const basisScore = berechneScore(baseD, {}).score;
    const kp = loeseZielKaufpreis(baseD, {}, { typ: "score", wert: basisScore });
    // Die Suche startet beim aktuellen Kaufpreis (siehe Kommentar in
    // aiTools.js zur Score-Nicht-Monotonie) - das Ergebnis kann also nicht
    // darunter liegen.
    expect(kp).toBeGreaterThanOrEqual(+baseD.kaufpreis);
  });

  it("liefert null bei unbekanntem oder fehlendem Zieltyp", () => {
    expect(loeseZielKaufpreis(baseD, {}, null)).toBeNull();
    expect(loeseZielKaufpreis(baseD, {}, { typ: "unbekannt" })).toBeNull();
    expect(loeseZielKaufpreis(baseD, {}, { typ: "score", wert: 0 })).toBeNull();
  });

  it("liefert null, wenn schon der aktuelle Kaufpreis das Ziel nicht erreicht", () => {
    // Score 101 ist ausserhalb der 0..100-Skala nie erreichbar.
    expect(loeseZielKaufpreis(baseD, {}, { typ: "score", wert: 101 })).toBeNull();
    // Cashflow beim aktuellen Kaufpreis bereits negativ -> kein hoeherer
    // Kaufpreis kann das Ziel erst recht erreichen.
    const dSchlecht = { ...baseD, kaltmiete: "300" };
    expect(computeRendite(dSchlecht, {}).cf2MitSt).toBeLessThan(0);
    expect(loeseZielKaufpreis(dSchlecht, {}, { typ: "cashflowNull" })).toBeNull();
  });
});
