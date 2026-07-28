import { describe, it, expect } from "vitest";
import { parseExposeOutput, zahl } from "./exposeOutput";

// Der Worker hat kein eigenes Test-Setup - diese Datei wird vom Vitest im
// Projekt-Root mitgenommen (`npm test`), weil dessen Default-Include das
// ganze Repo ausser node_modules abdeckt.

describe("zahl", () => {
  it("nimmt echte Zahlen unveraendert", () => {
    expect(zahl(269000)).toBe(269000);
    expect(zahl(93.6)).toBe(93.6);
  });

  it("rettet Zahlen aus deutscher Schreibweise", () => {
    expect(zahl("269.000 EUR")).toBe(269000);
    expect(zahl("93,6 kWh/m2a")).toBe(93.6);
    expect(zahl("ca. 54 m2")).toBe(54);
    expect(zahl("269.000,50")).toBe(269000.5);
    expect(zahl("3,57 %")).toBe(3.57);
  });

  it("unterscheidet Tausenderpunkt von Dezimalpunkt", () => {
    expect(zahl("1.234")).toBe(1234);
    expect(zahl("93.6")).toBe(93.6);
  });

  it("verwirft, was keine Zahl ist", () => {
    expect(zahl("auf Anfrage")).toBeNull();
    expect(zahl(null)).toBeNull();
    expect(zahl(undefined)).toBeNull();
    expect(zahl(NaN)).toBeNull();
    expect(zahl({})).toBeNull();
  });
});

describe("parseExposeOutput", () => {
  it("liest einen vollstaendigen Datensatz", () => {
    const raw = JSON.stringify({
      objekt: { titel: "Moderne EG-Wohnung", kaufpreis: 269000, wohnflaeche: 54, plz: "74321" },
      ausstattung: { balkon_terrasse: true, stellplatz: "Tiefgaragenstellplatz" },
      energie: { endenergiebedarf: 93.6, energieeffizienzklasse: "C" },
      kosten: { hausgeld: 419, provision_kaeufer_prozent: 3.57 },
      kontext: { objektbeschreibung: "Betreutes Wohnen" },
      bild: { titelbild_index: 0, bildbeschreibung: "Mehrfamilienhaus" },
      confidence: { kaufpreis: "sicher", stellplatz: "unsicher", kaltmiete: "nicht_gefunden" },
      warnungen: [{ feld: "wohnflaeche", hinweis: "54 vs. 52 m2" }],
    });
    const r = parseExposeOutput(raw);

    expect(r.objekt.kaufpreis).toBe(269000);
    expect(r.objekt.plz).toBe("74321");
    expect(r.ausstattung.balkon_terrasse).toBe(true);
    expect(r.energie.endenergiebedarf).toBe(93.6);
    expect(r.kosten.provision_kaeufer_prozent).toBe(3.57);
    expect(r.bild.titelbild_index).toBe(0);
    expect(r.confidence.stellplatz).toBe("unsicher");
    expect(r.warnungen).toEqual([{ feld: "wohnflaeche", hinweis: "54 vs. 52 m2" }]);
  });

  it("fuellt fehlende Gruppen mit null statt zu werfen", () => {
    const r = parseExposeOutput("{}");
    expect(r.objekt.kaufpreis).toBeNull();
    expect(r.ausstattung.keller).toBeNull();
    expect(r.kosten.kaltmiete).toBeNull();
    expect(r.confidence).toEqual({});
    expect(r.warnungen).toEqual([]);
  });

  it("entfernt einen Markdown-Codeblock um die Antwort", () => {
    const r = parseExposeOutput('```json\n{"objekt":{"kaufpreis":300000}}\n```');
    expect(r.objekt.kaufpreis).toBe(300000);
  });

  it("haelt Freitext aus Zahlenfeldern raus", () => {
    const r = parseExposeOutput(
      JSON.stringify({ kosten: { kaufnebenkosten: "auf Anfrage", hausgeld: "419 EUR" } }),
    );
    expect(r.kosten.kaufnebenkosten).toBeNull();
    expect(r.kosten.hausgeld).toBe(419);
  });

  it("wertet Platzhalter in Textfeldern als nicht gefunden", () => {
    const r = parseExposeOutput(
      JSON.stringify({ objekt: { titel: "n/a", ort: "  ", objektart: "keine Angabe" } }),
    );
    expect(r.objekt.titel).toBeNull();
    expect(r.objekt.ort).toBeNull();
    expect(r.objekt.objektart).toBeNull();
  });

  it("verwirft unbekannte confidence-Werte und kaputte Warnungen", () => {
    const r = parseExposeOutput(
      JSON.stringify({
        confidence: { kaufpreis: "sicher", wohnflaeche: "vielleicht", ort: 5 },
        warnungen: [{ feld: "wohnflaeche" }, "kaputt", { feld: "ort", hinweis: "abweichend" }],
      }),
    );
    expect(r.confidence).toEqual({ kaufpreis: "sicher" });
    expect(r.warnungen).toEqual([{ feld: "ort", hinweis: "abweichend" }]);
  });

  it("wirft bei unbrauchbarer Antwort", () => {
    expect(() => parseExposeOutput("Tut mir leid, ich kann das nicht lesen.")).toThrow(
      "expose_output_not_json",
    );
    expect(() => parseExposeOutput("[1,2,3]")).toThrow("expose_output_not_object");
  });

  it("akzeptiert nur einen plausiblen Titelbild-Index", () => {
    expect(parseExposeOutput(JSON.stringify({ bild: { titelbild_index: -1 } })).bild
      .titelbild_index).toBeNull();
    expect(parseExposeOutput(JSON.stringify({ bild: { titelbild_index: 2.5 } })).bild
      .titelbild_index).toBeNull();
    expect(parseExposeOutput(JSON.stringify({ bild: { titelbild_index: 3 } })).bild
      .titelbild_index).toBe(3);
  });
});
