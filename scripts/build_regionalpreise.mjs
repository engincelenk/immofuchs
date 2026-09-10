// Erzeugt public/regionalpreise.json aus src/immodata/2026/datenblatter/immodaten.json.
//
// Bewusst eine schlanke Ableitung statt die Quelldatei direkt zu importieren
// (gleiches Muster wie build_miete_referenz.py -> public/miete-referenz.txt):
// kein Aufblaehen des JS-Bundles, on-demand per fetch geladen.
//
// "fakten" (qualitative Standort-Infos, Backlog C.8) sind seit 2026-09-10
// mit dabei - nur auf Bundeslandebene (16 Eintraege, kein Aufblaehen), fuer
// die KI-Begruendung bei Preis-/Hebel-Analyse. Die Kreis-Ebene bekommt
// bewusst keine Fakten: 259 Kreise mit je 3-5 Saetzen waere die Datei
// vielfach groesser, ohne dass es hier gebraucht wird.
//
// Einmalig/jaehrlich auszufuehren, nach jedem manuellen Update von
// immodaten.json (siehe dortige Pflegehinweise):
//   node scripts/build_regionalpreise.mjs

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUELLE = path.join(__dirname, "..", "src", "immodata", "2026", "datenblatter", "immodaten.json");
const ZIEL = path.join(__dirname, "..", "public", "regionalpreise.json");

const daten = JSON.parse(readFileSync(QUELLE, "utf-8"));

const ausgabe = {
  stand: daten.stand,
  bundeslaender: daten.bundeslaender.map((b) => ({
    code: b.code,
    landeswerte: b.landeswerte,
    kreise: b.kreise,
    fakten: b.fakten || [],
  })),
};

writeFileSync(ZIEL, JSON.stringify(ausgabe), "utf-8");
console.log(`public/regionalpreise.json geschrieben (${ausgabe.bundeslaender.length} Bundeslaender).`);
