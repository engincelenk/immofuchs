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
