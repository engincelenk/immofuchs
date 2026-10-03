import { describe, it, expect } from "vitest";
import { entferneHerkunftUndRhythmus } from "./outputFilter";
import { buildSystemPrompt } from "./systemPrompt";

describe("entferneHerkunftUndRhythmus", () => {
  it("laesst normale Antworten unveraendert", () => {
    const text = "Dein Cashflow ist negativ. Beim MSCI World ETF fallen laufende Kosten an. KfW-Kredite sind eine Option.";
    expect(entferneHerkunftUndRhythmus(text, "de")).toBe(text);
  });

  it("streicht Saetze mit Quellenangabe, behaelt den Rest", () => {
    const r = entferneHerkunftUndRhythmus(
      "Der Zins liegt bei 3,6 %. Laut Bundesbank ist das die Rendite zehnjähriger Anleihen. Du hast dann 1.200 € mehr Rate.",
      "de",
    );
    expect(r).toBe("Der Zins liegt bei 3,6 %. Du hast dann 1.200 € mehr Rate.");
    expect(r).not.toMatch(/bundesbank/i);
  });

  it("streicht Rhythmus- und Stand-Angaben", () => {
    for (const s of [
      "Die Werte werden monatlich aktualisiert.",
      "Wir pflegen die Daten quartalsweise gepflegt.",
      "Datenstand ist Oktober 2026.",
      "Stand 03.10.2026 liegt der Wert bei 3,6 %.",
      "The data is updated monthly.",
    ]) {
      const r = entferneHerkunftUndRhythmus(`Die Rendite liegt bei 3,6 %. ${s}`, s.startsWith("The") ? "en" : "de");
      expect(r).toBe("Die Rendite liegt bei 3,6 %.");
    }
  });

  it("nennt Quellen wie justETF, Destatis oder Zensus nicht, auch nicht englisch", () => {
    expect(entferneHerkunftUndRhythmus("Die Zahlen stammen vom Statistischen Bundesamt.", "de")).not.toMatch(/statistisch/i);
    expect(entferneHerkunftUndRhythmus("Quelle: justETF.", "de")).not.toMatch(/justetf/i);
    expect(entferneHerkunftUndRhythmus("According to Destatis, prices rose.", "en")).not.toMatch(/destatis/i);
  });

  it("ersetzt eine reine Herkunftsantwort durch einen neutralen Satz in der Sprache", () => {
    expect(entferneHerkunftUndRhythmus("Quelle: Bundesbank.", "de")).toContain("ImmoFuchs-Datenbasis");
    expect(entferneHerkunftUndRhythmus("Source: Bundesbank.", "en")).toContain("ImmoFuchs data base");
  });
});

describe("Finn System-Prompt: Herkunft, Rhythmus und Alternativen", () => {
  // Zeilenumbrueche im Prompt-Text normalisieren, sonst scheitert der Textvergleich.
  const p = buildSystemPrompt("de").replace(/\s+/g, " ");

  it("verbietet Quellen und Aktualisierungsrhythmus", () => {
    expect(p).toContain("Nenne niemals, woher");
    expect(p).toContain("wie oft, wann zuletzt oder seit");
    expect(p).toContain("Datenstand");
  });

  it("nennt die Annahme: Verkauf nach Ablauf der Spekulationsfrist, kein Steuerabzug", () => {
    expect(p).toContain("erst nach Ablauf der 10-jährigen Spekulationsfrist verkauft");
    expect(p).toContain("kein Steuerabzug auf den Verkaufsgewinn");
  });

  it("beschreibt den Alternativ-Vergleich ohne Empfehlung und ohne Tendenz", () => {
    expect(p).toContain("alternativVergleich");
    expect(p).toContain("einsatzAusEigenerTasche");
    expect(p).toContain("KEINE Aufforderung, etwas zu kaufen, zu verkaufen oder zu halten");
    expect(p).toContain("KEINE Tendenz-Aussage");
    expect(p).toContain("Regel 3 (Kauftendenz) gilt für diesen Vergleich NICHT");
    expect(p).toContain("Totalverlust");
    expect(p).toContain("Entscheidung liegt immer beim Nutzer");
  });
});
