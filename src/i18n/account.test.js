import { describe, it, expect } from "vitest";
import { ACCOUNT_T } from "./account.js";

// Analog zu vollstaendigkeit.test.js: haelt die 5 Sprachbloecke fuer die
// neuen Konto-/Login-Texte deckungsgleich, damit ein fehlender Schluessel
// nicht erst als "undefined" im Betrieb auffaellt.
const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

describe("Konto-/Login-Texte (i18n/account.js)", () => {
  it("haelt alle Sprachbloecke deckungsgleich", () => {
    const referenz = Object.keys(ACCOUNT_T.de).sort();
    for (const lang of SPRACHEN) {
      expect(Object.keys(ACCOUNT_T[lang]).sort(), `Sprache ${lang}`).toEqual(referenz);
    }
  });

  it.each(SPRACHEN)("hat in %s keine leeren Werte", (lang) => {
    const leer = Object.entries(ACCOUNT_T[lang])
      .filter(([, v]) => !v || String(v).trim().length === 0)
      .map(([k]) => k);
    expect(leer).toEqual([]);
  });
});
