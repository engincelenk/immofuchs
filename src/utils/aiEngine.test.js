import { describe, it, expect } from "vitest";
import {
  AI_PRODUKTE,
  alter,
  ergebnisAnlegen,
  ergebnisFuer,
  geaenderteFelder,
  istVeraltet,
  mitErgebnis,
  produktFuer,
  veraltetText,
  zahlenSnapshot,
} from "./aiEngine.js";

// AI-Engine: Ergebnisse kosten Kontingent und muessen deshalb erhalten
// bleiben - und sie muessen als veraltet erkennbar sein, sobald sich die
// Zahlen darunter aendern.

const daten = {
  kaufpreis: "199000",
  kaltmiete: "750",
  eigenkapital: "60000",
  zinssatz: "4.07",
  tilgung: "2",
  flaeche: "47",
  ort: "Ingersheim",
};

describe("Produktregistry", () => {
  it("kennt die vier Produkte mit eindeutigen Ids", () => {
    const ids = AI_PRODUKTE.map((p) => p.id);
    expect(ids).toEqual(["analyse", "hebel", "expose", "handout"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("jedes Produkt nennt seine Voraussetzung", () => {
    for (const p of AI_PRODUKTE) {
      expect(["kennzahlen", "datei", "expose"]).toContain(p.braucht);
      expect(p.titel.length).toBeGreaterThan(0);
    }
  });

  it("produktFuer findet und faellt sauber zurueck", () => {
    expect(produktFuer("analyse").titel).toBe("Immobilie analysieren");
    expect(produktFuer("gibtsnicht")).toBeNull();
  });
});

describe("Snapshot der tragenden Zahlen", () => {
  it("nimmt nur die Felder auf, die das Ergebnis tragen", () => {
    const s = zahlenSnapshot(daten);
    expect(s).toHaveProperty("kaufpreis");
    expect(s).toHaveProperty("kaltmiete");
    // Der Ort aendert keine Renditeeinschaetzung.
    expect(s).not.toHaveProperty("ort");
  });

  it("laesst leere Felder weg", () => {
    expect(zahlenSnapshot({ kaufpreis: "", kaltmiete: "750" })).toEqual({ kaltmiete: "750" });
  });
});

describe("Veralten", () => {
  const ergebnis = ergebnisAnlegen("analyse", { text: "Trägt sich knapp." }, daten);

  it("ein frisches Ergebnis ist nicht veraltet", () => {
    expect(istVeraltet(ergebnis, daten)).toBe(false);
  });

  it("ein geaenderter Kaufpreis macht es veraltet", () => {
    const neu = { ...daten, kaufpreis: "179000" };
    expect(istVeraltet(ergebnis, neu)).toBe(true);
    expect(geaenderteFelder(ergebnis, neu)).toEqual(["Kaufpreis"]);
  });

  it("nennt mehrere geaenderte Felder", () => {
    const neu = { ...daten, kaufpreis: "179000", kaltmiete: "800" };
    expect(geaenderteFelder(ergebnis, neu)).toEqual(["Kaufpreis", "Kaltmiete"]);
  });

  it("eine geaenderte Adresse macht es NICHT veraltet", () => {
    expect(istVeraltet(ergebnis, { ...daten, ort: "Stuttgart" })).toBe(false);
  });

  it("das Handout veraltet nicht durch geaenderte Zahlen", () => {
    // Je Produkt eigene Felderliste: das Handout haengt am Exposé, nicht am
    // Kaufpreis. Eine gemeinsame Liste wuerde es grundlos entwerten.
    const h = ergebnisAnlegen("handout", { fragen: [] }, daten);
    expect(istVeraltet(h, { ...daten, kaufpreis: "1" })).toBe(false);
  });

  it("der Hebel haengt an der Renovierung, die Analyse nicht", () => {
    const a = ergebnisAnlegen("analyse", {}, { ...daten, renovierung: "10000" });
    const h = ergebnisAnlegen("hebel", {}, { ...daten, renovierung: "10000" });
    const neu = { ...daten, renovierung: "50000" };
    expect(istVeraltet(a, neu)).toBe(false);
    expect(istVeraltet(h, neu)).toBe(true);
  });

  it("nennt bei einem Feld das Delta im Klartext", () => {
    const neu = { ...daten, kaufpreis: "179000" };
    expect(veraltetText(ergebnis, neu)).toBe("Kaufpreis 199.000 → 179.000");
  });

  it("zaehlt ab drei geaenderten Feldern statt aufzuzaehlen", () => {
    const neu = { ...daten, kaufpreis: "1", kaltmiete: "2", zinssatz: "3", tilgung: "4" };
    expect(veraltetText(ergebnis, neu)).toBe("Kaufpreis, Kaltmiete und 2 weitere geändert");
  });

  it("ein entferntes Feld zaehlt als Aenderung", () => {
    const ohne = { ...daten };
    delete ohne.kaltmiete;
    expect(istVeraltet(ergebnis, ohne)).toBe(true);
  });
});

describe("Ablage am Objekt", () => {
  it("legt ein Ergebnis unter seiner Produkt-Id ab", () => {
    const e = ergebnisAnlegen("analyse", { text: "x" }, daten);
    const rd = mitErgebnis({ letzteAnsicht: "haupt" }, e);
    expect(rd.ai.analyse.inhalt.text).toBe("x");
    // Bestehende Felder bleiben unangetastet.
    expect(rd.letzteAnsicht).toBe("haupt");
  });

  it("ein zweites Produkt verdraengt das erste nicht", () => {
    let rd = mitErgebnis({}, ergebnisAnlegen("analyse", { text: "a" }, daten));
    rd = mitErgebnis(rd, ergebnisAnlegen("hebel", { text: "b" }, daten));
    expect(Object.keys(rd.ai)).toEqual(["analyse", "hebel"]);
  });

  it("dasselbe Produkt erneut ueberschreibt sein Ergebnis", () => {
    let rd = mitErgebnis({}, ergebnisAnlegen("analyse", { text: "alt" }, daten));
    rd = mitErgebnis(rd, ergebnisAnlegen("analyse", { text: "neu" }, daten));
    expect(rd.ai.analyse.inhalt.text).toBe("neu");
    expect(Object.keys(rd.ai)).toHaveLength(1);
  });

  it("liest Ergebnisse aus einem geladenen Objekt", () => {
    const objekt = { kennzahlen: mitErgebnis({}, ergebnisAnlegen("hebel", { text: "h" }, daten)) };
    expect(ergebnisFuer(objekt, "hebel").inhalt.text).toBe("h");
    expect(ergebnisFuer(objekt, "analyse")).toBeNull();
    expect(ergebnisFuer({}, "hebel")).toBeNull();
  });
});

describe("alter", () => {
  it("formatiert den Zeitstempel", () => {
    const e = ergebnisAnlegen("analyse", {}, daten);
    expect(alter(e)).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("bleibt bei fehlendem Zeitstempel leer", () => {
    expect(alter(null)).toBe("");
    expect(alter({ erstellt: "kaputt" })).toBe("");
  });
});
