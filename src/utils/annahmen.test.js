// Tests zu den Annahmen und ihren Herkunftsvermerken (Spec
// docs/technical_specs/objektseite-neu.md §7). Angelegt in Schritt 2 des
// Umbaus; ausgefuehrt wird die Suite nur auf ausdrueckliche Anweisung (§27).
import { describe, it, expect } from "vitest";
import {
  annahmenFuer,
  annahmenAnwenden,
  herkunftAbleiten,
  herkunftFuerEntwurf,
  herkunftZaehlung,
  ANNAHMEN_FELDER,
  EIGENKAPITAL_QUOTE,
  HERKUNFT,
  STANDARD_ANNAHMEN,
} from "./annahmen.js";

describe("annahmenFuer — Eigenkapital (§7.3)", () => {
  it("belegt das Eigenkapital mit der Quote des Kaufpreises vor", () => {
    const a = annahmenFuer({ bundesland: "BW", flaeche: "60", kaufpreis: "300000" });
    expect(+a.eigenkapital).toBe(300000 * EIGENKAPITAL_QUOTE);
  });

  it("ohne Kaufpreis bleibt das Feld weg — eine 0 saehe aus wie eine Entscheidung", () => {
    const a = annahmenFuer({ bundesland: "BW", flaeche: "60" });
    expect(a.eigenkapital).toBeUndefined();
  });

  it("setzt kein Baujahr — es laesst sich nicht serioes raten", () => {
    const a = annahmenFuer({ bundesland: "BW", flaeche: "60", kaufpreis: "300000" });
    expect(a.baujahr).toBeUndefined();
  });

  it("die bisherigen Standardwerte bleiben unveraendert", () => {
    const a = annahmenFuer({ bundesland: "BW", flaeche: "60", kaufpreis: "300000" });
    for (const [key, wert] of Object.entries(STANDARD_ANNAHMEN)) {
      expect(a[key]).toBe(wert);
    }
  });

  it("die Grunderwerbsteuer folgt dem Bundesland, sonst greift der Rueckfall", () => {
    expect(annahmenFuer({ bundesland: "BW" }).grEst).not.toBe(undefined);
    expect(annahmenFuer({}).grEst).toBe("5");
  });
});

