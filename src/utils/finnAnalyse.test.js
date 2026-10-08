import { describe, it, expect } from "vitest";
import { analysiereExpose } from "./finnAnalyse.js";
import { berechneRealpreis, bauePreistabelle } from "./finnRealpreis.js";
import { pruefeKonsistenz, berechneVerdict, sortiereFindings } from "./finnKonsistenz.js";
import { ermittleObjekttyp, formatiereStockwerk } from "./finnAbgleich.js";
import { ALLE_FRAGEN, ABSCHNITTE } from "../data/finnFragenkatalog.js";
import { INGERSHEIM, MURR } from "./finnFixtures.js";

// Akzeptanzkriterien aus docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 6.
// Die Zahlen sind nachgerechnet, nicht aus dem PDF-Prototyp uebernommen -
// dessen €/m²-Werte sind handgerundet und je ~1 €/m² zu hoch (Spec 6.1).

const finding = (analyse, id) => analyse.findings.find((f) => f.id === id);
const frage = (analyse, id) => analyse.checkliste.find((c) => c.id === id);
const bekannt = (analyse, id) => analyse.bekannt.find((b) => b.id === id);

describe("Fragenkatalog", () => {
  it("hat 44 Fragen in 11 Abschnitten", () => {
    expect(ABSCHNITTE).toHaveLength(11);
    expect(ALLE_FRAGEN).toHaveLength(44);
  });

  it("hat genau 12 Kern-Fragen (Default-Vorauswahl)", () => {
    expect(ALLE_FRAGEN.filter((f) => f.kern)).toHaveLength(12);
  });

  it("vergibt eindeutige IDs", () => {
    const ids = ALLE_FRAGEN.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nutzt nur definierte Quellen- und Relevanzwerte", () => {
    for (const f of ALLE_FRAGEN) {
      expect(["tabelle", "text", "fehlt", "vor_ort"]).toContain(f.quelle);
      expect(["alle", "etw", "haus", "eigennutzer", "kapitalanleger"]).toContain(f.relevanz);
    }
  });
});

describe("ermittleObjekttyp", () => {
  it("erkennt Wohnungen auch dann, wenn 'Haus' im Text steht", () => {
    expect(ermittleObjekttyp({ objekt: { objektart: "Wohnung im Zweifamilienhaus" } })).toBe("ETW");
    expect(ermittleObjekttyp({ objekt: { objektart: "Etagenwohnung" } })).toBe("ETW");
  });

  it("erkennt Haeuser", () => {
    expect(ermittleObjekttyp({ objekt: { objektart: "Reihenhaus" } })).toBe("Haus");
    expect(ermittleObjekttyp({ objekt: { objektart: "Doppelhaushälfte" } })).toBe("Haus");
  });

  it("faellt bei unbekannter Objektart auf ETW zurueck", () => {
    expect(ermittleObjekttyp({ objekt: { objektart: null } })).toBe("ETW");
    expect(ermittleObjekttyp({})).toBe("ETW");
  });
});

describe("formatiereStockwerk", () => {
  it("macht aus der nackten Tabellen-Zahl eine lesbare Etage", () => {
    expect(formatiereStockwerk("1")).toBe("1. OG");
    expect(formatiereStockwerk("3")).toBe("3. OG");
    expect(formatiereStockwerk("0")).toBe("EG");
  });

  it("laesst bereits ausgeschriebene Angaben unveraendert", () => {
    expect(formatiereStockwerk("1. OG")).toBe("1. OG");
    expect(formatiereStockwerk("Dachgeschoss")).toBe("Dachgeschoss");
  });

  it("liefert null fuer leere oder fehlende Angaben", () => {
    expect(formatiereStockwerk(null)).toBeNull();
    expect(formatiereStockwerk("  ")).toBeNull();
  });
});

