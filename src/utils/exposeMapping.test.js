import { describe, it, expect } from "vitest";
import {
  baueZeilen,
  uebernehmeZeilen,
  zaehleZeilen,
  enthaeltKaltmiete,
  mapEnergietraeger,
  mapVermietet,
  mapDatum,
  mapHeizungsalter,
  mapEndenergie,
  mapZustandRenovierung,
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

describe("enthaeltKaltmiete", () => {
  it("erkennt eine ausgewaehlte Kaltmiete", () => {
    const zeilen = baueZeilen(ergebnis({ kosten: { kaltmiete: 650 } }), {}, t);
    expect(enthaeltKaltmiete(zeilen, new Set(["kaltmiete", "wohnflaeche"]))).toBe(true);
  });

  it("meldet false, wenn nur die Wohnflaeche uebernommen wird", () => {
    // Wichtig fuer die Sync-Richtung: ohne Kaltmiete soll der Renditerechner
    // die Kaltmiete weiter aus €/m² × neuer Flaeche nachziehen.
    const zeilen = baueZeilen(ergebnis({ kosten: { kaltmiete: 650 } }), {}, t);
    expect(enthaeltKaltmiete(zeilen, new Set(["wohnflaeche"]))).toBe(false);
  });

  it("meldet false, wenn im Expose gar keine Kaltmiete steht", () => {
    const zeilen = baueZeilen(ergebnis(), {}, t);
    expect(enthaeltKaltmiete(zeilen, new Set(["kaltmiete"]))).toBe(false);
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

// ── Neue Uebernahmen (Referenzexposes Ingersheim + Murr) ───────────────────

describe("mapVermietet", () => {
  it("bildet den Bool auf die Belegungs-Auswahl ab", () => {
    expect(mapVermietet(true)).toBe("ja");
    expect(mapVermietet(false)).toBe("nein");
  });

  it("liefert null bei fehlender Angabe statt 'nein' zu raten", () => {
    // Ein Expose, das nichts zur Vermietung sagt, ist nicht dasselbe wie ein
    // Expose, das ausdruecklich "nicht vermietet" sagt.
    expect(mapVermietet(null)).toBe(null);
    expect(mapVermietet("ja")).toBe(null);
  });
});

describe("mapDatum", () => {
  it("wandelt das deutsche Expose-Format in den Wert des date-Inputs", () => {
    expect(mapDatum("01.10.2025")).toBe("2025-10-01");
    expect(mapDatum("1.9.2024")).toBe("2024-09-01");
  });

  it("laesst ISO unveraendert", () => {
    expect(mapDatum("2025-10-01")).toBe("2025-10-01");
  });

  it("weist Unbrauchbares ab", () => {
    expect(mapDatum("ab sofort")).toBe(null);
    expect(mapDatum("32.01.2025")).toBe(null);
    expect(mapDatum("01.13.2025")).toBe(null);
    expect(mapDatum(null)).toBe(null);
  });
});

describe("mapHeizungsalter", () => {
  const heute = new Date("2026-07-28");

  it("stuft nach dem Alter des Waermeerzeugers ein", () => {
    expect(mapHeizungsalter(1996, heute)).toBe("alt"); // 30 J. — Expose Ingersheim
    expect(mapHeizungsalter(2010, heute)).toBe("mittel"); // 16 J.
    expect(mapHeizungsalter(2020, heute)).toBe("neu"); // 6 J.
  });

  it("trifft die Stufengrenzen 10 und 20 Jahre", () => {
    // Die Auswahl heisst "Ueber 20 J." / "10-20 J." / "Unter 10 J." - genau 20
    // Jahre gehoeren deshalb noch in die mittlere Stufe.
    expect(mapHeizungsalter(2006, heute)).toBe("mittel"); // exakt 20
    expect(mapHeizungsalter(2005, heute)).toBe("alt"); // 21
    expect(mapHeizungsalter(2016, heute)).toBe("mittel"); // exakt 10
    expect(mapHeizungsalter(2017, heute)).toBe("neu"); // 9
  });

  it("weist unplausible Jahre ab", () => {
    expect(mapHeizungsalter(1800, heute)).toBe(null);
    expect(mapHeizungsalter(2030, heute)).toBe(null);
    expect(mapHeizungsalter(null, heute)).toBe(null);
  });
});

describe("mapEndenergie", () => {
  it("uebernimmt Werte innerhalb der Plausibilitaetsgrenzen", () => {
    expect(mapEndenergie(77.4)).toBe("77.4"); // Expose Ingersheim
    expect(mapEndenergie(94)).toBe("94"); // Expose Murr
  });

  it("verwirft Ausreisser, damit die Baujahr-Schaetzung greift", () => {
    expect(mapEndenergie(7)).toBe(null); // verrutschtes Komma
    expect(mapEndenergie(12128)).toBe(null); // Jahresverbrauch statt Kennwert
  });
});

describe("mapZustandRenovierung", () => {
  it("leitet aus dem Zustand einen Betrag je m² ab", () => {
    expect(mapZustandRenovierung("Gepflegt", 76)).toBe("0"); // Expose Murr
    expect(mapZustandRenovierung("renovierungsbedürftig", 50)).toBe("30000"); // 600 €/m²
    expect(mapZustandRenovierung("nach Vereinbarung", 60)).toBe("15000"); // 250 €/m²
  });

  it("bewertet 'unsaniert' als schlechten Zustand, nicht als 'saniert'", () => {
    // "unsaniert" enthaelt "saniert" - die Pruefreihenfolge muss das abfangen.
    expect(mapZustandRenovierung("unsaniert", 50)).toBe("30000");
  });

  it("liefert null ohne Wohnflaeche", () => {
    expect(mapZustandRenovierung("Gepflegt", 0)).toBe(null);
    expect(mapZustandRenovierung(null, 76)).toBe(null);
  });
});

describe("Uebernahme der neuen Felder", () => {
  function uebernehme(erg) {
    const zeilen = baueZeilen(erg, {}, t);
    const auswahl = new Set(zeilen.filter((z) => z.uebernehmbar).map((z) => z.key));
    const gesetzt = {};
    uebernehmeZeilen(zeilen, auswahl, (k, v) => (gesetzt[k] = v), erg);
    return gesetzt;
  }

  it("setzt aus dem Mietbeginn zugleich die Ausgangsmiete des Mietrechners", () => {
    const gesetzt = uebernehme(
      ergebnis({
        objekt: { vermietet: true, vermietet_seit: "01.10.2025" },
        kosten: { kaltmiete: 1000 },
      }),
    );
    expect(gesetzt.letzteErhDatum).toBe("2025-10-01");
    // Gleiche Miete davor und danach = keine Erhoehung in der Historie.
    expect(gesetzt.letzteErhMiete).toBe("1000");
    expect(gesetzt.immLeer).toBe("ja");
  });

  it("uebernimmt den Energieausweis-Wert in den Sanierungsrechner", () => {
    const gesetzt = uebernehme(ergebnis({ energie: { endenergiebedarf: 94 } }));
    expect(gesetzt.sanIstVerbrauch).toBe("94");
  });

  it("laesst den Sanierungsrechner bei unplausiblem Kennwert schaetzen", () => {
    const zeilen = baueZeilen(ergebnis({ energie: { endenergiebedarf: 12128 } }), {}, t);
    expect(zeile(zeilen, "endenergiebedarf").uebernehmbar).toBe(false);
  });

  it("uebernimmt die nicht umlagefaehigen Kosten NIE aus dem Expose", () => {
    // Bewusste Produktentscheidung: nichtUml wird aus der Wohnflaeche
    // gerechnet, damit der Wert ueber Objekte hinweg vergleichbar bleibt.
    // Der Expose-Wert ist reine Anzeige.
    const zeilen = baueZeilen(
      ergebnis({ kosten: { hausgeld_nicht_umlagefaehig: 77.07 } }),
      {},
      t,
    );
    const z = zeile(zeilen, "hausgeld_nicht_umlagefaehig");
    expect(z.gefunden).toBe(true);
    expect(z.uebernehmbar).toBe(false);
    expect(z.ziele).toEqual([]);
  });

  it("uebernimmt die Instandhaltungsruecklage fuer die Ampel", () => {
    const gesetzt = uebernehme(ergebnis({ kosten: { ruecklage_monatlich: 45.83 } }));
    expect(gesetzt.ruecklage).toBe("45.83");
  });

  it("uebernimmt Strasse und Hausnummer fuer den Merklisten-Namen", () => {
    const gesetzt = uebernehme(
      ergebnis({ objekt: { strasse: "Murrstrasse", hausnummer: "2" } }),
    );
    expect(gesetzt.strasse).toBe("Murrstrasse");
    expect(gesetzt.hausnummer).toBe("2");
  });

  it("laesst Nutzflaeche und Wohneinheiten als reine Anzeige stehen", () => {
    const zeilen = baueZeilen(
      ergebnis({ objekt: { nutzflaeche: 8, wohneinheiten: 22 } }),
      {},
      t,
    );
    expect(zeile(zeilen, "nutzflaeche").uebernehmbar).toBe(false);
    expect(zeile(zeilen, "wohneinheiten").uebernehmbar).toBe(false);
  });
});

describe("Mietbeginn ohne Kaltmiete-Uebernahme", () => {
  it("setzt keine Ausgangsmiete, wenn die Kaltmiete abgewaehlt ist", () => {
    // Sonst entsteht eine erfundene Mieterhoehung: letzteErhMiete waere die
    // Expose-Miete (1000), die Ist-Miete im Rechner aber der alte Wert (1200).
    // buildMP in mietprognose.js legt bei lM < miete einen Historieneintrag an
    // und verbraucht damit Kappungsgrenze, die nie genutzt wurde.
    const erg = ergebnis({
      objekt: { vermietet_seit: "01.10.2025" },
      kosten: { kaltmiete: 1000 },
    });
    const zeilen = baueZeilen(erg, {}, t);
    const auswahl = new Set(["vermietet_seit"]); // Kaltmiete bewusst NICHT dabei
    const gesetzt = {};
    uebernehmeZeilen(zeilen, auswahl, (k, v) => (gesetzt[k] = v), erg);
    expect(gesetzt.letzteErhDatum).toBe("2025-10-01");
    expect(gesetzt.letzteErhMiete).toBeUndefined();
  });
});
