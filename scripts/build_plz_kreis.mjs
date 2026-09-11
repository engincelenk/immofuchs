// Erzeugt public/plz-kreis.txt: PLZ -> Landkreis-/Stadtkreis-Name.
//
// Warum ueberhaupt noetig (Backlog Punkt 4, 2026-09-11, Nutzer-Befund): die
// Regionaldaten (regionalpreis.js) matchen bisher nur exakt auf den
// getippten Ortsnamen, sonst faellt die App auf den Landesdurchschnitt
// zurueck. Bei einer kleinen Gemeinde, die selbst kein Kreis ist (z. B. PLZ
// 74385 -> Pleidelsheim), gibt es so nie einen Kreistreffer, obwohl
// Pleidelsheim zum Landkreis Ludwigsburg gehoert, der in den Datenblaettern
// steht. Diese Datei loest genau das: PLZ -> amtlicher Kreisname, als
// zweite Matching-Stufe VOR dem Bundesland-Fallback (siehe
// findRegionalPreis() in regionalpreis.js).
//
// Quelle: OpenPLZ API (https://www.openplzapi.org/, https://github.com/
// openpotato/openplzapi), oeffentlich, ohne Schluessel, deckt alle 16
// Bundeslaender/294 Kreise amtlich ab (Destatis/BKG-Gebietsstand). Bewusst
// als statische Datei statt Laufzeit-Abfrage - dieselbe Begruendung wie bei
// jeder anderen Datei in public/: kein Request je Objekt, kein
// Datenabfluss, funktioniert offline.
//
// Format wie miete-referenz.txt: Base36, "|"-getrennte Eintraege, PLZ als
// Differenz zum Vorgaenger. Der WERT ist hier aber kein Zahlenwert, sondern
// ein Index in ein Kreisnamen-Woerterbuch (kreise[]) - bei ~294 Kreisen auf
// >10.000 PLZ waere der Klartextname je Eintrag reine Wiederholung.
//
// Bekannte Grenze (bewusst dokumentiert statt versteckt): einzelne Staedte
// und ihr gleichnamiger, aber separater Landkreis (z. B. Kassel Stadt vs.
// Landkreis Kassel, Muenchen Stadt vs. Landkreis Muenchen) fuehren nach der
// Bereinigung unten zum selben Namen wie die kreisfreie Stadt. Das ist eine
// Ausnahme bei einer niedrigen einstelligen Zahl von Faellen deutschlandweit
// und betrifft nur diese zweite, ohnehin nachrangige Matching-Stufe (erst
// greift sie, wenn der exakte Ortsname NICHT direkt in den Datenblaettern
// steht) - keine Scheingenauigkeit vortaeuschen, aber auch keinen Blocker
// fuer den ueberwiegenden Regelfall (kleine Gemeinde -> ihr Landkreis).
//
// Einmalig auszufuehren (Kreisgrenzen aendern sich praktisch nie):
//   node scripts/build_plz_kreis.mjs

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.join(__dirname, "..", "public", "plz-kreis.txt");

const BASIS = "https://openplzapi.org/de";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)" };
const SEITENGROESSE = 50;
const PAUSE_MS = 80;

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function holeJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function holeAlleSeiten(basisUrl) {
  const erste = await fetch(`${basisUrl}${basisUrl.includes("?") ? "&" : "?"}page=1&pageSize=${SEITENGROESSE}`, {
    headers: HEADERS,
  });
  if (!erste.ok) throw new Error(`${basisUrl} -> ${erste.status}`);
  const gesamtSeiten = Number(erste.headers.get("x-total-pages") || "1");
  const ergebnis = await erste.json();
  for (let seite = 2; seite <= gesamtSeiten; seite++) {
    await warte(PAUSE_MS);
    const teil = await holeJson(
      `${basisUrl}${basisUrl.includes("?") ? "&" : "?"}page=${seite}&pageSize=${SEITENGROESSE}`,
    );
    ergebnis.push(...teil);
  }
  return ergebnis;
}

// Entfernt den Typ-/Ehrentitel-Zusatz nach dem ersten Komma
// ("Kiel, Landeshauptstadt" -> "Kiel", "Solingen, Klingenstadt" ->
// "Solingen"), damit der Name so weit wie moeglich der Form entspricht, die
// auch in den Datenblaettern verwendet wird (siehe normalisiere() in
// regionalpreis.js, das zusaetzlich "(Kreis)"/"(Bezirk)"-Klammerzusaetze
// strippt). Landkreise kommen von der API OHNE Komma ("Böblingen"), nur
// kreisfreie Staedte haengen einen - und zwar sehr unterschiedlichen -
// Ehrentitel an ("Stadt", "Hansestadt", "Wissenschaftsstadt", "Stadt der
// FernUniversität", ...). Eine feste Liste dieser Titel zu pflegen waere
// nie vollstaendig; "alles vor dem ersten Komma" ist robuster.
function bereinigeKreisname(name) {
  const roh = String(name || "").trim();
  const komma = roh.indexOf(",");
  return (komma < 0 ? roh : roh.slice(0, komma)).trim();
}

