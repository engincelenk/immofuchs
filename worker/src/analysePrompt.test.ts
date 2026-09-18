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

  it("haengt cashflowMon und dscr an eine Variantenzeile an, wenn mitgeliefert", () => {
    const p = nutzerPayload(KENNZAHLEN, "", [VARIANTE({ cashflowMon: "+45 €", dscr: "1,3" })]);
    expect(p).toContain("- Kaufpreis −15.000 € (neu 285.000 €): Score 78 statt 72, Cashflow +45 €/Monat, DSCR 1,3");
  });

  it("laesst cashflowMon/dscr in der Variantenzeile weg, wenn nicht mitgeliefert", () => {
    const p = nutzerPayload(KENNZAHLEN, "", [VARIANTE()]);
    expect(p).not.toContain("Cashflow");
    expect(p).not.toContain("DSCR");
  });

  it("haelt Nutzerhinweis und Varianten getrennt", () => {
    const p = nutzerPayload(KENNZAHLEN, "Dach neu 2024", [VARIANTE()]);
    expect(p.indexOf("Durchgerechnete Varianten")).toBeLessThan(
      p.indexOf("Zusaetzliche Hinweise des Nutzers"),
    );
    expect(p).toContain("Dach neu 2024");
  });
});

// Das Briefing loest analyse/hebel/preis ab (Spec docs/technical_specs/
// investment-briefing.md). Die Tests halten die Regeln fest, an denen die
// drei Vorgaenger gescheitert sind: widerspruechliche Urteile, dreifach
// genannte Befunde, Rauschen als Hebel verkauft.
describe("systemPromptFuer - briefing", () => {
  it("bindet das Urteil an die gesetzte Ampel", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain("ampel");
    expect(p).toContain("weder abschwaechen noch verschaerfen");
  });

  it("verlangt Klartext statt Ausweichformulierung", () => {
    expect(systemPromptFuer("briefing")).toContain("traegt sich nicht");
  });

  it("verbietet, einen Befund zweimal auf die Karte zu schreiben", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain("genau EINMAL");
  });

  it("erklaert eine Abweichung im Rahmen ausdruecklich NICHT zum Hebel", () => {
    expect(systemPromptFuer("briefing")).toContain('"im Rahmen"');
  });

  it("verbietet Score und Pfeile im Text", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain("KEINEN Score");
    expect(p).toContain("Keine Pfeile");
  });

  it("bindet Mietpotenzial an die Kappungsgrenze", () => {
    expect(systemPromptFuer("briefing")).toContain("Kappungsgrenze");
  });

  it("haelt Fachbegriffe aus dem Text - der Leser ist Einsteiger", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain("DSCR");
    expect(p).toContain("keine Fachbegriffe");
  });

  it("liefert das eigene Antwortschema statt des generischen", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain('"urteil"');
    expect(p).toContain('"tragfaehigkeit"');
    expect(p).not.toContain('"calculations"');
    expect(p).not.toContain('"keyInsights"');
  });

  it("erwaehnt keine Durchgerechneten Varianten - die gab es nur beim Hebel-Produkt", () => {
    expect(systemPromptFuer("briefing")).not.toContain("Durchgerechnete Varianten");
  });
});

describe("nutzerPayload - gerechnete Werte", () => {
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

// Der Zielpreis-Kanal und der Kanal "vorherige Befunde" sind mit
// analyse/hebel/preis entfallen (Spec Abschnitt 11): das Briefing baut nicht
// mehr auf fremden Modelltexten auf, und den zirkulaeren Zielbereich ersetzt
// die gerechnete Kachel V4.
describe("nutzerPayload - Befunde (Produkt handout)", () => {
  const BEFUNDE = [{ produkt: "Investment-Briefing", kernaussage: "Der Cashflow traegt nicht." }];

  it("rendert die Befunde als eigenen Block", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, undefined, BEFUNDE);
    expect(p).toContain("Bisherige Befunde");
    expect(p).toContain("- Investment-Briefing: Der Cashflow traegt nicht.");
  });

  it("nennt ohne Befunde keinen entsprechenden Block", () => {
    expect(nutzerPayload(KENNZAHLEN)).not.toContain("Bisherige Befunde");
  });

  it("kennt weder Zielbereich noch vorherige Befunde als eigene Bloecke mehr", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, undefined, BEFUNDE);
    expect(p).not.toContain("Investment-Zielbereich");
    expect(p).not.toContain("Vorherige Befunde");
  });
});

