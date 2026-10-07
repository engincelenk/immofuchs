// Nutzerdaten App -> Stripe (Auftrag 2026-09-29). Die App fuehrt Konto, E-Mail
// und Name; Stripe bekommt nur eine Kopie fuer Rechnung und Mails.
//
// Bewusst nur E-Mail und - falls Stripe noch KEINEN hat - der Name:
// `customer.name` ist in Stripe der Rechnungsempfaenger (bei Firmenkunden der
// Firmenname, gesetzt beim Checkout in stripe/checkout.ts). Den Profilnamen
// dort einfach hineinzuschreiben wuerde die Rechnungsanschrift ueberschreiben.
// Die E-Mail muss stimmen, sonst findet findOrCreateCustomer() den Kunden nach
// einer E-Mail-Aenderung nicht mehr (Suche per E-Mail) und legt einen Duplikat-
// Kunden an.
import type Stripe from "stripe";
import type { Env } from "../types";
import { getLatestSubscriptionForUser, getUserById, ADMIN_TEST_SUBSCRIPTION_PREFIX } from "../db";
import { getStripeClient } from "./client";
import { reconcileModeOf } from "./reconcile";

export interface CustomerPatch {
  email?: string;
  name?: string;
}

// Reine Vergleichsfunktion (testbar): was muss an Stripe geschickt werden?
export function customerPatchFor(
  user: { email: string; name: string | null },
  customer: { email?: string | null; name?: string | null },
): CustomerPatch {
  const patch: CustomerPatch = {};
  if ((customer.email ?? "").toLowerCase() !== user.email.toLowerCase()) patch.email = user.email;
  if (!customer.name && user.name) patch.name = user.name;
  return patch;
}

// Best effort: ein Stripe-Fehler darf die Aenderung in der App NIE blockieren
// (nur Log) - der taegliche Abgleich (reconcileCustomers) zieht nach.
export async function syncCustomerFromUser(env: Env, userId: string): Promise<void> {
  try {
    if (!env.STRIPE_SECRET_KEY) return;
    const sub = await getLatestSubscriptionForUser(env.DB, userId);
    const customerId = sub?.stripe_customer_id;
    if (!customerId || sub?.stripe_subscription_id?.startsWith(ADMIN_TEST_SUBSCRIPTION_PREFIX)) return;
    const user = await getUserById(env.DB, userId);
    if (!user) return;
    const stripe = getStripeClient(env);
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return;
    const patch = customerPatchFor(user, customer);
    if (Object.keys(patch).length === 0) return;
    await stripe.customers.update(customerId, patch);
  } catch (err) {
    console.error("stripe_customer_sync_failed", userId, err instanceof Error ? err.message : "unknown");
  }
}

const MAX_LIST_PAGES = 20; // 20 x 100 Kunden
const MAX_UPDATES = 50; // Subrequest-Deckel pro Cron-Lauf

export interface CustomerReconcileReport {
  checked: number;
  diffs: number;
  updated: number;
  errors: number;
}

// Taeglicher Abgleich, Modus wie beim Abo-Abgleich (STRIPE_RECONCILE_MODE):
// "log" meldet nur, "apply" zieht Stripe nach, "off" tut nichts.
export async function reconcileCustomers(env: Env): Promise<CustomerReconcileReport> {
  const mode = reconcileModeOf(env);
  const report: CustomerReconcileReport = { checked: 0, diffs: 0, updated: 0, errors: 0 };
  if (mode === "off" || !env.STRIPE_SECRET_KEY) return report;

  const stripe = getStripeClient(env);
  const customers = new Map<string, Stripe.Customer>();
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await stripe.customers.list({ limit: 100, starting_after: startingAfter });
    for (const c of res.data) customers.set(c.id, c);
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }

  const rows = (
    await env.DB.prepare(
      `SELECT DISTINCT s.stripe_customer_id AS customer_id, u.id AS user_id, u.email AS email, u.name AS name
       FROM subscriptions s JOIN users u ON u.id = s.user_id
       WHERE s.stripe_customer_id IS NOT NULL
         AND (s.stripe_subscription_id IS NULL OR s.stripe_subscription_id NOT LIKE ?)`,
    )
      .bind(`${ADMIN_TEST_SUBSCRIPTION_PREFIX}%`)
      .all<{ customer_id: string; user_id: string; email: string; name: string | null }>()
  ).results;

  for (const row of rows) {
    const customer = customers.get(row.customer_id);
    if (!customer) continue; // nicht in der Liste (Seitenlimit/geloescht): nichts raten
    report.checked++;
    const patch = customerPatchFor(row, customer);
    if (Object.keys(patch).length === 0) continue;
    report.diffs++;
    console.error("stripe_customer_diff", row.user_id, row.customer_id, mode, JSON.stringify(Object.keys(patch)));
    if (mode !== "apply" || report.updated >= MAX_UPDATES) continue;
    try {
      await stripe.customers.update(row.customer_id, patch);
      report.updated++;
    } catch (err) {
      report.errors++;
      console.error("stripe_customer_update_failed", row.customer_id, err instanceof Error ? err.message : "unknown");
    }
  }
  console.log("stripe_customer_reconcile_done", mode, JSON.stringify(report));
  return report;
}
