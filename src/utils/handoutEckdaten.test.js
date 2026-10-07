import { describe, it, expect } from "vitest";
import { katalogFuerObjekt, ergaenzeUmKatalog } from "./handoutEckdaten.js";
import { ALLE_FRAGEN } from "../data/finnFragenkatalog.js";

// Vollstaendig ausgefuellte Eckdaten (Kaufpreis, Wohnflaeche, Kaltmiete,
// Baujahr) - dieselben vier Felder, die objektKennzahlen.js als tragende
// "Eckdaten" gewichtet.
const VOLLSTAENDIG = {
  kaufpreis: "300000",
  flaeche: "80",
  kaltmiete: "900",
  baujahr: "1981",
  // Felder, die es am Objekt zwar gibt, aber NICHT uebernommen werden
  // duerfen, weil sie in App.jsx createDefaults() einen generischen
  // Startwert tragen, der nichts ueber DIESES Objekt aussagt.
  garage: "20000",
  makler: "3.57",
  wohneinheiten: "1",
};

describe("katalogFuerObjekt", () => {
  it("beantwortet die Katalogfragen zu Wohnflaeche, Kaufpreis, Kaltmiete und Baujahr", () => {
    const katalog = katalogFuerObjekt({ title: "Musterwohnung" }, VOLLSTAENDIG);
    const beantwortetIds = katalog.bekannt.map((b) => b.id);

    expect(beantwortetIds).toContain("1.1"); // Wohnflaeche
    expect(beantwortetIds).toContain("2.1"); // Gesamtkaufpreis
    expect(beantwortetIds).toContain("3.2"); // Kaltmiete
    expect(beantwortetIds).toContain("4.1"); // Baujahr

    const checklistenIds = katalog.checkliste.map((c) => c.id);
    expect(checklistenIds).not.toContain("1.1");
    expect(checklistenIds).not.toContain("2.1");
    expect(checklistenIds).not.toContain("3.2");
    expect(checklistenIds).not.toContain("4.1");
  });

  it("formuliert die Eckdaten ohne Expose-Bezug", () => {
    const katalog = katalogFuerObjekt({ title: "Musterwohnung" }, VOLLSTAENDIG);
    for (const b of katalog.bekannt) {
      expect(b.text).not.toMatch(/Exposé/i);
    }
  });

  it("uebernimmt generische Rechner-Defaults NICHT als bekannte Fakten (Maklerprovision, Wohneinheiten)", () => {
    const katalog = katalogFuerObjekt({ title: "Musterwohnung" }, VOLLSTAENDIG);
    const beantwortetIds = katalog.bekannt.map((b) => b.id);
    // 2.4 (Maklerprovision) und 5.5 (Wohneinheiten) haetten Resolver, die auf
    // `makler`/`wohneinheiten` reagieren wuerden - die bleiben hier bewusst
    // unbeantwortet, weil "3.57" bzw. "1" reine Formular-Startwerte sind.
    expect(beantwortetIds).not.toContain("2.4");
    expect(beantwortetIds).not.toContain("5.5");
    const checklistenIds = katalog.checkliste.map((c) => c.id);
    expect(checklistenIds).toContain("2.4");
    expect(checklistenIds).toContain("5.5");
  });

  it("blendet die Vermietungs-Fragen bei fehlender Kaltmiete komplett aus", () => {
    const katalog = katalogFuerObjekt(
      { title: "Musterwohnung" },
      { kaufpreis: "300000", flaeche: "80", baujahr: "1981" },
    );
    // Ohne Kaltmiete gilt das Objekt als nicht vermietet - Abschnitt 3 taucht
    // dann weder in der Checkliste noch (ueber die Vollstaendigkeitspruefung
    // hinaus) unter "bekannt" auf, weil er komplett uebersprungen wird.
    expect(katalog.checkliste.some((c) => c.abschnitt === 3)).toBe(false);
    expect(katalog.bekannt.some((b) => b.id === "3.2")).toBe(false);
    // Kaufpreis, Wohnflaeche und Baujahr sind trotzdem als Eckdaten bekannt.
    expect(katalog.bekannt.map((b) => b.id)).toEqual(
      expect.arrayContaining(["1.1", "2.1", "4.1"]),
    );
  });

  it("behandelt eine Kaltmiete von 0 als nicht vermietet, nicht als bekannten Fakt", () => {
    const katalog = katalogFuerObjekt(
      { title: "Musterwohnung" },
      { kaufpreis: "300000", flaeche: "80", baujahr: "1981", kaltmiete: "0" },
    );
    expect(katalog.checkliste.some((c) => c.abschnitt === 3)).toBe(false);
    expect(katalog.bekannt.some((b) => b.id === "3.2")).toBe(false);
  });

  it("liefert bei einem komplett leeren Objekt trotzdem den vollen offenen Katalog", () => {
    const katalog = katalogFuerObjekt({}, {});
    expect(katalog.bekannt).toHaveLength(0);
    // ETW-Default (kein Titel-Hinweis) + nicht vermietet: die WEG-Fragen
    // bleiben sichtbar, die Vermietungs-Fragen entfallen.
    expect(katalog.checkliste.some((c) => c.abschnitt === 5)).toBe(true);
    expect(katalog.checkliste.some((c) => c.abschnitt === 3)).toBe(false);
    expect(katalog.checkliste.length).toBeGreaterThan(20);
  });

  it("erkennt ein Haus am Objekttitel und blendet WEG-Fragen aus", () => {
    const katalog = katalogFuerObjekt({ title: "Einfamilienhaus Musterweg 3" }, VOLLSTAENDIG);
    expect(katalog.objekttyp).toBe("Haus");
    expect(katalog.checkliste.some((c) => c.abschnitt === 5)).toBe(false);
  });

  it("liefert eine Vorauswahl, die eine Teilmenge der offenen Kern-Fragen ist", () => {
    const katalog = katalogFuerObjekt({ title: "Musterwohnung" }, VOLLSTAENDIG);
    const offeneKernIds = katalog.checkliste.filter((c) => c.kern).map((c) => c.id);
    expect(katalog.vorauswahl.sort()).toEqual(offeneKernIds.sort());
  });

  it("verlaesst sich auf den echten Katalog (44 Fragen, 11 Abschnitte) statt auf eine Kopie", () => {
    const katalog = katalogFuerObjekt({}, {});
    expect(katalog.checkliste.length + katalog.bekannt.length).toBeLessThanOrEqual(
      ALLE_FRAGEN.length,
    );
  });
});