describe("nutzerPayload - Standort-Kontext (Backlog C.8)", () => {
  const FAKTEN = [
    "Baden-Württemberg ist stark exportorientiert, Schwerpunkt Automobilbau.",
    "Im Bundesländervergleich niedrige Arbeitslosenquote.",
  ];

  it("rendert den Standort-Kontext als Liste, wenn vorhanden", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, undefined, undefined, FAKTEN);
    expect(p).toContain("Standort-Kontext");
    expect(p).toContain("- " + FAKTEN[0]);
    expect(p).toContain("- " + FAKTEN[1]);
  });

  it("markiert den Block ausdruecklich als keine Kennzahl", () => {
    const p = nutzerPayload(KENNZAHLEN, "", undefined, undefined, undefined, FAKTEN);
    expect(p).toContain("keine Kennzahl");
  });

  it("nennt ohne Fakten keinen Standort-Kontext-Block", () => {
    expect(nutzerPayload(KENNZAHLEN)).not.toContain("Standort-Kontext");
    expect(nutzerPayload(KENNZAHLEN, "", undefined, undefined, undefined, [])).not.toContain(
      "Standort-Kontext",
    );
  });
});

// Das Handout hat seit 2026-09-08 eine eigene Form: eine Fragenliste, die der
// Nutzer einzeln abwaehlt und ausdruckt. Diese Tests halten die Trennung fest -
// eine versehentlich zurueckgebaute Abschnittsform waere im Client sofort eine
// leere Karte, weil parseHandoutOutput dann keine Fragen faende.
describe("systemPromptFuer - handout", () => {
  it("verlangt eine Fragenliste statt des Investment-Briefing-Schemas", () => {
    const p = systemPromptFuer("handout");
    expect(p).toContain('"fragen"');
    expect(p).toContain('"vorOrt"');
    expect(p).toContain('"kern"');
    expect(p).not.toContain('"keyInsights"');
    expect(p).not.toContain('"summary"');
  });

  it("deckelt die Fragenzahl schon im Prompt", () => {
    expect(systemPromptFuer("handout")).toContain("Hoechstens 12 fragen");
  });

  it("laesst die Befunde weiterhin die Quelle der Fragen sein", () => {
    expect(systemPromptFuer("handout")).toContain("Bisherige Befunde");
  });

  it("aendert das Schema der uebrigen Produkte nicht", () => {
    for (const produkt of ["kredit", "miete", "sanier"] as const) {
      expect(systemPromptFuer(produkt)).toContain('"keyInsights"');
      expect(systemPromptFuer(produkt)).toContain('"summary"');
      expect(systemPromptFuer(produkt)).not.toContain('"fragen"');
    }
    expect(systemPromptFuer("briefing")).not.toContain('"fragen"');
  });
});

describe("systemPromptFuer - generisches Schema (FORM)", () => {
  it("gibt fuer die Rechner-Produkte die volle Ebenen-Struktur vor", () => {
    for (const produkt of ["kredit", "miete", "vfe"] as const) {
      const p = systemPromptFuer(produkt);
      expect(p).toContain('"summary"');
      expect(p).toContain('"keyInsights"');
      expect(p).toContain('"risks"');
      expect(p).toContain('"opportunities"');
      expect(p).toContain('"calculations"');
      expect(p).toContain('"scenarios"');
      expect(p).toContain('"assumptions"');
      expect(p).toContain('"recommendation"');
    }
  });

  it("erklaert die vier basis-Werte im Prompt", () => {
    const p = systemPromptFuer("kredit");
    expect(p).toContain('"basis"');
    expect(p).toContain("expose");
    expect(p).toContain("berechnet");
    expect(p).toContain("annahme");
    expect(p).toContain('"ki"');
  });

  it("verbietet erfundene Werte in keyInsights/risks/opportunities scharf und ergaenzt die Herkunfts-Pflicht", () => {
    const p = systemPromptFuer("kredit");
    expect(p).toContain("Erfinde KEINE");
    expect(p).toContain("LASS SIE WEG");
    expect(p).toContain("Herkunft");
  });

  it("verlangt keine Kauf- oder Anlageempfehlung fuer recommendation", () => {
    expect(systemPromptFuer("kredit")).toContain("Kauf- oder Anlageempfehlung");
  });
});

