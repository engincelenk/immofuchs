// Haelt die fuenf Sprachen der Objektseite synchron (Spec docs/technical_specs/
// objektseite-neu.md §26.6). Ein fehlender Schluessel faellt sonst erst im
// laufenden Betrieb auf - und zwar nur dem, der die Sprache benutzt.
import { describe, it, expect } from "vitest";
import { T } from "./translations.js";
import { OBJ_T } from "./objektseite.js";

describe("Objektseiten-Schluessel in T gemischt", () => {
  const sprachen = Object.keys(OBJ_T);
  it("alle fuenf Sprachen vorhanden", () => {
    expect(sprachen.sort()).toEqual(["de", "en", "hi", "tr", "zh"]);
  });
  it("jeder Schluessel liegt in jeder Sprache in T", () => {
    const keys = Object.keys(OBJ_T.de);
    for (const s of sprachen) {
      for (const k of keys) {
        expect(T[s][k], `${s}.${k}`).toBeTruthy();
      }
    }
  });
  it("gleiche Schluesselmenge in allen Sprachen", () => {
    const de = Object.keys(OBJ_T.de).sort();
    for (const s of sprachen) expect(Object.keys(OBJ_T[s]).sort(), s).toEqual(de);
  });
  it("Platzhalter stimmen je Schluessel ueberein", () => {
    const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
    for (const k of Object.keys(OBJ_T.de)) {
      for (const s of Object.keys(OBJ_T)) {
        expect(ph(OBJ_T[s][k]), `${s}.${k}`).toBe(ph(OBJ_T.de[k]));
      }
    }
  });
});

// Alternativ-Investment (Nachtrag 2026-10-03): die Rueckblick-/Risiko-Texte
// tragen Zahlen aus der monatlichen Datenpflege. Uebersetzung und Datendatei
// duerfen nicht auseinanderlaufen.
import { ALTERNATIV_ANLAGEN_DATEN } from "../data/alternativAnlagen.js";

describe("Alternativ-Investment: Uebersetzungen der Anlagedaten", () => {
  // Zahlen sprachneutral vergleichen: Dezimalkomma = Dezimalpunkt,
  // Tausenderpunkt/-komma vor genau drei Ziffern entfernt.
  const zahlen = (s) =>
    (String(s)
      .replace(/(\d)[.,](\d{3})(?!\d)/g, "$1$2")
      .match(/\d+(?:[.,]\d+)?/g) || [])
      .map((z) => z.replace(",", "."))
      .sort()
      .join(" ");

  it("deutsche Texte entsprechen der Datendatei", () => {
    for (const a of ALTERNATIV_ANLAGEN_DATEN) {
      expect(OBJ_T.de[`altName_${a.key}`], a.key).toBe(a.name);
      expect(OBJ_T.de[`altRisiko_${a.key}`], a.key).toBe(a.risiko);
      if (a.key === "bundesanleihe") continue; // {rendite}/{stand} statt fester Zahlen
      expect(OBJ_T.de[`altHistorie_${a.key}`], a.key).toBe(a.historie);
      expect(OBJ_T.de[`altBeispiel_${a.key}`], a.key).toBe(a.beispiel);
    }
  });

  it("jede Sprache nennt dieselben Zahlen wie der deutsche Text", () => {
    for (const a of ALTERNATIV_ANLAGEN_DATEN) {
      for (const feld of ["altHistorie_", "altRisiko_", "altBeispiel_"]) {
        const k = feld + a.key;
        for (const s of Object.keys(OBJ_T)) {
          expect(zahlen(OBJ_T[s][k]), `${s}.${k}`).toBe(zahlen(OBJ_T.de[k]));
        }
      }
    }
  });
});
