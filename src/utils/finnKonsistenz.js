// Konsistenz-Engine und Red-Flag-Radar der Finn-Exposé-Analyse.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 4.
//
// Alle Regeln sind deterministisch - kein zweiter KI-Call. Grundlage ist das
// bereits extrahierte Ergebnis von /api/expose-extract, insbesondere das
// `abweichungen`-Array (Widersprueche mit beiden Fundstellen).
//
// Zwei Auflagen aus dem Regelwerk der Spec, die den Ton jeder Formulierung
// hier bestimmen:
//   GR-02  neutral und sachlich, nie wertend oder anklagend gegenueber dem
//          Anbieter ("im Exposé unterschiedlich angegeben", nicht "falsche
//          Angabe"). Wird in finnKonsistenz.test.js gegen eine Wortliste
//          geprueft.
//   GR-03  keine Angemessenheits-Urteile ohne Referenzdatenbasis. Werte werden
//          angezeigt und zur Klaerung vorgeschlagen, nicht als "zu hoch" oder
//          "zu niedrig" bewertet.

import { fmt, fmtE } from "./helpers.js";

// Toleranzen, bewusst benannt statt inline: K3 und K4 vergleichen Zahlen, die
// im Expose gerundet stehen - ohne Toleranz feuert jede Rundung ein Finding.
const QM_PREIS_TOLERANZ = 0.02; // 2 %
const GESAMTPREIS_TOLERANZ = 0.01; // 1 %

// K5: aeltere Anlagen sind der Grund fuer die GEG-Frage. Oberhalb davon ist die
// Heizung juenger als jede Austauschpflicht-Diskussion.
const HEIZUNG_PRUEFEN_AB_BAUJAHR = 2000;
// K7: vor Baujahr 1995 ist eine Klasse besser als C ohne Sanierungshinweis
// erklaerungsbeduerftig - nicht falsch, aber nachfragenswert.
const ENERGIEKLASSE_PLAUSIBEL_AB_BAUJAHR = 1995;
const GUTE_ENERGIEKLASSEN = ["A+", "A", "B"];

const SANIERUNGS_HINWEISE = /saniert|sanierung|modernisiert|modernisierung|kernsaniert/i;
const STELLPLATZ_INKLUSIVE =
  /(?:im\s+kaufpreis\s+(?:enthalten|inbegriffen|inkludiert)|inklusive[m]?\s+(?:tiefgaragen|garagen|au(?:ss|ß)en)?stellplatz|stellplatz\s+inklusive)/i;

const zahl = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function beschreibungsText(ergebnis) {
  return [ergebnis?.kontext?.objektbeschreibung, ergebnis?.kontext?.lagebeschreibung]
    .filter(Boolean)
    .join("\n");
}

function findeAbweichung(ergebnis, feld) {
  return (ergebnis?.abweichungen ?? []).find((a) => a.feld === feld) ?? null;
}

// ── Regeln ──────────────────────────────────────────────────────────────────
// Jede Regel bekommt (ergebnis, realpreis) und liefert ein Finding oder null.

// K1 - Der Stellplatz ist separat bepreist, der Fliesstext nennt ihn aber als
// im Kaufpreis enthalten. Teuerster Einzelfund im Murr-Referenzexpose.
function k1Stellplatz(ergebnis) {
  const preis = zahl(ergebnis?.objekt?.stellplatz_kaufpreis);
  if (!preis || preis <= 0) return null;

  const abw = findeAbweichung(ergebnis, "stellplatz_kaufpreis");
  const textWiderspruch = STELLPLATZ_INKLUSIVE.test(beschreibungsText(ergebnis));
  if (!abw && !textWiderspruch) return null;

  const quellen = abw ? [abw.quelle_a, abw.quelle_b] : ["Objektbeschreibung", "Eckdaten-Tabelle"];
  return {
    id: "K1_stellplatz",
    severity: "critical",
    impactEur: preis,
    text: `Das Exposé beschreibt den Stellplatz an einer Stelle als im Kaufpreis enthalten, weist ihn an anderer Stelle mit ${fmtE(preis)} zusätzlich aus. Vor einem Angebot klären, was gilt.`,
    quellen,
  };
}

