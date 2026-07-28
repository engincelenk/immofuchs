// Bruecke zwischen Extraktions-Ergebnis (Worker-Schema, Spec Abschnitt 5) und
// den Rechnerfeldern im geteilten Context (`d`/`set` aus AppContext).
//
// Zwei bewusste Entscheidungen:
// 1. Nicht jedes extrahierte Feld hat ein Rechnerfeld. Felder ohne Ziel werden
//    trotzdem angezeigt (Spec 4.5: Kontext fuer den Nutzer), aber nicht
//    uebernommen - sie sind Information, keine Eingabe.
// 2. Uebernommen wird nichts automatisch. Die Karte liefert Vorschlaege, der
//    Nutzer bestaetigt (Spec 8, Punkt 6/7: kein stilles Ueberschreiben).

import { PLZ_DB } from "../data/plzData.js";
import { fmt } from "./helpers.js";

// Reihenfolge = Anzeigereihenfolge in der Ergebnis-Karte.
// ziele: Schluessel im geteilten `d`-Objekt, die dieses Feld befuellt.
// immerPruefen: CEO-Auflage (Spec 4.4) - unabhaengig von confidence immer als
//   "bitte pruefen" markiert, weil ein falscher Wert die Nettorendite kippt.
export const FELD_DEFS = [
  { key: "titel", gruppe: "objekt", typ: "text" },
  { key: "objektart", gruppe: "objekt", typ: "text" },
  { key: "kaufpreis", gruppe: "objekt", typ: "zahl", einheit: "€", ziele: ["kaufpreis"] },
  // Separat ausgewiesener Stellplatz-/Garagenpreis (Nutzertest 2026-07-28).
  // Zielfeld ist das bestehende `garage` im Renditerechner - rendite.js rechnet
  // gesamtKaufpreis = kaufpreis + garage, die Aufteilung bleibt fuer den Nutzer
  // also sichtbar, statt still im Kaufpreis zu verschwinden.
  {
    key: "stellplatz_kaufpreis",
    gruppe: "objekt",
    typ: "zahl",
    einheit: "€",
    ziele: ["garage"],
  },
  { key: "kaufpreis_pro_qm", gruppe: "objekt", typ: "zahl", einheit: "€/m²" },
  { key: "zimmer", gruppe: "objekt", typ: "zahl" },
  // Wohnflaeche speist zwei Rechner: Rendite (flaeche) und Sanierung (sanFl).
  { key: "wohnflaeche", gruppe: "objekt", typ: "zahl", einheit: "m²", ziele: ["flaeche", "sanFl"] },
  { key: "plz", gruppe: "objekt", typ: "text", ziele: ["plz"] },
  { key: "ort", gruppe: "objekt", typ: "text", ziele: ["ort"] },
  { key: "stockwerk", gruppe: "objekt", typ: "text" },
  // Jahreszahl ohne Tausenderpunkt - "1.996" liest sich wie ein Betrag.
  { key: "baujahr", gruppe: "objekt", typ: "zahl", ohneTrenner: true, ziele: ["baujahr"] },

  { key: "balkon_terrasse", gruppe: "ausstattung", typ: "bool" },
  { key: "einbaukueche", gruppe: "ausstattung", typ: "bool" },
  { key: "stellplatz", gruppe: "ausstattung", typ: "text" },
  { key: "keller", gruppe: "ausstattung", typ: "bool" },
  { key: "barrierefrei", gruppe: "ausstattung", typ: "bool" },
  { key: "heizungsart", gruppe: "ausstattung", typ: "text" },

  { key: "energieausweistyp", gruppe: "energie", typ: "text" },
  // Energietraeger wird auf die Auswahlliste des Sanierungsrechners abgebildet
  // (htO in Sanier.jsx) - passt nichts, wird nur angezeigt.
  { key: "energietraeger", gruppe: "energie", typ: "text", ziele: ["sanHt"] },
  { key: "endenergiebedarf", gruppe: "energie", typ: "zahl", einheit: "kWh/m²·a", nachkomma: 1 },
  { key: "energieeffizienzklasse", gruppe: "energie", typ: "text" },

  { key: "hausgeld", gruppe: "kosten", typ: "zahl", einheit: "€" },
  {
    key: "provision_kaeufer_prozent",
    gruppe: "kosten",
    typ: "zahl",
    einheit: "%",
    nachkomma: 2,
    ziele: ["makler"],
    immerPruefen: true,
  },
  { key: "kaufnebenkosten", gruppe: "kosten", typ: "zahl", einheit: "€", immerPruefen: true },
  { key: "gesamtkosten", gruppe: "kosten", typ: "zahl", einheit: "€" },
  { key: "kaltmiete", gruppe: "kosten", typ: "zahl", einheit: "€", ziele: ["kaltmiete"] },
  { key: "nebenkosten_miete", gruppe: "kosten", typ: "zahl", einheit: "€" },

  { key: "objektbeschreibung", gruppe: "kontext", typ: "text" },
  { key: "lagebeschreibung", gruppe: "kontext", typ: "text" },
];