describe("Ingersheim (docs/expose1.pdf)", () => {
  const analyse = analysiereExpose(INGERSHEIM);

  it("berechnet die Flaechen aus beworben und belegt", () => {
    expect(analyse.realpreis.flaecheBeworben).toBe(50);
    expect(analyse.realpreis.flaecheReal).toBe(47.88);
    expect(analyse.realpreis.flaecheAbweichend).toBe(true);
  });

  it("berechnet die Quadratmeterpreise", () => {
    expect(analyse.realpreis.qmBeworben).toBeCloseTo(3980.0, 2);
    expect(analyse.realpreis.qmReal).toBeCloseTo(4156.22, 2);
    expect(analyse.realpreis.qmAllIn).toBeCloseTo(4469.51, 2);
  });

  it("berechnet den All-in-Kaufpreis", () => {
    expect(analyse.realpreis.allIn).toBe(214000);
  });

  it("meldet den Flaechen-Widerspruch mit beiden Fundstellen und Euro-Schaden", () => {
    const k2 = finding(analyse, "K2_flaeche");
    expect(k2).toBeDefined();
    expect(k2.severity).toBe("critical");
    expect(k2.impactEur).toBeCloseTo(8437.6, 2);
    expect(k2.quellen).toEqual(["Eckdaten-Tabelle", "Ausstattungsliste"]);
  });

  it("meldet den Verbrauchsausweis als Pruefhinweis", () => {
    expect(finding(analyse, "K6_ausweis").severity).toBe("info");
  });

  it("meldet KEINEN Stellplatz-Widerspruch - der Preis ist hier eindeutig separat", () => {
    expect(finding(analyse, "K1_stellplatz")).toBeUndefined();
  });

  it("meldet keinen Gesamtpreis-Widerspruch: 199.000 + 15.000 = 214.000", () => {
    expect(finding(analyse, "K4_gesamtpreis")).toBeUndefined();
  });

  it("blendet den Vermietungs-Abschnitt vollstaendig aus", () => {
    expect(analyse.vermietet).toBe(false);
    expect(analyse.checkliste.filter((c) => c.abschnitt === 3)).toHaveLength(0);
    expect(analyse.bekannt.filter((b) => String(b.id).startsWith("3."))).toHaveLength(0);
  });

  it("zeigt den WEG-Abschnitt, weil es eine ETW ist", () => {
    expect(analyse.objekttyp).toBe("ETW");
    expect(analyse.checkliste.some((c) => c.abschnitt === 5)).toBe(true);
  });

  it("laesst die Flaechenfrage offen, solange die Flaeche strittig ist", () => {
    expect(frage(analyse, "1.1")).toBeDefined();
    expect(bekannt(analyse, "1.1")).toBeUndefined();
  });

  it("beantwortet den Gesamtkaufpreis und die Stellplatzfrage automatisch", () => {
    expect(bekannt(analyse, "2.1").text).toBe("Gesamtkaufpreis 214.000 € inkl. Stellplatz/Garage");
    expect(bekannt(analyse, "2.2").text).toBe("Stellplatz separat ausgewiesen, zzgl. 15.000 €");
  });

  it("uebernimmt Baujahr, Heizung und Energieausweis nach 'Bereits bekannt'", () => {
    expect(bekannt(analyse, "4.1").text).toBe("Baujahr 1996");
    expect(bekannt(analyse, "4.2").text).toBe("Gas-Zentralheizung, Baujahr 1996");
    expect(bekannt(analyse, "4.4").text).toBe(
      "Energieausweis: Verbrauchsausweis, Klasse C, 77,4 kWh/(m²a)",
    );
  });

  it("listet Hausgeld und Stellplaetze als Zusatzfakten", () => {
    expect(bekannt(analyse, "fakt_hausgeld").text).toBe("Hausgeld 208 € pro Monat");
    expect(bekannt(analyse, "fakt_stellplatz").text).toBe(
      "2 × Stellplatz im Freien, zusammen 15.000 €",
    );
  });

  it("waehlt genau die Kern-Fragen vor, die offen geblieben sind", () => {
    expect(analyse.vorauswahl).toContain("1.1");
    expect(analyse.vorauswahl).toContain("4.3");
    expect(analyse.vorauswahl).toContain("5.1");
    // 2.1 und 2.2 sind beantwortet und stehen deshalb gar nicht zur Auswahl.
    expect(analyse.vorauswahl).not.toContain("2.1");
    expect(analyse.vorauswahl).not.toContain("2.2");
  });

  it("baut Titel und Adresse fuer den Handout-Kopf", () => {
    expect(analyse.titel).toBe("2-Zimmer-ETW, Baujahr 1996, 1. OG, ca. 47,88 m²");
    expect(analyse.adresse).toBe("Murrstrasse 2, 74379 Ingersheim");
  });
});

