import { describe, it, expect } from "vitest";
import { baueHandoutDokument, type HandoutAnfrage } from "./handoutDokument";

// Uebernommen aus src/utils/finnHandout.test.js (Abschnitt "PDF-Handout"),
// nachdem die Vorlage in den Worker gezogen ist (Preispolitik 2026-08-20,
// Schritt 3). Die Anforderungen sind dieselben geblieben: der GR-01-Hinweis
// und der Disclaimer muessen drinstehen, nur ausgewaehlte Fragen duerfen
// aufgenommen werden, und Freitext aus dem Exposé darf das Dokument nicht
// zerlegen.
//
// Die Analyse wird hier von Hand gebaut statt aus finnAnalyse.js importiert:
// der Worker haengt bewusst nicht am Frontend-Bundle, und was diese Vorlage
// leisten muss, haengt nur an der Form des Objekts - nicht daran, wer es
// erzeugt hat.

const LABELS = {
  titel: "Besichtigungs-Handout",
  automatisiert: "Automatisiert erkannt — bitte vor einer Verhandlung selbst prüfen.",
  findings: "Die wichtigsten Punkte",
  quellen: "Fundstellen: {quellen}",
  schwereCritical: "kritisch",
  schwereWarning: "prüfen",
  schwereInfo: "Info",
  preis: "Der echte Preis",
  beworben: "Beworben",
  real: "Real",
  bekannt: "Bereits bekannt",
  offen: "Noch zu klären",
  vorOrt: "Vor Ort prüfen",
  leer: "Keine wesentlichen Auffälligkeiten gefunden.",
  pdfDisclaimer: "Keine Rechts- oder Anlageberatung",
  pdfFooter: "Erstellt mit Finn · immofuchs.info",
  pdfVerdict: "Finn-Einschätzung {score} / 5",
};

function anfrage(ueberschreibungen: Partial<HandoutAnfrage> = {}): HandoutAnfrage {
  return {
    lang: "de",
    labels: LABELS,
    auswahl: ["5.1"],
    analyse: {
      adresse: "Hauptstraße 12, 74379 Ingersheim",
      titel: "Gepflegte 3-Zimmer-Wohnung",
      objekttyp: "ETW",
      verdictLabel: "Genauer hinsehen",
      verdictScore: 3.4,
      findings: [
        { text: "Hausgeld liegt über dem Üblichen", severity: "warning", impactEur: 4200, quellen: ["Exposé"] },
      ],
      preistabelle: [
        { label: "Preis pro m²", beworben: "4.010 €", real: "4.156 €", abweichend: true },
        { label: "All-in", beworben: null, real: "214.000 €" },
      ],
      bekannt: [{ text: "Baujahr 1998" }],
      checkliste: [
        { id: "5.1", frage: "Wie hoch ist die Instandhaltungsrücklage der gesamten WEG?", kategorie: "WEG" },
        { id: "5.2", frage: "Stehen Sonderumlagen an?", kategorie: "WEG" },
        { id: "9.1", frage: "Feuchte Stellen im Keller?", quelle: "vor_ort" },
      ],
    },
    ...ueberschreibungen,
  };
}

const BASIS = "https://immofuchs.info";

describe("Handout-Dokument", () => {
  it("traegt den GR-01-Hinweis und den Disclaimer im Footer", () => {
    const html = baueHandoutDokument(anfrage(), BASIS);
    expect(html).toContain(LABELS.automatisiert);
    expect(html).toContain("Keine Rechts- oder Anlageberatung");
    expect(html).toContain("Erstellt mit Finn · immofuchs.info");
  });

  it("uebernimmt die Zahlen der Preistabelle unveraendert", () => {
    const html = baueHandoutDokument(anfrage(), BASIS);
    expect(html).toContain("4.156 €");
    expect(html).toContain("214.000 €");
  });

  it("nimmt nur die ausgewaehlten Fragen auf", () => {
    const html = baueHandoutDokument(anfrage(), BASIS);
    expect(html).toContain("Instandhaltungsrücklage der gesamten");
    expect(html).not.toContain("Stehen Sonderumlagen an?");
  });

  it("trennt Vor-Ort-Fragen von den Fragen an den Anbieter", () => {
    const html = baueHandoutDokument(anfrage({ auswahl: ["5.1", "9.1"] }), BASIS);
    expect(html).toContain("Vor Ort prüfen");
    expect(html).toContain("Feuchte Stellen im Keller?");
  });

  it("maskiert spitze Klammern aus dem Expose-Text", () => {
    const boesartig = anfrage();
    boesartig.analyse!.adresse = "<script>alert(1)</script>";
    const html = baueHandoutDokument(boesartig, BASIS);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("verlinkt das Logo absolut - das Druckfenster hat keine Basis-URL", () => {
    const html = baueHandoutDokument(anfrage(), BASIS);
    expect(html).toContain('src="https://immofuchs.info/logo-transparent.png"');
  });

  it("kommt ohne Findings aus, ohne eine leere Tabelle zu zeigen", () => {
    const ohne = anfrage();
    ohne.analyse!.findings = [];
    const html = baueHandoutDokument(ohne, BASIS);
    expect(html).toContain(LABELS.leer);
    expect(html).not.toContain(LABELS.quellen.replace("{quellen}", ""));
  });

  it("uebersteht eine voellig leere Anfrage, statt zu werfen", () => {
    const html = baueHandoutDokument({ analyse: {} }, BASIS);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("deckelt uebergrosse Listen, statt sie ungebremst zu rendern", () => {
    const viele = anfrage();
    viele.analyse!.findings = Array.from({ length: 50 }, (_, i) => ({
      text: `Fund Nummer ${i}`,
      severity: "info",
    }));
    const html = baueHandoutDokument(viele, BASIS);
    expect(html).toContain("Fund Nummer 9");
    expect(html).not.toContain("Fund Nummer 10");
  });

  it("setzt den Euro-Betrag eines Fundes als Abzug davor", () => {
    const html = baueHandoutDokument(anfrage(), BASIS);
    expect(html).toContain("−4.200 €");
  });
});
