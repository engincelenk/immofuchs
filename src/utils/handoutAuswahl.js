// Persistenz der Fragen-Auswahl im Besichtigungshandout der AI-Engine.
//
// Bewusst KEIN zweiter Store: die Ablage aus finnAuswahl.js ist schon genau
// das, was hier gebraucht wird (Schluessel -> Liste von IDs, LRU-Deckel gegen
// unbegrenztes Wachsen des localStorage, tolerant gegen geblockten Speicher im
// Privatmodus). Sie unterscheidet sich vom Handout am Objekt nur im
// Schluessel - und den liefert diese Datei. Ein eigener localStorage-Key
// haette dieselbe Quota-Logik ein zweites Mal zu pflegen bedeutet.
//
// Der Name der Quelldatei ist historisch (Handout im Finn-/Exposé-Kontext);
// dieses Modul ist die Adresse fuer den Objekt-Kontext.
import { ladeAuswahl, speichereAuswahl } from "./finnAuswahl.js";

export { ladeAuswahl, speichereAuswahl };

/**
 * Schluessel je Objekt UND je Lauf.
 *
 * Warum der Zeitstempel mit hineingehoert: Die Frage-IDs sind laufende Nummern
 * ("3-unterlagen", siehe worker/src/analyseOutput.ts). Erstellt der Nutzer das
 * Handout neu, gibt es "3-unterlagen" wieder - dann aber mit einer anderen
 * Frage dahinter. Ohne den Zeitstempel wuerde die alte Auswahl stillschweigend
 * auf neue Fragen angewendet: der Nutzer druckt eine Liste, die er nie
 * ausgewaehlt hat. Mit ihm startet jeder neue Lauf sauber bei seiner eigenen
 * Vorauswahl, und der alte Eintrag faellt ueber den LRU-Deckel von selbst raus.
 *
 * @param {string|number} objektId
 * @param {string} erstellt ISO-Zeitstempel des Ergebnisses
 * @returns {string|null} null, wenn die Zuordnung nicht eindeutig waere
 */
export function objektHandoutSchluessel(objektId, erstellt) {
  if (objektId === null || objektId === undefined || objektId === "") return null;
  return `objekt:${objektId}:${erstellt || ""}`;
}