describe("Murr (docs/expose2.pdf)", () => {
  const analyse = analysiereExpose(MURR);

  it("meldet den Stellplatz-Widerspruch als groessten Fund", () => {
    const k1 = finding(analyse, "K1_stellplatz");
    expect(k1).toBeDefined();
    expect(k1.severity).toBe("critical");
    expect(k1.impactEur).toBe(15000);
    expect(k1.quellen).toEqual(["Objektbeschreibung", "Objektbeschreibung"]);
    expect(analyse.findings[0].id).toBe("K1_stellplatz");
  });

  it("meldet auch den zweiten Flaechen-Widerspruch (76 vs. 75 m²)", () => {
    const k2 = finding(analyse, "K2_flaeche");
    expect(k2).toBeDefined();
    expect(k2.impactEur).toBeCloseTo(3671.05, 2);
  });

  it("berechnet die Renditen auf den All-in-Preis", () => {
    expect(analyse.realpreis.bruttoRendite).toBeCloseTo(4.08, 2);
    expect(analyse.realpreis.nettoRendite).toBeCloseTo(3.77, 2);
    expect(analyse.realpreis.bruttoRenditeOhneStellplatz).toBeCloseTo(4.3, 2);
  });

  it("zeigt den Vermietungs-Abschnitt und beantwortet Mietstatus und Kaltmiete", () => {
    expect(analyse.vermietet).toBe(true);
    expect(bekannt(analyse, "3.1").text).toBe("vermietet seit 01.10.2025");
    expect(bekannt(analyse, "3.2").text).toBe("Kaltmiete 1.000 € monatlich");
  });

  it("laesst Gesamtpreis und Stellplatzfrage offen, weil beides strittig ist", () => {
    expect(frage(analyse, "2.1")).toBeDefined();
    expect(frage(analyse, "2.2")).toBeDefined();
  });

  it("laesst die Frage nach der WEG-Ruecklage offen - der Monatsbeitrag beantwortet sie nicht", () => {
    expect(frage(analyse, "5.1")).toBeDefined();
    expect(analyse.vorauswahl).toContain("5.1");
  });

  it("zeigt die Ruecklage als Betrag, ohne sie zu bewerten (GR-03)", () => {
    const hausgeld = bekannt(analyse, "fakt_hausgeld").text;
    expect(hausgeld).toBe(
      "Hausgeld 256 € pro Monat, davon 77,07 € nicht umlagefähig, davon 45,83 € Rücklagenzuführung",
    );
    expect(hausgeld).not.toMatch(/zu (?:hoch|niedrig|gering)/i);
  });

  it("fuehrt den Stellplatz nicht gleichzeitig als bekannten Fakt", () => {
    expect(bekannt(analyse, "fakt_stellplatz")).toBeUndefined();
  });

  it("meldet die fehlende Angabe zum Heizungsalter", () => {
    expect(finding(analyse, "K5_heizung").severity).toBe("warning");
  });

  it("schreibt das Stockwerk aus, statt die nackte Tabellen-Zahl zu zeigen", () => {
    expect(analyse.titel).toBe("3-Zimmer-ETW, Baujahr 1995, 1. OG, ca. 75,00 m²");
    expect(bekannt(analyse, "fakt_lage").text).toBe("3 Zimmer, 1. OG");
  });
});

