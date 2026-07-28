import { describe, it, expect } from "vitest";
import { FELD_DEFS } from "../utils/exposeMapping.js";
import { EXPOSE_T } from "./expose.js";
import { TIPS } from "./tips.js";
import { T } from "./translations.js";

// Waechter gegen halb uebersetzte Features: die App laedt fuenf Sprachen, und
// ein fehlender Schluessel faellt im Betrieb erst auf, wenn jemand die Sprache
// umstellt - dann steht dort "undefined". Diese Tests halten die Sprachbloecke
// deckungsgleich, ohne dass man sie von Hand durchzaehlen muss.

const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

describe("Expose-Feldlabels", () => {
  it.each(SPRACHEN)("hat in %s ein Label fuer jedes Feld aus FELD_DEFS", (lang) => {
    const fehlend = FELD_DEFS.filter((def) => !EXPOSE_T[lang].felder[def.key]).map((d) => d.key);
    expect(fehlend).toEqual([]);
  });

  it("fuehrt keine Labels ohne zugehoeriges Feld", () => {
    const keys = new Set(FELD_DEFS.map((d) => d.key));
    expect(Object.keys(EXPOSE_T.de.felder).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("haelt alle Sprachbloecke deckungsgleich", () => {
    const referenz = Object.keys(EXPOSE_T.de.felder).sort();
    for (const lang of SPRACHEN) {
      expect(Object.keys(EXPOSE_T[lang].felder).sort(), `Sprache ${lang}`).toEqual(referenz);
    }
  });
});

describe("Tooltips und Beschriftungen der neuen Felder", () => {
  // Felder, die in dieser Runde dazugekommen sind bzw. deren Berechnung sich
  // geaendert hat - fuer die muss die Erklaerung in jeder Sprache stehen.
  it.each(SPRACHEN)("hat in %s die Tooltips zu nichtUml/Ist-Verbrauch", (lang) => {
    for (const key of ["nichtUml", "sanIstVerbrauch"]) {
      expect(TIPS[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });

  it.each(SPRACHEN)("hat in %s die Ist-Verbrauch-Beschriftungen", (lang) => {
    for (const key of [
      "sIstVerbrauch",
      "sIstVerbrauchAktiv",
      "sIstVerbrauchNachWw",
      "sIstVerbrauchSchaetzung",
    ]) {
      expect(T[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });

  // Instandhaltungsruecklage als eigenes Feld/Ampel ist 2026-07-28 wieder
  // entfernt worden (kaum im Expose vorhanden, Doppelung zu nichtUml). Der
  // Hinweis darauf steckt jetzt im nichtUml-Tooltip selbst.
  it.each(SPRACHEN)("hat in %s keine verwaisten Ruecklage-Schluessel mehr", (lang) => {
    for (const key of ["ruecklage", "rlGreen", "rlYellow", "rlRed", "richtwert"]) {
      expect(T[lang][key], `${lang}.${key}`).toBeUndefined();
      expect(TIPS[lang][key], `TIPS.${lang}.${key}`).toBeUndefined();
    }
  });

  it.each(SPRACHEN)("erwaehnt die Ruecklage im nichtUml-Tooltip", (lang) => {
    expect(TIPS[lang].nichtUml, `${lang}.nichtUml`).toMatch(/r[üu]cklage|reserve|rezerv|储备金|आरक्षित/i);
  });
});
