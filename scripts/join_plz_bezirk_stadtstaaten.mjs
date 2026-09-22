// Ergaenzt public/plz-kreis.txt um Berlin (12 Bezirke) und Hamburg (7 Bezirke) -
// Backlog Objektseiten-Baustein "Vergleich/Benchmark" (2026-09-22).
//
// Warum ein eigenes Skript statt build_plz_kreis.mjs zu erweitern: OpenPLZ
// (Quelle von build_plz_kreis.mjs) fuehrt Berlin und Hamburg amtlich je als
// EINEN "Kreisfreie Stadt"-Distrikt ohne Bezirks-Ebene - die dort erzeugte
// Datei kann diese Staedte grundsaetzlich nicht auf Bezirksebene aufloesen.
// regionalpreise.json fuehrt Berlin/Hamburg aber bereits auf Bezirksebene
// (12 bzw. 7 Eintraege), die ohne Bezirks-Zuordnung ungenutzt blieben - alle
// Berlin/Hamburg-Objekte fielen bislang auf den Landesdurchschnitt zurueck.
//
// Weder OpenPLZ noch eine frei verfuegbare Tabelle liefert PLZ->Bezirk
// eindeutig (PLZ- und Bezirksgrenzen ueberschneiden sich real, siehe
// build_plz_kreis.mjs's eigener Kommentar zu Kollisionen). Deshalb hier ein
// raeumlicher Abgleich: Flaechenschwerpunkt (Centroid) des groessten Teils
// jedes PLZ-Polygons gegen die 12+7 Bezirks-Polygone - dieselbe Naeherung,
// die die bestehende Kreis-Zuordnung an ihren eigenen Grenzen ohnehin in
// Kauf nimmt, hier nur explizit statt implizit.
//
// Quellen (amtliche Geodaten, direkt abgefragt, kein Download von Dritten):
//   - Berlin PLZ: gdi.berlin.de/services/wfs/postleitzahlen
//     (Amt fuer Statistik Berlin-Brandenburg, CC-BY-3.0)
//   - Berlin Bezirke: gdi.berlin.de/services/wfs/alkis_bezirke
//   - Hamburg PLZ: geodienste.hamburg.de/HH_WFS_Postleitzahlen
//     (Landesbetrieb Geoinformation und Vermessung Hamburg, DL-DE-BY-2.0)
//   - Hamburg Bezirke: geodienste.hamburg.de/HH_WFS_Verwaltungsgrenzen (app:bezirke)
//
// Bekannte Grenze: die Ziel-Bezirksnamen sind hart auf die Schreibweise in
// regionalpreise.json gemappt (BE_ZIELNAMEN/HH_ZIELNAMEN unten) - aendert
// sich dort ein Kreisname, muss die Tabelle hier nachgezogen werden, sonst
// findet findRegionalPreis() (regionalpreis.js) den Eintrag nicht mehr.
//
// Einmalig auszufuehren: node scripts/join_plz_bezirk_stadtstaaten.mjs

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(__dirname, "..", "public", "plz-kreis.txt");
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)" };

// ── Geometrie-Hilfsfunktionen (Shoelace-Formel, Ray-Casting Even-Odd) ───────
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return a / 2;
}
function ringCentroid(ring) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const f = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
    a += f;
  }
  a *= 0.5;
  return a === 0 ? ring[0] : [cx / (6 * a), cy / (6 * a)];
}
// Schwerpunkt des GROESSTEN Teils eines MultiPolygons - relevant fuer PLZ mit
// abgetrennten Exklaven, damit nicht die kleinere Nebenflaeche zaehlt.
function hauptSchwerpunkt(multiPolyCoords) {
  let beste = null, besteFlaeche = -1;
  for (const poly of multiPolyCoords) {
    const flaeche = Math.abs(ringArea(poly[0]));
    if (flaeche > besteFlaeche) {
      besteFlaeche = flaeche;
      beste = ringCentroid(poly[0]);
    }
  }
  return beste;
}
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    const schneidet = yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (schneidet) inside = !inside;
  }
  return inside;
}
function pointInPolygon(pt, rings) {
  let inside = pointInRing(pt, rings[0]);
  for (let k = 1; k < rings.length; k++) if (pointInRing(pt, rings[k])) inside = !inside;
  return inside;
}
function pointInMultiPolygon(pt, multiPolyCoords) {
  for (const poly of multiPolyCoords) if (pointInPolygon(pt, poly)) return true;
  return false;
}
function dist2(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}
// Faellt nur bei einem Centroid exakt auf einer Grenzlinie zurueck (Randfall) -
// dann naechstgelegener Bezirks-Schwerpunkt statt "kein Treffer".
function findeBezirk(centroid, bezirke) {
  for (const b of bezirke) if (pointInMultiPolygon(centroid, b.coords)) return b.name;
  let beste = null, besterAbstand = Infinity;
  for (const b of bezirke) {
    const d = dist2(centroid, hauptSchwerpunkt(b.coords));
    if (d < besterAbstand) {
      besterAbstand = d;
      beste = b.name;
    }
  }
  return beste;
}

// ── WFS-Abruf ────────────────────────────────────────────────────────────
async function holeGeoJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}
function alsBezirke(geojson, nameFeld) {
  return geojson.features.map((f) => ({
    name: f.properties[nameFeld],
    coords: f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates],
  }));
}
function alsPlzZuordnung(geojson, plzFeld, bezirke, zielnamen) {
  const ergebnis = [];
  for (const f of geojson.features) {
    const plz = String(f.properties[plzFeld]).padStart(5, "0");
    const multi = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const roh = findeBezirk(hauptSchwerpunkt(multi), bezirke);
    ergebnis.push({ plz, bezirk: zielnamen[roh] || roh });
  }
  return ergebnis;
}

