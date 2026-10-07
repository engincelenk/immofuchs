// Bruecke zwischen dem Finn-Fragenkatalog (bislang nur im Expose-Scan
// genutzt, siehe finnAbgleich.js) und einem am Objekt gespeicherten
// Datenobjekt (`data`/`basis` in ObjektDetail.jsx - dieselbe flache Form wie
// `d` im Renditerechner, siehe App.jsx createDefaults()).
//
// Nutzerfeedback zum Besichtigungshandout der AI-Engine (HandoutFragen.jsx):
// "Eckdaten fehlen. Nimm das alte PDF-Funktion und integriere 1:1. Es waren
// auch mehr Checkboxen integriert." Das bezieht sich auf genau das, was
// FinnHandoutPanel.jsx (Expose-Weg) schon kann: gleicheKatalogAb() liefert
// dort die Eckdaten-Spalte ("bekannt") und die 44 Katalogfragen abzueglich der
// bereits beantworteten. Diese Datei macht denselben Aufruf fuer den
// Objekt-Weg lauffaehig, OHNE finnAbgleich.js/finnFragenkatalog.js
// anzufassen: die Resolver dort erwarten die verschachtelte Form des
// Expose-Extraktionsergebnisses (`ergebnis.objekt.*`, `ergebnis.kosten.*`,
// ...) - hier wird nur ein duennes Adapter-Objekt in genau dieser Form gebaut.
//
// Bewusst NUR vier Felder werden uebernommen: kaufpreis, wohnflaeche (=
// `flaeche`), kaltmiete, baujahr. Das sind exakt die Felder, die
// objektKennzahlen.js selbst als tragende "Eckdaten" gewichtet
// (berechneVollstaendigkeit: kaufpreis 20, kaltmiete 20, flaeche 12,
// baujahr 3) und die in ObjektDetail.jsx FELD_GRUPPEN unter "Eckdaten" /
// "Einnahmen" gefuehrt werden. Alle anderen Renditerechner-Felder (garage,
// makler, wohneinheiten, letzteErhDatum, sanIstVerbrauch, ...) tragen in
// App.jsx createDefaults() einen plausiblen, aber generischen Startwert
// (z.B. garage: "20000", makler: "3.57", wohneinheiten: "1") - ein manuell
// angelegtes Objekt, das dieses Feld nie angefasst hat, traegt diesen Wert
// unveraendert weiter. Wuerden sie hier als "bereits bekannt" auftauchen,
// waere das eine erfundene Tatsache statt einer echten - schlimmer als eine
// offene Frage (Fragenkatalog-Philosophie: lieber offen als falsch positiv).
// Die zugehoerigen Katalogfragen (2.4 Maklerprovision, 5.5 Wohneinheiten, 3.1
// vermietet seit, 4.4 Energieausweis, ...) bleiben dadurch "noch zu klaeren" -
// genau wie bei einem Expose, das dazu nichts sagt. Das ist beabsichtigt,
// kein Fehler.

import { gleicheKatalogAb, ermittleObjekttyp } from "./finnAbgleich.js";
import { berechneRealpreis } from "./finnRealpreis.js";

