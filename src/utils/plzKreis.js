// PLZ -> amtlicher Landkreis-/Stadtkreis-Name (Backlog Punkt 4, 2026-09-11).
//
// Warum ueberhaupt: die Regionaldaten (regionalpreis.js) matchen zuerst
// exakt auf den getippten Ortsnamen. Eine kleine Gemeinde, die selbst kein
// Kreis ist (PLZ 74385 -> "Pleidelsheim"), findet dort nie einen Treffer und
// die App fiel bisher direkt auf den Landesdurchschnitt zurueck - obwohl
// Pleidelsheim zum Landkreis Ludwigsburg gehoert, der sehr wohl in den
// Datenblaettern steht. Diese Datei loest PLZ -> Kreisname auf, als
// zweite Matching-Stufe VOR dem Bundesland-Fallback (siehe
// findRegionalPreis() in regionalpreis.js).
//
// Quelle: OpenPLZ API (openplzapi.org, github.com/openpotato/openplzapi),
// amtlicher Gebietsstand (Destatis/BKG) - siehe scripts/build_plz_kreis.mjs
// fuer die Erzeugung. Bewusst als statische Datei statt Laufzeit-Abfrage -
// dasselbe Muster wie mietReferenz.js/regionalpreis.js: kein Request je
// Objekt, kein Datenabfluss, funktioniert offline.
//
// Format: JSON mit einem Kreisnamen-Woerterbuch ("kreise", ~294 Eintraege)
// und einer Base36-Zuordnung ("zuordnung", PLZ als Differenz zum Vorgaenger,
// Wert = Index ins Woerterbuch) - dasselbe Delta+Base36-Prinzip wie
// mietReferenz.js, nur mit einem Namens-Woerterbuch statt eines Zahlenwerts,
// weil auf >10.000 PLZ nur ~294 unterschiedliche Kreisnamen kommen.

const DATEI = "/plz-kreis.txt";

let daten = null;
let laufend = null;

function d36(s) {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}

export function dekodierePlzKreis(text) {
  const { kreise, zuordnung } = JSON.parse(text);
  const map = new Map();
  let plz = 0;
  for (const eintrag of zuordnung.split("|")) {
    if (!eintrag) continue;
    const komma = eintrag.indexOf(",");
    if (komma < 0) continue;
    plz += d36(eintrag.slice(0, komma));
    const idx = d36(eintrag.slice(komma + 1));
    const name = Number.isFinite(idx) ? kreise[idx] : null;
    if (name) map.set(String(plz).padStart(5, "0"), name);
  }
  return map;
}

// Laedt die Tabelle einmalig - dasselbe Muster wie ladeMietReferenz()/
// ladeRegionalpreise().
export function ladePlzKreis() {
  if (daten) return Promise.resolve(daten);
  if (!laufend) {
    laufend = fetch(DATEI)
      .then((r) => {
        if (!r.ok) throw new Error(`plz_kreis_${r.status}`);
        return r.text();
      })
      .then((text) => {
        daten = dekodierePlzKreis(text);
        return daten;
      })
      .catch((err) => {
        laufend = null;
        throw err;
      });
  }
  return laufend;
}

// Synchron, sobald ladePlzKreis() aufgeloest ist - null davor oder ohne
// Treffer fuer diese PLZ.
export function kreisFuerPlz(plz) {
  if (!daten || !plz) return null;
  return daten.get(String(plz).trim().padStart(5, "0")) ?? null;
}
