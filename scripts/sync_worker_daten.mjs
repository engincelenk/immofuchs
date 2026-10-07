// Erzeugt worker/src/data/geodaten.generated.ts aus den Quelldateien in public/.
//
// Warum: plz-kreis.txt und regionalpreise.json wurden bis 2026-10-03 als
// statische Dateien ausgeliefert und liessen sich per Direkt-URL am Stueck
// herunterladen (siehe auch kappungsgrenze.ts, dasselbe Vorgehen). Jetzt
// liegen die Daten im Worker, der immer nur den Ausschnitt fuer EINE PLZ bzw.
// EIN Bundesland herausgibt, mit Rate-Limit je IP (worker/src/routes/daten.ts).
// vite.config.js nimmt die Dateien aus dist/, damit sie nicht mehr
// oeffentlich liegen. public/ bleibt Quelle der Wahrheit fuer die
// Build-Skripte (build_plz_kreis.mjs, build_regionalpreise.mjs, ...).
//
// NACH JEDER DATENPFLEGE an plz-kreis.txt/regionalpreise.json ausfuehren:
//   node scripts/sync_worker_daten.mjs
// und den Worker neu deployen. Ein Test (worker/src/data/geodaten.test.ts)
// schlaegt fehl, wenn die erzeugte Datei hinter public/ zurueckliegt.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const plzKreis = JSON.parse(readFileSync(path.join(wurzel, "public", "plz-kreis.txt"), "utf-8"));
const regional = JSON.parse(readFileSync(path.join(wurzel, "public", "regionalpreise.json"), "utf-8"));

const kopf =
  "// GENERIERT von scripts/sync_worker_daten.mjs - nicht von Hand aendern.\n" +
  "// Quelle: public/plz-kreis.txt und public/regionalpreise.json.\n";
const ausgabe =
  kopf +
  `export const PLZ_KREIS_DATEN: { kreise: string[]; zuordnung: string } = ${JSON.stringify(plzKreis)};\n` +
  `export const REGIONALPREISE_DATEN: { stand: string; bundeslaender: Array<{ code: string } & Record<string, unknown>> } = ${JSON.stringify(regional)};\n`;

writeFileSync(path.join(wurzel, "worker", "src", "data", "geodaten.generated.ts"), ausgabe, "utf-8");
console.log(`geodaten.generated.ts: ${(ausgabe.length / 1024).toFixed(1)} KB`);
