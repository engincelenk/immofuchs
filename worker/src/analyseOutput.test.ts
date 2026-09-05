import { describe, it, expect } from "vitest";
import { parseAnalyseOutput } from "./analyseOutput";

// Der Parser ist die Stelle, an der Modellschwankungen aufschlagen. Der Prompt
// BITTET um JSON, dieser Parser ERZWINGT es - die Ansicht darf bei keiner
// Formulierungslaune des Modells brechen.

const gut = JSON.stringify({
  kernaussage: "Solide Vermietung, aber der Cashflow trägt erst ab Jahr 4.",
  kpis: [
    { label: "Nettorendite", wert: "3,4 %", ton: "neutral" },
    { label: "Cashflow", wert: "−85 €", ton: "schwach" },
  ],
  abschnitte: [
    { titel: "RENDITE", text: "Die Nettorendite liegt bei 3,4 Prozent." },
    { titel: "RISIKO", text: "Der Zinsbindungsablauf ist das Hauptrisiko." },
  ],
});

describe("parseAnalyseOutput", () => {
  it("liest die zugesagte Form", () => {
    const e = parseAnalyseOutput(gut);
    expect(e?.kernaussage).toContain("Solide Vermietung");
    expect(e?.kpis).toHaveLength(2);
    expect(e?.abschnitte[0].titel).toBe("RENDITE");
  });

  it("entfernt Markdown-Zaeune", () => {
    expect(parseAnalyseOutput("```json\n" + gut + "\n```")?.kpis).toHaveLength(2);
  });

  it("ueberliest eine Vorrede vor dem JSON", () => {
    const e = parseAnalyseOutput("Gerne! Hier ist die Analyse:\n" + gut);
    expect(e?.kernaussage).toContain("Solide Vermietung");
  });

  it("begrenzt auf drei kpis und drei Abschnitte", () => {
    const viele = JSON.stringify({
      kernaussage: "Test",
      kpis: Array.from({ length: 8 }, (_, i) => ({ label: `L${i}`, wert: `${i}`, ton: "gut" })),
      abschnitte: Array.from({ length: 8 }, (_, i) => ({ titel: `T${i}`, text: `Text ${i}` })),
    });
    const e = parseAnalyseOutput(viele);
    expect(e?.kpis).toHaveLength(3);
    expect(e?.abschnitte).toHaveLength(3);
  });

  it("normalisiert einen unbekannten Ton auf neutral", () => {
    const e = parseAnalyseOutput(
      JSON.stringify({ kernaussage: "x", kpis: [{ label: "a", wert: "b", ton: "euphorisch" }] }),
    );
    expect(e?.kpis[0].ton).toBe("neutral");
  });

  it("wirft unvollstaendige kpis weg statt sie halb zu zeigen", () => {
    const e = parseAnalyseOutput(
      JSON.stringify({ kernaussage: "x", kpis: [{ label: "nur Label" }, { wert: "nur Wert" }] }),
    );
    expect(e?.kpis).toHaveLength(0);
  });

  it("setzt Abschnittstitel in Grossbuchstaben", () => {
    const e = parseAnalyseOutput(
      JSON.stringify({ kernaussage: "x", abschnitte: [{ titel: "rendite", text: "y" }] }),
    );
    expect(e?.abschnitte[0].titel).toBe("RENDITE");
  });

  it("rettet reinen Fliesstext in die Kernaussage", () => {
    // Kein hartes Scheitern, wenn das Modell die Form ignoriert - der Text ist
    // immer noch besser als eine Fehlermeldung.
    const e = parseAnalyseOutput("Das Objekt trägt sich knapp, der Cashflow bleibt dünn.");
    expect(e?.kernaussage).toContain("trägt sich knapp");
    expect(e?.abschnitte).toHaveLength(0);
  });

  it("faellt auf den ersten Abschnitt zurueck, wenn die Kernaussage fehlt", () => {
    const e = parseAnalyseOutput(
      JSON.stringify({ abschnitte: [{ titel: "RENDITE", text: "Die Rendite ist schwach." }] }),
    );
    expect(e?.kernaussage).toContain("Rendite ist schwach");
  });

  it("liefert null, wenn nichts Brauchbares da ist", () => {
    expect(parseAnalyseOutput("")).toBeNull();
    expect(parseAnalyseOutput("{}")).toBeNull();
    expect(parseAnalyseOutput("   ")).toBeNull();
    expect(parseAnalyseOutput(JSON.stringify({ kpis: [] }))).toBeNull();
  });

  it("kuerzt eine ausufernde Kernaussage statt sie durchzureichen", () => {
    const lang = "a".repeat(900);
    const e = parseAnalyseOutput(JSON.stringify({ kernaussage: lang }));
    expect(e!.kernaussage.length).toBeLessThanOrEqual(400);
    expect(e!.kernaussage.endsWith("…")).toBe(true);
  });

  it("uebersteht kaputte Typen ohne zu werfen", () => {
    expect(() => parseAnalyseOutput(JSON.stringify({ kernaussage: 42, kpis: "nein" }))).not.toThrow();
    expect(() => parseAnalyseOutput(JSON.stringify([1, 2, 3]))).not.toThrow();
    expect(parseAnalyseOutput(JSON.stringify({ kernaussage: "x", abschnitte: [null] }))?.abschnitte).toEqual([]);
  });
});
