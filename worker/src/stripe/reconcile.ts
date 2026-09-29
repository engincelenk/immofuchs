// Taeglicher Abgleich D1 <-> Stripe (Admin-Sync-Auftrag 2026-09-29).
// Webhooks werden "mindestens einmal" zugestellt, koennen aber auch ganz
// ausfallen (Worker-Ausfall, deaktivierter Endpoint). Ohne diesen Lauf bliebe
// ein verpasstes Event fuer immer falsch - z.B. ein in Stripe gekuendigtes Abo,
// das in D1 weiter "active" ist und Pro-Zugang gibt. Stripe ist die Wahrheit.
//
// Modus (Env STRIPE_RECONCILE_MODE): "log" (Default - nur melden, nichts
// schreiben), "apply" (D1 korrigieren + Audit-Log), "off". Bewusst "log" als
// Default: erst auf dev beobachten, wie viele Abweichungen es real gibt.
//
// Keine Mails (Willkommen/Dunning) - das sind Webhook-Uebergaenge, hier wird
// nur der Zustand angeglichen.
import type Stripe from "stripe";
import type { Env } from "../types";
import { ADMIN_TEST_SUBSCRIPTION_PREFIX, logAdminAction, markTrialUsedForUser, newId } from "../db";
import type { SubscriptionRow } from "../db";
import { getStripeClient } from "./client";
import { mapStripeSubscription, type MappedSubscription } from "./subscriptionMapping";

export type ReconcileMode = "off" | "log" | "apply";

// Obergrenzen wegen der Subrequest-Limits eines Worker-Aufrufs.
const MAX_LIST_PAGES = 20; // 20 x 100 = 2000 Abos
const MAX_INDIVIDUAL_RETRIEVES = 20;

const SYSTEM_ACTOR = { adminUserId: "system", adminEmail: "system@stripe-reconcile" };

export interface ReconcileReport {
  mode: ReconcileMode;
  checked: number;
  diffs: number;
  created: number;
  errors: number;
}

export function reconcileModeOf(env: Env): ReconcileMode {
  const raw = env.STRIPE_RECONCILE_MODE;
  return raw === "off" || raw === "apply" ? raw : "log";
}

type Diff = Record<string, { d1: unknown; stripe: unknown }>;

export function expectedStatusOf(mapped: MappedSubscription): SubscriptionRow["status"] | null {
  if (!mapped.status) return null;
  return mapped.cancelAtPeriodEnd ? "cancel_scheduled" : mapped.status;
}

// Reine Vergleichsfunktion (testbar): welche Felder weichen ab?
export function diffSubscription(row: SubscriptionRow, mapped: MappedSubscription): Diff {
  const diff: Diff = {};
  const status = expectedStatusOf(mapped);
  if (status && row.status !== status) diff.status = { d1: row.status, stripe: status };
  if (mapped.plan && row.plan !== mapped.plan) diff.plan = { d1: row.plan, stripe: mapped.plan };
  if (row.current_period_end !== mapped.periodEnd) {
    diff.currentPeriodEnd = { d1: row.current_period_end, stripe: mapped.periodEnd };
  }
  if (row.cancel_at_period_end !== mapped.cancelAtPeriodEnd) {
    diff.cancelAtPeriodEnd = { d1: row.cancel_at_period_end, stripe: mapped.cancelAtPeriodEnd };
  }
  if (row.stripe_customer_id !== mapped.stripeCustomerId) {
    diff.stripeCustomerId = { d1: row.stripe_customer_id, stripe: mapped.stripeCustomerId };
  }
  return diff;
}

async function listAllStripeSubscriptions(env: Env): Promise<Map<string, Stripe.Subscription>> {
  const stripe = getStripeClient(env);
  const result = new Map<string, Stripe.Subscription>();
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await stripe.subscriptions.list({ status: "all", limit: 100, starting_after: startingAfter });
    for (const sub of res.data) result.set(sub.id, sub);
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }
  return result;
}

async function applyCorrection(
  env: Env,
  row: SubscriptionRow,
  mapped: MappedSubscription,
  nowMs: number,
): Promise<void> {
  const status = expectedStatusOf(mapped);
  if (!status || !mapped.plan) return;
  const wasPastDue = row.status === "past_due";
  const pastDueSince = mapped.status === "past_due" ? (wasPastDue ? row.past_due_since : nowMs) : null;
  // stripe_event_created = jetzt: der Abgleich-Stand ist neuer als jedes Event,
  // das vor diesem Lauf erzeugt, aber noch unterwegs war.
  await env.DB.prepare(
    `UPDATE subscriptions SET status = ?, plan = ?, stripe_customer_id = ?, current_period_end = ?,
       cancel_at_period_end = ?, past_due_since = ?, latest_invoice_id = COALESCE(?, latest_invoice_id),
       updated_at = ?, stripe_event_created = ? WHERE id = ?`,
  )
    .bind(
      status,
      mapped.plan,
      mapped.stripeCustomerId,
      mapped.periodEnd,
      mapped.cancelAtPeriodEnd,
      pastDueSince,
      mapped.latestInvoiceId,
      nowMs,
      Math.floor(nowMs / 1000),
      row.id,
    )
    .run();
  if (mapped.status === "trialing" && mapped.userId) await markTrialUsedForUser(env.DB, mapped.userId);
}

