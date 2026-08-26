// Duenne Stripe-Client-Initialisierung (Spec Abschnitt 2). Kein Eigenbau-
// fetch-Client mehr wie bei Paddle - stripe-node ist seit v14 fetch-basiert
// und laeuft damit ohne Node-spezifisches `http`-Modul in Cloudflare Workers.
// Der Secret Key verlaesst den Worker weiterhin nie in Richtung Client
// (gleiches Prinzip wie zuvor bei paddle/client.ts).
import Stripe from "stripe";
import type { Env } from "../types";

let cached: { key: string; client: Stripe } | null = null;

export function getStripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("stripe_not_configured");
  // Pro Worker-Isolate wiederverwendet statt bei jedem Aufruf neu erzeugt -
  // vermeidet unnoetigen Init-Overhead bei mehreren Aufrufen in derselben
  // Anfrage (z.B. Checkout + Kunde anlegen).
  if (cached?.key === env.STRIPE_SECRET_KEY) return cached.client;
  const client = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  cached = { key: env.STRIPE_SECRET_KEY, client };
  return client;
}