export const GRUPPEN = ["objekt", "ausstattung", "energie", "kosten", "kontext"];

// Hausgeld hat bewusst KEIN Ziel: `nichtUml` im Renditerechner ist nur der
// nicht umlagefaehige Anteil des Hausgelds, nicht das Hausgeld selbst. Eine
// 1:1-Uebernahme wuerde die Kosten deutlich zu hoch ansetzen.

// Energietraeger-Text (frei formuliert im Expose) auf die Auswahlwerte des
// Sanierungsrechners abbilden. Unbekanntes ergibt null - dann bleibt das Feld
// Anzeige ohne Uebernahme.
export function mapEnergietraeger(text) {
  if (typeof text !== "string") return null;
  const v = text.toLowerCase();
  if (v.includes("pellet") || v.includes("holz")) return "pellets";
  if (v.includes("wärmepumpe") || v.includes("waermepumpe") || v.includes("erdwärme")) return "wp";
  if (v.includes("fernwärme") || v.includes("fernwaerme")) return "fernw-std";
  if (v.includes("öl") || v.includes("oel")) return "heizoel";
  if (v.includes("gas")) return "gas";
  if (v.includes("kohle")) return "kohle";
  if (v.includes("strom")) return "strom";
  return null;
}

function holeWert(ergebnis, def) {
  const gruppe = ergebnis?.[def.gruppe];
  return gruppe ? (gruppe[def.key] ?? null) : null;
}

function formatiere(def, wert, t) {
  if (wert === null || wert === undefined || wert === "") return null;
  if (def.typ === "bool") return wert ? t.ja : t.nein;
  if (def.typ === "zahl") {
    // Ohne feste Vorgabe richtet sich die Genauigkeit nach dem Wert: 3 Zimmer
    // bleiben "3", 80,05 m² bleiben "80,05" statt auf "80" gerundet zu werden.
    const nachkomma = def.nachkomma ?? (Number.isInteger(wert) ? 0 : 2);
    const zahl = def.ohneTrenner ? String(wert) : fmt(wert, nachkomma);
    return def.einheit ? `${zahl} ${def.einheit}` : zahl;
  }
  return String(wert);
}

// Wandelt einen extrahierten Wert in die Schreibweise des Rechnerfelds um -
// `d` haelt alle Zahlen als String (siehe createDefaults in App.jsx).
function zielWert(def, wert) {
  if (def.ziele?.includes("sanHt")) return mapEnergietraeger(wert);
  if (def.typ === "zahl") return String(wert);
  return String(wert);
}

