import { describe, it, expect } from "vitest";
import { FELD_DEFS, GRUPPEN } from "./exposeMapping.js";
import { EXPOSE_JSON_SCHEMA, EXPOSE_SYSTEM_PROMPT } from "../../worker/src/exposePrompt.ts";

// Die Feldnamen sind ein Vertrag zwischen Client und Worker: der Client zeigt
// an, was FELD_DEFS kennt, der Worker liefert, was sein Schema anfragt. Laufen
// beide auseinander, faellt das nirgends auf - das Feld steht stumm auf "nicht
// gefunden", ohne Fehler und ohne Log. Genau dieser Zustand bestand zwischen
// der Client- und der Worker-Haelfte dieser Umsetzung.
//
// Der Test deckt nur die Namen ab, nicht die Durchreichung in exposeOutput.ts -
// die ist dort mit eigenen Tests belegt.

function schemaFelder(gruppe) {
  return Object.keys(EXPOSE_JSON_SCHEMA.properties[gruppe]?.properties ?? {});
}

describe("Feldvertrag Client ↔ Worker", () => {
  it("fragt der Worker jedes Feld an, das der Client anzeigt", () => {
    const fehlend = FELD_DEFS.filter(
      (def) => !schemaFelder(def.gruppe).includes(def.key),
    ).map((def) => `${def.gruppe}.${def.key}`);
    expect(fehlend).toEqual([]);
  });

  it("zeigt der Client jedes Feld an, das der Worker liefert", () => {
    // Andere Richtung: ein extrahiertes Feld ohne Anzeige ist bezahlte
    // Modell-Arbeit, die niemand zu sehen bekommt.
    const bekannt = new Set(FELD_DEFS.map((def) => `${def.gruppe}.${def.key}`));
    const ohneAnzeige = [];
    for (const gruppe of GRUPPEN) {
      for (const key of schemaFelder(gruppe)) {
        if (!bekannt.has(`${gruppe}.${key}`)) ohneAnzeige.push(`${gruppe}.${key}`);
      }
    }
    expect(ohneAnzeige).toEqual([]);
  });

  it("nennt der Prompt die Abweichungs-Struktur, die die Analyse voraussetzt", () => {
    // `abweichungen` ist kein Feld einer Gruppe, sondern ein eigenes Array
    // (Spec v2, Abschnitt 1.1) und faellt deshalb durch die Gruppen-Pruefungen
    // oben durch. Ohne die Schluessel im Prompt-Text liefert Gemini das Array
    // nie - der Flaechen-Widerspruch waere dann stumm nicht mehr auffindbar.
    const schluessel = Object.keys(EXPOSE_JSON_SCHEMA.properties.abweichungen.items.properties);
    expect(schluessel).toEqual(["feld", "wert_a", "quelle_a", "wert_b", "quelle_b", "hinweis"]);
    for (const key of schluessel) {
      expect(EXPOSE_SYSTEM_PROMPT, `Prompt nennt "${key}" nicht`).toContain(`"${key}"`);
    }
  });

  it("nennt der Prompt jedes Feld des Schemas", () => {
    // Das maschinenlesbare Schema (guided_json) gilt nur fuer den
    // Workers-AI-Fallback. Gemini bekommt ausschliesslich den Prompt-Text -
    // ein dort fehlendes Feld wird schlicht nie extrahiert.
    const fehlend = [];
    for (const gruppe of GRUPPEN) {
      for (const key of schemaFelder(gruppe)) {
        if (!EXPOSE_SYSTEM_PROMPT.includes(`"${key}"`)) fehlend.push(`${gruppe}.${key}`);
      }
    }
    expect(fehlend).toEqual([]);
  });
});
