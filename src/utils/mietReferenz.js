// Ortsuebliche Nettokaltmiete je m² und Postleitzahl.
//
// Datenquelle: Zensus 2022, "Durchschnittliche Nettokaltmiete" auf dem
// 1-km-Gitter (Statistisches Bundesamt, Open Data, freie Nutzung mit
// Quellenangabe, Stichtag 15.05.2022). Erzeugt von
// scripts/build_miete_referenz.py, das die Gitterzellen im Umkreis von 3 km
// um den PLZ-Mittelpunkt mittelt.
//
// WICHTIG - das ist die BESTANDSMIETE, nicht die Angebotsmiete.
// Der Zensus erfasst, was Mieter tatsaechlich zahlen, quer durch alle
// Vertragsalter. Neuvermietungen liegen darueber, in angespannten Maerkten
// deutlich. Wer diese Zahl als "Marktmiete" ausgibt, unterschaetzt das
// Potenzial systematisch - und wer die eigene Annahme daran misst, muss das
// wissen. Jede Anzeige dieser Zahl benennt die Herkunft deshalb mit.
//
// Bewusst als statische Datei statt Dienst - dieselbe Begruendung wie bei
// plzGeo.js: kein Laufzeit-Request je Objekt, kein Datenabfluss darueber,
// keine Rate-Limits, kein API-Schluessel, funktioniert offline.
//
// Format: "|"-getrennte Eintraege "dPLZ,zehntelEuro", beide Base36, die PLZ
// als Differenz zum Vorgaenger (Liste ist sortiert). 53 KB fuer 10.767 PLZ.

const DATEI = "/miete-referenz.txt";

export const MIET_REFERENZ_QUELLE = {
  name: "Zensus 2022",
  herausgeber: "Statistisches Bundesamt",
  stichtag: "15.05.2022",
  art: "Bestandsmiete",
};

let tabelle = null;
let laufend = null;

function d36(s) {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}

export function dekodiere(text) {
  const map = new Map();
  let plz = 0;
  for (const eintrag of text.split("|")) {
    const komma = eintrag.indexOf(",");
    if (komma < 0) continue;
    plz += d36(eintrag.slice(0, komma));
    const zehntel = d36(eintrag.slice(komma + 1));
    if (!Number.isFinite(zehntel)) continue;
    map.set(String(plz).padStart(5, "0"), zehntel / 10);
  }
  return map;
}

// Laedt die Tabelle einmalig. Mehrere gleichzeitige Aufrufe teilen sich
// dieselbe Anfrage (dasselbe Muster wie ladePlzGeo).
export function ladeMietReferenz() {
  if (tabelle) return Promise.resolve(tabelle);
  if (!laufend) {
    laufend = fetch(DATEI)
      .then((r) => {
        if (!r.ok) throw new Error(`miete_referenz_${r.status}`);
        return r.text();
      })
      .then((text) => {
        tabelle = dekodiere(text);
        return tabelle;
      })
      .catch((err) => {
        // Naechster Aufruf darf es erneut versuchen - eine fehlende Referenz
        // ist kein dauerhafter Zustand, nur ein fehlgeschlagener Abruf.
        laufend = null;
        throw err;
      });
  }
  return laufend;
}

// Synchron, sobald die Tabelle geladen ist - null, solange nicht.
export function referenzMiete(plz) {
  if (!tabelle || !plz) return null;
  const wert = tabelle.get(String(plz).trim().padStart(5, "0"));
  return Number.isFinite(wert) ? wert : null;
}
