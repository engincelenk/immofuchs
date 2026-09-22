// Schliesst Luecken in public/plz-kreis.txt: PLZ aus der eigenen Orte-Liste
// (src/data/plzData.js, PLZ_RAW), die build_plz_kreis.mjs bisher NICHT
// zugeordnet hat (Backlog: Objektseiten-Baustein "Vergleich/Benchmark",
// 2026-09-22). Betrifft ueberwiegend kleine, in Gebietsreformen eingemeindete
// Ortsteile (Sachsen, Sachsen-Anhalt, Thueringen, Brandenburg), die beim
// Kreis->Localities-Durchlauf von build_plz_kreis.mjs nicht auftauchen.
//
// Anders als build_plz_kreis.mjs (fragt je Kreis alle Orte ab) nutzt dieses
// Skript den direkten Endpunkt /de/Localities?postalCode={plz} - liefert pro
// PLZ sofort den Landkreis, ohne die komplette Kreis-Iteration zu wiederholen.
// Nur fuer die Luecken gedacht, kein Ersatz fuer build_plz_kreis.mjs.
//
// Einmalig auszufuehren: node scripts/fill_plz_kreis_gaps.mjs

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(__dirname, "..", "public", "plz-kreis.txt");
const PLZ_DATEN = path.join(__dirname, "..", "src", "data", "plzData.js");

const BASIS = "https://openplzapi.org/de";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)" };
const PAUSE_MS = 80;

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

function to36(n) {
  return n < 0 ? "-" + Math.abs(n).toString(36) : n.toString(36);
}
function d36(s) {
  return s.charCodeAt(0) === 45 ? -parseInt(s.slice(1), 36) : parseInt(s, 36);
}

// Gleiche Bereinigung wie build_plz_kreis.mjs: Ehrentitel nach dem ersten
// Komma abschneiden ("Kiel, Landeshauptstadt" -> "Kiel").
function bereinigeName(name) {
  const roh = String(name || "").trim();
  const komma = roh.indexOf(",");
  return (komma < 0 ? roh : roh.slice(0, komma)).trim();
}

function dekodiere(text) {
  const { kreise, zuordnung } = JSON.parse(text);
  const map = new Map(); // PLZ-String -> Kreisname
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
  return { kreise, map };
}

function liesPlzRaw() {
  const raw = readFileSync(PLZ_DATEN, "utf-8");
  const nachGleich = raw.split("PLZ_RAW =")[1];
  const start = nachGleich.indexOf('"') + 1;
  const text = nachGleich.slice(start).split('";')[0];
  return text
    .split("|")
    .filter(Boolean)
    .map((zeile) => zeile.split(",")[0]);
}

async function holeKreis(plz) {
  const res = await fetch(`${BASIS}/Localities?postalCode=${plz}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`status_${res.status}`);
  const treffer = await res.json();
  if (!Array.isArray(treffer) || treffer.length === 0) return null;
  const d = treffer[0].district;
  if (!d?.name) return null;
  return { name: bereinigeName(d.name), typ: d.type };
}

async function main() {
  console.log("Lade bestehende Zuordnung ...");
  const { kreise, map } = dekodiere(readFileSync(ZIEL, "utf-8"));
  console.log(`  ${kreise.length} Kreise, ${map.size} PLZ bereits zugeordnet`);

  const alleplz = liesPlzRaw();
  const fehlend = [...new Set(alleplz)].filter((p) => !map.has(p)).sort();
  console.log(`  ${fehlend.length} PLZ aus der eigenen Orte-Liste fehlen\n`);

  const kreisIndex = new Map(kreise.map((name, i) => [name, i]));
  const kreisNamen = [...kreise];

  let geloest = 0;
  let ungeloest = [];

  for (const plz of fehlend) {
    let ergebnis;
    try {
      ergebnis = await holeKreis(plz);
    } catch (err) {
      console.log(`  ${plz}: Fehler (${err.message})`);
      ungeloest.push(plz);
      await warte(PAUSE_MS);
      continue;
    }
    if (!ergebnis) {
      console.log(`  ${plz}: kein Treffer`);
      ungeloest.push(plz);
      await warte(PAUSE_MS);
      continue;
    }

    // Gleiche Kollisions-Konvention wie build_plz_kreis.mjs: wenn der
    // bereinigte Name schon als Kreisname existiert, den nehmen. Sonst,
    // falls Typ Landkreis UND der blosse Name in einem anderen Kontext
    // vergeben sein koennte, den "(Landkreis)"-Zusatz probieren, bevor ein
    // komplett neuer Eintrag angelegt wird.
    let finalName = ergebnis.name;
    if (!kreisIndex.has(finalName)) {
      const mitZusatz = `${ergebnis.name} (Landkreis)`;
      if (ergebnis.typ === "Landkreis" && kreisIndex.has(mitZusatz)) {
        finalName = mitZusatz;
      }
    }
    if (!kreisIndex.has(finalName)) {
      kreisIndex.set(finalName, kreisNamen.length);
      kreisNamen.push(finalName);
    }
    map.set(plz, finalName);
    geloest++;
    console.log(`  ${plz}: ${finalName}`);
    await warte(PAUSE_MS);
  }

  console.log(`\n${geloest} geloest, ${ungeloest.length} weiterhin ohne Treffer.`);
  if (ungeloest.length > 0) {
    console.log("Ohne Treffer:", ungeloest.join(", "));
  }

  // Neu kodieren: alle PLZ (alt + neu) sortiert, Delta + Base36.
  const teile = [];
  let vorher = 0;
  for (const plz of [...map.keys()].sort()) {
    const plzNum = Number(plz);
    const delta = plzNum - vorher;
    vorher = plzNum;
    teile.push(`${to36(delta)},${to36(kreisIndex.get(map.get(plz)))}`);
  }

  const ausgabe = JSON.stringify({ kreise: kreisNamen, zuordnung: teile.join("|") });
  writeFileSync(ZIEL, ausgabe, "utf-8");
  console.log(`\n${ZIEL} aktualisiert: ${kreisNamen.length} Kreise, ${map.size} PLZ, ${(ausgabe.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
