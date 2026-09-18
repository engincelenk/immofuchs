// ImmoFuchs AI-Engine - die eine Stelle, an der die KI-Produkte definiert und
// ihre Ergebnisse am Objekt abgelegt werden.
//
// Warum ueberhaupt eine Registry: Die Produktliste ist ausdruecklich nicht
// final - es kommen welche dazu, andere fliegen raus. Wer ein Produkt
// hinzufuegt, soll genau eine Stelle anfassen muessen und nicht vier
// (Kachel, Zustandslogik, Persistenz, Texte).
//
// Warum die Ergebnisse persistiert werden: Sie kosten Kontingent. Was
// Kontingent kostet, muss beim naechsten Oeffnen wieder da sein - sonst zahlt
// der Nutzer zweimal fuer dieselbe Auskunft. Bis 2026-09 waren alle
// Ergebnisse fluechtig: Chat zu, Analyse weg.

export const AI_ENGINE_NAME = "AI-Engine";

// Produkte der Engine. `id` landet als Schluessel in resultData.ai und darf
// sich deshalb nicht mehr aendern, sobald etwas gespeichert wurde.
//
// `aktion` ist bewusst ein VERB und nicht der Titel: bis zum UX-Review
// 2026-09-05 trug der Knopf woertlich denselben String wie die Ueberschrift
// zwei Zeilen darueber. Jede Karte sagte dieselbe Sache zweimal - das zweite
// Mal als 347 px breite Flaeche. Vier Produkte mal 56 px = 224 px reine
// Verdopplung, der teuerste Einzelposten des Befunds "Elemente zu lang".
// Titel-Ueberarbeitung 2026-09-07 (UX-Review): vorher trugen die drei
// Kernprodukte grammatisch verschiedene Formen (Imperativ ohne Objekt, halber
// Fragesatz, Imperativ) - schwer auf einen Blick als zusammengehoerige
// Gruppe erkennbar. Jetzt einheitlich "<Gegenstand> analysieren".
export const AI_PRODUKTE = [
  {
    id: "briefing",
    titel: "Investment-Briefing",
    kurz: "Ampel, Vergleiche, Tragfähigkeit und Stresstest in einer Auswertung",
    aktion: "Erstellen",
    // Braucht ein gerechnetes Objekt, kein Exposé - wie das fruehere
    // "analyse" (Spec docs/technical_specs/investment-briefing.md, das dieses
    // eine Produkt an die Stelle von analyse/hebel/preis setzt).
    braucht: "kennzahlen",
  },
  {
    id: "expose",
    titel: "Exposé-Scan",
    kurz: "PDF hochladen, Felder automatisch füllen",
    aktion: "Exposé hochladen",
    braucht: "datei",
  },
  {
    id: "handout",
    titel: "Besichtigungshandout",
    kurz: "Fragen für den Termin, abgeleitet aus deinen Auswertungen",
    aktion: "Erstellen",
    // Braucht eine Grundlage ueber das Objekt: entweder einen Exposé-Scan
    // oder von Hand eingepflegte Daten (Nutzer-Vorgabe 2026-09-07, vorher
    // zwingend Exposé). Die drei Auswertungen oben gehen zusaetzlich als
    // "Befunde" in den Prompt ein, sofern vorhanden - siehe
    // ObjektDetail.starteProdukt() und worker/src/analysePrompt.ts.
    braucht: "grundlage",
  },
];

export function produktFuer(id) {
  return AI_PRODUKTE.find((p) => p.id === id) || null;
}

// ── Ergebnisse am Objekt ────────────────────────────────────────────────────
//
// Abgelegt unter resultData.ai[produktId]. resultData ist serverseitig freies
// JSON (worker/src/routes/objects.ts), das Schema bleibt also unangetastet.

// Die Zahlen, auf die sich ein Ergebnis bezog. Aendert der Nutzer danach den
// Kaufpreis, ist die Aussage nicht mehr belastbar - dann muss das sichtbar
// werden, statt eine veraltete Einschaetzung als aktuell auszugeben.
//
// Bewusst JE PRODUKT eine eigene Liste (Befund des UX-Reviews 2026-09-05):
// Mit einer gemeinsamen Liste wuerde ein geaenderter Zinssatz auch das
// Besichtigungshandout als veraltet markieren - dort spielt er keine Rolle.
// Ein Ergebnis grundlos zu entwerten kostet den Nutzer Kontingent.
const RELEVANTE_FELDER = {
  // Vereinigung der fruehen Felder von analyse/hebel/preis (Spec §8.1):
  // das Briefing zeigt Ampel, Vergleiche UND Tragfaehigkeit gleichzeitig,
  // haengt also an allem, was fuer eine dieser drei frueher galt.
  briefing: [
    "kaufpreis",
    "kaltmiete",
    "eigenkapital",
    "zinssatz",
    "tilgung",
    "flaeche",
    "renovierung",
    "bundesland",
    "ort",
    "plz",
    "jahre",
    "wertP",
  ],
  // Der Expose-Scan bezieht sich auf die hochgeladene Datei, nicht auf die
  // Eingabefelder - er veraltet nicht, wenn der Nutzer Zahlen anpasst.
  expose: [],
  handout: [],
};

