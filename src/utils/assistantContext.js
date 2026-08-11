// Baut das schlanke Kontext-JSON pro Rechner fuer den KI-Assistenten
// (Datensparsamkeit, siehe docs/plans/2026-07-19-ki-assistent-konzept.md 1.3/4.4).
// Deckt alle 6 Rechner ab, die inzwischen am globalen `d`-Context haengen.
// SteuerTrick.jsx baut den Assistenten-Kontext weiterhin direkt selbst (nicht
// ueber diese Helper-Funktion) - der Worker-Kontext-Schluessel dort
// (lohnsteuer, grenzsteuersatzProzent, ...) unterscheidet sich bewusst von
// den Feldnamen in `d` (steuer6Ls/steuer6Gst/steuer6Grd), waere also ohnehin
// keine 1:1-Zuordnung.
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
// steuer6/vfe (Konzept-Dok 8.3 Punkt 2): beide Rechner haben inzwischen einen
// SaveBtn (vorher nicht, siehe Git-Historie) und koennen daher in der
// Merkliste/Vergleichsfunktion landen - Zuordnung ergaenzt.
export const TAB_TO_RECHNER = {
  haupt: "renditerechner",
  kredit: "finanzierung",
  miete: "miete",
  sanier: "sanierung",
  vfe: "vorfaelligkeit",
  steuer6: "steuertrick",
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
  steuertrick: ["steuer6Ls", "steuer6Gst", "steuer6Grd"],
};

export function buildAssistantContext(rechner, d, kennzahlen) {
  const fields = ASSISTANT_FIELDS[rechner] ?? [];
  const kontext = Object.fromEntries(fields.map((f) => [f, d[f]]));
  // kennzahlen wird flach eingemischt (nicht verschachtelt) - der Worker liest
  // "bewertung.tier" direkt von der Kontext-Wurzel (worker/src/index.ts extractTier).
  return { ...kontext, ...kennzahlen };
}
