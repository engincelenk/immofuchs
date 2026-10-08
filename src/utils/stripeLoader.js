// Stripe.js dynamisch nachladen - NICHT global im <head>, sondern erst beim
// Erreichen der Plan-Auswahl/Zahlung. Bei globaler Einbindung wuerde jeder
// Free-Nutzer (die grosse Mehrheit) ein Zahlungs-SDK laden, das er nie
// benutzt - widerspricht dem Performance-/Offline-First-Anspruch der PWA
// (gleiches Prinzip wie zuvor bei paddleLoader.js).
let stripePromise = null;

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

// Stripe.js kennt kein globales Event-Pub/Sub wie Paddle.js - Payment-
// Element-Events (change, ready) werden pro Instanz per Callback registriert
// (siehe PaymentStep.jsx), der Listener-Mechanismus aus paddleLoader.js
// entfaellt hier deshalb ersatzlos.
export function loadStripeClient() {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      stripePromise = Promise.reject(new Error("stripe_not_configured"));
    } else {
      stripePromise = import("@stripe/stripe-js")
        .then(({ loadStripe }) => loadStripe(STRIPE_PUBLISHABLE_KEY))
        .then((stripe) => {
          if (!stripe) throw new Error("stripe_script_blocked_or_failed");
          return stripe;
        });
    }
    // Ein fehlgeschlagener Ladeversuch (Ad-/Tracking-Blocker, Netzwerkfehler)
    // darf nicht dauerhaft gecacht bleiben - sonst scheitert jeder weitere
    // Versuch in derselben Session sofort, auch nachdem der Nutzer seinen
    // Blocker pausiert hat.
    stripePromise.catch(() => {
      stripePromise = null;
    });
  }
  return stripePromise;
}
