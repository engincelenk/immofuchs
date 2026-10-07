// Der Finn-Fragenkatalog als Datenstruktur.
// Quelle: docs/Finn_Fragenkatalog.md - dort steht die fachliche Fassung, die
// sich unabhaengig vom Produkt weiterentwickelt. Diese Datei ist die 1:1-
// Uebertragung; jede Aenderung hier gehoert auch dorthin (und umgekehrt).
//
// 44 Fragen in 11 Abschnitten, davon 12 Kern-Fragen (Default-Vorauswahl).
//
// Felder je Frage:
//   id        stabil, "<abschnitt>.<nr>" - haengt an der Nutzerauswahl und darf
//             sich niemals verschieben, auch nicht beim Umsortieren.
//   quelle    wo die Antwort ueblicherweise steht. Steuert NICHT allein, ob
//             Finn sie beantwortet - das entscheidet `antwort` je Dokument.
//             "fehlt" heisst "meistens nicht im Expose", nicht "nie".
//   kern      true = im Handout vorausgewaehlt.
//   relevanz  "alle" | "etw" | "haus" | "eigennutzer" | "kapitalanleger".
//             Nicht zutreffende Fragen werden ausgeblendet, nicht abgewaehlt.
//   antwort   optionaler Resolver (ergebnis, kontext) => string|null.
//             Gibt er einen String zurueck, gilt die Frage als beantwortet und
//             wandert nach "Bereits bekannt". null => "Noch zu klaeren".
//
// Abschnitts-Gating (Fragenkatalog, "Anwendung in Finn", Schritt 1):
//   nurWennVermietet  ganzer Abschnitt entfaellt bei nicht vermieteten Objekten
//   nurEtw            ganzer Abschnitt entfaellt bei Haeusern

import { fmt, fmtE } from "../utils/helpers.js";

// ── Hilfen fuer die Resolver ────────────────────────────────────────────────

function hatAbweichung(ergebnis, feld) {
  return (ergebnis?.abweichungen ?? []).some((a) => a.feld === feld);
}

const qm = (v) => `${fmt(v, Number.isInteger(v) ? 0 : 2)} m²`;

// Bewusst nicht `Boolean(v)`: null heisst "steht nicht im Expose" und muss
// offen bleiben, false heisst "laut Expose nicht vorhanden" und ist eine
// gueltige Antwort.
const jaNein = (v, wennJa, wennNein) => (v === true ? wennJa : v === false ? wennNein : null);

