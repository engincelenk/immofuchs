import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Regressionstest fuer den am 2026-08-18 gefundenen Bug (damals
// PADDLE_PRICE_ID_MONTHLY/YEARLY bzw. PADDLE_API_KEY auf dev fehlerhaft,
// siehe release-notes.txt 1.20.1) - seit dem Wechsel weg von Paddle
// (2026-08-27) die Stripe-Entsprechung: eine falsch konfigurierte
// STRIPE_SECRET_KEY/STRIPE_PRICE_ID_MONTHLY/_YEARLY auf dev laesst diesen
// Test bewusst rot laufen, statt es zu verschweigen, und wird genau dadurch
// gruen, sobald die Konfiguration stimmt - kein manuelles Update noetig.
//
// Akzeptierter Nebeneffekt (anders als bei Paddles ephemeren Draft-
// Transaktionen): createSubscriptionCheckout() legt bei Stripe eine ECHTE
// Subscription im Status "incomplete" an (payment_behavior:
// default_incomplete), die dieser Test nie bezahlt. Sie bleibt im
// Stripe-Testmodus-Dashboard sichtbar (kein D1-Schreibzugriff, da der
// Webhook erst bei einer Statusaenderung feuert) - dieselbe Sorte
// akzeptierter Fussabdruck wie die event_id in processed_webhook_events bei
// billing-webhook.e2e.test.ts, nicht automatisch aufraeumbar.
describe("POST /billing/checkout — echte Stripe-Testmodus-Subscription", () => {
  it.each(["monthly", "yearly"] as const)("erzeugt eine Subscription mit clientSecret fuer Plan=%s", async (plan) => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();
    expect(res.status, `Antwort: ${JSON.stringify(body)}`).toBe(200);
    // Stripe-PaymentIntent-Client-Secrets haben die Form "pi_<id>_secret_<key>".
    expect(body.clientSecret).toEqual(expect.stringMatching(/^pi_.+_secret_.+$/));
  });
});
