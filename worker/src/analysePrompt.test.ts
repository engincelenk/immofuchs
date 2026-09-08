import { describe, it, expect } from "vitest";
import { nutzerPayload, systemPromptFuer, type HebelVariante } from "./analysePrompt";

const KENNZAHLEN = { kaufpreis: 300000, nettorendite: 3.1, cashflowMonat: -180 };

const VARIANTE = (over: Partial<HebelVariante> = {}): HebelVariante => ({
  feld: "Kaufpreis",
  aenderung: "−15.000 €",
  neuerWert: "285.000 €",
  score: 78,
  deltaScore: 6,
  ...over,
});

describe("nutzerPayload", () => {
  it("rendert Kennzahlen als Klartextzeilen", () => {
    const p = nutzerPayload(KENNZAHLEN);
    expect(p).toContain("Kennzahlen des Objekts:");
    expect(p).toContain("kaufpreis: 300000");
    expect(p).toContain("cashflowMonat: -180");
  });

  it("laesst leere Kennzahlen weg statt sie als leer zu senden", () => {
    const p = nutzerPayload({ kaufpreis: 300000, baujahr: null, ort: "", flaeche: undefined });
    expect(p).toContain("kaufpreis");
    expect(p).not.toContain("baujahr");
    expect(p).not.toContain("ort");
    expect(p).not.toContain("flaeche");
  });

  it("nennt ohne Varianten keinen Variantenblock (Regressionsschutz fuer analyse)", () => {
    const p = nutzerPayload(KENNZAHLEN);
    expect(p).not.toContain("Durchgerechnete Varianten");
    expect(nutzerPayload(KENNZAHLEN, "", [])).not.toContain("Durchgerechnete Varianten");
  });

  it("rendert Varianten mit Ausgangs- und Zielscore", () => {
    const p = nutzerPayload(KENNZAHLEN, "", [VARIANTE()]);
    expect(p).toContain("Durchgerechnete Varianten");
    // deltaScore 6 bei Score 78 heisst: vorher 72.
    expect(p).toContain("- Kaufpreis −15.000 € (neu 285.000 €): Score 78 statt 72");
  });

  it("rechnet auch einen verschlechternden Hebel korrekt zurueck", () => {
    const p = nutzerPayload(KENNZAHLEN, "", [VARIANTE({ score: 65, deltaScore: -7 })]);
    expect(p).toContain("Score 65 statt 72");
  });

  it("haelt Nutzerhinweis und Varianten getrennt", () => {
    const p = nutzerPayload(KENNZAHLEN, "Dach neu 2024", [VARIANTE()]);
    expect(p.indexOf("Durchgerechnete Varianten")).toBeLessThan(
      p.indexOf("Zusaetzliche Hinweise des Nutzers"),
    );
    expect(p).toContain("Dach neu 2024");
  });
});

describe("systemPromptFuer", () => {
  it("weist das Hebel-Produkt an, mitgelieferte Zahlen zu uebernehmen statt zu rechnen", () => {
    const p = systemPromptFuer("hebel");
    expect(p).toContain("Durchgerechnete Varianten");
    expect(p).toContain("NICHT nach");
  });

  it("verbietet dem Hebel-Produkt erfundene Zielwerte, wenn nichts mitgeliefert wurde", () => {
    expect(systemPromptFuer("hebel")).toContain("erfinde KEINE Zielwerte");
  });

  it("erwaehnt Varianten im Analyse-Prompt nicht - dort gibt es keine", () => {
    expect(systemPromptFuer("analyse")).not.toContain("Durchgerechnete Varianten");
  });
});

describe("nutzerPayload - gerechnete Werte (Produkt preis)", () => {
  const ZAHLEN = [
    { label: "Ortsübliche Miete", wert: "9,30 €/m²" },
    { label: "Deine Mietannahme", wert: "14,40 €/m²" },
  ];

  it("rendert den Zahlenblock als Label-Wert-Liste", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, ZAHLEN);
    expect(p).toContain("Gerechnete Werte");
    expect(p).toContain("- Ortsübliche Miete: 9,30 €/m²");
    expect(p).toContain("- Deine Mietannahme: 14,40 €/m²");
  });

  it("verbietet im Blocktitel ausdruecklich eigene Zahlen", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, ZAHLEN);
    expect(p).toContain("keine eigenen Zahlen bilden");
  });

  it("nennt ohne Zahlen keinen Zahlenblock", () => {
    expect(nutzerPayload(KENNZAHLEN)).not.toContain("Gerechnete Werte");
    expect(nutzerPayload(KENNZAHLEN, "", undefined, [])).not.toContain("Gerechnete Werte");
  });
});

// Das Handout hat seit 2026-09-08 eine eigene Form: eine Fragenliste, die der
// Nutzer einzeln abwaehlt und ausdruckt. Diese Tests halten die Trennung fest -
// eine versehentlich zurueckgebaute Abschnittsform waere im Client sofort eine
// leere Karte, weil parseHandoutOutput dann keine Fragen faende.
describe("systemPromptFuer - handout", () => {
  it("verlangt eine Fragenliste statt Abschnitten", () => {
    const p = systemPromptFuer("handout");
    expect(p).toContain('"fragen"');
    expect(p).toContain('"vorOrt"');
    expect(p).toContain('"kern"');
    expect(p).not.toContain('"abschnitte"');
    expect(p).not.toContain('"kpis"');
  });

  it("deckelt die Fragenzahl schon im Prompt", () => {
    expect(systemPromptFuer("handout")).toContain("Hoechstens 12 fragen");
  });

  it("laesst die Befunde weiterhin die Quelle der Fragen sein", () => {
    expect(systemPromptFuer("handout")).toContain("Bisherige Befunde");
  });

  it("aendert die Form der drei anderen Produkte nicht", () => {
    for (const produkt of ["analyse", "hebel", "preis"] as const) {
      expect(systemPromptFuer(produkt)).toContain('"abschnitte"');
      expect(systemPromptFuer(produkt)).not.toContain('"fragen"');
    }
  });
});

describe("systemPromptFuer - preis", () => {
  it("verbietet einen geschaetzten Verkehrswert", () => {
    const p = systemPromptFuer("preis");
    expect(p).toContain("KEINE eigene Zahl");
    expect(p).toContain("bewertest die Immobilie NICHT");
  });

  it("benennt die Zensus-Zahl als Bestandsmiete", () => {
    expect(systemPromptFuer("preis")).toContain("BESTANDSMIETE");
  });

  it("ist ein anderer Prompt als analyse und hebel", () => {
    const p = systemPromptFuer("preis");
    expect(p).not.toBe(systemPromptFuer("analyse"));
    expect(p).not.toBe(systemPromptFuer("hebel"));
  });
});
