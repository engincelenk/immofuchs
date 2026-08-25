// Kontingente der kostenlosen Testphase (Nutzer-Vorgabe 2026-08-25, loest die
// Preispolitik 2026-08-20 ab). Eine Quelle fuer Worker und Anzeige - das
// Frontend liest die Zahlen ueber /me, statt sie ein zweites Mal zu pflegen.
//
// Die Testphase schaltet dieselben Funktionen frei wie Pro. Gedeckelt wird
// nur noch dort, wo echtes Geld fliesst (Finn und Exposé-Scan gehen gegen
// Workers AI) - und zwar TAEGLICH statt einmalig ueber die ganze Phase. Der
// Grund fuer die Umstellung: ein Gesamtkontingent war nach zwei Sitzungen
// aufgebraucht, danach lief die Testphase formal noch Tage weiter, ohne dass
// sich damit noch etwas ausprobieren liess - sie testete nichts mehr.
//
// Rechnernutzung und PDF sind in der Testphase unbegrenzt: beide kosten nichts
// ausser Rechenzeit im Browser, und genau sie sind das Produkt - wer sie nicht
// frei ausprobieren kann, kann die Kaufentscheidung nicht treffen.
//
// Die Phase verlangt weiterhin KEINE Zahlungsdaten (siehe startAppTrialIfNew
// in routes/account.ts) - erst nach ihrem Ende ist ein Abo noetig.
export const TRIAL_DAUER_MS = 7 * 24 * 60 * 60 * 1000;

// Kontingente je TAG. "je Rechner" heisst zusaetzlich: der Zaehler haengt an
// (Nutzer, Rechner, Tag). Exposé-Scan und Handout gehoeren dagegen zum OBJEKT,
// nicht zum Rechner - ein Exposé wird einmal gescannt und fliesst dann in
// jeden Rechner, deshalb ein gemeinsames Kontingent.
export const TRIAL_LIMITS = {
  // Finn-Anfragen je Rechner und Tag.
  finn: 10,
  // Exposé-Scans pro Tag (rechneruebergreifend).
  expose: 3,
  // Handouts pro Tag (rechneruebergreifend).
  handout: 3,
} as const;

// Features ohne jedes Kontingent in der Testphase.
export const TRIAL_UNBEGRENZT = ["rechner", "pdf"] as const;

// Gespeicherte Objekte, Gesamtzahl fuer die ganze Testphase - kein
// Tageskontingent, weil es kein Verbrauch ist, sondern ein Bestand: die
// Merkliste soll sich nicht Tag fuer Tag weiter fuellen lassen.
export const TRIAL_MERKLISTE_GESAMT = 5;

// Tagesschluessel der Kontingente. UTC statt lokaler Zeit, weil der Worker
// keine verlaessliche Zeitzone des Nutzers kennt und ein wanderndes
// Zuruecksetzen (Reise, VPN) sonst zusaetzliche Kontingente verschenken oder
// wegnehmen wuerde. Der Tageswechsel liegt damit fuer deutsche Nutzer um
// 01:00/02:00 Uhr Ortszeit - unkritisch, weil niemand um diese Zeit auf das
// Zuruecksetzen wartet.
export function trialTag(jetzt: number = Date.now()): string {
  return new Date(jetzt).toISOString().slice(0, 10);
}

// Welche Features taeglich zaehlen. Wer hier fehlt, zaehlt ueber die ganze
// Phase (tag='') - heute niemand mehr, das Feld bleibt aber bestehen, damit
// ein kuenftiges Gesamtkontingent ohne Schema-Aenderung moeglich ist.
export const TAGESKONTINGENT: ReadonlySet<string> = new Set(["finn", "expose", "handout"]);
