// Abrechnungsperiode der Free-Kontingente (Preispolitik 2026-08-20).
//
// Die drei Gratis-Kontingente (Rechner, Finn, Exposé) liefen bis dahin
// dauerhaft: einmal verbraucht, nie wieder. Neu sind es Monatskontingente -
// "3/Monat" statt "3x insgesamt".
//
// Umgesetzt als Periodenschluessel statt als Cron/Alarm: jeder Zaehler traegt
// die Periode, in der er gefuellt wurde, und wird beim ersten Zugriff einer
// neuen Periode auf 0 gesetzt. Kein Hintergrundjob, der ueber Millionen
// Zeilen laufen muesste, und kein Zeitfenster, in dem ein noch nicht
// zurueckgesetzter Zaehler faelschlich sperrt.
//
// Kalendermonat statt rollierender 30 Tage, weil genau das in der
// Preistabelle steht ("3/Monat") - ein rollierendes Fenster waere dem Nutzer
// nicht erklaerbar, ohne ihm den Startzeitpunkt anzuzeigen. UTC-Grenze wie
// bei den Tageslimits (SessionRateLimiter.checkAndIncrement).
export function aktuellePeriode(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 7); // "2026-08"
}
