// Baut das schlanke Kontext-JSON pro Rechner fuer den KI-Assistenten
// (Datensparsamkeit, siehe docs/plans/2026-07-19-ki-assistent-konzept.md 1.3/4.4).
// Deckt Phase 1+2 ab (alle Rechner, die am globalen `d`-Context haengen —
// reines Feld-Mapping). Vorfaelligkeit haengt trotz vfe*-Praefix ebenfalls an
// `d` (kein separater React-State), deshalb hier mit drin. Steuertrick nutzt
// echten lokalen useState (ls/gst/grd) und baut seinen Kontext direkt in
// SteuerTrick.jsx, ohne diese Helper-Funktion.
export const ASSISTANT_FIELDS = {
  renditerechner: ["kaufpreis", "flaeche", "kaltmiete", "eigenkapital", "zinssatz", "tilgung", "jahre"],
  finanzierung: ["kaufpreis", "eigenkapital", "zinssatz", "tilgung", "zinsbindung"],
  miete: ["vergleichsmiete", "letzteErhDatum", "letzteErhMiete", "mietJahre"],
  sanierung: ["baujahr", "sanFl", "sanHt", "sanHa", "sanPe", "sanIsfp"],
  vorfaelligkeit: [
    "vfeAuszahlung",
    "vfeSollzinsbindungsEnde",
    "vfeRestschuld",
    "vfeRestschuldDatum",
    "vfeSollzinssatz",
    "vfeMonatsRate",
    "vfeAbloeseTermin",
    "vfeSondertilgung",
    "vfeWiederanlagezins",
    "vfeBearbeitungsentgelt",
  ],
};

export function buildAssistantContext(rechner, d, kennzahlen) {
  const fields = ASSISTANT_FIELDS[rechner] ?? [];
  const kontext = Object.fromEntries(fields.map((f) => [f, d[f]]));
  // kennzahlen wird flach eingemischt (nicht verschachtelt) - der Worker liest
  // "bewertung.tier" direkt von der Kontext-Wurzel (worker/src/index.ts extractTier).
  return { ...kontext, ...kennzahlen };
}
