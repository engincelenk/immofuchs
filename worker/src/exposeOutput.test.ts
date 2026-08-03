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

  it("uebernimmt strukturierte Abweichungen mit beiden Fundstellen", () => {
    const r = parseExposeOutput(
      JSON.stringify({
        abweichungen: [
          {
            feld: "wohnflaeche",
            wert_a: 50,
            quelle_a: "Eckdaten-Tabelle",
            wert_b: "47,88 m2",
            quelle_b: "Ausstattungsliste",
            hinweis: "unterschiedlich angegeben",
          },
        ],
      }),
    );
    // "47,88 m2" ist nach Abzug der Einheit vollstaendig eine Zahl und wird
    // deshalb als Zahl uebernommen - die Konsistenz-Engine rechnet damit.
    expect(r.abweichungen).toEqual([
      {
        feld: "wohnflaeche",
        wert_a: 50,
        quelle_a: "Eckdaten-Tabelle",
        wert_b: 47.88,
        quelle_b: "Ausstattungsliste",
        hinweis: "unterschiedlich angegeben",
      },
    ]);
  });

  it("laesst Aussagen in Abweichungen als Text stehen, statt eine Zahl daraus zu machen", () => {
    const r = parseExposeOutput(
      JSON.stringify({
        abweichungen: [
          {
            feld: "stellplatz_kaufpreis",
            wert_a: "2 Stellplaetze im Kaufpreis enthalten",
            quelle_a: "Objektbeschreibung",
            wert_b: 15000,
            quelle_b: "Eckdaten-Tabelle",
            hinweis: "zu klaeren",
          },
        ],
      }),
    );
    expect(r.abweichungen[0].wert_a).toBe("2 Stellplaetze im Kaufpreis enthalten");
    expect(r.abweichungen[0].wert_b).toBe(15000);
  });

  it("verwirft unvollstaendige und inhaltsleere Abweichungen", () => {
    const r = parseExposeOutput(
      JSON.stringify({
        abweichungen: [
          { feld: "wohnflaeche", wert_a: 50, wert_b: 48, hinweis: "ohne Quellen" },
          {
            feld: "kaufpreis",
            wert_a: 199000,
            quelle_a: "Titel",
            wert_b: 199000,
            quelle_b: "Tabelle",
            hinweis: "identisch, kein Widerspruch",
          },
          "kaputt",
        ],
      }),
    );
    expect(r.abweichungen).toEqual([]);
  });

  it("liefert ein leeres Abweichungs-Array, wenn das Modell keins schickt", () => {
    expect(parseExposeOutput("{}").abweichungen).toEqual([]);
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

// ── Felder aus dem Abgleich der Referenzexposes (Ingersheim, Murr) ─────────
describe("parseExposeOutput - neue Felder", () => {
  it("reicht die Felder des Expose Murr durch", () => {
    const raw = JSON.stringify({
      objekt: {
        wohnflaeche: 76,
        nutzflaeche: 8,
        strasse: "Bottenaeckerstr.",
        hausnummer: "3",
        zustand: "Gepflegt",
        wohneinheiten: 22,
        vermietet: true,
        vermietet_seit: "01.10.2025",
      },
      ausstattung: { stellplatz_anzahl: 1, baujahr_waermeerzeuger: 1995 },
      kosten: { hausgeld: 256, hausgeld_nicht_umlagefaehig: 77.07, ruecklage_monatlich: 45.83 },
    });
    const r = parseExposeOutput(raw);

    // Nutzflaeche bleibt getrennt - sie darf nie in der Wohnflaeche landen.
    expect(r.objekt.wohnflaeche).toBe(76);
    expect(r.objekt.nutzflaeche).toBe(8);
    expect(r.objekt.strasse).toBe("Bottenaeckerstr.");
    expect(r.objekt.hausnummer).toBe("3");
    expect(r.objekt.zustand).toBe("Gepflegt");
    expect(r.objekt.wohneinheiten).toBe(22);
    expect(r.objekt.vermietet).toBe(true);
    expect(r.ausstattung.baujahr_waermeerzeuger).toBe(1995);
    expect(r.kosten.hausgeld_nicht_umlagefaehig).toBe(77.07);
    expect(r.kosten.ruecklage_monatlich).toBe(45.83);
  });

  it("laesst das Mietbeginn-Datum als Text stehen", () => {
    // Der Client parst es selbst (mapDatum). Wuerde `zahl` darauf laufen,
    // bliebe von "01.10.2025" die Zahl 1.102025 uebrig.
    const r = parseExposeOutput(JSON.stringify({ objekt: { vermietet_seit: "01.10.2025" } }));
    expect(r.objekt.vermietet_seit).toBe("01.10.2025");
  });

  it("nimmt 'Ja'/'Nein' als Vermietungsstatus", () => {
    expect(parseExposeOutput(JSON.stringify({ objekt: { vermietet: "Ja" } })).objekt.vermietet).toBe(
      true,
    );
    expect(
      parseExposeOutput(JSON.stringify({ objekt: { vermietet: "Nein" } })).objekt.vermietet,
    ).toBe(false);
  });

  it("liefert null, wenn die neuen Felder fehlen", () => {
    const r = parseExposeOutput("{}");
    expect(r.objekt.nutzflaeche).toBeNull();
    expect(r.objekt.vermietet).toBeNull();
    expect(r.objekt.vermietet_seit).toBeNull();
    expect(r.ausstattung.baujahr_waermeerzeuger).toBeNull();
    expect(r.kosten.ruecklage_monatlich).toBeNull();
  });

  it("rettet die Ruecklage aus deutscher Schreibweise", () => {
    const r = parseExposeOutput(
      JSON.stringify({ kosten: { ruecklage_monatlich: "ca. 45,83 EUR monatlich" } }),
    );
    expect(r.kosten.ruecklage_monatlich).toBe(45.83);
  });
});