export const ABSCHNITTE = [
  {
    nr: 1,
    titel: "Fläche & Grundriss",
    fragen: [
      {
        id: "1.1",
        frage: "Wie groß ist die Wohnfläche, und nach welcher Methode berechnet (WoFlV/DIN 277)?",
        quelle: "tabelle",
        kern: true,
        relevanz: "alle",
        // Bewusst NICHT beantwortet, sobald die Flaeche widerspruechlich
        // angegeben ist: dann ist genau die Berechnungsmethode der strittige
        // Punkt, den der Nutzer beim Termin ansprechen soll. Der Widerspruch
        // selbst laeuft als eigenes Finding (K2), nicht als Antwort hier
        // (Fragenkatalog, "Anwendung in Finn", Schritt 5).
        antwort: (e) =>
          e.objekt?.wohnflaeche && !hatAbweichung(e, "wohnflaeche")
            ? `Wohnfläche ${qm(e.objekt.wohnflaeche)} laut Exposé`
            : null,
      },
      {
        id: "1.2",
        frage: "Wie ist der Grundriss geschnitten (Durchgangszimmer, Flurflächenanteil)?",
        quelle: "tabelle",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "1.3",
        frage: "Verkleinern Dachschrägen die real nutzbare Fläche?",
        quelle: "vor_ort",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "1.4",
        frage: "Zählen Keller-, Dachboden- oder Gartenanteile zur Wohn- oder nur zur Nutzfläche?",
        quelle: "text",
        kern: false,
        relevanz: "alle",
        antwort: (e) =>
          e.objekt?.nutzflaeche
            ? `${qm(e.objekt.nutzflaeche)} Nutzfläche separat ausgewiesen, nicht Teil der Wohnfläche`
            : null,
      },
    ],
  },
  {
    nr: 2,
    titel: "Kaufpreis & Nebenkosten",
    fragen: [
      {
        id: "2.1",
        frage: "Wie hoch ist der Gesamtkaufpreis inkl. Stellplatz/TG, nicht nur der Kopfpreis?",
        quelle: "tabelle",
        kern: true,
        relevanz: "alle",
        // Offen lassen, solange widerspruechlich ist, ob der Stellplatz im
        // Preis steckt - sonst steht im Handout eine Summe als "bereits
        // bekannt", die genau der strittige Punkt ist.
        antwort: (e, k) =>
          k.realpreis.allIn && !hatAbweichung(e, "stellplatz_kaufpreis")
            ? `Gesamtkaufpreis ${fmtE(k.realpreis.allIn)} inkl. Stellplatz/Garage`
            : null,
      },
      {
        id: "2.2",
        frage: "Ist der Stellplatz im Kaufpreis enthalten oder zusätzlich?",
        quelle: "text",
        kern: true,
        relevanz: "alle",
        antwort: (e) => {
          if (hatAbweichung(e, "stellplatz_kaufpreis")) return null;
          const preis = e.objekt?.stellplatz_kaufpreis;
          if (preis) return `Stellplatz separat ausgewiesen, zzgl. ${fmtE(preis)}`;
          return null;
        },
      },
      {
        id: "2.3",
        frage:
          "Wie hoch sind Grunderwerbsteuer, Notar- und Grundbuchkosten (üblich ca. 9–12 % zusätzlich)?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
        antwort: (e) =>
          e.kosten?.kaufnebenkosten ? `Kaufnebenkosten ${fmtE(e.kosten.kaufnebenkosten)} laut Exposé` : null,
      },
      {
        id: "2.4",
        frage: "Wie hoch ist die Maklerprovision, und wer zahlt sie?",
        quelle: "tabelle",
        kern: false,
        relevanz: "alle",
        antwort: (e) =>
          e.kosten?.provision_kaeufer_prozent
            ? `Maklerprovision ${fmt(e.kosten.provision_kaeufer_prozent, 2)} % für den Käufer`
            : null,
      },
      {
        id: "2.5",
        frage: "Ist eine Einbauküche oder sonstiges Inventar im Kaufpreis enthalten?",
        quelle: "text",
        kern: false,
        relevanz: "alle",
        antwort: (e) =>
          jaNein(
            e.ausstattung?.einbaukueche,
            "Einbauküche laut Exposé vorhanden",
            "keine Einbauküche laut Exposé",
          ),
      },
    ],
  },
  {
    nr: 3,
    titel: "Vermietung",
    nurWennVermietet: true,
    fragen: [
      {
        id: "3.1",
        frage: "Ist die Wohnung vermietet, seit wann?",
        quelle: "tabelle",
        kern: true,
        relevanz: "alle",
        antwort: (e) =>
          e.objekt?.vermietet_seit
            ? `vermietet seit ${e.objekt.vermietet_seit}`
            : e.objekt?.vermietet === true
              ? "vermietet, Mietbeginn nicht angegeben"
              : null,
      },
      {
        id: "3.2",
        frage: "Wie hoch ist die aktuelle Kaltmiete?",
        quelle: "tabelle",
        kern: true,
        relevanz: "alle",
        antwort: (e) => (e.kosten?.kaltmiete ? `Kaltmiete ${fmtE(e.kosten.kaltmiete)} monatlich` : null),
      },
      {
        id: "3.3",
        frage: "Wann und um wie viel wurde die Miete zuletzt erhöht? Staffel- oder Indexmiete?",
        quelle: "fehlt",
        kern: true,
        relevanz: "alle",
      },
      {
        id: "3.4",
        frage: "Ist eine Kaution hinterlegt, wird sie übergeben?",
        quelle: "fehlt",
        kern: true,
        relevanz: "alle",
      },
      {
        id: "3.5",
        frage: "Gibt es Mietrückstände oder laufende Streitigkeiten?",
        quelle: "fehlt",
        kern: false,
        relevanz: "kapitalanleger",
      },
      {
        id: "3.6",
        frage: "Greift eine Kündigungssperrfrist bei Eigenbedarf (Umwandlung, § 577a BGB)?",
        quelle: "fehlt",
        kern: true,
        relevanz: "eigennutzer",
      },
      {
        id: "3.7",
        frage: "Liegt die Miete unter, auf oder über dem ortsüblichen Mietspiegel?",
        quelle: "fehlt",
        kern: false,
        relevanz: "kapitalanleger",
      },
    ],
  },
  {
    nr: 4,
    titel: "Technik & Gebäudezustand",
    fragen: [
      {
        id: "4.1",
        frage: "Baujahr des Gebäudes",
        quelle: "tabelle",
        kern: false,
        relevanz: "alle",
        antwort: (e) => (e.objekt?.baujahr ? `Baujahr ${e.objekt.baujahr}` : null),
      },
      {
        id: "4.2",
        frage: "Wie alt ist die Heizungsanlage konkret (kann jünger als das Haus sein)?",
        quelle: "fehlt",
        kern: true,
        relevanz: "alle",
        // "fehlt" beschreibt den Normalfall - nennt das Expose ein eigenes
        // Baujahr fuer den Waermeerzeuger, wird es hier beantwortet.
        antwort: (e) => {
          const bj = e.ausstattung?.baujahr_waermeerzeuger;
          if (!bj) return null;
          const art = e.ausstattung?.heizungsart;
          return art ? `${art}, Baujahr ${bj}` : `Baujahr Wärmeerzeuger ${bj}`;
        },
      },
      {
        id: "4.3",
        frage: "Besteht eine Austauschpflicht nach dem Gebäudeenergiegesetz?",
        quelle: "fehlt",
        kern: true,
        relevanz: "alle",
      },
      {
        id: "4.4",
        frage:
          "Verbrauchs- oder Bedarfsausweis, und ist die Energieeffizienzklasse zum Baujahr plausibel?",
        quelle: "tabelle",
        kern: false,
        relevanz: "alle",
        antwort: (e) => {
          const teile = [
            e.energie?.energieausweistyp,
            e.energie?.energieeffizienzklasse ? `Klasse ${e.energie.energieeffizienzklasse}` : null,
            e.energie?.endenergiebedarf ? `${fmt(e.energie.endenergiebedarf, 1)} kWh/(m²a)` : null,
          ].filter(Boolean);
          return teile.length ? `Energieausweis: ${teile.join(", ")}` : null;
        },
      },
      {
        id: "4.5",
        frage: "Wann wurden Fenster, Dach, Fassade oder Steigleitungen zuletzt saniert?",
        quelle: "text",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "4.6",
        frage: "Gab es Wasserschäden oder Schimmel in der Vergangenheit?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "4.7",
        frage: "Gibt es einen Aufzug, funktioniert er zuverlässig?",
        quelle: "tabelle",
        kern: false,
        relevanz: "etw",
      },
    ],
  },
  {
    nr: 5,
    titel: "WEG, Rücklage & Verwaltung",
    nurEtw: true,
    fragen: [
      {
        id: "5.1",
        frage:
          "Wie hoch ist die Instandhaltungsrücklage der gesamten Eigentümergemeinschaft (nicht nur der monatliche Beitrag dieser Einheit)?",
        quelle: "fehlt",
        kern: true,
        relevanz: "etw",
        // Bewusst KEIN Resolver auf `ruecklage_monatlich`: der Monatsbeitrag
        // dieser Wohnung beantwortet die Frage nach dem Bestand der WEG nicht.
        // Der Betrag steht stattdessen unter "Bereits bekannt" (finnAbgleich).
      },
      {
        id: "5.2",
        frage: "Gibt es beschlossene oder geplante Sonderumlagen?",
        quelle: "fehlt",
        kern: true,
        relevanz: "etw",
      },
      {
        id: "5.3",
        frage:
          "Welche größeren Maßnahmen stehen laut den letzten drei Eigentümerversammlungsprotokollen an?",
        quelle: "fehlt",
        kern: false,
        relevanz: "etw",
      },
      {
        id: "5.4",
        frage: "Gibt es Rechtsstreitigkeiten in der WEG oder mit der Verwaltung?",
        quelle: "fehlt",
        kern: false,
        relevanz: "etw",
      },
      {
        id: "5.5",
        frage:
          "Wie viele Einheiten hat das Gesamtobjekt, wie hoch ist der Miteigentumsanteil dieser Wohnung?",
        quelle: "text",
        kern: false,
        relevanz: "etw",
        antwort: (e) =>
          e.objekt?.wohneinheiten
            ? `${e.objekt.wohneinheiten} Wohneinheiten im Gesamtobjekt, Miteigentumsanteil nicht angegeben`
            : null,
      },
    ],
  },
  {
    nr: 6,
    titel: "Rechtliches, Grundbuch & Lasten",
    fragen: [
      {
        id: "6.1",
        frage: "Welche Lasten sind im Grundbuch eingetragen (Grundschulden, Wegerechte, Nießbrauch)?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "6.2",
        frage: "Besteht ein Vorkaufsrecht Dritter oder der Gemeinde?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "6.3",
        frage: "Ist die Immobilie erbbaurechtsbelastet, wie lange läuft der Vertrag noch?",
        quelle: "text",
        kern: false,
        relevanz: "alle",
      },
    ],
  },
  {
    nr: 7,
    titel: "Bauliche Substanz & Genehmigungen",
    fragen: [
      {
        id: "7.1",
        frage: "Sind alle An- oder Umbauten (Balkon, Dachausbau) genehmigt?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "7.2",
        frage: "Steht das Gebäude unter Denkmalschutz?",
        quelle: "text",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "7.3",
        frage: "Gibt es Hinweise auf Altlasten im Baugrund oder Schädlingsbefall?",
        quelle: "fehlt",
        kern: false,
        relevanz: "haus",
      },
    ],
  },
  {
    nr: 8,
    titel: "Zubehör & Sondernutzung",
    fragen: [
      {
        id: "8.1",
        frage: "Gehört ein Kellerabteil oder Dachboden fest zur Einheit?",
        quelle: "tabelle",
        kern: false,
        relevanz: "alle",
        antwort: (e) =>
          jaNein(e.ausstattung?.keller, "Keller laut Exposé vorhanden", "kein Keller laut Exposé"),
      },
      {
        id: "8.2",
        frage: "Gibt es ein Sondernutzungsrecht am Garten oder an bestimmten Stellplätzen?",
        quelle: "text",
        kern: false,
        relevanz: "etw",
      },
    ],
  },
  {
    nr: 9,
    titel: "Nutzung & Beschränkungen",
    nurEtw: true,
    fragen: [
      {
        id: "9.1",
        frage:
          "Ist Vermietung, Kurzzeitvermietung (Airbnb) oder gewerbliche Nutzung laut Teilungserklärung erlaubt?",
        quelle: "fehlt",
        kern: false,
        relevanz: "kapitalanleger",
      },
      {
        id: "9.2",
        frage: "Ist Haustierhaltung erlaubt?",
        quelle: "text",
        kern: false,
        relevanz: "etw",
      },
    ],
  },
  {
    nr: 10,
    titel: "Verkaufsprozess & Formalia",
    fragen: [
      {
        id: "10.1",
        frage: "Bis wann wird ein Finanzierungsnachweis für ein Angebot benötigt?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "10.2",
        frage: "Vertritt der Makler ausschließlich den Verkäufer, oder besteht Doppeltätigkeit?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "10.3",
        frage: "Gibt es bereits andere Interessenten oder Angebote?",
        quelle: "fehlt",
        kern: false,
        relevanz: "alle",
      },
    ],
  },
  {
    nr: 11,
    titel: "Umfeld",
    fragen: [
      {
        id: "11.1",
        frage: "Wie ist Handyempfang und Internetverfügbarkeit vor Ort?",
        quelle: "vor_ort",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "11.2",
        frage: "Wie laut ist es zu unterschiedlichen Tageszeiten (Verkehr, Nachbarn, Gewerbe)?",
        quelle: "vor_ort",
        kern: false,
        relevanz: "alle",
      },
      {
        id: "11.3",
        frage: "Wie ist die tatsächliche Parksituation außerhalb des Besichtigungstermins?",
        quelle: "vor_ort",
        kern: false,
        relevanz: "alle",
      },
    ],
  },
];

// Flache Liste fuer Tests und Lookups. Reihenfolge = Katalogreihenfolge.
export const ALLE_FRAGEN = ABSCHNITTE.flatMap((a) =>
  a.fragen.map((f) => ({ ...f, abschnitt: a.nr, kategorie: a.titel })),
);
