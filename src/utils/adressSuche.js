// Adress-Vervollstaendigung ueber Photon (photon.komoot.io), einem offenen
// Suchdienst auf OpenStreetMap-Daten - kostenlos, ohne Schluessel.
//
// WICHTIG, und im Formular auch sichtbar ausgewiesen: Dies ist die einzige
// Stelle der App, an der eine Nutzereingabe den Browser verlaesst. Alles
// andere - Kennzahlen, Unterlagen, PLZ-Koordinaten - bleibt lokal. Deshalb:
//   - erst ab drei Zeichen,
//   - entprellt, nicht bei jedem Tastendruck,
//   - nur der eingetippte Text, nie Kaufpreis, Miete oder andere Objektdaten,
//   - laufende Anfragen werden abgebrochen, wenn weitergetippt wird.
//
// Vollstaendige deutsche Adressen offline vorzuhalten waere keine Alternative:
// der Datensatz liegt im Gigabyte-Bereich. Fuer PLZ und Ort allein braucht es
// den Dienst nicht - die stecken in data/plzData.js.

const ENDPUNKT = "https://photon.komoot.io/api/";
export const MIN_ZEICHEN = 3;

// Mittelpunkt Deutschlands als Gewichtung, damit gleichnamige Orte im Ausland
// nicht nach oben rutschen.
const BIAS = { lat: 51.16, lon: 10.45 };

function bezeichnung(p) {
  const strasse = [p.street || p.name, p.housenumber].filter(Boolean).join(" ");
  const ort = [p.postcode, p.city || p.county].filter(Boolean).join(" ");
  return { strasse, ort, voll: [strasse, ort].filter(Boolean).join(", ") };
}

// Photon liefert das Bundesland als Klartext ("Baden-Württemberg"); der
// Formular-State erwartet das Kuerzel. Die Zuordnung kommt vom Aufrufer, der
// BL_N ohnehin importiert hat.
export function kuerzelFuerBundesland(name, blNamen) {
  if (!name) return "";
  const treffer = Object.entries(blNamen).find(
    ([, voll]) => voll.toLowerCase() === String(name).toLowerCase(),
  );
  return treffer ? treffer[0] : "";
}

/**
 * Sucht Adressen. Wirft "abgebrochen", wenn das Signal ausgeloest wurde -
 * der Aufrufer soll das ignorieren, es ist kein Fehler.
 *
 * @param {string} text  Eingabe des Nutzers
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array>} Treffer mit strasse, hausnummer, plz, ort, bundesland, lat, lon
 */
export async function sucheAdressen(text, signal) {
  const q = String(text || "").trim();
  if (q.length < MIN_ZEICHEN) return [];

  const url = `${ENDPUNKT}?q=${encodeURIComponent(q)}&lang=de&limit=6&lat=${BIAS.lat}&lon=${BIAS.lon}`;
  const antwort = await fetch(url, { signal });
  if (!antwort.ok) throw new Error(`photon_${antwort.status}`);
  const daten = await antwort.json();

  return (daten.features || [])
    // Nur Deutschland - die App rechnet mit deutschem Steuer- und Mietrecht.
    .filter((f) => (f.properties?.countrycode || "DE") === "DE")
    .map((f) => {
      const p = f.properties || {};
      const [lon, lat] = f.geometry?.coordinates || [];
      const b = bezeichnung(p);
      return {
        id: `${p.osm_type || ""}${p.osm_id || ""}-${lat},${lon}`,
        strasse: p.street || p.name || "",
        hausnummer: p.housenumber || "",
        plz: p.postcode || "",
        ort: p.city || p.county || "",
        bundeslandName: p.state || "",
        lat,
        lon,
        anzeige: b.voll || p.name || q,
        zeile1: b.strasse || p.name || "",
        zeile2: b.ort,
      };
    })
    .filter((t) => t.lat != null && t.lon != null && (t.zeile1 || t.zeile2));
}
