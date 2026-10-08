// PLZ -> amtlicher Landkreis-/Stadtkreis-Name (Backlog Punkt 4, 2026-09-11).
//
// Warum ueberhaupt: die Regionaldaten (regionalpreis.js) matchen zuerst
// exakt auf den getippten Ortsnamen. Eine kleine Gemeinde, die selbst kein
// Kreis ist (PLZ 74385 -> "Pleidelsheim"), findet dort nie einen Treffer und
// die App fiel bisher direkt auf den Landesdurchschnitt zurueck - obwohl
// Pleidelsheim zum Landkreis Ludwigsburg gehoert, der sehr wohl in den
// Datenblaettern steht. Diese Zuordnung loest PLZ -> Kreisname auf, als
// zweite Matching-Stufe VOR dem Bundesland-Fallback (siehe
// findRegionalPreis() in regionalpreis.js).
//
// Quelle: OpenPLZ API (openplzapi.org), amtlicher Gebietsstand (Destatis/BKG),
// erzeugt von scripts/build_plz_kreis.mjs.
//
// Seit 2026-10-03 NICHT mehr als statische Datei: public/plz-kreis.txt war
// per Direkt-URL am Stueck herunterladbar. Die Daten liegen im Worker
// (GET /api/v1/daten/plz-kreis/:plz, worker/src/routes/daten.ts), der je
// Anfrage genau eine PLZ beantwortet. Der Client holt die PLZ des Objekts
// bei Bedarf und merkt sie sich; kreisFuerPlz() bleibt synchron.

import { apiV1 } from "./apiBase.js";

// PLZ -> Kreisname (oder null = bekannt, aber ohne Treffer). Fehlt der
// Schluessel, wurde die PLZ noch nicht geladen.
const cache = new Map();
const laufend = new Map();

function normalisiere(plz) {
  const p = String(plz ?? "").trim();
  return /^\d{5}$/.test(p) ? p : null;
}

// Laedt die Zuordnung fuer EINE PLZ. Mehrere gleichzeitige Aufrufe teilen sich
// dieselbe Anfrage; ein Fehlschlag wird nicht gemerkt, der naechste Aufruf
// versucht es erneut. Ohne gueltige PLZ gibt es nichts zu laden.
export function ladePlzKreis(plz) {
  const p = normalisiere(plz);
  if (!p || cache.has(p)) return Promise.resolve(cache.get(p) ?? null);
  if (!laufend.has(p)) {
    laufend.set(
      p,
      fetch(apiV1(`/daten/plz-kreis/${p}`))
        .then((r) => {
          if (!r.ok) throw new Error(`plz_kreis_${r.status}`);
          return r.json();
        })
        .then(({ kreis }) => {
          cache.set(p, kreis ?? null);
          laufend.delete(p);
          return kreis ?? null;
        })
        .catch((err) => {
          laufend.delete(p);
          throw err;
        }),
    );
  }
  return laufend.get(p);
}

// Synchron, sobald ladePlzKreis(plz) aufgeloest ist - null davor oder ohne
// Treffer fuer diese PLZ.
export function kreisFuerPlz(plz) {
  const p = normalisiere(plz);
  return p ? (cache.get(p) ?? null) : null;
}
