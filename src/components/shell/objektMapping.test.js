import { describe, it, expect, vi, beforeEach } from "vitest";
import { toServerPayload, fromServerObject } from "./Merkliste.jsx";
import { regionalSnapshot } from "../../utils/regionalpreis.js";

// Merkliste.jsx importiert regionalSnapshot() als fertige Funktion - gemockt
// wird deshalb genau dieser Export, nicht regionalPreis() darunter (dessen
// interner Aufruf in der echten regionalSnapshot()-Implementierung waere
// vom Mock nicht erreichbar, siehe ESM-Modulscope).
vi.mock("../../utils/regionalpreis.js", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, regionalSnapshot: vi.fn(), ladeRegionalpreise: vi.fn() };
});

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

// Zwei-Produkte-Umbau (Auftrag 2026-09-08): ein Rechner-Ergebnis (Kredit-,
// Miet-, Sanier-, VfE- oder Steuer6-Rechner) ist kein Rendite-Objekt.
// toServerPayload() darf hier nicht berechneObjektKennzahlen() aufrufen -
// die Tests oben (ohne local.kennzahlen) muessen dabei unveraendert gruen
// bleiben (Rueckwaertskompatibilitaet, Pruefpunkt der Aufgabenstellung).
describe("Objekt-Mapping — Rechner-Ergebnisse (art:\"rechnerErgebnis\")", () => {
  const rechnerLokal = {
    id: "obj-kredit-1",
    name: "Kredit München",
    date: "08.09.2026",
    letzteAnsicht: "kredit",
    data: { kaufpreis: "300000", eigenkapital: "60000", zinssatz: "3.8" },
    kennzahlen: { art: "rechnerErgebnis", rechnerTyp: "kredit" },
  };

  it("setzt kaufpreis/wohnflaeche/score/scoreLabel auf null", () => {
    const payload = toServerPayload(rechnerLokal);
    expect(payload.kaufpreis).toBeNull();
    expect(payload.wohnflaeche).toBeNull();
    expect(payload.score).toBeNull();
    expect(payload.scoreLabel).toBeNull();
  });

  it("baut resultData mit art und rechnerTyp statt der vollen Rechnung", () => {
    const payload = toServerPayload(rechnerLokal);
    expect(payload.resultData).toEqual({
      art: "rechnerErgebnis",
      rechnerTyp: "kredit",
      letzteAnsicht: "kredit",
    });
    expect(payload.inputData).toEqual(rechnerLokal.data);
  });

  it("faellt ohne letzteAnsicht auf haupt zurueck, wie im Objekt-Pfad", () => {
    const { letzteAnsicht: _weg, ...ohne } = rechnerLokal;
    expect(toServerPayload(ohne).resultData.letzteAnsicht).toBe("haupt");
  });

  it("Rueckwaertskompatibilitaet: fehlt kennzahlen.art, bleibt der heutige Objekt-Pfad", () => {
    const { kennzahlen: _weg, ...ohneArt } = rechnerLokal;
    const payload = toServerPayload(ohneArt);
    expect(payload.resultData).not.toHaveProperty("art");
    expect(payload.resultData).not.toHaveProperty("rechnerTyp");
    expect(payload.kaufpreis).toBe(300000);
  });
});

// Backlog B.5/D.12 (2026-09-10): der regionale Snapshot wird bei Neuanlage
// einmal berechnet und danach nie wieder ueberschrieben - sonst waere ein
// spaeterer Vergleich "damals vs. heute" wertlos.
describe("Objekt-Mapping — regionaler Snapshot (B.5/D.12)", () => {
  const snapshotJetzt = { stand: "Q2 2026", kaufpreisQm: 4285.71, regionalerRichtwertQm: 4730, ebene: "kreis" };
  const snapshotDamals = { stand: "Q1 2026", kaufpreisQm: 4000, regionalerRichtwertQm: 4500, ebene: "kreis" };

  beforeEach(() => {
    vi.mocked(regionalSnapshot).mockReset();
  });

  it("berechnet bei Neuanlage (kein bisheriger Snapshot) einen frischen Snapshot", () => {
    vi.mocked(regionalSnapshot).mockReturnValue(snapshotJetzt);
    const payload = toServerPayload(lokal);
    expect(payload.resultData.regionalSnapshot).toEqual(snapshotJetzt);
  });

  it("behaelt einen bereits vorhandenen Snapshot unveraendert, auch wenn sich die Regionaldaten geaendert haben", () => {
    vi.mocked(regionalSnapshot).mockReturnValue(snapshotJetzt);
    const mitAltemSnapshot = { ...lokal, kennzahlen: { regionalSnapshot: snapshotDamals } };
    const payload = toServerPayload(mitAltemSnapshot);
    expect(payload.resultData.regionalSnapshot).toEqual(snapshotDamals);
    expect(regionalSnapshot).not.toHaveBeenCalled();
  });

  it("laesst regionalSnapshot ganz weg, wenn keine Regionaldaten verfuegbar sind", () => {
    vi.mocked(regionalSnapshot).mockReturnValue(null);
    const payload = toServerPayload(lokal);
    expect(payload.resultData).not.toHaveProperty("regionalSnapshot");
  });
});
