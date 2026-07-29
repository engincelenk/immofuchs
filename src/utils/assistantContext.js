// Baut das schlanke Kontext-JSON pro Rechner fuer den KI-Assistenten
// (Datensparsamkeit, siehe docs/plans/2026-07-19-ki-assistent-konzept.md 1.3/4.4).
// Deckt Phase 1+2 ab (alle Rechner, die am globalen `d`-Context haengen —
// reines Feld-Mapping). Vorfaelligkeit haengt trotz vfe*-Praefix ebenfalls an
// `d` (kein separater React-State), deshalb hier mit drin. Steuertrick nutzt
// echten lokalen useState (ls/gst/grd) und baut seinen Kontext direkt in
// SteuerTrick.jsx, ohne diese Helper-Funktion.
// Uebersetzt die UI-Tab-Id (so speichert die Merkliste, siehe SaveBtn-Aufrufe
// in den Rechnern) auf den rechner-Wert, den der Worker akzeptiert
// (worker/src/validator.ts, RECHNER_VALUES). Beide Namensraeume sind
// historisch auseinandergelaufen: nur "miete" heisst zufaellig gleich, alle
// anderen wurden vom Worker mit 400 invalid_rechner abgelehnt - der
// Objektvergleich funktionierte dadurch ausser Miete/Miete nie
// (Bugreport 2026-07-29).
//
// Uebersetzt wird beim LESEN, nicht beim Speichern: in den localStorage der
// Nutzer sind die alten Ids laengst geschrieben, ein Umstellen von SaveBtn
// wuerde die bestehenden Eintraege nicht heilen und zusaetzlich ein zweites
// Format in Umlauf bringen.
//
// steuer6/vfe fehlen bewusst: beide Rechner haben keinen SaveBtn, koennen also
// nicht in der Merkliste landen - und fuer "steuertrick" gibt es unten auch
// keine ASSISTANT_FIELDS, die Zuordnung waere also ohnehin wirkungslos.
export const TAB_TO_RECHNER = {
  haupt: "renditerechner",
  kredit: "finanzierung",
  miete: "miete",
  sanier: "sanierung",
};

// Fallback bewusst auf einen GUELTIGEN Wert statt auf den Rohwert: ein
// unbekannter tab (alter localStorage-Eintrag) wuerde sonst unveraendert
// durchgereicht und liefe wieder in genau den 400er, den dieses Mapping
// beseitigt.
export function tabZuRechner(tab) {
  return TAB_TO_RECHNER[tab] ?? "renditerechner";
}

export const ASSISTANT_FIELDS = {
  renditerechner: [
    "kaufpreis",
    "flaeche",
    "kaltmiete",
    "eigenkapital",
    "zinssatz",
    "tilgung",
    "jahre",
  ],
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
