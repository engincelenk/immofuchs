import { describe, it, expect } from "vitest";
import { berechnePreisSchaetzung, preisZeilen } from "./preisSchaetzung.js";
import { dekodiere } from "./mietReferenz.js";

// Dieselbe Basis wie investmentScore.test.js: 60 m², 900 € Kaltmiete
// entspricht 15,00 €/m².
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

describe("berechnePreisSchaetzung", () => {
  it("meldet nicht verfuegbar, solange ein Eingangswert fehlt", () => {
    expect(berechnePreisSchaetzung(baseD, {}, 0).verfuegbar).toBe(false);
    expect(berechnePreisSchaetzung(baseD, {}, null).verfuegbar).toBe(false);
    expect(berechnePreisSchaetzung({ ...baseD, flaeche: "0" }, {}, 10).verfuegbar).toBe(false);
    expect(berechnePreisSchaetzung({ ...baseD, kaltmiete: "" }, {}, 10).verfuegbar).toBe(false);
    expect(berechnePreisSchaetzung({}, {}, 10).verfuegbar).toBe(false);
  });

  it("rechnet die eigene Miete je m² aus Kaltmiete und Flaeche", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 10);
    expect(s.eigeneMieteQm).toBeCloseTo(15, 6);
  });

  it("weist die Abweichung zum Ortsniveau als Prozent aus", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 10);
    expect(s.abweichungProzent).toBeCloseTo(50, 6);
    expect(s.ueberOrtsniveau).toBe(true);
    expect(s.auffaellig).toBe(true);
  });

  it("erkennt eine Miete unter Ortsniveau", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 20);
    expect(s.abweichungProzent).toBeCloseTo(-25, 6);
    expect(s.ueberOrtsniveau).toBe(false);
    expect(s.auffaellig).toBe(true);
  });

  it("schlaegt bei kleiner Abweichung keinen Alarm - der Zensuswert ist ein Mittel", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 14.5);
    expect(Math.abs(s.abweichungProzent)).toBeLessThan(8);
    expect(s.auffaellig).toBe(false);
  });

  it("leitet bei zu optimistischer Mietannahme einen niedrigeren Preis ab", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 10);
    expect(s.preisBeiReferenz).toBeGreaterThan(0);
    expect(s.preisBeiReferenz).toBeLessThan(s.kaufpreis);
  });

  it("spannt zwischen den beiden gerechneten Ankern auf, nicht um einen erfundenen Mittelwert", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 10);
    expect(s.spanneVon).toBe(Math.min(s.kaufpreis, s.preisBeiReferenz));
    expect(s.spanneBis).toBe(Math.max(s.kaufpreis, s.preisBeiReferenz));
  });

  it("dreht die Spanne, wenn die Miete unter dem Ortsniveau liegt", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 20);
    expect(s.preisBeiReferenz).toBeGreaterThan(s.kaufpreis);
    expect(s.spanneVon).toBe(s.kaufpreis);
  });

  it("liefert den Kaufpreis je m²", () => {
    const s = berechnePreisSchaetzung(baseD, {}, 10);
    expect(s.kaufpreisQm).toBeCloseTo(5000, 6);
  });
});

describe("preisZeilen", () => {
  it("liefert nichts, wenn die Schaetzung nicht verfuegbar ist", () => {
    expect(preisZeilen({ verfuegbar: false })).toEqual([]);
    expect(preisZeilen(null)).toEqual([]);
  });

  it("formatiert deutsch und nennt Referenz, Annahme und Abweichung", () => {
    const zeilen = preisZeilen(berechnePreisSchaetzung(baseD, {}, 10));
    const map = Object.fromEntries(zeilen.map((z) => [z.label, z.wert]));
    expect(map["Ortsübliche Miete"]).toBe("10,00 €/m²");
    expect(map["Deine Mietannahme"]).toBe("15,00 €/m²");
    expect(map["Abweichung"]).toBe("+50 %");
    expect(map["Kaufpreis je m²"]).toBe("5.000,00 €/m²");
  });

  it("zeigt ein Minus bei Miete unter Ortsniveau", () => {
    const zeilen = preisZeilen(berechnePreisSchaetzung(baseD, {}, 20));
    expect(zeilen.find((z) => z.label === "Abweichung").wert).toBe("−25 %");
  });

  it("haelt die Worker-Grenzen ein (40 Zeichen, keine Zeilenumbrueche)", () => {
    for (const z of preisZeilen(berechnePreisSchaetzung(baseD, {}, 10))) {
      expect(z.label.length).toBeLessThanOrEqual(40);
      expect(z.wert.length).toBeLessThanOrEqual(40);
      expect(`${z.label}${z.wert}`).not.toMatch(/[\r\n]/);
    }
  });
});

describe("mietReferenz.dekodiere", () => {
  it("liest die PLZ als Differenz, den Mietwert aber absolut", () => {
    // 10115 -> 9,3 ; naechster Eintrag +1 PLZ (10116) -> 10,8.
    // Die Miete benachbarter PLZ korreliert kaum, eine Differenzkodierung
    // wuerde dort nichts sparen - deshalb absolut.
    const map = dekodiere(
      `${(10115).toString(36)},${(93).toString(36)}|1,${(108).toString(36)}`,
    );
    expect(map.get("10115")).toBeCloseTo(9.3, 6);
    expect(map.get("10116")).toBeCloseTo(10.8, 6);
  });

  it("fuellt vierstellige PLZ auf fuenf Stellen auf", () => {
    const map = dekodiere(`${(4109).toString(36)},${(70).toString(36)}`);
    expect(map.get("04109")).toBeCloseTo(7, 6);
  });

  it("ueberspringt kaputte Eintraege statt zu werfen", () => {
    const map = dekodiere("kaputt|");
    expect(map.size).toBe(0);
  });
});