// Muss exakt zu den Kreisnamen in public/regionalpreise.json passen.
const BE_ZIELNAMEN = {
  Mitte: "Mitte (Bezirk)",
  "Friedrichshain-Kreuzberg": "Friedrichshain-Kreuzberg",
  Pankow: "Pankow (Bezirk)",
  "Charlottenburg-Wilmersdorf": "Charlottenburg-Wilmersdorf",
  Spandau: "Spandau (Bezirk)",
  "Steglitz-Zehlendorf": "Steglitz-Zehlendorf",
  "Tempelhof-Schöneberg": "Tempelhof-Schöneberg",
  Neukölln: "Neukölln (Bezirk)",
  "Treptow-Köpenick": "Treptow-Köpenick",
  "Marzahn-Hellersdorf": "Marzahn-Hellersdorf",
  Lichtenberg: "Lichtenberg (Bezirk)",
  Reinickendorf: "Reinickendorf (Bezirk)",
};
const HH_ZIELNAMEN = {
  "Hamburg-Mitte": "Hamburg-Mitte",
  Altona: "Altona",
  Eimsbüttel: "Eimsbüttel (Bezirk)",
  "Hamburg-Nord": "Hamburg-Nord",
  Wandsbek: "Wandsbek (Bezirk)",
  Bergedorf: "Bergedorf (Bezirk)",
  Harburg: "Harburg (Bezirk)",
};

function to36(n) {
  return n < 0 ? "-" + Math.abs(n).toString(36) : n.toString(36);
}
function d36(s) {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}
function dekodiere(text) {
  const { kreise, zuordnung } = JSON.parse(text);
  const map = new Map();
  let plz = 0;
  for (const eintrag of zuordnung.split("|")) {
    if (!eintrag) continue;
    const komma = eintrag.indexOf(",");
    plz += d36(eintrag.slice(0, komma));
    const idx = d36(eintrag.slice(komma + 1));
    if (kreise[idx]) map.set(String(plz).padStart(5, "0"), kreise[idx]);
  }
  return { kreise, map };
}

async function main() {
  console.log("Lade Berlin/Hamburg Geodaten ...");
  const [bePlzGeo, beBezirkeGeo, hhPlzGeo, hhBezirkeGeo] = await Promise.all([
    holeGeoJson(
      "https://gdi.berlin.de/services/wfs/postleitzahlen?service=WFS&version=2.0.0&request=GetFeature&typeNames=postleitzahlen:postleitzahlen&outputFormat=application/json",
    ),
    holeGeoJson(
      "https://gdi.berlin.de/services/wfs/alkis_bezirke?service=WFS&version=2.0.0&request=GetFeature&typeNames=alkis_bezirke:bezirksgrenzen&outputFormat=application/json",
    ),
    holeGeoJson(
      "https://geodienste.hamburg.de/HH_WFS_Postleitzahlen?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typeNames=de.hh.up:postleitzahlen&outputFormat=application/geo%2Bjson",
    ),
    holeGeoJson(
      "https://geodienste.hamburg.de/HH_WFS_Verwaltungsgrenzen?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typeNames=app:bezirke&outputFormat=application/geo%2Bjson",
    ),
  ]);

  const beBezirke = alsBezirke(beBezirkeGeo, "namgem");
  const hhBezirke = alsBezirke(hhBezirkeGeo, "bezirk_name");
  console.log(`  Berlin: ${bePlzGeo.features.length} PLZ, ${beBezirke.length} Bezirke`);
  console.log(`  Hamburg: ${hhPlzGeo.features.length} PLZ, ${hhBezirke.length} Bezirke`);

  const bePlz = alsPlzZuordnung(bePlzGeo, "plz", beBezirke, BE_ZIELNAMEN);
  const hhPlz = alsPlzZuordnung(hhPlzGeo, "plz", hhBezirke, HH_ZIELNAMEN);

  console.log("\nLade bestehende plz-kreis.txt ...");
  const { kreise, map } = dekodiere(readFileSync(ZIEL, "utf-8"));
  console.log(`  ${kreise.length} Kreise, ${map.size} PLZ`);

  const kreisIndex = new Map(kreise.map((n, i) => [n, i]));
  const kreisNamen = [...kreise];
  let neu = 0, aktualisiert = 0;
  for (const { plz, bezirk } of [...bePlz, ...hhPlz]) {
    if (!kreisIndex.has(bezirk)) {
      kreisIndex.set(bezirk, kreisNamen.length);
      kreisNamen.push(bezirk);
    }
    if (map.has(plz)) aktualisiert++;
    else neu++;
    map.set(plz, bezirk);
  }
  console.log(`\n${neu} PLZ neu, ${aktualisiert} vorhandene auf Bezirksebene praezisiert.`);

  const teile = [];
  let vorher = 0;
  for (const plz of [...map.keys()].sort()) {
    const plzNum = Number(plz);
    teile.push(`${to36(plzNum - vorher)},${to36(kreisIndex.get(map.get(plz)))}`);
    vorher = plzNum;
  }
  const ausgabe = JSON.stringify({ kreise: kreisNamen, zuordnung: teile.join("|") });
  writeFileSync(ZIEL, ausgabe, "utf-8");
  console.log(`\n${ZIEL} aktualisiert: ${kreisNamen.length} Kreise, ${map.size} PLZ, ${(ausgabe.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