// K2 - Zwei verschiedene Wohnflaechen im selben Dokument. Der Euro-Schaden ist
// die Differenz zum beworbenen Quadratmeterpreis.
function k2Flaeche(ergebnis, realpreis) {
  const abw = findeAbweichung(ergebnis, "wohnflaeche");
  if (!abw) return null;
  if (typeof abw.wert_a !== "number" || typeof abw.wert_b !== "number") return null;

  const groesser = Math.max(abw.wert_a, abw.wert_b);
  const kleiner = Math.min(abw.wert_a, abw.wert_b);
  const differenz = groesser - kleiner;
  if (differenz <= 0) return null;

  const impact = realpreis.qmBeworben !== null ? differenz * realpreis.qmBeworben : null;
  const proQm =
    realpreis.qmBeworben !== null && realpreis.qmReal !== null
      ? ` Effektiv ${fmtE(Math.round(realpreis.qmReal))} statt ${fmtE(Math.round(realpreis.qmBeworben))} pro m².`
      : "";

  return {
    id: "K2_flaeche",
    severity: "critical",
    impactEur: impact,
    text: `Die Wohnfläche ist im Exposé unterschiedlich angegeben: ${fmt(groesser, 2)} m² an einer Stelle, ${fmt(kleiner, 2)} m² an anderer.${proQm} Nach welcher Methode gerechnet wurde, ist zu klären.`,
    quellen: [abw.quelle_a, abw.quelle_b],
  };
}

// K3 - Der im Expose genannte Quadratmeterpreis passt nicht zu Kaufpreis
// geteilt durch Flaeche. Meist ein Hinweis darauf, dass er auf einer dritten,
// gar nicht genannten Flaeche beruht.
function k3QmPreis(ergebnis, realpreis) {
  const genannt = zahl(ergebnis?.objekt?.kaufpreis_pro_qm);
  if (!genannt || genannt <= 0 || realpreis.qmReal === null) return null;

  const abweichung = Math.abs(genannt - realpreis.qmReal) / realpreis.qmReal;
  if (abweichung <= QM_PREIS_TOLERANZ) return null;

  const impact =
    realpreis.flaecheReal !== null ? Math.abs(genannt - realpreis.qmReal) * realpreis.flaecheReal : null;
  return {
    id: "K3_qm_preis",
    severity: "warning",
    impactEur: impact,
    text: `Der im Exposé genannte Quadratmeterpreis (${fmtE(Math.round(genannt))}) passt nicht zu Kaufpreis geteilt durch Wohnfläche (${fmtE(Math.round(realpreis.qmReal))}). Auf welcher Fläche der Wert beruht, ist zu klären.`,
    quellen: ["Eckdaten-Tabelle"],
  };
}

// K4 - Der genannte Gesamtpreis geht nicht auf.
function k4Gesamtpreis(ergebnis, realpreis) {
  const genannt = zahl(ergebnis?.kosten?.gesamtkosten);
  if (!genannt || genannt <= 0 || realpreis.allIn === null) return null;

  const differenz = Math.abs(genannt - realpreis.allIn);
  if (differenz <= realpreis.allIn * GESAMTPREIS_TOLERANZ) return null;

  return {
    id: "K4_gesamtpreis",
    severity: "warning",
    impactEur: differenz,
    text: `Der im Exposé genannte Gesamtpreis (${fmtE(genannt)}) weicht von Kaufpreis plus Stellplatz (${fmtE(realpreis.allIn)}) ab. Welche Positionen enthalten sind, ist zu klären.`,
    quellen: ["Eckdaten-Tabelle", "Objektbeschreibung"],
  };
}

// K5 - Heizungsalter. Bewusst KEIN Urteil ueber die Anlage (GR-03), sondern
// der Anstoss zur Frage, die im Fragenkatalog als Kern-Frage steht.
function k5Heizung(ergebnis) {
  const baujahr = zahl(ergebnis?.objekt?.baujahr);
  if (!baujahr || baujahr >= HEIZUNG_PRUEFEN_AB_BAUJAHR) return null;

  const heizung = zahl(ergebnis?.ausstattung?.baujahr_waermeerzeuger);
  if (heizung !== null && heizung !== baujahr) return null;

  const text =
    heizung === null
      ? `Das Exposé nennt kein eigenes Baujahr für den Wärmeerzeuger. Bei Gebäudebaujahr ${baujahr} ist das Alter der Heizung und eine mögliche Austauschpflicht nach dem Gebäudeenergiegesetz vor Ort zu klären.`
      : `Wärmeerzeuger und Gebäude haben dasselbe Baujahr (${baujahr}). Alter, Wartungsstand und eine mögliche Austauschpflicht nach dem Gebäudeenergiegesetz sind zu klären.`;

  return { id: "K5_heizung", severity: "warning", impactEur: null, text, quellen: ["Eckdaten-Tabelle"] };
}