// Baut die Zeilen der Ergebnis-Karte: pro Feld Wert, Status und - falls im
// Rechner schon etwas steht - der bestehende Wert fuer den Konflikt-Toggle
// (Spec 8, Punkt 6).
export function baueZeilen(ergebnis, d, t) {
  const confidence = ergebnis?.confidence ?? {};
  const warnungen = ergebnis?.warnungen ?? [];

  return FELD_DEFS.map((def) => {
    const wert = holeWert(ergebnis, def);
    const gefunden = wert !== null && wert !== undefined && wert !== "";
    const warnung = warnungen.find((w) => w.feld === def.key)?.hinweis ?? null;
    const conf = confidence[def.key] ?? (gefunden ? "unsicher" : "nicht_gefunden");

    const ziel = zielFuer(def, wert, gefunden);
    const bestehend = ziel ? (d?.[ziel] ?? null) : null;
    const neuerWert = ziel && gefunden ? zielWert(def, wert) : null;
    // Konflikt nur, wenn im Rechner etwas anderes steht als vorgeschlagen.
    const konflikt = Boolean(
      ziel && neuerWert !== null && bestehend !== null && String(bestehend) !== neuerWert,
    );

    return {
      key: def.key,
      gruppe: def.gruppe,
      label: t.felder[def.key],
      wert,
      anzeige: formatiere(def, wert, t) ?? t.nichtGefunden,
      gefunden,
      confidence: conf,
      warnung,
      // Status-Icon der Karte (Spec 8, Punkt 6). "pruefen" schlaegt "sicher",
      // damit die CEO-Auflage nicht von einem hohen confidence-Wert
      // ueberstimmt werden kann.
      status: !gefunden
        ? "nicht_gefunden"
        : def.immerPruefen
          ? "pruefen"
          : warnung || conf === "unsicher"
            ? "unsicher"
            : "sicher",
      uebernehmbar: Boolean(ziel && neuerWert !== null),
      ziele: def.ziele ?? [],
      neuerWert,
      bestehend,
      konflikt,
    };
  });
}

// Ein Feld ist nur uebernehmbar, wenn es ein Ziel gibt UND der Wert sich
// abbilden laesst (Energietraeger z.B. nur bei bekannter Heizungsart).
function zielFuer(def, wert, gefunden) {
  if (!def.ziele || !gefunden) return null;
  if (def.ziele.includes("sanHt") && mapEnergietraeger(wert) === null) return null;
  return def.ziele[0];
}

// Schreibt die ausgewaehlten Zeilen in den geteilten Context.
// `auswahl` ist ein Set der Feld-Keys, die uebernommen werden sollen.
export function uebernehmeZeilen(zeilen, auswahl, set) {
  let anzahl = 0;
  for (const zeile of zeilen) {
    if (!zeile.uebernehmbar || !auswahl.has(zeile.key)) continue;
    const wert = zeile.key === "energietraeger" ? mapEnergietraeger(zeile.wert) : zeile.neuerWert;
    for (const ziel of zeile.ziele) set(ziel, wert);
    // PLZ zieht Ort und Bundesland nach, wie die manuelle Eingabe in
    // PLZSearch.jsx - sonst rechnet die Grunderwerbsteuer mit dem alten Land.
    if (zeile.key === "plz" && /^\d{5}$/.test(String(wert))) {
      const treffer = PLZ_DB.byPlz[String(wert)];
      if (treffer) {
        set("ort", treffer.ort);
        set("bundesland", treffer.bl);
      }
    }
    anzahl++;
  }
  return anzahl;
}

// Ist die Kaltmiete Teil dieser Uebernahme? Der Renditerechner koppelt
// Kaltmiete und €/m² ueber zwei Effekte; kommt die Kaltmiete aus dem Expose,
// muss sie die fuehrende Groesse sein, sonst rechnet der Rechner sie sofort
// wieder aus dem alten €/m²-Wert um (Nutzertest 2026-07-28). Ohne Kaltmiete in
// der Auswahl bleibt es bei der Gegenrichtung - dann soll eine uebernommene
// Wohnflaeche die Kaltmiete neu berechnen.
export function enthaeltKaltmiete(zeilen, auswahl) {
  return zeilen.some((z) => z.key === "kaltmiete" && z.uebernehmbar && auswahl.has(z.key));
}

// Kopfzeile der Karte: "18 von 22 Feldern gefunden · 3 zu pruefen" (Spec 8).
export function zaehleZeilen(zeilen) {
  const gesamt = zeilen.length;
  const gefunden = zeilen.filter((z) => z.gefunden).length;
  const zuPruefen = zeilen.filter(
    (z) => z.status === "pruefen" || z.status === "unsicher",
  ).length;
  return { gesamt, gefunden, zuPruefen };
}
