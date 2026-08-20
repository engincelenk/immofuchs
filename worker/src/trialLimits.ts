// Kontingente der kostenlosen Testphase (Preispolitik 2026-08-20, Nutzer-
// Vorgabe). Eine Quelle fuer Worker und Anzeige - das Frontend liest die
// Zahlen ueber /me, statt sie ein zweites Mal zu pflegen.
//
// Die Testphase schaltet dieselben Funktionen frei wie Pro, aber mit kleinen
// Kontingenten. Der Grund ist Missbrauch: die Phase kostet keine
// Zahlungsdaten, ein neues Konto ist also billig - gedeckelt wird deshalb
// dort, wo echtes Geld fliesst (Finn und Exposé-Scan gehen gegen Workers AI).
//
// "je Rechner" heisst: der Zaehler haengt an (Nutzer, Rechner). Exposé-Scan
// und Handout gehoeren dagegen zum OBJEKT, nicht zum Rechner - ein Exposé
// wird einmal gescannt und fliesst dann in jeden Rechner.
export const TRIAL_DAUER_MS = 7 * 24 * 60 * 60 * 1000;

export const TRIAL_LIMITS = {
  // Berechnungen je Rechner.
  rechner: 3,
  // Finn-Anfragen je Rechner.
  finn: 5,
  // Exposé-Scans insgesamt.
  expose: 3,
  // Gespeicherte Objekte je Rechner.
  merkliste: 3,
} as const;

// Nur vier der sechs Rechner speichern ueberhaupt Objekte (Merkliste.jsx,
// RECHNER_TABS). "3 je Rechner" sind damit hoechstens 12 - die Zahl, gegen
// die der Worker prueft. Die Aufteilung je Rechner macht das Frontend; der
// Server zieht die Gesamtgrenze, weil die objects-Tabelle keinen Rechner-Bezug
// speichert (Migration 0004) und ihn nachzuruesten fuer eine reine
// Missbrauchsgrenze zu viel waere.
export const RECHNER_MIT_MERKLISTE = 4;
export const TRIAL_MERKLISTE_GESAMT = TRIAL_LIMITS.merkliste * RECHNER_MIT_MERKLISTE;

// PDF und Handout haben kein eigenes Kontingent: sie haengen an dem, wofuer
// sie erzeugt werden. Je Berechnung ein PDF, je Scan ein Handout - damit
// stimmt "3 mal" von selbst und laesst sich nicht umgehen, ohne vorher das
// teurere Kontingent zu verbrauchen.
export const GEKOPPELT = {
  pdf: "rechner",
  handout: "expose",
} as const;