// K6 - Verbrauchs- statt Bedarfsausweis. Formulierung aus dem freigegebenen
// Prototyp-Handout uebernommen.
function k6Ausweis(ergebnis) {
  const typ = ergebnis?.energie?.energieausweistyp;
  if (typeof typ !== "string" || !/verbrauch/i.test(typ)) return null;

  return {
    id: "K6_ausweis",
    severity: "info",
    impactEur: null,
    text: "Der Energieausweis ist ein Verbrauchsausweis, kein Bedarfsausweis — abhängig vom Heizverhalten der Vormieter und damit weniger belastbar für die eigene Kalkulation.",
    quellen: ["Eckdaten-Tabelle"],
  };
}

// K7 - Gute Energieklasse bei altem Baujahr ohne Sanierungshinweis im Text.
function k7Energieklasse(ergebnis) {
  const baujahr = zahl(ergebnis?.objekt?.baujahr);
  const klasse = ergebnis?.energie?.energieeffizienzklasse;
  if (!baujahr || baujahr >= ENERGIEKLASSE_PLAUSIBEL_AB_BAUJAHR) return null;
  if (typeof klasse !== "string" || !GUTE_ENERGIEKLASSEN.includes(klasse.trim().toUpperCase())) {
    return null;
  }
  if (SANIERUNGS_HINWEISE.test(beschreibungsText(ergebnis))) return null;

  return {
    id: "K7_energieklasse",
    severity: "info",
    impactEur: null,
    text: `Energieeffizienzklasse ${klasse} bei Baujahr ${baujahr}, ohne dass das Exposé eine Sanierung nennt. Welche Maßnahmen dahinterstehen, ist zu klären.`,
    quellen: ["Eckdaten-Tabelle"],
  };
}

const REGELN = [k1Stellplatz, k2Flaeche, k3QmPreis, k4Gesamtpreis, k5Heizung, k6Ausweis, k7Energieklasse];

// ── Red-Flag-Radar ──────────────────────────────────────────────────────────

const SEVERITY_RANG = { critical: 0, warning: 1, info: 2 };

// Sortierung nach finanzieller Relevanz, nicht nach Fundort im Dokument
// (Spec v1, Abschnitt 5, Baustein 4): erst alles mit Euro-Betrag absteigend,
// danach der Rest nach Schweregrad, bei Gleichstand stabil nach Regel-ID.
export function sortiereFindings(findings) {
  return [...findings].sort((a, b) => {
    const aHat = a.impactEur !== null && a.impactEur !== undefined;
    const bHat = b.impactEur !== null && b.impactEur !== undefined;
    if (aHat && bHat) return b.impactEur - a.impactEur;
    if (aHat !== bHat) return aHat ? -1 : 1;
    const rang = SEVERITY_RANG[a.severity] - SEVERITY_RANG[b.severity];
    return rang !== 0 ? rang : a.id.localeCompare(b.id);
  });
}

export function pruefeKonsistenz(ergebnis, realpreis) {
  const findings = REGELN.map((regel) => regel(ergebnis, realpreis)).filter(Boolean);
  return sortiereFindings(findings);
}

// Verdict-Score 1..5 (5 = unauffaellig). Bewusst simpel und nachvollziehbar:
// eine feinere Gewichtung wuerde eine Kalibrierungsbasis voraussetzen, die es
// noch nicht gibt (Spec v1, Abschnitt 15, offene Frage zur Schweregrad-Basis).
const ABZUG = { critical: 1, warning: 0.5, info: 0.25 };

export function berechneVerdict(findings) {
  const roh = findings.reduce((score, f) => score - (ABZUG[f.severity] ?? 0), 5);
  const score = Math.max(1, Math.round(roh * 10) / 10);
  const label =
    score >= 4.5
      ? "Unauffällig"
      : score >= 3.5
        ? "Einzelne Punkte klären"
        : score >= 2.5
          ? "Verhandeln vor Zusage"
          : "Genauer prüfen";
  return { score, label };
}