export function relevanteFelder(produktId) {
  return RELEVANTE_FELDER[produktId] || RELEVANTE_FELDER.briefing;
}

export function zahlenSnapshot(data, produktId = "analyse") {
  const s = {};
  for (const f of relevanteFelder(produktId)) {
    const v = data?.[f];
    if (v != null && String(v).trim() !== "") s[f] = String(v);
  }
  return s;
}

// `extra` traegt gerechnete Beilagen zum Modelltext - heute die durchgerechneten
// Varianten des Produkts "hebel". Sie werden MIT gespeichert, weil sie zum
// Zeitpunkt der Auswertung galten: wer den Kaufpreis spaeter aendert, soll
// weiter sehen koennen, auf welchen Zahlen die gespeicherte Einschaetzung
// fusste. Neu gerechnet wuerden sie sonst still zur Aussage von gestern passen.
export function ergebnisAnlegen(produktId, inhalt, data, extra = null) {
  return {
    produktId,
    inhalt,
    erstellt: new Date().toISOString(),
    basis: zahlenSnapshot(data, produktId),
    ...(extra && Object.keys(extra).length > 0 ? extra : {}),
  };
}

export function ergebnisseLesen(objekt) {
  return objekt?.kennzahlen?.ai || objekt?.resultData?.ai || {};
}

export function ergebnisFuer(objekt, produktId) {
  return ergebnisseLesen(objekt)[produktId] || null;
}

// true, wenn sich seit dem Ergebnis mindestens eine der tragenden Zahlen
// geaendert hat. Bewusst nur diese: eine geaenderte Hausnummer macht eine
// Renditeeinschaetzung nicht falsch.
export function istVeraltet(ergebnis, data) {
  if (!ergebnis?.basis || !ergebnis.produktId) return false;
  const felder = relevanteFelder(ergebnis.produktId);
  if (felder.length === 0) return false;
  const jetzt = zahlenSnapshot(data, ergebnis.produktId);
  return felder.some((f) => (ergebnis.basis[f] ?? null) !== (jetzt[f] ?? null));
}

// Welche Felder sich geaendert haben - fuer den Hinweistext, damit dort steht
// WAS sich geaendert hat und nicht nur DASS.
const FELD_NAME = {
  renovierung: "Renovierungskosten",
  kaufpreis: "Kaufpreis",
  kaltmiete: "Kaltmiete",
  eigenkapital: "Eigenkapital",
  zinssatz: "Zinssatz",
  tilgung: "Tilgung",
  flaeche: "Wohnfläche",
  plz: "PLZ",
  bundesland: "Bundesland",
  ort: "Ort",
  jahre: "Betrachtungszeitraum",
  wertP: "Wertsteigerung",
};

export function geaenderteFelder(ergebnis, data) {
  if (!ergebnis?.basis || !ergebnis.produktId) return [];
  const jetzt = zahlenSnapshot(data, ergebnis.produktId);
  return relevanteFelder(ergebnis.produktId)
    .filter((f) => (ergebnis.basis[f] ?? null) !== (jetzt[f] ?? null))
    .map((f) => FELD_NAME[f] || f);
}

// Das Veraltet-Band soll benennen WAS sich geaendert hat, nicht nur DASS -
// sonst muss der Nutzer Kontingent ausgeben, um herauszufinden, ob sich
// Kontingent lohnt. Bei einem Feld mit Delta, ab drei nur noch gezaehlt.
export function veraltetText(ergebnis, data, locale = "de-DE") {
  const felder = geaenderteFelder(ergebnis, data);
  if (felder.length === 0) return "";
  const zahl = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(locale) : String(v ?? "–");
  };
  if (felder.length === 1) {
    const key = relevanteFelder(ergebnis.produktId).find((f) => (FELD_NAME[f] || f) === felder[0]);
    return `${felder[0]} ${zahl(ergebnis.basis[key])} → ${zahl(data?.[key])}`;
  }
  if (felder.length === 2) return `${felder[0]} und ${felder[1]} geändert`;
  return `${felder[0]}, ${felder[1]} und ${felder.length - 2} weitere geändert`;
}

// Schreibt ein Ergebnis in die resultData-Form, die toServerPayload erwartet.
export function mitErgebnis(bisherigeResultData, ergebnis) {
  return {
    ...(bisherigeResultData || {}),
    ai: { ...(bisherigeResultData?.ai || {}), [ergebnis.produktId]: ergebnis },
  };
}