// Ort-Nennung und Zahlen-Disziplin waren bisher auf drei Prompts verteilt und
// dort jeweils leicht anders formuliert - genau daher kamen die
// widerspruechlichen Karten. Jetzt gibt es nur noch einen Ort, an dem das steht.
describe("systemPromptFuer - briefing: Ort und Zahlen-Disziplin", () => {
  it("weist das Briefing an, den Ort genau einmal beim Namen zu nennen", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain('"ort"');
    expect(p).toContain("genau einmal");
  });

  it("sagt ausdruecklich, dass die Bewertung bereits getroffen ist", () => {
    const p = systemPromptFuer("briefing");
    expect(p).toContain("du faellst sie nicht");
  });

  it("grenzt sich nicht mehr gegen zwei Schwesterprodukte ab - es gibt nur noch eins", () => {
    expect(systemPromptFuer("briefing")).not.toContain("eine von drei");
  });
});

// Die fuenf Produkte der Nicht-Rendite-Rechner: kein Objekt, sondern die
// Eingaben eines einzelnen Rechners. Dieselbe Zahlen-Disziplin - das Modell
// darf nur mit mitgelieferten Zahlen arbeiten, nie eigene Markt-, Foerder-
// oder Steuerzahlen erfinden. Sie teilen sich FORM untereinander; das
// Briefing hat seit 2026-09-18 eine eigene Form (BRIEFING_FORM).
describe("systemPromptFuer - die fuenf Rechner-Produkte", () => {
  const rechnerProdukte = ["kredit", "miete", "sanier", "vfe", "steuer6"] as const;

  it("liefert fuer jedes der fuenf Produkte einen nicht-leeren, eigenstaendigen Prompt im Investment-Briefing-Schema", () => {
    const prompts = rechnerProdukte.map((p) => systemPromptFuer(p));
    for (const p of prompts) {
      expect(p.length).toBeGreaterThan(0);
      expect(p).toContain('"summary"');
      expect(p).toContain('"keyInsights"');
    }
    // Paarweise verschieden - kein Copy-Paste-Ueberrest.
    for (let i = 0; i < prompts.length; i++) {
      for (let j = i + 1; j < prompts.length; j++) {
        expect(prompts[i]).not.toBe(prompts[j]);
      }
    }
  });

  it("verbietet allen fuenf Produkten, eigene Zahlen zu erfinden", () => {
    for (const produkt of rechnerProdukte) {
      const p = systemPromptFuer(produkt);
      expect(p).toMatch(/KEINEN?\s+eigene[nrs]?/);
      // steuer6 braucht keine externe Referenzzahl (der einzige Fakt - die
      // Tarifeckwerte - steht als fester Text im Prompt, nicht im
      // "Gerechnete Werte"-Kanal) - seine eigenen Zahlen (Sanierungskosten,
      // Kaufpreis) laufen ueber "Kennzahlen des Objekts", siehe Test unten.
      if (produkt === "steuer6") {
        expect(p).toContain("Kennzahlen des Objekts");
      } else {
        expect(p).toContain("Gerechnete Werte");
      }
    }
  });

  it("kredit: verlangt eine Einordnung gegen den mitgelieferten Referenzzins, keinen eigenen", () => {
    const p = systemPromptFuer("kredit");
    expect(p).toContain("Referenzzins");
    expect(p).toContain("ZINSSATZ");
  });

  it("miete: liest die Kappungsgrenzen-Einordnung vom Client, urteilt nicht selbst ueber den Ort", () => {
    const p = systemPromptFuer("miete");
    expect(p).toContain("Kappungsgrenze");
    expect(p).toContain("urteile NICHT selbst");
  });

  it("sanier: verbietet erfundene Foerdersaetze und -hoechstbetraege", () => {
    const p = systemPromptFuer("sanier");
    expect(p).toContain("KEINEN eigenen Foerdersatz");
    expect(p).toContain("FÖRDERUNG");
  });

  it("vfe: bindet die Hoehe der Entschaedigung an den mitgelieferten Wiederanlagezins", () => {
    const p = systemPromptFuer("vfe");
    expect(p).toContain("Wiederanlagezins");
    expect(p).toContain("Sondertilgungsrecht");
  });

  it("steuer6: traegt die recherchierten Tarifeckwerte 2026 als festen Fakt im Prompt", () => {
    const p = systemPromptFuer("steuer6");
    expect(p).toContain("12.348");
    expect(p).toContain("69.879");
    expect(p).toContain("277.826");
  });

  it("aendert die Form der beiden Objekt-Produkte nicht", () => {
    for (const produkt of ["briefing", "handout"] as const) {
      const vorher = systemPromptFuer(produkt);
      expect(vorher).toBe(systemPromptFuer(produkt));
    }
  });
});