describe("ANNAHMEN_FELDER", () => {
  it("traegt nur Schluessel und Einheit, keinen Anzeigetext", () => {
    for (const f of ANNAHMEN_FELDER) {
      expect(typeof f.key).toBe("string");
      expect(typeof f.labelKey).toBe("string");
      expect(f.label).toBeUndefined();
    }
  });

  it("enthaelt Eigenkapital und Baujahr — die beiden Zugaenge aus §7.3", () => {
    const keys = ANNAHMEN_FELDER.map((f) => f.key);
    expect(keys).toContain("eigenkapital");
    expect(keys).toContain("baujahr");
  });

  it("keine doppelten Schluessel", () => {
    const keys = ANNAHMEN_FELDER.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("herkunftFuerEntwurf — spaetere Quelle gewinnt", () => {
  it("Annahme < PLZ < Exposé < Nutzer", () => {
    const h = herkunftFuerEntwurf({
      annahmen: { zinssatz: "4", grEst: "5", tilgung: "2", kaltmiete: "0" },
      plzKeys: ["grEst"],
      exposeKeys: ["tilgung"],
      nutzerKeys: ["kaltmiete"],
    });
    expect(h.zinssatz).toBe(HERKUNFT.ANNAHME);
    expect(h.grEst).toBe(HERKUNFT.PLZ);
    expect(h.tilgung).toBe(HERKUNFT.EXPOSE);
    expect(h.kaltmiete).toBe(HERKUNFT.NUTZER);
  });

  it("ein Nutzerwert schlaegt eine Exposé-Angabe desselben Feldes", () => {
    const h = herkunftFuerEntwurf({ exposeKeys: ["kaufpreis"], nutzerKeys: ["kaufpreis"] });
    expect(h.kaufpreis).toBe(HERKUNFT.NUTZER);
  });
});

describe("herkunftAbleiten — Altobjekte ohne Vermerk (§7.2)", () => {
  const annahmen = { zinssatz: "4", tilgung: "2", eigenkapital: "60000" };

  it("weicht der Wert von der Annahme ab, hat ihn jemand gesetzt", () => {
    const h = herkunftAbleiten({ zinssatz: "3.1", tilgung: "2" }, annahmen);
    expect(h.zinssatz).toBe(HERKUNFT.NUTZER);
    expect(h.tilgung).toBe(HERKUNFT.ANNAHME);
  });

  it("leere Felder bekommen gar keinen Vermerk", () => {
    const h = herkunftAbleiten({ zinssatz: "", tilgung: "   " }, annahmen);
    expect(h.zinssatz).toBeUndefined();
    expect(h.tilgung).toBeUndefined();
  });

  it("ein Wert ohne passende Annahme gilt als gesetzt", () => {
    const h = herkunftAbleiten({ baujahr: "1974" }, annahmen);
    expect(h.baujahr).toBe(HERKUNFT.NUTZER);
  });

  it("kennt nur nutzer und annahme — expose und plz sind nachtraeglich nicht feststellbar", () => {
    const h = herkunftAbleiten({ zinssatz: "3.1", tilgung: "2", baujahr: "1974" }, annahmen);
    const werte = new Set(Object.values(h));
    expect(werte.has(HERKUNFT.EXPOSE)).toBe(false);
    expect(werte.has(HERKUNFT.PLZ)).toBe(false);
  });

  it("ohne Daten ein leeres Objekt", () => {
    expect(herkunftAbleiten(null, annahmen)).toEqual({});
  });
});

describe("annahmenAnwenden — was einmal nutzer ist, bleibt nutzer (§7.2)", () => {
  const daten = { zinssatz: "3.1", tilgung: "2", nichtUml: "80", leerstand: "0" };
  const herkunft = {
    zinssatz: HERKUNFT.NUTZER,
    tilgung: HERKUNFT.ANNAHME,
    nichtUml: HERKUNFT.EXPOSE,
  };
  const neu = { zinssatz: "4", tilgung: "3", nichtUml: "100", leerstand: "2" };

  it("ueberschreibt keinen Nutzerwert", () => {
    const { daten: d, herkunft: h } = annahmenAnwenden(daten, herkunft, neu);
    expect(d.zinssatz).toBe("3.1");
    expect(h.zinssatz).toBe(HERKUNFT.NUTZER);
  });

  it("ueberschreibt keinen Exposé-Wert — eine Messung schlaegt einen Standardwert", () => {
    const { daten: d, herkunft: h } = annahmenAnwenden(daten, herkunft, neu);
    expect(d.nichtUml).toBe("80");
    expect(h.nichtUml).toBe(HERKUNFT.EXPOSE);
  });

  it("aktualisiert Annahmen und vermerkt neue Felder als Annahme", () => {
    const { daten: d, herkunft: h } = annahmenAnwenden(daten, herkunft, neu);
    expect(d.tilgung).toBe("3");
    expect(h.tilgung).toBe(HERKUNFT.ANNAHME);
    expect(d.leerstand).toBe("2");
    expect(h.leerstand).toBe(HERKUNFT.ANNAHME);
  });

  it("laesst die Eingaben unangetastet", () => {
    const kopie = { ...daten };
    annahmenAnwenden(daten, herkunft, neu);
    expect(daten).toEqual(kopie);
  });

  it("kommt ohne Herkunft zurecht", () => {
    const { herkunft: h } = annahmenAnwenden({}, null, { tilgung: "2" });
    expect(h.tilgung).toBe(HERKUNFT.ANNAHME);
  });
});

describe("herkunftZaehlung", () => {
  it("zaehlt je Quelle — Grundlage der hint-Zeile aus §22", () => {
    const z = herkunftZaehlung({
      a: HERKUNFT.NUTZER,
      b: HERKUNFT.NUTZER,
      c: HERKUNFT.EXPOSE,
      d: HERKUNFT.PLZ,
      e: HERKUNFT.ANNAHME,
    });
    expect(z).toEqual({ nutzer: 2, expose: 1, plz: 1, annahme: 1 });
  });

  it("ignoriert unbekannte Werte und kommt mit nichts zurecht", () => {
    expect(herkunftZaehlung({ a: "quatsch" })).toEqual({
      nutzer: 0,
      expose: 0,
      plz: 0,
      annahme: 0,
    });
    expect(herkunftZaehlung(null).nutzer).toBe(0);
  });
});