// ── Investment-Briefing-Schema (2026-09-16) ─────────────────────────────────
// Der Worker liefert seit dem Umbau {summary, keyInsights, risks,
// opportunities, calculations, scenarios, assumptions, recommendation} statt
// {kernaussage, kpis, abschnitte}. Diese Zugriffsfunktionen sind die EINE
// Stelle, die dieses Schema kennt - AiEngine.jsx UND RechnerAiKarte.jsx lesen
// darueber, damit es nicht zwei Kopien derselben Feldnamen gibt.
//
// altesSchema(): erkennt Ergebnisse, die VOR dem Umbau gespeichert wurden
// (kein keyInsights-Array). Die Karte zeigt dafuer einen Hinweis statt eines
// stillen Blanks - eine bezahlte Auswertung darf nach einem Schema-Wechsel
// nicht kommentarlos leer wirken.
export function altesSchema(ergebnis) {
  const i = ergebnis?.inhalt;
  if (!i || typeof i === "string") return false;
  return !Array.isArray(i.keyInsights) && (i.kernaussage != null || Array.isArray(i.abschnitte));
}

export function summaryVon(ergebnis) {
  const i = ergebnis?.inhalt;
  if (!i) return "";
  if (typeof i === "string") return i;
  return i.summary || i.kernaussage || i.zusammenfassung || "";
}

function listeVon(ergebnis, feld) {
  const arr = ergebnis?.inhalt?.[feld];
  return Array.isArray(arr) ? arr.filter((x) => x?.title && x?.text) : [];
}

export const keyInsightsVon = (ergebnis) => listeVon(ergebnis, "keyInsights");
export const risksVon = (ergebnis) => listeVon(ergebnis, "risks");
export const opportunitiesVon = (ergebnis) => listeVon(ergebnis, "opportunities");

export function calculationsVon(ergebnis) {
  const arr = ergebnis?.inhalt?.calculations;
  return Array.isArray(arr) ? arr.filter((x) => x?.label && x?.wert) : [];
}

export function scenariosVon(ergebnis) {
  const arr = ergebnis?.inhalt?.scenarios;
  return Array.isArray(arr) ? arr.filter((x) => x?.label && x?.vorher && x?.nachher) : [];
}

export function assumptionsVon(ergebnis) {
  const arr = ergebnis?.inhalt?.assumptions;
  return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.trim() !== "") : [];
}

export function recommendationVon(ergebnis) {
  const r = ergebnis?.inhalt?.recommendation;
  return typeof r === "string" && r.trim() !== "" ? r : "";
}

// Herkunfts-Kennzeichnung je Insight/Risk/Opportunity (Produktvision Punkt
// 11: der Nutzer muss unterscheiden koennen, ob eine Aussage aus dem Exposé,
// einer Berechnung, einer Annahme oder einer Einordnung der KI stammt).
export const BASIS_LABEL = {
  expose: "Aus dem Exposé",
  berechnet: "Berechnet",
  annahme: "Annahme",
  ki: "KI-Einordnung",
};

// ── Investment-Briefing-Antwortschema (Spec §7.4) ───────────────────────────
// Eigenes, schlankeres Schema nur fuer das Produkt "briefing": urteil statt
// summary, staerken/risiken/hebel statt keyInsights/risks/opportunities,
// dazu vier feste Einordnungssaetze (markt/tragfaehigkeit/zeitraum/
// stresstest) statt calculations/scenarios/assumptions - die Zahlen zeigt
// hier ausschliesslich die Engine (briefing.js), das Modell liefert nur noch
// Text dazu (Grundprinzip der Spec, Abschnitt 3).
export function urteilVon(ergebnis) {
  const i = ergebnis?.inhalt;
  return i && typeof i !== "string" ? i.urteil || "" : "";
}

function briefingListeVon(ergebnis, feld) {
  const arr = ergebnis?.inhalt?.[feld];
  return Array.isArray(arr) ? arr.filter((x) => x?.title && x?.text) : [];
}

export const staerkenVon = (ergebnis) => briefingListeVon(ergebnis, "staerken");
export const risikenVon = (ergebnis) => briefingListeVon(ergebnis, "risiken");
export const hebelTexteVon = (ergebnis) => briefingListeVon(ergebnis, "hebel");

function briefingTextVon(ergebnis, feld) {
  const v = ergebnis?.inhalt?.[feld];
  return typeof v === "string" ? v : "";
}

export const marktVon = (ergebnis) => briefingTextVon(ergebnis, "markt");
export const tragfaehigkeitTextVon = (ergebnis) => briefingTextVon(ergebnis, "tragfaehigkeit");
export const zeitraumTextVon = (ergebnis) => briefingTextVon(ergebnis, "zeitraum");
export const stresstestTextVon = (ergebnis) => briefingTextVon(ergebnis, "stresstest");

export function alter(ergebnis, locale = "de-DE") {
  if (!ergebnis?.erstellt) return "";
  const d = new Date(ergebnis.erstellt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
