// Planpreise, serverseitig.
//
// Bis zur Preispolitik 2026-08-20 standen diese beiden Zahlen an fuenf
// Stellen verstreut (Admin-Dashboard, Zahlungsanbieter-Webhook, zwei
// Erinnerungs-Durchlaeufe, E-Mail-Rueckfall). Der Kommentar in db.ts
// begruendete das damit, dass "zwei Zahlen an zwei Stellen" keine eigene
// Datei rechtfertigen - die Annahme stimmte nicht mehr: bei der
// Preisumstellung war genau das die Stelle, an der Werte haengengeblieben
// waeren. Jetzt eine Quelle.
//
// Diese Werte muessen zu den in Stripe hinterlegten Preisen (STRIPE_PRICE_ID_
// MONTHLY/_YEARLY) passen und zu src/components/checkout/planPricing.js im
// Frontend. Stripe bleibt die verbindliche Quelle des tatsaechlich
// abgerechneten Betrags - was hier steht, speist Anzeigen
// (Admin-Kennzahlen) und Hinweistexte (Mails, Push).
export const PLAN_PREIS_EUR = {
  monthly: 6.99,
  yearly: 59.99,
} as const;

export type Plan = keyof typeof PLAN_PREIS_EUR;

// Deutsche Schreibweise mit Komma - die Benachrichtigungstexte, in die das
// eingesetzt wird, sind ebenfalls durchgaengig deutsch (notifications.ts).
export function preisText(plan: string): string {
  const betrag = plan === "monthly" ? PLAN_PREIS_EUR.monthly : PLAN_PREIS_EUR.yearly;
  return `${betrag.toFixed(2).replace(".", ",")} €`;
}
