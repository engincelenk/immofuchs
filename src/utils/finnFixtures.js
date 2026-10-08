// Extraktionsergebnisse der beiden Referenz-Exposés als Testfixtures.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 6.
//
// Die Werte sind am 2026-07-30 aus dem Volltext von docs/expose1.pdf
// (Ingersheim) und docs/expose2.pdf (Murr) abgelesen und entsprechen dem, was
// /api/expose-extract nach den Regeln aus exposePrompt.ts liefern muss.
//
// Bewusst als eigene Datei und nicht inline im Test: die Fixtures sind der
// vereinbarte Abnahmegegenstand und werden auch von spaeteren Etappen (Panel,
// PDF) gebraucht. Wer sie aendert, aendert die Akzeptanzkriterien.

// ── Ingersheim, Murrstrasse 2 (docs/expose1.pdf) ────────────────────────────
// Kernfall: 50 m² im Kopfbereich, 47,88 m² "gemaess Berechnung" in der
// Ausstattungsliste. Stellplaetze unstrittig separat bepreist. Nicht vermietet.
export const INGERSHEIM = {
  objekt: {
    titel: "Mehr drin als gedacht: Top-Whg mit Balkon in Top-Lage",
    objektart: "Eigentumswohnung",
    kaufpreis: 199000,
    stellplatz_kaufpreis: 15000,
    kaufpreis_pro_qm: null,
    zimmer: 2,
    wohnflaeche: 47.88,
    nutzflaeche: null,
    plz: "74379",
    ort: "Ingersheim",
    strasse: "Murrstrasse",
    hausnummer: "2",
    stockwerk: "1. OG",
    baujahr: 1996,
    zustand: null,
    wohneinheiten: 12,
    vermietet: null,
    vermietet_seit: null,
  },
  ausstattung: {
    balkon_terrasse: true,
    einbaukueche: true,
    stellplatz: "Stellplatz im Freien",
    stellplatz_anzahl: 2,
    keller: true,
    barrierefrei: null,
    heizungsart: "Gas-Zentralheizung",
    baujahr_waermeerzeuger: 1996,
  },
  energie: {
    energieausweistyp: "Verbrauchsausweis",
    energietraeger: "Gas",
    endenergiebedarf: 77.4,
    energieeffizienzklasse: "C",
  },
  kosten: {
    hausgeld: 208,
    hausgeld_nicht_umlagefaehig: null,
    ruecklage_monatlich: null,
    provision_kaeufer_prozent: 3.57,
    kaufnebenkosten: null,
    gesamtkosten: 214000,
    kaltmiete: null,
    nebenkosten_miete: null,
  },
  kontext: {
    objektbeschreibung:
      "Hier erwartet Sie eine top nutzbare 2-Zimmer-Wohnung in einem gepflegten Mehrfamilienhaus aus dem Jahr 1996. Insgesamt umfasst das Haus 12 Wohneinheiten. Die ca. 50 m2 große Wohnung verfügt über einen durchdachten Grundriss. Zwei zur Wohnung gehörende Außenstellplätze für zzgl. insgesamt + 15.000 EUR, direkt am Haus. Kaufpreis Wohnung: 199.000 €, + Außenstellplätze: (beide für INSGESAMT) 15.000 €, = Gesamtkaufpreis: 214.000 €.",
    lagebeschreibung:
      "Die Immobilie befindet sich in angenehmer Wohnlage von Ingersheim, eingebettet in ein gewachsenes Wohngebiet mit überwiegend Ein- und kleineren Mehrfamilienhäusern.",
  },
  bild: { titelbild_index: 0, bildbeschreibung: null },
  confidence: { kaufpreis: "sicher", wohnflaeche: "unsicher", stellplatz_kaufpreis: "sicher" },
  warnungen: [
    { feld: "wohnflaeche", hinweis: "Im Exposé zwei verschiedene Wohnflächen angegeben." },
  ],
  abweichungen: [
    {
      feld: "wohnflaeche",
      wert_a: 50,
      quelle_a: "Eckdaten-Tabelle",
      wert_b: 47.88,
      quelle_b: "Ausstattungsliste",
      hinweis: "Wohnfläche im Exposé unterschiedlich angegeben, Berechnungsmethode zu klären.",
    },
  ],
};

