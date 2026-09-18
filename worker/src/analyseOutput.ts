// Haertet die Modellantwort der AI-Engine zur zugesagten Form.
//
// Nach demselben Muster wie exposeOutput.ts: der Prompt BITTET um JSON, dieser
// Parser ERZWINGT es. Modelle liefern gelegentlich Markdown-Zaeune, Vorreden
// oder mehr Felder als verlangt - der Client darf davon nichts merken, sonst
// bricht die Ansicht bei jeder Modellschwankung.

// Investment-Briefing-Schema (2026-09): loest das fruehere
// {kernaussage, kpis, abschnitte} ab. Statt Fliesstext in benannten
// Abschnitten liefert das Modell jetzt eine Erkenntnis-Hierarchie:
// summary (Ebene 1, DIE eine Aussage) -> keyInsights (Ebene 2, das
// Herzstueck, 3-5 Eintraege im Muster Erkenntnis->Zahl->Begruendung) ->
// calculations/scenarios/assumptions (Ebene 3/4, die Rohzahlen und
// Annahmen, auf denen die Erkenntnisse beruhen). risks/opportunities sind
// derselben Form wie keyInsights, aber optional und nur befuellt, wenn die
// Daten sie hergeben.
//
// "basis" macht fuer jede Aussage in keyInsights/risks/opportunities
// sichtbar, worauf sie beruht (Exposé-Angabe, ImmoFuchs-Berechnung,
// getroffene Annahme oder eigene KI-Einordnung) - das ist die
// Herkunfts-Transparenz aus der Produktvision, nicht nur ein Anzeigefeld.
export type AnalyseBasis = "expose" | "berechnet" | "annahme" | "ki";

export interface AnalyseInsight {
  title: string;
  value?: string;
  text: string;
  basis: AnalyseBasis;
}

export interface AnalyseCalcRow {
  label: string;
  wert: string;
}

export interface AnalyseScenarioRow {
  label: string;
  vorher: string;
  nachher: string;
}

export interface AnalyseErgebnis {
  summary: string;
  keyInsights: AnalyseInsight[];
  risks: AnalyseInsight[];
  opportunities: AnalyseInsight[];
  calculations: AnalyseCalcRow[];
  scenarios: AnalyseScenarioRow[];
  assumptions: string[];
  recommendation?: string;
}

const MAX_SUMMARY = 300;
const MAX_KEY_INSIGHTS = 5;
const MAX_RISKS = 3;
const MAX_OPPORTUNITIES = 3;
const MAX_CALCULATIONS = 8;
const MAX_SCENARIOS = 5;
const MAX_ASSUMPTIONS = 6;
const MAX_INSIGHT_TITLE = 60;
const MAX_INSIGHT_VALUE = 40;
const MAX_INSIGHT_TEXT = 400;
const MAX_CALC_FIELD = 40;
const MAX_SCENARIO_FIELD = 40;
const MAX_ASSUMPTION_TEXT = 200;
const MAX_RECOMMENDATION = 200;

