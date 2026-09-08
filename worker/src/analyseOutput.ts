// Haertet die Modellantwort der AI-Engine zur zugesagten Form.
//
// Nach demselben Muster wie exposeOutput.ts: der Prompt BITTET um JSON, dieser
// Parser ERZWINGT es. Modelle liefern gelegentlich Markdown-Zaeune, Vorreden
// oder mehr Felder als verlangt - der Client darf davon nichts merken, sonst
// bricht die Ansicht bei jeder Modellschwankung.

export interface AnalyseKpi {
  label: string;
  wert: string;
  ton: "gut" | "neutral" | "schwach";
}

export interface AnalyseAbschnitt {
  titel: string;
  text: string;
}

export interface AnalyseErgebnis {
  kernaussage: string;
  kpis: AnalyseKpi[];
  abschnitte: AnalyseAbschnitt[];
}

const MAX_KERNAUSSAGE = 400;
const MAX_KPIS = 3;
const MAX_ABSCHNITTE = 4;
const MAX_ABSCHNITT_TEXT = 1200;

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

function ton(wert: unknown): AnalyseKpi["ton"] {
  return wert === "gut" || wert === "schwach" ? wert : "neutral";
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
    // Besser als nichts - der Text wird zur Kernaussage, Abschnitte bleiben leer.
    const nur = text(roh, MAX_KERNAUSSAGE);
    return nur ? { kernaussage: nur, kpis: [], abschnitte: [] } : null;
  }
  if (typeof daten !== "object" || daten === null) return null;
  const d = daten as Record<string, unknown>;

  const kernaussage = text(d.kernaussage, MAX_KERNAUSSAGE);

  const kpis: AnalyseKpi[] = Array.isArray(d.kpis)
    ? d.kpis
        .slice(0, MAX_KPIS)
        .map((k) => {
          const o = (k || {}) as Record<string, unknown>;
          return { label: text(o.label, 40), wert: text(o.wert, 40), ton: ton(o.ton) };
        })
        .filter((k) => k.label && k.wert)
    : [];

  const abschnitte: AnalyseAbschnitt[] = Array.isArray(d.abschnitte)
    ? d.abschnitte
        .slice(0, MAX_ABSCHNITTE)
        .map((a) => {
          const o = (a || {}) as Record<string, unknown>;
          return { titel: text(o.titel, 40).toUpperCase(), text: text(o.text, MAX_ABSCHNITT_TEXT) };
        })
        .filter((a) => a.titel && a.text)
    : [];

  // Ohne Kernaussage ist das Ergebnis wertlos - sie traegt die Ansicht im
  // Reiter. Ein erster Abschnitt kann sie notfalls ersetzen.
  if (!kernaussage && abschnitte.length === 0) return null;
  return {
    kernaussage: kernaussage || text(abschnitte[0]?.text, MAX_KERNAUSSAGE),
    kpis,
    abschnitte,
  };
}

// ── Besichtigungshandout ────────────────────────────────────────────────────
//
// Eigene Form, eigener Parser - und zwar NUR fuer dieses eine Produkt. Die
// drei Auswertungen (analyse/hebel/preis) bleiben unveraendert bei
// {kernaussage, kpis, abschnitte}; der Aufrufer waehlt den Parser nach
// Produkt (siehe handleObjektAnalyse).
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
  return { kernaussage: text(d.kernaussage, MAX_KERNAUSSAGE), fragen };
}
