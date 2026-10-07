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
//
// Investment-Briefing-Umbau (2026-09-18, Stufe 4): analyse/hebel/preis sind
// zu einem Produkt "briefing" zusammengefasst (Spec docs/technical_specs/
// investment-briefing.md). Diese Tests wurden entsprechend umgeschrieben,
// nicht nur umbenannt - RELEVANTE_FELDER.briefing ist jetzt die Vereinigung
// der drei frueheren Listen.

const daten = {
  kaufpreis: "199000",
  kaltmiete: "750",
  eigenkapital: "60000",
  zinssatz: "4.07",
  tilgung: "2",
  flaeche: "47",
  renovierung: "0",
  ort: "Ingersheim",
};

describe("Produktregistry", () => {
  it("kennt die Produkte mit eindeutigen Ids", () => {
    const ids = AI_PRODUKTE.map((p) => p.id);
    expect(ids).toEqual(["briefing", "expose", "handout"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("jedes Produkt nennt seine Voraussetzung, einen Titel und ein Aktionsverb", () => {
    for (const p of AI_PRODUKTE) {
      // "grundlage" (2026-09-07): das Handout haengt nicht mehr zwingend am
      // Exposé-Scan, sondern an irgendeiner Datengrundlage - Scan ODER von
      // Hand eingepflegte Felder.
      expect(["kennzahlen", "datei", "grundlage", "ort"]).toContain(p.braucht);
      expect(p.titel.length).toBeGreaterThan(0);
      // Das Aktionsverb ist Pflicht: ohne es faellt der Knopf auf den Titel
      // zurueck - genau die Verdopplung, die der UX-Review beseitigt hat.
      expect(p.aktion?.length).toBeGreaterThan(0);
      expect(p.aktion).not.toBe(p.titel);
    }
  });

  it("produktFuer findet und faellt sauber zurueck", () => {
    expect(produktFuer("briefing").titel).toBe("Investment-Briefing");
    expect(produktFuer("gibtsnicht")).toBeNull();
  });
});

describe("Snapshot der tragenden Zahlen", () => {
  it("nimmt nur die Felder auf, die das Ergebnis tragen", () => {
    const s = zahlenSnapshot(daten);
    expect(s).toHaveProperty("kaufpreis");
    expect(s).toHaveProperty("kaltmiete");
    // Anders als beim fruehen "analyse" gehoert "ort" jetzt dazu (Spec
    // §8.1): die Vergleichs-Kacheln V1-V6 haengen direkt an regionalPreis(),
    // das nach Bundesland/Ort/PLZ matcht.
    expect(s).toHaveProperty("ort");
  });

  it("laesst leere Felder weg", () => {
    expect(zahlenSnapshot({ kaufpreis: "", kaltmiete: "750" })).toEqual({ kaltmiete: "750" });
  });
});

describe("Veralten", () => {
  const ergebnis = ergebnisAnlegen("briefing", { urteil: "Trägt sich knapp." }, daten);

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

  it("ein geaenderter Ort macht es veraltet - anders als beim fruehen 'analyse'", () => {
    // Bewusste Verhaltensaenderung (Spec §8.1): "briefing" haengt an "ort",
    // weil die Vergleichs-Kacheln V1-V6 direkt von regionalPreis(bundesland,
    // ort, plz) abhaengen - ein anderer Ort kann einen anderen Kreis treffen.
    // Das fruehere "analyse" hatte "ort" bewusst NICHT in seiner Liste, weil
    // dort nur die Rendite zaehlte. Diese Differenz ist gewollt, kein Bug.
    const neu = { ...daten, ort: "Stuttgart" };
    expect(istVeraltet(ergebnis, neu)).toBe(true);
  });

  it("das Handout veraltet nicht durch geaenderte Zahlen", () => {
    // Je Produkt eigene Felderliste: das Handout haengt am Exposé, nicht am
    // Kaufpreis. Eine gemeinsame Liste wuerde es grundlos entwerten.
    const h = ergebnisAnlegen("handout", { fragen: [] }, daten);
    expect(istVeraltet(h, { ...daten, kaufpreis: "1" })).toBe(false);
  });

  it("das Briefing haengt auch an der Renovierung (frueher nur 'hebel')", () => {
    const b = ergebnisAnlegen("briefing", {}, { ...daten, renovierung: "10000" });
    const neu = { ...daten, renovierung: "50000" };
    expect(istVeraltet(b, neu)).toBe(true);
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
    const e = ergebnisAnlegen("briefing", { text: "x" }, daten);
    const rd = mitErgebnis({ letzteAnsicht: "haupt" }, e);
    expect(rd.ai.briefing.inhalt.text).toBe("x");
    // Bestehende Felder bleiben unangetastet.
    expect(rd.letzteAnsicht).toBe("haupt");
  });

  it("ein zweites Produkt verdraengt das erste nicht", () => {
    let rd = mitErgebnis({}, ergebnisAnlegen("briefing", { text: "a" }, daten));
    rd = mitErgebnis(rd, ergebnisAnlegen("handout", { text: "b" }, daten));
    expect(Object.keys(rd.ai)).toEqual(["briefing", "handout"]);
  });

  it("dasselbe Produkt erneut ueberschreibt sein Ergebnis", () => {
    let rd = mitErgebnis({}, ergebnisAnlegen("briefing", { text: "alt" }, daten));
    rd = mitErgebnis(rd, ergebnisAnlegen("briefing", { text: "neu" }, daten));
    expect(rd.ai.briefing.inhalt.text).toBe("neu");
    expect(Object.keys(rd.ai)).toHaveLength(1);
  });

  it("liest Ergebnisse aus einem geladenen Objekt", () => {
    const objekt = { kennzahlen: mitErgebnis({}, ergebnisAnlegen("briefing", { text: "b" }, daten)) };
    expect(ergebnisFuer(objekt, "briefing").inhalt.text).toBe("b");
    expect(ergebnisFuer(objekt, "handout")).toBeNull();
    expect(ergebnisFuer({}, "briefing")).toBeNull();
  });
});

describe("Alte Produkte (analyse/hebel/preis) verschwinden", () => {
  // Spec §10.1: ergebnisseLesen() ignoriert sie, mitErgebnis() entfernt sie
  // beim naechsten Speichern - unabhaengig davon, ob die D1-Migration 0033
  // dieses Objekt schon erreicht hat.
  const altesResultData = {
    ai: {
      analyse: { produktId: "analyse", inhalt: { kernaussage: "alt" } },
      hebel: { produktId: "hebel", inhalt: {} },
      preis: { produktId: "preis", inhalt: {} },
      handout: { produktId: "handout", inhalt: { fragen: [] } },
    },
  };

  it("ergebnisseLesen ignoriert die drei alten Produkte", () => {
    const objekt = { resultData: altesResultData };
    expect(ergebnisFuer(objekt, "analyse")).toBeNull();
    expect(ergebnisFuer(objekt, "hebel")).toBeNull();
    expect(ergebnisFuer(objekt, "preis")).toBeNull();
    expect(ergebnisFuer(objekt, "handout")).not.toBeNull();
  });

  it("mitErgebnis entfernt sie beim naechsten Speichern", () => {
    const neu = mitErgebnis(altesResultData, ergebnisAnlegen("briefing", { urteil: "x" }, daten));
    expect(Object.keys(neu.ai).sort()).toEqual(["briefing", "handout"]);
  });
});

describe("alter", () => {
  it("formatiert den Zeitstempel", () => {
    const e = ergebnisAnlegen("briefing", {}, daten);
    expect(alter(e)).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("bleibt bei fehlendem Zeitstempel leer", () => {
    expect(alter(null)).toBe("");
    expect(alter({ erstellt: "kaputt" })).toBe("");
  });
});
