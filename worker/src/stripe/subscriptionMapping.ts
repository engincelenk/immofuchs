// Gemeinsame Abbildung Stripe-Subscription -> D1-Felder. Genutzt vom Webhook
// (stripe/webhook.ts) UND vom taeglichen Abgleich (stripe/reconcile.ts) -
// beide muessen dieselbe Logik anwenden, sonst korrigiert der Abgleich Zeilen
// in einen anderen Zustand, als der Webhook sie geschrieben hat.
import type Stripe from "stripe";
import type { Env } from "../types";

export type MappedStatus = "active" | "trialing" | "past_due" | "canceled";

// Stripe kennt 'trialing', 'active', 'past_due', 'canceled', 'unpaid',
// 'incomplete', 'incomplete_expired'. 'incomplete'/'incomplete_expired' sind
// reines Vor-Zahlung-Rauschen (null -> ignorieren), 'unpaid' ist eine bereits
// bezahlte Subscription, deren Verlaengerung endgueltig scheiterte ('canceled').
// Ausfuehrliche Herleitung: Live-Befund 2026-08-27, siehe Git-Historie von
// stripe/webhook.ts.
export function statusFromStripe(stripeStatus: unknown): MappedStatus | null {
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing") return "trialing";
  if (stripeStatus === "past_due") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "unpaid") return "canceled";
  return null;
}

export function planFromPriceId(env: Env, priceId: unknown): "monthly" | "yearly" | null {
  if (priceId === env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

export interface MappedSubscription {
  userId: string | undefined;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  latestInvoiceId: string | null;
  status: MappedStatus | null;
  plan: "monthly" | "yearly" | null;
  periodEnd: number;
  cancelAtPeriodEnd: 0 | 1;
}

export function mapStripeSubscription(env: Env, sub: Stripe.Subscription): MappedSubscription {
  // Beim Ersterstellen kann sub.latest_invoice schon am Objekt haengen, waehrend
  // invoice.payment_succeeded noch nicht da ist (Zustellreihenfolge, Live-Befund
  // 2026-08-27) - deshalb die ID direkt hier lesen.
  const latestInvoiceId =
    typeof sub.latest_invoice === "string" ? sub.latest_invoice : (sub.latest_invoice?.id ?? null);
  // Seit API-Version "Basil" (2025-03-31) liegt current_period_end am Item statt
  // an der Subscription (Live-Befund 2026-09-10); die mitgelieferten
  // stripe-node-Typen kennen das Feld noch nicht -> Cast. Fallback aufs alte Feld.
  const itemPeriodEnd = (sub.items.data[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const rawPeriodEnd = itemPeriodEnd ?? sub.current_period_end;
  return {
    userId: sub.metadata?.user_id || undefined,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    latestInvoiceId,
    status: statusFromStripe(sub.status),
    plan: planFromPriceId(env, sub.items.data[0]?.price?.id),
    periodEnd: rawPeriodEnd ? rawPeriodEnd * 1000 : Date.now(),
    cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
  };
}
