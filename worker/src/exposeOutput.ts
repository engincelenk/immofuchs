import type {
  ConfidenceWert,
  ExposeExtractResponse,
  ExposeWarnung,
} from "./types";

// Haertet die Modell-Antwort auf das Schema aus Spec Abschnitt 5.
// Grundannahme: das Modell haelt sich NICHT zuverlaessig an die Prompt-Regeln.
// Deshalb hier eine echte Normalisierung statt eines blossen JSON.parse:
// Zahlenfelder, die Freitext enthalten ("ca. 269.000 EUR"), werden entweder
// sauber in eine Zahl ueberfuehrt oder verworfen - sie landen sonst direkt in
// einer Renditerechnung (Spec 6, Schritt 3).

const MAX_TEXT_LEN = 400;
const MAX_BESCHREIBUNG_LEN = 1500;
const MAX_WARNUNGEN = 20;

export function parseExposeOutput(raw: string): ExposeExtractResponse {
  const data = parseJson(raw);

  const objekt = obj(data.objekt);
  const ausstattung = obj(data.ausstattung);
  const energie = obj(data.energie);
  const kosten = obj(data.kosten);
  const kontext = obj(data.kontext);
  const bild = obj(data.bild);

  return {
    objekt: {
      titel: text(objekt.titel),
      objektart: text(objekt.objektart),
      kaufpreis: zahl(objekt.kaufpreis),
      stellplatz_kaufpreis: zahl(objekt.stellplatz_kaufpreis),
      kaufpreis_pro_qm: zahl(objekt.kaufpreis_pro_qm),
      zimmer: zahl(objekt.zimmer),
      wohnflaeche: zahl(objekt.wohnflaeche),
      plz: text(objekt.plz),
      ort: text(objekt.ort),
      stockwerk: text(objekt.stockwerk),
      baujahr: zahl(objekt.baujahr),
    },
    ausstattung: {
      balkon_terrasse: bool(ausstattung.balkon_terrasse),
      einbaukueche: bool(ausstattung.einbaukueche),
      stellplatz: text(ausstattung.stellplatz),
      keller: bool(ausstattung.keller),
      barrierefrei: bool(ausstattung.barrierefrei),
      heizungsart: text(ausstattung.heizungsart),
    },
    energie: {
      energieausweistyp: text(energie.energieausweistyp),
      energietraeger: text(energie.energietraeger),
      endenergiebedarf: zahl(energie.endenergiebedarf),
      energieeffizienzklasse: text(energie.energieeffizienzklasse),
    },
    kosten: {
      hausgeld: zahl(kosten.hausgeld),
      provision_kaeufer_prozent: zahl(kosten.provision_kaeufer_prozent),
      kaufnebenkosten: zahl(kosten.kaufnebenkosten),
      gesamtkosten: zahl(kosten.gesamtkosten),
      kaltmiete: zahl(kosten.kaltmiete),
      nebenkosten_miete: zahl(kosten.nebenkosten_miete),
    },
    kontext: {
      objektbeschreibung: text(kontext.objektbeschreibung, MAX_BESCHREIBUNG_LEN),
      lagebeschreibung: text(kontext.lagebeschreibung, MAX_BESCHREIBUNG_LEN),
    },
    bild: {
      titelbild_index: index(bild.titelbild_index),
      bildbeschreibung: text(bild.bildbeschreibung),
    },
    confidence: confidence(data.confidence),
    warnungen: warnungen(data.warnungen),
  };
}

function parseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  // Trotz responseMimeType kommt gelegentlich ein Markdown-Codeblock zurueck.
  const ohneFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
    : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(ohneFence);
  } catch {
    throw new Error("expose_output_not_json");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("expose_output_not_object");
  }
  return parsed as Record<string, unknown>;
}

function obj(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLen = MAX_TEXT_LEN): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  // Modelle schreiben statt null gerne Platzhalter in Textfelder.
  if (/^(null|n\/a|nicht angegeben|keine angabe|unbekannt|-{1,2})$/i.test(trimmed)) return null;
  return trimmed.slice(0, maxLen);
}

// Nimmt eine echte Zahl, oder rettet eine Zahl aus deutscher Schreibweise
// ("269.000 EUR", "93,6 kWh/m2a", "ca. 54 m2"). Alles andere wird verworfen -
// lieber "nicht gefunden" als ein Fantasiewert in der Renditerechnung.
export function zahl(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  // Muss an einer Ziffer beginnen, sonst faengt der Treffer den Punkt aus
  // "ca. 54 m2" ein; abschliessende Trenner ("269.000.") gehoeren nicht dazu.
  const treffer = value.match(/-?\d[\d.,]*/);
  if (!treffer) return null;
  let roh = treffer[0].replace(/[.,]+$/, "");

  const hatKomma = roh.includes(",");
  const hatPunkt = roh.includes(".");
  if (hatKomma && hatPunkt) {
    // "269.000,50" - Punkt ist Tausendertrenner, Komma das Dezimalzeichen.
    roh = roh.replace(/\./g, "").replace(",", ".");
  } else if (hatKomma) {
    roh = roh.replace(",", ".");
  } else if (hatPunkt) {
    // "269.000" ist ein Tausenderpunkt, "93.6" ein Dezimalpunkt. Genau drei
    // Nachkommastellen ohne weitere Punkte sind im Immobilienkontext immer
    // Tausender (Preise), nie eine Nachkommastelle.
    const teile = roh.split(".");
    const nurTausender = teile.slice(1).every((t) => t.length === 3);
    roh = nurTausender ? teile.join("") : roh;
  }

  const n = Number(roh);
  return Number.isFinite(n) ? n : null;
}

function bool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "ja" || v === "vorhanden") return true;
  if (v === "false" || v === "nein" || v === "nicht vorhanden") return false;
  return null;
}

function index(value: unknown): number | null {
  const n = zahl(value);
  if (n === null || !Number.isInteger(n) || n < 0) return null;
  return n;
}

const CONFIDENCE_WERTE: ReadonlySet<string> = new Set(["sicher", "unsicher", "nicht_gefunden"]);

function confidence(value: unknown): Record<string, ConfidenceWert> {
  const quelle = obj(value);
  const out: Record<string, ConfidenceWert> = {};
  for (const [feld, wert] of Object.entries(quelle)) {
    if (typeof wert !== "string" || !CONFIDENCE_WERTE.has(wert)) continue;
    if (feld.length > 60) continue;
    out[feld] = wert as ConfidenceWert;
  }
  return out;
}

function warnungen(value: unknown): ExposeWarnung[] {
  if (!Array.isArray(value)) return [];
  const out: ExposeWarnung[] = [];
  for (const entry of value.slice(0, MAX_WARNUNGEN)) {
    const e = obj(entry);
    const feld = text(e.feld, 60);
    const hinweis = text(e.hinweis);
    if (!feld || !hinweis) continue;
    out.push({ feld, hinweis });
  }
  return out;
}