async function createMissing(env: Env, mapped: MappedSubscription, nowMs: number): Promise<boolean> {
  const status = expectedStatusOf(mapped);
  if (!status || !mapped.plan || !mapped.userId) return false;
  // Nur anlegen, wenn das Konto existiert - sonst schluege der Insert ohne
  // Zuordnung fehl bzw. legte eine Zeile fuer einen geloeschten Nutzer an.
  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(mapped.userId).first();
  if (!user) return false;
  await env.DB.prepare(
    `INSERT INTO subscriptions
      (id, user_id, status, plan, stripe_customer_id, stripe_subscription_id, current_period_end,
       cancel_at_period_end, first_purchase_at, past_due_since, latest_invoice_id, updated_at, stripe_event_created)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      mapped.userId,
      status,
      mapped.plan,
      mapped.stripeCustomerId,
      mapped.stripeSubscriptionId,
      mapped.periodEnd,
      mapped.cancelAtPeriodEnd,
      nowMs,
      mapped.status === "past_due" ? nowMs : null,
      mapped.latestInvoiceId,
      nowMs,
      Math.floor(nowMs / 1000),
    )
    .run();
  if (mapped.status === "trialing") await markTrialUsedForUser(env.DB, mapped.userId);
  return true;
}

export async function reconcileSubscriptions(env: Env): Promise<ReconcileReport> {
  const mode = reconcileModeOf(env);
  const report: ReconcileReport = { mode, checked: 0, diffs: 0, created: 0, errors: 0 };
  if (mode === "off" || !env.STRIPE_SECRET_KEY) return report;

  const nowMs = Date.now();
  const stripeSubs = await listAllStripeSubscriptions(env);
  const rows = (
    await env.DB.prepare(
      "SELECT * FROM subscriptions WHERE stripe_subscription_id IS NOT NULL AND stripe_subscription_id NOT LIKE ?",
    )
      .bind(`${ADMIN_TEST_SUBSCRIPTION_PREFIX}%`)
      .all<SubscriptionRow>()
  ).results;
  const known = new Set<string>();
  let retrieves = 0;

  for (const row of rows) {
    const stripeId = row.stripe_subscription_id as string;
    known.add(stripeId);
    report.checked++;
    try {
      let sub = stripeSubs.get(stripeId);
      if (!sub) {
        // Nicht in der Liste (z.B. Seitenlimit): einzeln nachfragen, aber
        // gedeckelt. Bereits gekuendigte Zeilen brauchen das nicht.
        if (row.status === "canceled" || retrieves >= MAX_INDIVIDUAL_RETRIEVES) continue;
        retrieves++;
        try {
          sub = await getStripeClient(env).subscriptions.retrieve(stripeId);
        } catch (err) {
          if ((err as { code?: string })?.code !== "resource_missing") throw err;
          // In Stripe nicht (mehr) vorhanden -> wie gekuendigt behandeln.
          const diff: Diff = { status: { d1: row.status, stripe: "canceled (missing in Stripe)" } };
          report.diffs++;
          await reportDiff(env, mode, row, diff);
          if (mode === "apply") {
            await env.DB.prepare(
              "UPDATE subscriptions SET status = 'canceled', updated_at = ?, stripe_event_created = ? WHERE id = ?",
            )
              .bind(nowMs, Math.floor(nowMs / 1000), row.id)
              .run();
          }
          continue;
        }
      }
      const mapped = mapStripeSubscription(env, sub);
      const diff = diffSubscription(row, mapped);
      if (Object.keys(diff).length === 0) continue;
      report.diffs++;
      await reportDiff(env, mode, row, diff);
      if (mode === "apply") await applyCorrection(env, row, mapped, nowMs);
    } catch (err) {
      report.errors++;
      console.error("stripe_reconcile_row_failed", row.id, err instanceof Error ? err.message : "unknown");
    }
  }

  // Umgekehrte Richtung: Stripe-Abo mit user_id, aber ohne D1-Zeile (Webhook nie
  // angekommen). Nur aktive/trialing/past_due-Stande - Vor-Zahlung-Rauschen und
  // laengst beendete Abos ohne Zeile bleiben unberuehrt.
  for (const sub of stripeSubs.values()) {
    if (known.has(sub.id)) continue;
    try {
      const mapped = mapStripeSubscription(env, sub);
      if (!mapped.userId || !mapped.plan || !mapped.status || mapped.status === "canceled") continue;
      report.diffs++;
      const diff: Diff = { row: { d1: null, stripe: `${mapped.status}/${mapped.plan}` } };
      console.error("stripe_reconcile_missing_row", sub.id, mapped.userId, mode);
      if (mode === "apply" && (await createMissing(env, mapped, nowMs))) {
        report.created++;
        await logAdminAction(env.DB, {
          ...SYSTEM_ACTOR,
          action: "subscription.reconcile_created",
          targetType: "subscription",
          targetId: sub.id,
          details: { userId: mapped.userId, diff },
        });
      }
    } catch (err) {
      report.errors++;
      console.error("stripe_reconcile_missing_failed", sub.id, err instanceof Error ? err.message : "unknown");
    }
  }

  console.log("stripe_reconcile_done", JSON.stringify(report));
  return report;
}

async function reportDiff(env: Env, mode: ReconcileMode, row: SubscriptionRow, diff: Diff): Promise<void> {
  console.error("stripe_reconcile_diff", row.id, row.stripe_subscription_id, mode, JSON.stringify(diff));
  if (mode !== "apply") return;
  await logAdminAction(env.DB, {
    ...SYSTEM_ACTOR,
    action: "subscription.reconcile",
    targetType: "subscription",
    targetId: row.id,
    details: { userId: row.user_id, diff },
  });
}
