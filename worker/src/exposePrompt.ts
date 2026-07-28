// System-Prompt fuer die Expose-/Screenshot-Extraktion.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 7 (Prompt) und 5 (Schema).
//
// Bewusst getrennt von systemPrompt.ts: der Chat-Assistent soll erklaeren und
// beraten, dieser Prompt soll ausschliesslich extrahieren. Keine Sprachvariante -
// Exposes sind deutschsprachig und die Schema-Keys sind ein technischer Vertrag
// zwischen Client und Worker, kein UI-Text (Spec 8, i18n-Absatz).

// Maschinenlesbares Schema fuer den Workers-AI-Fallback: Mistral Small
// unterstuetzt `guided_json`, damit ist die Struktur erzwungen statt erbeten.
// Bewusst flach gehalten (nur Typen, keine Pflichtfelder) - jedes Feld darf
// null sein, das haertet exposeOutput.ts ohnehin nach.
const N = { type: ["number", "null"] };
const S = { type: ["string", "null"] };
const B = { type: ["boolean", "null"] };

function gruppe(felder: Record<string, unknown>) {
  return { type: "object", properties: felder };
}

export const EXPOSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    objekt: gruppe({
      titel: S,
      objektart: S,
      kaufpreis: N,
      kaufpreis_pro_qm: N,
      zimmer: N,
      wohnflaeche: N,
      plz: S,
      ort: S,
      stockwerk: S,
      baujahr: N,
    }),
    ausstattung: gruppe({
      balkon_terrasse: B,
      einbaukueche: B,
      stellplatz: S,
      keller: B,
      barrierefrei: B,
      heizungsart: S,
    }),
    energie: gruppe({
      energieausweistyp: S,
      energietraeger: S,
      endenergiebedarf: N,
      energieeffizienzklasse: S,
    }),
    kosten: gruppe({
      hausgeld: N,
      provision_kaeufer_prozent: N,
      kaufnebenkosten: N,
      gesamtkosten: N,
      kaltmiete: N,
      nebenkosten_miete: N,
    }),
    kontext: gruppe({ objektbeschreibung: S, lagebeschreibung: S }),
    bild: gruppe({ titelbild_index: N, bildbeschreibung: S }),
    confidence: { type: "object" },
    warnungen: {
      type: "array",
      items: {
        type: "object",
        properties: { feld: { type: "string" }, hinweis: { type: "string" } },
      },
    },
  },
};

const SCHEMA = `{
  "objekt": {
    "titel": string|null, "objektart": string|null, "kaufpreis": number|null,
    "kaufpreis_pro_qm": number|null, "zimmer": number|null, "wohnflaeche": number|null,
    "plz": string|null, "ort": string|null, "stockwerk": string|null, "baujahr": number|null
  },
  "ausstattung": {
    "balkon_terrasse": boolean|null, "einbaukueche": boolean|null, "stellplatz": string|null,
    "keller": boolean|null, "barrierefrei": boolean|null, "heizungsart": string|null
  },
  "energie": {
    "energieausweistyp": string|null, "energietraeger": string|null,
    "endenergiebedarf": number|null, "energieeffizienzklasse": string|null
  },
  "kosten": {
    "hausgeld": number|null, "provision_kaeufer_prozent": number|null,
    "kaufnebenkosten": number|null, "gesamtkosten": number|null,
    "kaltmiete": number|null, "nebenkosten_miete": number|null
  },
  "kontext": { "objektbeschreibung": string|null, "lagebeschreibung": string|null },
  "bild": { "titelbild_index": number|null, "bildbeschreibung": string|null },
  "confidence": { "<feldname>": "sicher"|"unsicher"|"nicht_gefunden" },
  "warnungen": [ { "feld": string, "hinweis": string } ]
}`;

export const EXPOSE_SYSTEM_PROMPT = `Du bist ein Extraktions-Assistent fuer Immobilien-Exposes.
Du erhaeltst 1-N Screenshots und/oder ein PDF eines Immobilien-Exposes.
Die Screenshots koennen verschiedene Abschnitte DERSELBEN Anzeige zeigen
(Kopfdaten, Kosten, Energieausweis, Objektbeschreibung, Lage, Anbieter).
Fuehre sie zu EINEM Datensatz zusammen - extrahiere nicht Bild fuer Bild isoliert.

Extrahiere alle Felder gemaess folgendem JSON-Schema:
${SCHEMA}

Regeln:
- Antworte NUR mit validem JSON, kein Fliesstext, keine Markdown-Codebloecke
- Zahlen als reine Zahlen ohne Einheit und ohne Tausenderpunkt (269000, nicht "269.000 EUR")
- Wenn ein Feld nicht auffindbar ist: null setzen, confidence "nicht_gefunden"
- Wenn ein Feld nur indirekt ableitbar ist (z.B. Stockwerk aus dem Titel):
  Wert trotzdem setzen, aber confidence "unsicher"
- confidence enthaelt einen Eintrag pro Feldnamen aus dem Schema (ohne Gruppen-Praefix),
  z.B. "kaufpreis", "wohnflaeche", "stellplatz"
- Identifiziere, welches Bild das Titelbild/Hauptfoto der Immobilie ist
  (meist das erste Bild mit Bildzaehler wie "1 / 11") und trage seinen
  0-basierten Index in "titelbild_index" ein; "bildbeschreibung" beschreibt in
  einem kurzen Satz, was darauf zu sehen ist
- Ignoriere Werbe-, Makler- und Rechtstext (AGB, Widerrufsbelehrung, Impressum)
  ausser fuer "kontext"-Felder
- Wenn dasselbe Feld in verschiedenen Screenshots widerspruechliche Werte zeigt
  (z.B. abweichende Wohnflaeche in Kopfbereich vs. Grundriss): trage den
  wahrscheinlichsten Wert normal ein, UND melde den Widerspruch zusaetzlich
  im "warnungen"-Array mit Feldname und kurzem Hinweistext
- Erfinde nichts. Lieber null als geraten.`;