// Schneidet Markdown-Zaeune und Vorreden weg und liefert den JSON-Kern.
function jsonKern(roh: string): string {
  const ohneZaun = roh.replace(/```(?:json)?/gi, "").trim();
  const start = ohneZaun.indexOf("{");
  const ende = ohneZaun.lastIndexOf("}");
  if (start < 0 || ende <= start) return ohneZaun;
  return ohneZaun.slice(start, ende + 1);
}

function text(wert: unknown, max: number): string {
  if (typeof wert !== "string") return "";
  const s = wert.trim().replace(/\s+/g, " ");
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

// Unbekannte oder fehlende Herkunftsangaben landen bewusst bei "ki" - das
// ist die einzige der vier Kategorien, die keine externe Quelle behauptet,
// also die sicherste Annahme, wenn das Modell die Form nicht einhaelt.
function basis(wert: unknown): AnalyseBasis {
  return wert === "expose" || wert === "berechnet" || wert === "annahme" || wert === "ki" ? wert : "ki";
}

function insight(roh: unknown, textMax: number): AnalyseInsight | null {
  const o = (roh || {}) as Record<string, unknown>;
  const title = text(o.title, MAX_INSIGHT_TITLE);
  const insightText = text(o.text, textMax);
  if (!title || !insightText) return null;
  const value = text(o.value, MAX_INSIGHT_VALUE);
  return { title, text: insightText, basis: basis(o.basis), ...(value ? { value } : {}) };
}

function insightListe(roh: unknown, max: number): AnalyseInsight[] {
  if (!Array.isArray(roh)) return [];
  const raus: AnalyseInsight[] = [];
  for (const eintrag of roh.slice(0, max)) {
    const i = insight(eintrag, MAX_INSIGHT_TEXT);
    if (i) raus.push(i);
  }
  return raus;
}

function calcZeilen(roh: unknown): AnalyseCalcRow[] {
  if (!Array.isArray(roh)) return [];
  const raus: AnalyseCalcRow[] = [];
  for (const eintrag of roh.slice(0, MAX_CALCULATIONS)) {
    const o = (eintrag || {}) as Record<string, unknown>;
    const label = text(o.label, MAX_CALC_FIELD);
    const wert = text(o.wert, MAX_CALC_FIELD);
    if (label && wert) raus.push({ label, wert });
  }
  return raus;
}

function scenarioZeilen(roh: unknown): AnalyseScenarioRow[] {
  if (!Array.isArray(roh)) return [];
  const raus: AnalyseScenarioRow[] = [];
  for (const eintrag of roh.slice(0, MAX_SCENARIOS)) {
    const o = (eintrag || {}) as Record<string, unknown>;
    const label = text(o.label, MAX_SCENARIO_FIELD);
    const vorher = text(o.vorher, MAX_SCENARIO_FIELD);
    const nachher = text(o.nachher, MAX_SCENARIO_FIELD);
    if (label && vorher && nachher) raus.push({ label, vorher, nachher });
  }
  return raus;
}

function assumptionZeilen(roh: unknown): string[] {
  if (!Array.isArray(roh)) return [];
  const raus: string[] = [];
  for (const eintrag of roh.slice(0, MAX_ASSUMPTIONS)) {
    const t = text(eintrag, MAX_ASSUMPTION_TEXT);
    if (t) raus.push(t);
  }
  return raus;
}

/**
 * @returns null, wenn sich nichts Brauchbares herausloesen laesst - der
 *   Aufrufer soll dann einen Fehler melden statt eine leere Karte zu zeigen.
 */
export function parseAnalyseOutput(roh: string): AnalyseErgebnis | null {
  let daten: unknown;
  try {
    daten = JSON.parse(jsonKern(roh));
  } catch {
    // Letzter Rettungsanker: das Modell hat reinen Fliesstext geliefert.
    // Besser als nichts - der Text wird zur summary, der Rest bleibt leer.
    const nur = text(roh, MAX_SUMMARY);
    return nur
      ? { summary: nur, keyInsights: [], risks: [], opportunities: [], calculations: [], scenarios: [], assumptions: [] }
      : null;
  }
  if (typeof daten !== "object" || daten === null) return null;
  const d = daten as Record<string, unknown>;

  const summary = text(d.summary, MAX_SUMMARY);
  const keyInsights = insightListe(d.keyInsights, MAX_KEY_INSIGHTS);
  const risks = insightListe(d.risks, MAX_RISKS);
  const opportunities = insightListe(d.opportunities, MAX_OPPORTUNITIES);
  const calculations = calcZeilen(d.calculations);
  const scenarios = scenarioZeilen(d.scenarios);
  const assumptions = assumptionZeilen(d.assumptions);
  const recommendation = text(d.recommendation, MAX_RECOMMENDATION);

  // Ohne summary ist das Ergebnis wertlos - sie traegt die Ansicht im
  // Reiter. Die erste Kernerkenntnis kann sie notfalls ersetzen.
  if (!summary && keyInsights.length === 0) return null;
  return {
    summary: summary || text(keyInsights[0]?.text, MAX_SUMMARY),
    keyInsights,
    risks,
    opportunities,
    calculations,
    scenarios,
    assumptions,
    ...(recommendation ? { recommendation } : {}),
  };
}

// ── Investment-Briefing ─────────────────────────────────────────────────────
//
// Eigene Form, eigener Parser (Spec docs/technical_specs/
// investment-briefing.md, Abschnitt 7.4): Das Briefing liefert KEINE
// calculations/scenarios/assumptions mehr - alle Zahlen der Karte rechnet der
// Client selbst (briefing.js) und zeigt sie live an. Das Modell steuert
// ausschliesslich Text bei, je Ebene genau ein Feld.
//
// Ohne "urteil" ist das Ergebnis wertlos: es ist der Satz unter der Ampel und
// der einzige Teil, den es ohne KI-Aufruf nicht gibt. Anders als beim
// generischen Parser gibt es hier deshalb KEINEN Fliesstext-Rettungsanker -
// ein Absatz ohne Feldzuordnung liesse sich den sieben Ebenen nicht zuordnen
// und stuende am Ende unter der falschen Ueberschrift.
export interface BriefingErgebnis {
  urteil: string;
  staerken: AnalyseInsight[];
  risiken: AnalyseInsight[];
  hebel: AnalyseInsight[];
  markt: string;
  tragfaehigkeit: string;
  zeitraum: string;
  stresstest: string;
}

const MAX_URTEIL = 220;
const MAX_BRIEFING_EINTRAEGE = 3;
const MAX_BRIEFING_TEXT = 300;
const MAX_MARKT = 250;
const MAX_TRAGFAEHIGKEIT = 300;
const MAX_ZEITRAUM = 250;
const MAX_STRESSTEST = 250;

function briefingListe(roh: unknown): AnalyseInsight[] {
  if (!Array.isArray(roh)) return [];
  const raus: AnalyseInsight[] = [];
  for (const eintrag of roh.slice(0, MAX_BRIEFING_EINTRAEGE)) {
    const i = insight(eintrag, MAX_BRIEFING_TEXT);
    if (i) raus.push(i);
  }
  return raus;
}

/**
 * @returns null, wenn kein "urteil" herauszuloesen ist - der Aufrufer
 *   verwirft die Antwort dann und gibt das Kontingent zurueck.
 */
export function parseBriefingOutput(roh: string): BriefingErgebnis | null {
  let daten: unknown;
  try {
    daten = JSON.parse(jsonKern(roh));
  } catch {
    return null;
  }
  if (typeof daten !== "object" || daten === null) return null;
  const d = daten as Record<string, unknown>;

  const urteil = text(d.urteil, MAX_URTEIL);
  if (!urteil) return null;

  return {
    urteil,
    staerken: briefingListe(d.staerken),
    risiken: briefingListe(d.risiken),
    hebel: briefingListe(d.hebel),
    markt: text(d.markt, MAX_MARKT),
    tragfaehigkeit: text(d.tragfaehigkeit, MAX_TRAGFAEHIGKEIT),
    zeitraum: text(d.zeitraum, MAX_ZEITRAUM),
    stresstest: text(d.stresstest, MAX_STRESSTEST),
  };
}

// ── Besichtigungshandout ────────────────────────────────────────────────────
//
// Eigene Form, eigener Parser - wie beim Briefing oben. Die fuenf
// Rechner-Produkte bleiben beim generischen Schema (parseAnalyseOutput); der
// Aufrufer waehlt den Parser nach Produkt (siehe handleObjektAnalyse).
//
// Warum ueberhaupt eine zweite Form: Das Handout ist das einzige Produkt, das
// nicht gelesen, sondern BENUTZT wird. Der Nutzer haekelt einzelne Fragen ab
// und druckt den Rest aus. Fliesstext in Abschnitten laesst sich nicht
// abwaehlen - eine Liste schon. Die Form muss also die Bedienung tragen, nicht
// nur den Inhalt.

export interface HandoutFrage {
  id: string;
  frage: string;
  kategorie: string;
  kern: boolean;
  vorOrt: boolean;
}

export interface HandoutErgebnis {
  kernaussage: string;
  fragen: HandoutFrage[];
}

// Zwoelf Fragen. Drei unabhaengige Gruende, die alle in dieselbe Richtung
// zeigen:
//  1. Das Handout wird ausgedruckt und zum Termin mitgenommen. Zwoelf Fragen
//     plus Kopf und Vor-Ort-Block fuellen genau eine A4-Seite - eine zweite
//     Seite nimmt beim Besichtigungstermin niemand in die Hand.
//  2. Jede Frage ist eine eigene Entscheidung (Kaestchen an/aus). Ueber einem
//     Dutzend hoert das Abwaegen auf und der Nutzer klickt "Alle waehlen" -
//     die Auswahl waere dann Zierde statt Funktion.
//  3. Token-Budget: ANALYSE_MAX_TOKENS liegt bei 1500. Zwoelf Fragen a 220
//     Zeichen plus Kernaussage passen sicher hinein. Mehr zuzulassen hiesse,
//     das Modell mitten im JSON abbrechen zu lassen - ein abgeschnittenes
//     JSON kostet Kontingent, ohne ein Ergebnis zu liefern.
const MAX_FRAGEN = 12;
// Eine gesprochene Frage ist zwei Zeilen lang, nicht zehn. 220 Zeichen sind
// grosszuegig gemessen und schneiden nur ab, was ohnehin keine Frage mehr ist.
const MAX_FRAGE_TEXT = 220;
const MAX_KATEGORIE = 24;
// Eigene Grenze fuer die kernaussage des Handouts (unveraendert bei 400 -
// unabhaengig von MAX_SUMMARY des Investment-Briefing-Schemas oben, das ist
// ein anderes Produkt mit eigener Form, siehe Kommentar am Dateianfang).
const MAX_HANDOUT_KERNAUSSAGE = 400;

// Modelle liefern Booleans gern als String ("true") - das darf nicht dazu
// fuehren, dass alle Fragen als "nicht wichtig" durchgehen.
function wahr(wert: unknown): boolean {
  return wert === true || wert === "true" || wert === 1;
}

// Stabile ID je Frage: laufende Nummer plus Kategorie-Slug ("3-unterlagen").
// Die Nummer allein waere schon eindeutig; der Slug macht die ID lesbar, wo
// sie auftaucht (gespeichertes Ergebnis, Druckauftrag).
//
// Vergeben wird sie EINMAL beim Parsen und danach mit dem Ergebnis am Objekt
// gespeichert. Auswahl und PDF referenzieren sie - sie darf sich also weder
// beim Rendern noch beim erneuten Laden aendern.
function frageId(index: number, kategorie: string): string {
  const slug = kategorie
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  return slug ? `${index + 1}-${slug}` : `${index + 1}`;
}

// Rettungsanker, wenn das Modell die Form ignoriert und Prosa liefert: was wie
// eine Frage aussieht (Zeile endet auf "?"), wird zur Frage.
//
// Anders als beim generischen Parser hilft es hier NICHT, den ganzen Text in
// die Kernaussage zu legen - eine Fragenliste ohne Fragen ist nicht bedienbar
// und ergaebe ein PDF ohne Inhalt. Lieber sechs gerettete Zeilen als ein
// verbrauchtes Kontingent fuer nichts.
function retteFragen(roh: string): string[] {
  return roh
    .replace(/```(?:json)?/gi, "")
    .split(/\r?\n/)
    .map((zeile) => zeile.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((zeile) => zeile.endsWith("?") && zeile.length > 10)
    .slice(0, MAX_FRAGEN);
}

/**
 * @returns null, wenn keine einzige Frage herauszuloesen ist - der Aufrufer
 *   verwirft die Antwort dann und gibt das Kontingent zurueck.
 */
export function parseHandoutOutput(roh: string): HandoutErgebnis | null {
  let daten: unknown;
  try {
    daten = JSON.parse(jsonKern(roh));
  } catch {
    const gerettet = retteFragen(roh);
    if (gerettet.length === 0) return null;
    return {
      kernaussage: "",
      fragen: gerettet.map((f, i) => ({
        id: frageId(i, ""),
        frage: text(f, MAX_FRAGE_TEXT),
        kategorie: "",
        kern: false,
        vorOrt: false,
      })),
    };
  }
  if (typeof daten !== "object" || daten === null) return null;
  const d = daten as Record<string, unknown>;

  const fragen: HandoutFrage[] = Array.isArray(d.fragen)
    ? d.fragen
        .slice(0, MAX_FRAGEN)
        .map((f, i) => {
          const o = (f || {}) as Record<string, unknown>;
          // text() zieht jeden Zeilenumbruch zu einem Leerzeichen zusammen.
          // Das ist hier keine Kosmetik: eine Frage mit eingebautem Umbruch
          // koennte in der Liste wie zwei Eintraege aussehen und im Dokument
          // eine eigene Zeile vortaeuschen.
          const kategorie = text(o.kategorie, MAX_KATEGORIE).toUpperCase();
          return {
            id: frageId(i, kategorie),
            frage: text(o.frage, MAX_FRAGE_TEXT),
            kategorie,
            kern: wahr(o.kern),
            vorOrt: wahr(o.vorOrt),
          };
        })
        .filter((f) => f.frage)
    : [];

  // Ohne Fragen ist das Produkt wertlos: hier traegt nicht der Text, sondern
  // die Liste. Eine Kernaussage allein ergaebe eine Karte, an der man nichts
  // auswaehlen und nichts drucken kann.
  if (fragen.length === 0) return null;
  return { kernaussage: text(d.kernaussage, MAX_HANDOUT_KERNAUSSAGE), fragen };
}
