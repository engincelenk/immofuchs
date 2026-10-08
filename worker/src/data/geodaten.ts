// Abfrage-Logik fuer die Regionaldaten. Die Rohdaten stehen in
// geodaten.generated.ts (erzeugt von scripts/sync_worker_daten.mjs) - hier
// liegt nur, wie daraus EIN Eintrag herausgeholt wird. Es gibt bewusst keine
// Funktion, die die ganze Tabelle zurueckgibt.
import { PLZ_KREIS_DATEN, REGIONALPREISE_DATEN } from "./geodaten.generated";

function d36(s: string): number {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}

// PLZ als Differenz zum Vorgaenger, Wert = Index ins Kreisnamen-Woerterbuch
// (gleiches Format wie zuvor im Client, siehe build_plz_kreis.mjs).
let plzKreisMap: Map<string, string> | null = null;
function plzKreisTabelle(): Map<string, string> {
  if (plzKreisMap) return plzKreisMap;
  const map = new Map<string, string>();
  let plz = 0;
  for (const eintrag of PLZ_KREIS_DATEN.zuordnung.split("|")) {
    if (!eintrag) continue;
    const komma = eintrag.indexOf(",");
    if (komma < 0) continue;
    plz += d36(eintrag.slice(0, komma));
    const name = PLZ_KREIS_DATEN.kreise[d36(eintrag.slice(komma + 1))];
    if (name) map.set(String(plz).padStart(5, "0"), name);
  }
  plzKreisMap = map;
  return map;
}

export function kreisFuerPlz(plz: string): string | null {
  return plzKreisTabelle().get(plz) ?? null;
}

export function regionalpreiseBundesland(code: string): { stand: string; bundesland: unknown } | null {
  const bl = REGIONALPREISE_DATEN.bundeslaender.find((b) => b.code === code);
  return bl ? { stand: REGIONALPREISE_DATEN.stand, bundesland: bl } : null;
}

// Nur Zaehlwerte fuer die Landingpage ("X Kreise in Y Bundeslaendern").
export function regionalpreiseMeta(): { stand: string; laender: number; kreise: number } {
  const laender = REGIONALPREISE_DATEN.bundeslaender;
  const kreise = laender.reduce(
    (n, b) => n + (Array.isArray(b.kreise) ? (b.kreise as unknown[]).length : 0),
    0,
  );
  return { stand: REGIONALPREISE_DATEN.stand, laender: laender.length, kreise };
}