// ── Murr, Bottenäckerstr. 3 (docs/expose2.pdf) ──────────────────────────────
// Zwei Widersprueche: der Tiefgaragenstellplatz gilt im selben Fliesstext
// einmal als im Kaufpreis enthalten und einmal als zzgl. 15.000 EUR; die
// Wohnflaeche steht mit 76 m² in der Tabelle und 75 m² im Text. Vermietet.
export const MURR = {
  objekt: {
    titel: "Gepflegte 3-Zimmer-Wohnung mit Balkon & Tiefgarage",
    objektart: "Etagenwohnung",
    kaufpreis: 279000,
    stellplatz_kaufpreis: 15000,
    kaufpreis_pro_qm: null,
    zimmer: 3,
    wohnflaeche: 75,
    nutzflaeche: 8,
    plz: "71711",
    ort: "Murr",
    strasse: "Bottenäckerstr.",
    hausnummer: "3",
    stockwerk: "1",
    baujahr: 1995,
    zustand: "Gepflegt",
    wohneinheiten: null,
    vermietet: true,
    vermietet_seit: "01.10.2025",
  },
  ausstattung: {
    balkon_terrasse: true,
    einbaukueche: true,
    stellplatz: "Tiefgaragenstellplatz",
    stellplatz_anzahl: 1,
    keller: true,
    barrierefrei: null,
    heizungsart: "Zentralheizung",
    baujahr_waermeerzeuger: null,
  },
  energie: {
    energieausweistyp: "Verbrauchsausweis",
    energietraeger: "Erdgas leicht",
    endenergiebedarf: 94,
    energieeffizienzklasse: "C",
  },
  kosten: {
    hausgeld: 256,
    hausgeld_nicht_umlagefaehig: 77.07,
    ruecklage_monatlich: 45.83,
    provision_kaeufer_prozent: 3.57,
    kaufnebenkosten: null,
    gesamtkosten: 294000,
    kaltmiete: 1000,
    nebenkosten_miete: null,
  },
  kontext: {
    objektbeschreibung:
      "Auf ca. 75 m2 Wohnfläche stehen Ihnen ein großzügiger Wohn- und Essbereich, zwei gut nutzbare Schlafzimmer, ein Badezimmer sowie eine moderne Einbauküche zur Verfügung. Zur Wohnung gehören zudem ein eigener Kellerraum (ca. 8 m2 Nutzfläche) sowie ein im Kaufpreis enthaltener Tiefgaragenstellplatz. Die monatliche Kaltmiete beträgt 1.000 €. Das monatliche Hausgeld beträgt insgesamt 256,00 €. Ein komfortabler Tiefgaragenstellplatz ist ebenfalls vorhanden und wird separat ausgewiesen: zzgl. 15.000 € zum Kaufpreis. Die Wohnung ist derzeit vermietet.",
    lagebeschreibung:
      "Die Wohnung befindet sich in einer schönen, gewachsenen Wohngegend von Murr und überzeugt durch ein ruhiges, familienfreundliches Umfeld.",
  },
  bild: { titelbild_index: 0, bildbeschreibung: null },
  confidence: { kaufpreis: "sicher", wohnflaeche: "unsicher", stellplatz_kaufpreis: "unsicher" },
  warnungen: [
    {
      feld: "stellplatz_kaufpreis",
      hinweis: "Im Exposé einmal als im Kaufpreis enthalten, einmal als zusätzlich beschrieben.",
    },
  ],
  abweichungen: [
    {
      feld: "stellplatz_kaufpreis",
      wert_a: "im Kaufpreis enthalten",
      quelle_a: "Objektbeschreibung",
      wert_b: 15000,
      quelle_b: "Objektbeschreibung",
      hinweis: "Ob der Tiefgaragenstellplatz im Kaufpreis enthalten ist, ist noch zu klären.",
    },
    {
      feld: "wohnflaeche",
      wert_a: 76,
      quelle_a: "Daten im Überblick",
      wert_b: 75,
      quelle_b: "Objektbeschreibung",
      hinweis: "Wohnfläche im Exposé unterschiedlich angegeben.",
    },
  ],
};
