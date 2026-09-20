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
