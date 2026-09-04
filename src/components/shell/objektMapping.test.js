import { describe, it, expect } from "vitest";
import { toServerPayload, fromServerObject } from "./Merkliste.jsx";

// Schritt A1 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md):
// Ein Objekt ist nicht mehr an genau einen Rechner gebunden. inputData ist der
// reine Formular-State, die Ansicht liegt als letzteAnsicht in resultData
// daneben. Diese Tests decken den Pruefpunkt A1 ab: speichern, neu laden, in
// zwei verschiedenen Rechnern oeffnen - beide sehen dieselben Daten.

const data = {
  kaufpreis: "300000",
  flaeche: "70",
  kaltmiete: "900",
  eigenkapital: "60000",
  zinssatz: "3.8",
  plz: "74379",
  ort: "Ingersheim",
};

const lokal = {
  id: "obj-1",
  name: "Murrstraße 2",
  date: "04.09.2026",
  letzteAnsicht: "kredit",
  data,
};

describe("Objekt-Mapping A1 - ein Objekt, mehrere Blickwinkel", () => {
  it("inputData traegt keinen tab mehr", () => {
    const payload = toServerPayload(lokal);
    expect(payload.inputData).not.toHaveProperty("tab");
    expect(payload.inputData).toEqual(data);
  });

  it("die Ansicht wandert nach resultData", () => {
    expect(toServerPayload(lokal).resultData.letzteAnsicht).toBe("kredit");
  });

  it("ohne Ansicht faellt sie auf haupt zurueck", () => {
    const { letzteAnsicht: _weg, ...ohne } = lokal;
    expect(toServerPayload(ohne).resultData.letzteAnsicht).toBe("haupt");
  });

  it("Round-Trip erhaelt Formular-State und Ansicht", () => {
    const server = { ...toServerPayload(lokal), updatedAt: "2026-09-04T10:00:00Z" };
    const zurueck = fromServerObject(server, "de-DE");
    expect(zurueck.data).toEqual(data);
    expect(zurueck.letzteAnsicht).toBe("kredit");
    expect(zurueck.name).toBe("Murrstraße 2");
  });

  it("derselbe Datensatz speist jeden Rechner - die Ansicht aendert die Daten nicht", () => {
    // Der Kern von A1: dasselbe Objekt einmal als Rendite-, einmal als
    // Kreditansicht gespeichert ergibt identische Eingabedaten statt zweier
    // getrennter Objekte.
    const alsRendite = toServerPayload({ ...lokal, letzteAnsicht: "haupt" });
    const alsKredit = toServerPayload({ ...lokal, letzteAnsicht: "kredit" });
    expect(alsRendite.inputData).toEqual(alsKredit.inputData);
    expect(alsRendite.resultData.letzteAnsicht).not.toBe(alsKredit.resultData.letzteAnsicht);
  });

  it("ein alter Datensatz mit tab in inputData landet nicht im Formular-State", () => {
    const alt = {
      id: "obj-alt",
      title: "Altbestand",
      updatedAt: "2026-08-01T10:00:00Z",
      inputData: { tab: "sanier", ...data },
      resultData: {},
    };
    const zurueck = fromServerObject(alt, "de-DE");
    expect(zurueck.data).not.toHaveProperty("tab");
    expect(zurueck.data).toEqual(data);
    // Ohne resultData.letzteAnsicht dient der alte tab als Rueckfallwert.
    expect(zurueck.letzteAnsicht).toBe("sanier");
  });

  it("Exposé-Objekt behaelt sein Ergebnis neben der Ansicht", () => {
    const expose = {
      id: "obj-expose",
      title: "Aus Exposé",
      updatedAt: "2026-09-04T10:00:00Z",
      inputData: { quelle: "expose-scan" },
      resultData: { bruttoRendite: 4.5, letzteAnsicht: "haupt" },
    };
    const zurueck = fromServerObject(expose, "de-DE");
    expect(zurueck.letzteAnsicht).toBe("haupt");
    expect(zurueck.data).toEqual({ quelle: "expose-scan" });
  });
});
