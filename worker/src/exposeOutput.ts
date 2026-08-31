import type {
  ConfidenceWert,
  ExposeAbweichung,
  ExposeExtractResponse,
  ExposeRisiko,
  ExposeRisikoSchwere,
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
const MAX_ABWEICHUNGEN = 10;
const MAX_QUELLE_LEN = 60;
const MAX_RISIKEN = 15;
const MAX_CODE_LEN = 40;

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
      nutzflaeche: zahl(objekt.nutzflaeche),
      plz: text(objekt.plz),
      ort: text(objekt.ort),
      strasse: text(objekt.strasse),
      hausnummer: text(objekt.hausnummer),
      stockwerk: text(objekt.stockwerk),
      baujahr: zahl(objekt.baujahr),
      zustand: text(objekt.zustand),
      wohneinheiten: zahl(objekt.wohneinheiten),
      vermietet: bool(objekt.vermietet),
      // Bewusst als Text, nicht ueber `zahl`: der Client parst das Datum
      // selbst (mapDatum in utils/exposeMapping.js) und erwartet die
      // Originalschreibweise "01.10.2025" oder ISO.
      vermietet_seit: text(objekt.vermietet_seit, 40),
    },
    ausstattung: {
      balkon_terrasse: bool(ausstattung.balkon_terrasse),
      einbaukueche: bool(ausstattung.einbaukueche),
      stellplatz: text(ausstattung.stellplatz),
      stellplatz_anzahl: zahl(ausstattung.stellplatz_anzahl),
      keller: bool(ausstattung.keller),
      barrierefrei: bool(ausstattung.barrierefrei),
      heizungsart: text(ausstattung.heizungsart),
      baujahr_waermeerzeuger: zahl(ausstattung.baujahr_waermeerzeuger),
    },
    energie: {
      energieausweistyp: text(energie.energieausweistyp),
      energietraeger: text(energie.energietraeger),
      endenergiebedarf: zahl(energie.endenergiebedarf),
      energieeffizienzklasse: text(energie.energieeffizienzklasse),
    },
    kosten: {
      hausgeld: zahl(kosten.hausgeld),
      hausgeld_nicht_umlagefaehig: zahl(kosten.hausgeld_nicht_umlagefaehig),
      ruecklage_monatlich: zahl(kosten.ruecklage_monatlich),
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
    abweichungen: abweichungen(data.abweichungen),
    risiken: risiken(data.risiken),
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

// Einheiten und Waehrungszeichen, die an einer sonst reinen Zahl haengen
// duerfen ("15.000,00 EUR", "47,88 m2"). Bewusst eng gehalten: alles andere
// bleibt Text, damit aus "2 Aussenstellplaetze inklusive" nicht die Zahl 2 wird.
const NUR_EINHEIT = /\s*(?:eur|euro|€|m2|m²|qm|%)\s*$/i;

// Ein Abweichungs-Wert ist entweder eine echte Zahl (dann rechnet die
// Konsistenz-Engine damit) oder eine Aussage im Klartext ("im Kaufpreis
// enthalten"). Deshalb hier NICHT `zahl()` auf alles loslassen: das wuerde aus
// jeder Aussage mit einer Ziffer eine Zahl machen und die Engine mit
// Fantasiewerten fuettern. Nur was nach Abzug der Einheit vollstaendig eine
// Zahl ist, wird auch als Zahl uebernommen.
function abweichungsWert(value: unknown): number | string | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const ohneEinheit = trimmed.replace(NUR_EINHEIT, "").trim();
  if (/^-?\d[\d.,]*$/.test(ohneEinheit)) {
    const n = zahl(ohneEinheit);
    if (n !== null) return n;
  }
  return trimmed.slice(0, MAX_TEXT_LEN);
}

function abweichungen(value: unknown): ExposeAbweichung[] {
  if (!Array.isArray(value)) return [];
  const out: ExposeAbweichung[] = [];
  for (const entry of value.slice(0, MAX_ABWEICHUNGEN)) {
    const e = obj(entry);
    const feld = text(e.feld, 60);
    const quelle_a = text(e.quelle_a, MAX_QUELLE_LEN);
    const quelle_b = text(e.quelle_b, MAX_QUELLE_LEN);
    const hinweis = text(e.hinweis);
    const wert_a = abweichungsWert(e.wert_a);
    const wert_b = abweichungsWert(e.wert_b);
    if (!feld || !quelle_a || !quelle_b || !hinweis) continue;
    if (wert_a === null || wert_b === null) continue;
    // Zwei identische Werte sind kein Widerspruch. Kommt vor, wenn das Modell
    // die Regel als "melde jede Fundstelle" missversteht - waere im Handout ein
    // Finding ohne Inhalt.
    if (wert_a === wert_b) continue;
    out.push({ feld, wert_a, quelle_a, wert_b, quelle_b, hinweis });
  }
  return out;
}

const RISIKO_SCHWEREN: ReadonlySet<string> = new Set(["hoch", "mittel", "niedrig"]);

// Expose-Roentgen (Spec neue-phase2, KI-Tool #4) - gleiche Haertung wie
// warnungen()/abweichungen(): ein Eintrag ohne gueltige Schwere oder ohne
// Hinweistext ist fuer den Nutzer wertlos und wird verworfen statt mit einem
// Platzhalter angezeigt zu werden.
function risiken(value: unknown): ExposeRisiko[] {
  if (!Array.isArray(value)) return [];
  const out: ExposeRisiko[] = [];
  for (const entry of value.slice(0, MAX_RISIKEN)) {
    const e = obj(entry);
    const code = text(e.code, MAX_CODE_LEN);
    const hinweis = text(e.hinweis);
    const schwereRoh = typeof e.schwere === "string" ? e.schwere.trim().toLowerCase() : "";
    if (!code || !hinweis || !RISIKO_SCHWEREN.has(schwereRoh)) continue;
    out.push({ code, schwere: schwereRoh as ExposeRisikoSchwere, hinweis });
  }
  return out;
}