describe("ergaenzeUmKatalog", () => {
  const modellFragen = [
    { id: "1-lage", frage: "Wie ist die Lage einzuschätzen?", kategorie: "LAGE", kern: true, vorOrt: false },
    // Inhaltlich identisch mit Katalogfrage 3.2 (Kaltmiete), nur anders formuliert
    // Gross-/Kleinschreibung + Satzzeichen: die Dedup-Heuristik soll das NICHT
    // erwischen (sie prueft nur exakte Normalform), das ist hier bewusst eine
    // andere Formulierung und bleibt daher zusaetzlich erhalten.
    { id: "2-miete", frage: "Wie hoch ist die Miete aktuell?", kategorie: "MIETE", kern: false, vorOrt: false },
  ];

  it("haengt offene Katalogfragen hinten an, ohne die Modellfragen zu veraendern", () => {
    const katalog = katalogFuerObjekt({}, {});
    const kombiniert = ergaenzeUmKatalog(modellFragen, katalog);

    expect(kombiniert.slice(0, 2)).toEqual(modellFragen);
    expect(kombiniert.length).toBeGreaterThan(modellFragen.length);
  });

  it("praefixt Katalog-IDs, damit sie nie mit Modell-IDs kollidieren", () => {
    const katalog = katalogFuerObjekt({}, {});
    const kombiniert = ergaenzeUmKatalog(modellFragen, katalog);
    const ausKatalog = kombiniert.slice(modellFragen.length);
    expect(ausKatalog.every((f) => f.id.startsWith("kat-"))).toBe(true);
    const ids = kombiniert.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("dedupliziert exakte Textdopplungen (Gross-/Kleinschreibung, Satzzeichen)", () => {
    const katalog = katalogFuerObjekt({}, {});
    const fragenMitDoppelung = [
      {
        id: "1-flaeche",
        // exakt dieselbe Frage wie Katalog 1.1, nur andere Schreibweise/Satzzeichen
        frage: "wie groß ist die wohnfläche, und nach welcher methode berechnet (wofLV/din 277)!",
        kategorie: "FLÄCHE",
        kern: true,
        vorOrt: false,
      },
    ];
    const kombiniert = ergaenzeUmKatalog(fragenMitDoppelung, katalog);
    expect(kombiniert.some((f) => f.id === "kat-1.1")).toBe(false);
  });

  it("markiert Vor-Ort-Katalogfragen weiterhin als vorOrt", () => {
    const katalog = katalogFuerObjekt({}, {});
    const kombiniert = ergaenzeUmKatalog([], katalog);
    // Vor-Ort-Fragen stecken nicht nur in Abschnitt 11 ("Umfeld"), sondern
    // auch vereinzelt anderswo (1.3, Dachschrägen) - deshalb gegen den echten
    // Katalog geprueft statt eine Sektion zu unterstellen.
    const erwartet = ALLE_FRAGEN.filter((f) => f.quelle === "vor_ort").map((f) => `kat-${f.id}`);
    const tatsaechlich = kombiniert.filter((f) => f.vorOrt).map((f) => f.id);
    expect(tatsaechlich.sort()).toEqual(erwartet.sort());
  });
});