// Der Renditerechner haelt jeden Wert als String, "0" oder ein leeres Feld
// eingeschlossen. Nur endliche, positive Zahlen zaehlen hier als "bekannt" -
// sonst wuerde ein unausgefuelltes oder bewusst auf 0 gesetztes Feld (z.B.
// Kaltmiete 0 = aktuell leerstehend) als falscher Fakt durchgehen.
function positiveZahl(wert) {
  const n = Number(wert);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Der Katalog formuliert seine Antworten fuer den Expose-Weg ("... laut
// Exposé") - am Objekt gibt es kein Dokument, aus dem der Wert stammt, nur
// die eigene Eingabe des Nutzers. Statt die Resolver in finnFragenkatalog.js
// zu verzweigen (und damit den Expose-Weg mitzuaendern, der unveraendert
// bleiben soll), wird die Formulierung hier nachtraeglich neutralisiert.
// Kein \b am Ende: "é" zaehlt in JS-Regex nicht als Wortzeichen, ein
// Wortgrenzen-Anker direkt danach traefe deshalb nie (weder "é" noch das
// Zeilenende/Leerzeichen dahinter sind \w) und die ganze Ersetzung liefe ins
// Leere.
function ohneExposeBezug(text) {
  return typeof text === "string" ? text.replace(/\s*laut Exposé/gi, "") : text;
}

// Baut das Adapter-"ergebnis" in der Form, die die Katalog-Resolver
// erwarten - ausschliesslich aus den vier belastbaren Objektfeldern.
function ergebnisAusObjekt(objekt, data) {
  return {
    objekt: {
      // Einziger Zweck: ermittleObjekttyp() greift auf `objekt.titel` zurueck,
      // um Wohnung/Haus am Objektnamen zu erkennen (z.B. "Reihenhaus
      // Musterstr. 5"). Ohne erkennbaren Hinweis faellt sie auf ETW zurueck -
      // dieselbe bewusste Default-Entscheidung wie im Expose-Weg.
      titel: objekt?.title,
      kaufpreis: positiveZahl(data?.kaufpreis),
      wohnflaeche: positiveZahl(data?.flaeche),
      baujahr: positiveZahl(data?.baujahr),
    },
    kosten: {
      kaltmiete: positiveZahl(data?.kaltmiete),
    },
  };
}

/**
 * Katalogabgleich fuer ein am Objekt gespeichertes Datenobjekt - das
 * Gegenstueck zu gleicheKatalogAb() im Expose-Weg (finnAnalyse.js).
 *
 * @param {{title?: string}} objekt
 * @param {Record<string, unknown>} data flache Rechnerfelder (`basis`/`d`)
 * @returns {{objekttyp: string, checkliste: Array, bekannt: Array, vorauswahl: string[]}}
 */
export function katalogFuerObjekt(objekt, data) {
  const ergebnis = ergebnisAusObjekt(objekt, data);
  const objekttyp = ermittleObjekttyp(ergebnis);
  // "Vermietet" gilt hier als gesetzt, sobald eine Kaltmiete > 0 hinterlegt
  // ist - dieselbe Ableitung, die auch die Preiseinordnung/Rendite am Objekt
  // schon nutzt (immLeer/kaltmiete im Renditerechner).
  const vermietet = ergebnis.kosten.kaltmiete !== undefined;
  const kontext = {
    objekttyp,
    vermietet,
    realpreis: berechneRealpreis(ergebnis),
    findings: [],
  };
  const { checkliste, bekannt, vorauswahl } = gleicheKatalogAb(ergebnis, kontext);
  return {
    objekttyp,
    checkliste,
    bekannt: bekannt.map((b) => ({ ...b, text: ohneExposeBezug(b.text) })),
    vorauswahl,
  };
}

// Grobe Heuristik gegen doppelte Fragen, wenn Modell und Katalog inhaltlich
// dasselbe fragen: Gross-/Kleinschreibung, Leerraum und ein Frage-/Satzzeichen
// am Ende zaehlen nicht. Muss keine Textaehnlichkeit erkennen, nur exakte
// Dopplungen fallen genug ins Gewicht.
function normalisiert(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[?？.!]+$/u, "")
    .replace(/\s+/g, " ");
}

/**
 * Ergaenzt die vom Modell gelieferten Fragen (HandoutFrage-Form, siehe
 * worker/src/analyseOutput.ts) um die noch offenen Katalogfragen, ohne
 * inhaltliche Dopplungen. Modellfragen kommen immer zuerst.
 *
 * @param {Array<{id: string, frage: string, kategorie?: string, kern?: boolean, vorOrt?: boolean}>} fragen
 * @param {ReturnType<typeof katalogFuerObjekt>} katalog
 */
export function ergaenzeUmKatalog(fragen, katalog) {
  const bekannteTexte = new Set(fragen.map((f) => normalisiert(f.frage)));
  const ausKatalog = katalog.checkliste
    .filter((c) => !bekannteTexte.has(normalisiert(c.frage)))
    .map((c) => ({
      // Praefix schliesst jede Kollision mit einer Modell-ID aus (die sind
      // "<Nummer>" oder "<Nummer>-<Kategorie-Slug>", siehe analyseOutput.ts
      // frageId()) - Katalog-IDs enthalten immer einen Punkt ("3.2").
      id: `kat-${c.id}`,
      frage: c.frage,
      kategorie: c.kategorie,
      kern: c.kern,
      vorOrt: c.quelle === "vor_ort",
    }));
  return [...fragen, ...ausKatalog];
}
