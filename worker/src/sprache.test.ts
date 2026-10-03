// Objektseiten-KI in der App-Sprache (2026-10-03): vorher stand in Lage- und
// Alternativ-Prompt fest "Antworte auf Deutsch".
import { describe, it, expect } from "vitest";
import { leseLang, sprachRegel, tokenFaktor } from "./systemPrompt";
import { lageSystemPrompt } from "./lagePrompt";
import { alternativSystemPrompt } from "./alternativPrompt";

describe("Sprache der Objektseiten-KI", () => {
  it("liest nur bekannte Sprachen, sonst Deutsch", () => {
    expect(leseLang("en")).toBe("en");
    expect(leseLang("hi")).toBe("hi");
    expect(leseLang("fr")).toBe("de");
    expect(leseLang(undefined)).toBe("de");
    expect(leseLang(42)).toBe("de");
  });

  it("nennt die Zielsprache und schuetzt JSON-Schluessel", () => {
    expect(sprachRegel("tr")).toContain("Türkisch");
    expect(sprachRegel("zh")).toContain("Chinesisch");
    expect(sprachRegel("en")).toContain("JSON-Schluessel");
  });

  it("Lage- und Alternativ-Prompt tragen die Sprache, kein festes Deutsch mehr", () => {
    for (const prompt of [lageSystemPrompt("en"), alternativSystemPrompt("en")]) {
      expect(prompt).toContain("Englisch");
      expect(prompt).not.toContain("Antworte auf Deutsch");
    }
    expect(lageSystemPrompt()).toContain("Deutsch");
  });

  it("gibt Hindi mehr Token-Spielraum", () => {
    expect(tokenFaktor("hi")).toBe(2);
    expect(tokenFaktor("de")).toBe(1);
  });
});
