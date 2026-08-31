// RevenueCat-Webhook (native In-App-Kaeufe iOS/Android, zusaetzlich zu
// Stripe fuer Web) - siehe docs/app-store-google-play-setup.md Teil C.
// Gleiches Grundmuster wie stripe/webhook.ts: Auth-Pruefung zuerst,
// Idempotenz gegen processed_webhook_events VOR jeder Aktion, dieselbe
// `subscriptions`-Tabelle (Spalte `source` unterscheidet die Herkunft).
//
// Anders als Stripe verifiziert RevenueCat den Webhook NICHT per HMAC-
// Signatur, sondern per statischem Authorization-Header (im RevenueCat-
// Dashboard als "Authorization header value" konfigurierbar) - siehe
// https://www.revenuecat.com/docs/integrations/webhooks#authentication.
//
// UNGETESTET (siehe docs/app-store-google-play-setup.md "Offene Punkte"):
// ohne echtes RevenueCat-Projekt mit echten Store-Produkten kann kein
// echtes Event zugestellt werden. Struktur/Statuslogik folgt der RevenueCat-
// Webhook-Referenz (Event-Typen, Feldnamen), bisher nicht gegen einen
// echten Event-Payload verifiziert.
import type { Env } from "../types";
import { getUserById, isWebhookEventProcessed, markTrialUsedForUser, markWebhookEventProcessed, newId } from "../db";

export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  period_type?: string; // 'NORMAL' | 'TRIAL' | 'INTRO'
  expiration_at_ms?: number | null;
  purchased_at_ms?: number;
  store?: string; // 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL' | ...
  original_transaction_id?: string;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

export function verifyRevenueCatAuth(env: Env, authHeader: string | null): boolean {
  if (!env.REVENUECAT_WEBHOOK_AUTH) return false;
  return authHeader === env.REVENUECAT_WEBHOOK_AUTH;
}

function planFromProductId(productId: string | undefined): "monthly" | "yearly" | null {
  if (productId === "pro_monthly") return "monthly";
  if (productId === "pro_yearly") return "yearly";
  return null;
}

function sourceFromStore(store: string | undefined): "app_store" | "play_store" | null {
  if (store === "APP_STORE") return "app_store";
  if (store === "PLAY_STORE") return "play_store";
  return null;
}

// Bildet die RevenueCat-Event-Typen auf dieselben vier Status-Werte ab, die
// entitlement.ts bereits fuer Stripe kennt ('active'/'trialing'/'past_due'/
// 'canceled'), plus 'cancel_scheduled' (identisches Muster wie im Stripe-
// Webhook: noch entitled, aber Kunde hat bereits gekuendigt).
function statusFromRevenueCatEvent(event: RevenueCatEvent): string | null {
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
      return event.period_type === "TRIAL" ? "trialing" : "active";
    case "CANCELLATION":
      // Kunde hat gekuendigt, bleibt aber bis expiration_at_ms entitled -
      // gleiches Prinzip wie Stripes cancel_at_period_end.
      return "cancel_scheduled";
    case "EXPIRATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    default:
      // TEST, TRANSFER, SUBSCRIPTION_PAUSED, INVOICE_ISSUANCE u.a. - kein
      // Entitlement-relevanter Uebergang, Event wird trotzdem als
      // verarbeitet markiert (Idempotenz), aber ohne DB-Aenderung.
      return null;
  }
}

export async function handleRevenueCatWebhook(env: Env, payload: RevenueCatWebhookPayload): Promise<{ ok: boolean }> {
  const event = payload.event;
  if (await isWebhookEventProcessed(env.DB, event.id)) {
    return { ok: true };
  }

  const status = statusFromRevenueCatEvent(event);
  const source = sourceFromStore(event.store);

  if (status && source) {
    await upsertSubscriptionFromRevenueCat(env, event, status, source);
  }

  await markWebhookEventProcessed(env.DB, event.id);
  return { ok: true };
}

async function upsertSubscriptionFromRevenueCat(
  env: Env,
  event: RevenueCatEvent,
  status: string,
  source: "app_store" | "play_store",
): Promise<void> {
  // app_user_id ist unsere eigene interne User-ID (nativePurchases.js
  // konfiguriert RevenueCat explizit damit statt mit einer anonymen
  // RevenueCat-ID) - kein zusaetzliches Mapping noetig.
  const userId = event.app_user_id;
  const plan = planFromProductId(event.product_id);
  if (!userId || !plan) {
    console.error("revenuecat_webhook_incomplete_event", event.type, event.product_id);
    return;
  }

  const periodEnd = event.expiration_at_ms ?? Date.now();
  const now = Date.now();

  if (status === "trialing") {
    await markTrialUsedForUser(env.DB, userId);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM subscriptions WHERE user_id = ? AND source = ? AND revenuecat_app_user_id = ?",
  )
    .bind(userId, source, userId)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions SET status = ?, plan = ?, current_period_end = ?,
         cancel_at_period_end = ?, revenuecat_original_transaction_id = COALESCE(?, revenuecat_original_transaction_id),
         updated_at = ? WHERE id = ?`,
    )
      .bind(
        status,
        plan,
        periodEnd,
        status === "cancel_scheduled" ? 1 : 0,
        event.original_transaction_id ?? null,
        now,
        existing.id,
      )
      .run();
  } else {
    const user = await getUserById(env.DB, userId);
    if (!user) {
      console.error("revenuecat_webhook_unknown_user", userId);
      return;
    }
    // Bekannter, noch ungeloester Randfall: idx_subscriptions_active_user
    // (UNIQUE ueber user_id WHERE status='active') schlaegt fehl, wenn
    // derselbe Nutzer bereits eine aktive Stripe-Subscription hat und
    // zusaetzlich nativ kauft (sollte die App-UI eigentlich verhindern, ist
    // aber serverseitig nicht erzwungen). Wirft dann denselben 500 wie jeder
    // andere D1-Fehler - RevenueCat liefert das Event erneut zu.
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, status, plan, current_period_end, cancel_at_period_end, first_purchase_at,
         past_due_since, updated_at, source, revenuecat_app_user_id, revenuecat_original_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
      .bind(
        newId(),
        userId,
        status,
        plan,
        periodEnd,
        status === "cancel_scheduled" ? 1 : 0,
        now,
        now,
        source,
        userId,
        event.original_transaction_id ?? null,
      )
      .run();
  }
}
