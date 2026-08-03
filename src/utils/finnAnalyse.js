// Orchestrator der Finn-Exposé-Analyse.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitte 2 und 3.
//
// Nimmt das fertige Extraktionsergebnis von /api/expose-extract und macht
// daraus das Handout-Datenobjekt. Rein rechnerisch, keine I/O, kein zweiter
// KI-Call - Laufzeit deutlich unter 50 ms, deshalb ohne Cache (NF-01).
//
// Einzige oeffentliche Funktion nach aussen: analysiereExpose().

import { berechneRealpreis, bauePreistabelle } from "./finnRealpreis.js";
import { pruefeKonsistenz, berechneVerdict } from "./finnKonsistenz.js";
import {
  gleicheKatalogAb,
  ermittleObjekttyp,
  istVermietet,
  formatiereStockwerk,
} from "./finnAbgleich.js";
import { fmt } from "./helpers.js";

// Ohne Kaufpreis UND ohne Wohnflaeche traegt kein einziger Baustein des
// Handouts: keine Preistabelle, kein Euro-Impact, keine Rendite. Dann lieber
// gar kein Handout als eines aus lauter Leerstellen. Ersetzt den Status
// `failed_no_text_layer` aus v1 - die Erkennung "kein Text-Layer" liegt bereits
// beim Worker, hier zaehlt nur, ob genug Substanz angekommen ist.
function istAuswertbar(ergebnis) {
  const kp = ergebnis?.objekt?.kaufpreis;
  const fl = ergebnis?.objekt?.wohnflaeche;
  return Boolean(kp) || Boolean(fl);
}

function baueTitel(ergebnis, realpreis) {
  const o = ergebnis?.objekt ?? {};
  const teile = [];
  if (o.zimmer) teile.push(`${fmt(o.zimmer, 0)}-Zimmer-${objektKurz(ergebnis)}`);
  else teile.push(objektKurz(ergebnis));
  if (o.baujahr) teile.push(`Baujahr ${o.baujahr}`);
  const stockwerk = formatiereStockwerk(o.stockwerk);
  if (stockwerk) teile.push(stockwerk);
  if (realpreis.flaecheReal !== null) teile.push(`ca. ${fmt(realpreis.flaecheReal, 2)} m²`);
  return teile.join(", ");
}

function objektKurz(ergebnis) {
  return ermittleObjekttyp(ergebnis) === "Haus" ? "Haus" : "ETW";
}

function baueAdresse(ergebnis) {
  const o = ergebnis?.objekt ?? {};
  const strasse = [o.strasse, o.hausnummer].filter(Boolean).join(" ");
  const ort = [o.plz, o.ort].filter(Boolean).join(" ");
  return [strasse, ort].filter(Boolean).join(", ");
}

// Wie viele Findings das Handout zeigt. Mehr als fuenf sind vor einem Termin
// nicht mehr merkbar und verwaessern die Priorisierung (Spec v1, Ziel 1).
export const MAX_FINDINGS = 5;

/**
 * @param {object} ergebnis - ExposeExtractResponse aus /api/expose-extract
 * @returns {object|null} FinnAnalysis, oder null wenn nicht auswertbar
 */
export function analysiereExpose(ergebnis) {
  if (!ergebnis || !istAuswertbar(ergebnis)) return null;

  const objekttyp = ermittleObjekttyp(ergebnis);
  const vermietet = istVermietet(ergebnis);
  const realpreis = berechneRealpreis(ergebnis);

  const alleFindings = pruefeKonsistenz(ergebnis, realpreis);
  const findings = alleFindings.slice(0, MAX_FINDINGS);

  // Verdict bewusst ueber ALLE Findings, nicht nur die angezeigten fuenf:
  // sonst waere ein Expose mit acht Auffaelligkeiten genauso bewertet wie eines
  // mit fuenf.
  const verdict = berechneVerdict(alleFindings);

  const { checkliste, bekannt, vorauswahl } = gleicheKatalogAb(ergebnis, {
    objekttyp,
    vermietet,
    realpreis,
    findings: alleFindings,
  });

  return {
    status: "ok",
    titel: baueTitel(ergebnis, realpreis),
    adresse: baueAdresse(ergebnis),
    objekttyp,
    vermietet,
    verdictScore: verdict.score,
    verdictLabel: verdict.label,
    findings,
    findingsGesamt: alleFindings.length,
    realpreis,
    preistabelle: bauePreistabelle(realpreis),
    bekannt,
    checkliste,
    vorauswahl,
    erstelltAm: new Date().toISOString(),
  };
}
