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
const MAX_ABSCHNITTE = 3;
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
