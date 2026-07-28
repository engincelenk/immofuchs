import { describe, it, expect } from "vitest";
import {
  baueZeilen,
  uebernehmeZeilen,
  zaehleZeilen,
  mapEnergietraeger,
  FELD_DEFS,
} from "./exposeMapping.js";
import { EXPOSE_T } from "../i18n/expose.js";

const t = EXPOSE_T.de;

// Auszug aus dem echten Extraktionsergebnis der Referenz-Anzeige
// (Spec Abschnitt 4, ImmoScout24 Bietigheim-Bissingen).
function ergebnis(overrides = {}) {
  return {
    objekt: {
      titel: "Moderne Erdgeschosswohnung",
      objektart: "Etagenwohnung",
      kaufpreis: 269000,
      wohnflaeche: 54,
      plz: "74321",
      ort: "Bietigheim-Bissingen",
      baujahr: 2018,
      ...(overrides.objekt ?? {}),
    },
    ausstattung: { balkon_terrasse: true, keller: true, ...(overrides.ausstattung ?? {}) },
    energie: { energietraeger: "Holzpellets", ...(overrides.energie ?? {}) },
    kosten: {
      hausgeld: 419,
      provision_kaeufer_prozent: 3.57,
      kaufnebenkosten: 28433,
      ...(overrides.kosten ?? {}),
    },
    kontext: {},
    bild: {},
    confidence: { kaufpreis: "sicher", wohnflaeche: "sicher", ...(overrides.confidence ?? {}) },
    warnungen: overrides.warnungen ?? [],
  };
}

function zeile(zeilen, key) {
  return zeilen.find((z) => z.key === key);
}

describe("baueZeilen", () => {
  it("liefert eine Zeile pro definiertem Feld", () => {
    const zeilen = baueZeilen(ergebnis(), {}, t);
    expect(zeilen).toHaveLength(FELD_DEFS.length);
  });

  it("formatiert Werte mit Einheit und uebersetztem Label", () => {
    const zeilen = baueZeilen(ergebnis(), {}, t);
    expect(zeile(zeilen, "kaufpreis").anzeige).toBe("269.000 €");
    expect(zeile(zeilen, "wohnflaeche").anzeige).toBe("54 m²");
    expect(zeile(zeilen, "balkon_terrasse").anzeige).toBe("ja");
    expect(zeile(zeilen, "kaufpreis").label).toBe("Kaufpreis");
  });

  it("formatiert Zahlen wertgerecht statt schematisch", () => {
    const zeilen = baueZeilen(
      ergebnis({ objekt: { baujahr: 1996, zimmer: 3, wohnflaeche: 80.05 } }),
      {},
      t,
    );
    // Jahreszahl ohne Tausenderpunkt, Zimmer ohne Nachkomma,
    // Nachkommastellen bleiben erhalten statt weggerundet zu werden.
    expect(zeile(zeilen, "baujahr").anzeige).toBe("1996");
    expect(zeile(zeilen, "zimmer").anzeige).toBe("3");
    expect(zeile(zeilen, "wohnflaeche").anzeige).toBe("80,05 m²");
  });

  it("markiert nicht gefundene Felder als leer", () => {
    const zeilen = baueZeilen(ergebnis({ objekt: { kaufpreis: null } }), {}, t);
    const z = zeile(zeilen, "kaufpreis");
    expect(z.gefunden).toBe(false);
    expect(z.status).toBe("nicht_gefunden");
    expect(z.uebernehmbar).toBe(false);
    expect(z.anzeige).toBe("nicht gefunden");
  });

  // CEO-Auflage, Spec 4.4
  it("markiert Provision und Kaufnebenkosten immer zum Pruefen, auch bei confidence sicher", () => {
    const zeilen = baueZeilen(
      ergebnis({ confidence: { provision_kaeufer_prozent: "sicher", kaufnebenkosten: "sicher" } }),
      {},
      t,
    );
    expect(zeile(zeilen, "provision_kaeufer_prozent").status).toBe("pruefen");
    expect(zeile(zeilen, "kaufnebenkosten").status).toBe("pruefen");
  });

  it("uebernimmt eine Warnung aus dem warnungen-Array in die betroffene Zeile", () => {
    const zeilen = baueZeilen(
      ergebnis({ warnungen: [{ feld: "wohnflaeche", hinweis: "54 vs. 52 m²" }] }),
      {},
      t,
    );
    const z = zeile(zeilen, "wohnflaeche");
    expect(z.warnung).toBe("54 vs. 52 m²");
    expect(z.status).toBe("unsicher");
  });

  it("erkennt einen Konflikt mit einem bestehenden Rechnerwert", () => {
    const zeilen = baueZeilen(ergebnis(), { kaufpreis: "250000" }, t);
    const z = zeile(zeilen, "kaufpreis");
    expect(z.konflikt).toBe(true);
    expect(z.bestehend).toBe("250000");
    expect(z.neuerWert).toBe("269000");
  });

  it("meldet keinen Konflikt, wenn der bestehende Wert identisch ist", () => {
    const zeilen = baueZeilen(ergebnis(), { kaufpreis: "269000" }, t);
    expect(zeile(zeilen, "kaufpreis").konflikt).toBe(false);
  });

  it("laesst Felder ohne Rechnerziel als reine Anzeige stehen", () => {
    const zeilen = baueZeilen(ergebnis(), {}, t);
    expect(zeile(zeilen, "hausgeld").uebernehmbar).toBe(false);
    expect(zeile(zeilen, "hausgeld").gefunden).toBe(true);
    expect(zeile(zeilen, "kaufnebenkosten").uebernehmbar).toBe(false);
  });

  it("macht einen unbekannten Energietraeger nicht uebernehmbar", () => {
    const zeilen = baueZeilen(ergebnis({ energie: { energietraeger: "Kernfusion" } }), {}, t);
    expect(zeile(zeilen, "energietraeger").uebernehmbar).toBe(false);
    expect(zeile(zeilen, "energietraeger").gefunden).toBe(true);
  });
});

