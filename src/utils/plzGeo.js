// Koordinaten je Postleitzahl - Grundlage der Objektkarte (Phase E).
//
// Datenquelle: GeoNames Postal Codes (DE), CC BY 3.0. Die Namensnennung samt
// Link auf geonames.org steht sichtbar unter der Karte - das verlangt die
// Lizenz, und mehr verlangt sie nicht.
//
// Bewusst als statische Datei statt Geocoding-Dienst:
//   - kein Laufzeit-Request je Objekt, also auch kein Datenabfluss darueber
//   - keine Rate-Limits, kein API-Schluessel
//   - funktioniert offline, was fuer eine PWA zaehlt
//
// Die Datei liegt in public/plz-geo.txt und wird erst geladen, wenn die Karte
// zum ersten Mal geoeffnet wird - sie soll das Haupt-Bundle nicht belasten.
//
// Format: "|"-getrennte Eintraege "dPLZ,dLat,dLon", alle Werte als Base36 und
// als Differenz zum Vorgaenger (die Liste ist nach PLZ sortiert, benachbarte
// PLZ liegen geografisch nah beieinander - die Differenzen sind deshalb klein).
// Lat/Lon in Tausendstel Grad, rund 110 m genau. Das reicht fuer Punkte auf
// einer Deutschlandkarte und spart gegenueber der Rohform die Haelfte:
// 85 KB statt 184 KB.

const DATEI = "/plz-geo.txt";

// Deutschland-Huellrechteck, aus dem Datensatz selbst abgeleitet. Dient der
// Projektion in der Karte.
export const DE_BOUNDS = { latMin: 47.4, latMax: 55.05, lonMin: 5.9, lonMax: 15.0 };

let tabelle = null;
let laufend = null;

function d36(s) {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}

export function dekodiere(text) {
  const map = new Map();
  let plz = 0;
  let lat = 0;
  let lon = 0;
  for (const eintrag of text.split("|")) {
    const komma1 = eintrag.indexOf(",");
    const komma2 = eintrag.indexOf(",", komma1 + 1);
    if (komma1 < 0 || komma2 < 0) continue;
    plz += d36(eintrag.slice(0, komma1));
    lat += d36(eintrag.slice(komma1 + 1, komma2));
    lon += d36(eintrag.slice(komma2 + 1));
    map.set(String(plz).padStart(5, "0"), { lat: lat / 1000, lon: lon / 1000 });
  }
  return map;
}

// Laedt die Tabelle einmalig. Mehrere gleichzeitige Aufrufe teilen sich
// dieselbe Anfrage (wie fetchObjectsOnce in Merkliste.jsx).
export function ladePlzGeo() {
  if (tabelle) return Promise.resolve(tabelle);
  if (!laufend) {
    laufend = fetch(DATEI)
      .then((r) => {
        if (!r.ok) throw new Error(`plz_geo_${r.status}`);
        return r.text();
      })
      .then((text) => {
        tabelle = dekodiere(text);
        return tabelle;
      })
      .catch((e) => {
        // Die Karte ist ein Extra: ohne Koordinaten bleibt die Ortsliste
        // nutzbar, deshalb kein harter Fehler nach oben.
        console.error("[plzGeo] Koordinaten nicht ladbar:", e);
        tabelle = new Map();
        return tabelle;
      })
      .finally(() => {
        laufend = null;
      });
  }
  return laufend;
}

export function koordinateFuer(plz, map) {
  if (!plz || !map) return null;
  const key = String(plz).trim().padStart(5, "0");
  return map.get(key) || null;
}

// Projiziert Lat/Lon auf Pixel. Fuer die Breite Deutschlands genuegt eine
// lineare Projektion mit Kosinus-Korrektur der Laengengrade - eine echte
// Mercator-Projektion wuerde auf diesem Ausschnitt kaum abweichen.
export function projiziere(lat, lon, breite, hoehe, rand = 8) {
  const b = DE_BOUNDS;
  const mittleresLat = ((b.latMin + b.latMax) / 2) * (Math.PI / 180);
  const kx = Math.cos(mittleresLat);
  const spanX = (b.lonMax - b.lonMin) * kx;
  const spanY = b.latMax - b.latMin;
  // Seitenverhaeltnis erhalten, damit Deutschland nicht verzerrt wirkt.
  const skala = Math.min((breite - 2 * rand) / spanX, (hoehe - 2 * rand) / spanY);
  const offsetX = (breite - spanX * skala) / 2;
  const offsetY = (hoehe - spanY * skala) / 2;
  return {
    x: offsetX + (lon - b.lonMin) * kx * skala,
    y: offsetY + (b.latMax - lat) * skala,
  };
}
