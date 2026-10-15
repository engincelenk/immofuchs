// Erinnerung an ablaufende Zahlungskarten (taeglicher Cron, scheduled.ts).
// Stripe sendet fuer PaymentMethod-Karten kein Ablauf-Event (nur fuer alte
// "Sources"), daher prueft der Cron die Standardkarte selbst - aber nur bei
// Abos, die in den naechsten 30 Tagen verlaengert werden: relevant ist, ob die
// Karte zur naechsten Abbuchung noch gilt.
import type Stripe from "stripe";
import type { Env } from "../types";
import { listSubscriptionsForCardCheck, markCardExpiryChecked } from "../db";
import { dispatchNotification } from "../notifications";
import { getStripeClient } from "./client";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// Je Lauf hoechstens so viele Abos (je 1-2 Stripe-Aufrufe): Subrequest-Limit.
const MAX_CHECKS_PER_RUN = 20;

// Eine Karte gilt bis zum Ende ihres Ablaufmonats. Reine Funktion (testbar):
// true, wenn sie zum Zeitpunkt der naechsten Abbuchung nicht mehr gilt.
export function cardExpiredBy(expMonth: number, expYear: number, chargeAtMs: number): boolean {
  const validUntilExclusive = Date.UTC(expYear, expMonth, 1); // 1. des Folgemonats, 00:00 UTC
  return validUntilExclusive <= chargeAtMs;
}

async function defaultCardOf(stripe: Stripe, stripeSubscriptionId: string): Promise<Stripe.PaymentMethod.Card | null> {
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["default_payment_method", "customer.invoice_settings.default_payment_method"],
  });
  let pm = sub.default_payment_method;
  if (!pm || typeof pm === "string") {
    const customer = sub.customer;
    const fallback =
      customer && typeof customer === "object" && !("deleted" in customer && customer.deleted)
        ? (customer as Stripe.Customer).invoice_settings?.default_payment_method
        : null;
    pm = fallback ?? null;
  }
  if (!pm || typeof pm === "string") return null;
  return pm.card ?? null;
}

export async function sendCardExpiryReminders(env: Env): Promise<void> {
  const due = await listSubscriptionsForCardCheck(env.DB, THIRTY_DAYS_MS, SEVEN_DAYS_MS, MAX_CHECKS_PER_RUN);
  if (due.length === 0) return;
  const stripe = getStripeClient(env);

  for (const sub of due) {
    try {
      if (!sub.stripe_subscription_id) continue;
      const card = await defaultCardOf(stripe, sub.stripe_subscription_id);
      if (card && cardExpiredBy(card.exp_month, card.exp_year, sub.current_period_end)) {
        await dispatchNotification(env, {
          event: "card_expiring",
          recipientEmail: sub.email,
          recipientUserId: sub.user_id,
          payload: {
            expiry: `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}`,
            last4: card.last4,
            periodEndDate: new Date(sub.current_period_end).toLocaleDateString("de-DE"),
          },
        });
        await markCardExpiryChecked(env.DB, sub.id, sub.current_period_end);
      } else {
        await markCardExpiryChecked(env.DB, sub.id);
      }
    } catch (err) {
      // Nicht als geprueft markieren: der naechste Lauf versucht es erneut.
      console.error("card_expiry_check_failed", sub.id, err instanceof Error ? err.message : "unknown");
    }
  }
}