async function main() {
  console.log("Lade Bundeslaender ...");
  const laender = await holeJson(`${BASIS}/FederalStates`);
  console.log(`  ${laender.length} Bundeslaender`);

  const kreisIndex = new Map(); // bereinigter Name -> Index
  const kreisNamen = [];
  const plzZuKreis = new Map(); // PLZ (number) -> Index

  for (const land of laender) {
    console.log(`Lade Kreise fuer ${land.name} ...`);
    const kreise = await holeAlleSeiten(`${BASIS}/FederalStates/${land.key}/Districts`);
    console.log(`  ${kreise.length} Kreise`);

    // Namenskollision VOR dem Zuordnen aufloesen, unabhaengig von der
    // Reihenfolge der API-Antwort (Backlog Punkt 4, Nachbesserung): einige
    // kreisfreie Staedte haben einen separaten, gleichnamigen Landkreis
    // (z.B. Stadt Muenchen und Landkreis Muenchen, Stadt Kassel und
    // Landkreis Kassel). Ohne Unterscheidung wuerden PLZ des Landkreises auf
    // denselben Index wie die Stadt zeigen - falsche Kaufpreis-/Mietwerte.
    // Die kreisfreie Stadt behaelt den bloßen Namen (das ist die ueblichere
    // Bedeutung), der Landkreis bekommt "(Landkreis)" angehaengt - NUR bei
    // einer echten Kollision, der weit ueberwiegende Rest bleibt
    // unveraendert. normalisiere() in regionalpreis.js strippt
    // "(Kreis)"/"(Bezirk)", NICHT "(Landkreis)" - der Zusatz bleibt beim
    // Abgleich mit den Datenblaettern also erhalten, statt erneut mit der
    // Stadt zu kollidieren.
    const nachBasisname = new Map();
    for (const kreis of kreise) {
      const basisname = bereinigeKreisname(kreis.name);
      if (!nachBasisname.has(basisname)) nachBasisname.set(basisname, []);
      nachBasisname.get(basisname).push(kreis);
    }
    const finalerName = new Map(); // kreis.key -> finaler Name
    for (const [basisname, gruppe] of nachBasisname) {
      if (gruppe.length === 1) {
        finalerName.set(gruppe[0].key, basisname);
        continue;
      }
      for (const kreis of gruppe) {
        finalerName.set(
          kreis.key,
          kreis.type === "Landkreis" ? `${basisname} (Landkreis)` : basisname,
        );
      }
    }

    for (const kreis of kreise) {
      await warte(PAUSE_MS);
      const name = finalerName.get(kreis.key);
      if (!kreisIndex.has(name)) {
        kreisIndex.set(name, kreisNamen.length);
        kreisNamen.push(name);
      }
      const idx = kreisIndex.get(name);

      const orte = await holeAlleSeiten(`${BASIS}/Districts/${kreis.key}/Localities`);
      for (const ort of orte) {
        const plz = Number(ort.postalCode);
        if (!Number.isFinite(plz)) continue;
        // Ueberschreiben bewusst erlaubt statt strikt: die seltenen PLZ, die
        // tatsaechlich zwei Kreise beruehren, bekommen so den zuletzt
        // gesehenen (nicht garantiert "richtigen") Kreis - besser ein
        // plausibler Treffer als gar keiner, und die erste Matching-Stufe
        // (exakter Ortsname) faengt den ueberwiegenden Teil ohnehin vorher ab.
        plzZuKreis.set(plz, idx);
      }
    }
  }

  console.log(`\n${kreisNamen.length} unterschiedliche Kreisnamen, ${plzZuKreis.size} PLZ zugeordnet.`);

  const teile = [];
  let vorher = 0;
  for (const plz of [...plzZuKreis.keys()].sort((a, b) => a - b)) {
    const d = plz - vorher;
    vorher = plz;
    teile.push(`${to36(d)},${to36(plzZuKreis.get(plz))}`);
  }

  const ausgabe = JSON.stringify({ kreise: kreisNamen, zuordnung: teile.join("|") });
  writeFileSync(ZIEL, ausgabe, "utf-8");
  console.log(`\n${ZIEL}\n  ${(ausgabe.length / 1024).toFixed(1)} KB`);

  const beispiele = [74385, 80331, 10115];
  console.log("\nStichprobe:");
  for (const plz of beispiele) {
    const idx = plzZuKreis.get(plz);
    console.log(`  ${plz}: ${idx != null ? kreisNamen[idx] : "(kein Treffer)"}`);
  }
}

function to36(n) {
  if (n < 0) return "-" + Math.abs(n).toString(36);
  return n.toString(36);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