describe("uebernehmeZeilen", () => {
  function sammle() {
    const d = {};
    return { d, set: (k, v) => (d[k] = v) };
  }

  it("schreibt nur ausgewaehlte Felder", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis(), {}, t);
    const anzahl = uebernehmeZeilen(zeilen, new Set(["kaufpreis"]), set);
    expect(anzahl).toBe(1);
    expect(d).toEqual({ kaufpreis: "269000" });
  });

  it("laesst einen bestehenden Wert stehen, solange das Feld nicht ausgewaehlt ist", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis(), { kaufpreis: "250000" }, t);
    uebernehmeZeilen(zeilen, new Set(), set);
    expect(d.kaufpreis).toBeUndefined();
  });

  it("befuellt beide Ziele der Wohnflaeche (Rendite und Sanierung)", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis(), {}, t);
    uebernehmeZeilen(zeilen, new Set(["wohnflaeche"]), set);
    expect(d.flaeche).toBe("54");
    expect(d.sanFl).toBe("54");
  });

  it("zieht bei der PLZ Ort und Bundesland nach", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis({ objekt: { plz: "70173" } }), {}, t);
    uebernehmeZeilen(zeilen, new Set(["plz"]), set);
    expect(d.plz).toBe("70173");
    expect(d.ort).toBe("Stuttgart");
    expect(d.bundesland).toBe("BW");
  });

  it("bildet den Energietraeger auf den Auswahlwert des Sanierungsrechners ab", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis(), {}, t);
    uebernehmeZeilen(zeilen, new Set(["energietraeger"]), set);
    expect(d.sanHt).toBe("pellets");
  });

  it("ignoriert Felder ohne Rechnerziel, auch wenn sie ausgewaehlt sind", () => {
    const { d, set } = sammle();
    const zeilen = baueZeilen(ergebnis(), {}, t);
    const anzahl = uebernehmeZeilen(zeilen, new Set(["hausgeld", "titel"]), set);
    expect(anzahl).toBe(0);
    expect(d).toEqual({});
  });
});

describe("zaehleZeilen", () => {
  it("zaehlt gefundene Felder und die zu pruefenden getrennt", () => {
    const zeilen = baueZeilen(ergebnis(), {}, t);
    const { gesamt, gefunden, zuPruefen } = zaehleZeilen(zeilen);
    expect(gesamt).toBe(FELD_DEFS.length);
    expect(gefunden).toBeGreaterThan(0);
    expect(gefunden).toBeLessThan(gesamt);
    // Provision und Kaufnebenkosten sind per Auflage immer dabei.
    expect(zuPruefen).toBeGreaterThanOrEqual(2);
  });
});

describe("mapEnergietraeger", () => {
  it("erkennt die gaengigen Schreibweisen", () => {
    expect(mapEnergietraeger("Holzpellets")).toBe("pellets");
    expect(mapEnergietraeger("Erdgas")).toBe("gas");
    expect(mapEnergietraeger("Heizöl")).toBe("heizoel");
    expect(mapEnergietraeger("Luft-Wasser-Wärmepumpe")).toBe("wp");
    expect(mapEnergietraeger("Fernwärme")).toBe("fernw-std");
  });

  it("gibt null zurueck, wenn nichts passt", () => {
    expect(mapEnergietraeger("Kernfusion")).toBeNull();
    expect(mapEnergietraeger(null)).toBeNull();
  });
});
