// Datum fuer Mails und Push. Der Worker laeuft in UTC: ohne feste Zeitzone zeigt
// eine Verlaengerung um 00:30 Berliner Zeit den Vortag.
export function datumDe(ms: number): string {
  return new Date(ms).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
}