describe("Findings-Priorisierung", () => {
  it("sortiert nach Euro-Impact, nicht nach Fundort", () => {
    const sortiert = sortiereFindings([
      { id: "b", severity: "info", impactEur: null },
      { id: "a", severity: "critical", impactEur: 500 },
      { id: "c", severity: "warning", impactEur: 9000 },
    ]);
    expect(sortiert.map((f) => f.id)).toEqual(["c", "a", "b"]);
  });

  it("stellt Findings mit Betrag vor solche ohne", () => {
    const sortiert = sortiereFindings([
      { id: "ohne", severity: "critical", impactEur: null },
      { id: "mit", severity: "info", impactEur: 1 },
    ]);
    expect(sortiert[0].id).toBe("mit");
  });

  it("zeigt hoechstens fuenf Findings, rechnet das Verdict aber ueber alle", () => {
    const viele = Array.from({ length: 7 }, (_, i) => ({
      id: `x${i}`,
      severity: "warning",
      impactEur: null,
    }));
    expect(berechneVerdict(viele).score).toBe(1.5);
  });

  it("begrenzt den Verdict-Score nach unten auf 1", () => {
    const sehrViele = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      severity: "critical",
      impactEur: null,
    }));
    expect(berechneVerdict(sehrViele).score).toBe(1);
  });

  it("vergibt bei fehlerfreiem Expose das unauffaellige Label", () => {
    expect(berechneVerdict([])).toEqual({ score: 5, label: "Unauffällig" });
  });
});

describe("Ton der Findings (GR-02)", () => {
  // Findings sind neutral und sachlich zu formulieren, nie wertend oder
  // anklagend gegenueber dem Anbieter - Immofuchs finanziert sich auch ueber
  // Makler, die auf der Plattform inserieren.
  const VERBOTEN =
    /\b(?:makler|falsch|getäuscht|täuschung|verschwiegen|betrug|irreführend|unseriös|verschleiert)\b/i;

  it("verwendet in keinem Finding beider Referenz-Exposés wertende Sprache", () => {
    for (const fixture of [INGERSHEIM, MURR]) {
      const analyse = analysiereExpose(fixture);
      for (const f of analyse.findings) {
        expect(f.text, `Finding ${f.id}`).not.toMatch(VERBOTEN);
      }
    }
  });
});

describe("Robustheit", () => {
  it("liefert null, wenn weder Kaufpreis noch Wohnflaeche erkannt wurden", () => {
    expect(analysiereExpose({ objekt: {}, kosten: {} })).toBeNull();
    expect(analysiereExpose(null)).toBeNull();
  });

  it("kommt ohne abweichungen-Array aus (altes Worker-Deployment)", () => {
    const ohne = { ...INGERSHEIM, abweichungen: undefined };
    const analyse = analysiereExpose(ohne);
    expect(analyse).not.toBeNull();
    expect(finding(analyse, "K2_flaeche")).toBeUndefined();
    // Ohne beworbene Flaeche gibt es nur noch einen Quadratmeterpreis.
    expect(analyse.realpreis.flaecheAbweichend).toBe(false);
    expect(analyse.realpreis.qmReal).toBeCloseTo(4156.22, 2);
  });

  it("laesst Zeilen ohne Datenbasis aus der Preistabelle weg, statt zu schaetzen", () => {
    const ohneMiete = berechneRealpreis({ objekt: { kaufpreis: 200000, wohnflaeche: 50 } });
    const labels = bauePreistabelle(ohneMiete).map((z) => z.label);
    expect(labels).toContain("Preis pro m²");
    expect(labels).not.toContain("Bruttomietrendite");
    expect(labels).not.toContain("Gesamtpreis inkl. Stellplatz");
  });

  it("faellt bei einem fehlerhaften Resolver nicht aus, sondern laesst die Frage offen", () => {
    const kaputt = { ...INGERSHEIM, ausstattung: null, energie: null };
    const analyse = analysiereExpose(kaputt);
    expect(analyse).not.toBeNull();
    expect(frage(analyse, "4.4")).toBeDefined();
  });

  it("erzeugt keine Findings aus einem widerspruchsfreien Expose", () => {
    const sauber = {
      objekt: { kaufpreis: 300000, wohnflaeche: 80, baujahr: 2020, objektart: "Wohnung" },
      ausstattung: { baujahr_waermeerzeuger: 2020 },
      energie: { energieausweistyp: "Bedarfsausweis", energieeffizienzklasse: "A" },
      kosten: {},
      kontext: {},
      abweichungen: [],
    };
    const realpreis = berechneRealpreis(sauber);
    expect(pruefeKonsistenz(sauber, realpreis)).toHaveLength(0);
  });
});
