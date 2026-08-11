// Paddle-Webhook-Verarbeitung (Spec 4.6, 4.13). Signaturprüfung zuerst,
// Idempotenz-Check gegen processed_webhook_events VOR jeder Aktion (Paddle
// liefert Events "at least once" - ein doppelt geliefertes Event darf nichts
// mehr aendern, siehe worker/src/paddle/webhook.test.ts).
import type { Env } from "../types";
import { getUserById, isWebhookEventProcessed, markTrialUsedForUser, markWebhookEventProcessed, newId } from "../db";
import { dispatchNotification } from "../notifications";
import { PAST_DUE_GRACE_MS } from "../entitlement";

// "ts=1700000000;h1=<hex-hmac>" - siehe Paddle-Doku "Verify webhook signature".
function parseSignatureHeader(header: string): { ts: string; h1: string } | null {
  const parts = Object.fromEntries(
    header.split(";").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()];
    }),
  );
  if (!parts.ts || !parts.h1) return null;
  return { ts: parts.ts, h1: parts.h1 };
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPaddleSignature(
  env: Env,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!env.PADDLE_WEBHOOK_SECRET || !signatureHeader) return false;
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.PADDLE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${parsed.ts}:${rawBody}`),
  );
  return toHex(signed) === parsed.h1;
}

interface PaddleWebhookBody {
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

// 'trialing' ist seit Phase 3 ein eigener Status und faellt NICHT mehr in
// 'active' zusammen (Migration 0012): der 7-Tage-Trial soll in Konto-Ansicht
// und Auswertung von einem bezahlten Abo unterscheidbar sein. Fuer die
// Rechtepruefung bleibt er gleichwertig (siehe entitlement.ts, computeIsPro).
function statusFromPaddle(paddleStatus: unknown): "active" | "trialing" | "past_due" | "canceled" | null {
  if (paddleStatus === "active") return "active";
  if (paddleStatus === "trialing") return "trialing";
  if (paddleStatus === "past_due") return "past_due";
  if (paddleStatus === "canceled" || paddleStatus === "paused") return "canceled";
  return null;
}

function planFromPriceId(env: Env, priceId: unknown): "monthly" | "yearly" | null {
  if (priceId === env.PADDLE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === env.PADDLE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

export async function handlePaddleWebhook(env: Env, rawBody: string): Promise<{ ok: boolean }> {
  const body = JSON.parse(rawBody) as PaddleWebhookBody;

  // Idempotenz VOR jeder Aktion (4.6/4.13) - ein bereits verarbeitetes Event
  // aendert garantiert nichts mehr, egal wie oft Paddle es erneut zustellt.
  if (await isWebhookEventProcessed(env.DB, body.event_id)) {
    return { ok: true };
  }

  if (body.event_type === "subscription.created" || body.event_type === "subscription.updated") {
    await upsertSubscriptionFromPaddle(env, body.data);
  } else if (body.event_type === "subscription.canceled") {
    await markSubscriptionCanceled(env, body.data);
  } else if (body.event_type === "transaction.completed") {
    // Fuer den Self-Service-Refund (4.12) wird die zuletzt abgerechnete
    // Transaktions-ID gebraucht - Paddles Adjustments-API refundet gegen eine
    // transaction_id, nicht gegen die subscription_id direkt.
    await storeLatestTransactionId(env, body.data);
  }
  // Der Subscription-Status bleibt die massgebliche Quelle fuer Entitlement
  // (4.6) - transaction.completed liefert nur die Transaktions-ID nach.

  await markWebhookEventProcessed(env.DB, body.event_id);
  return { ok: true };
}

async function upsertSubscriptionFromPaddle(env: Env, data: Record<string, unknown>): Promise<void> {
  const customData = data.custom_data as { user_id?: string } | undefined;
  const userId = customData?.user_id;
  if (!userId) {
    console.error("paddle_webhook_missing_user_id");
    return;
  }
  const paddleSubscriptionId = String(data.id ?? "");
  const paddleCustomerId = String(data.customer_id ?? "");
  const status = statusFromPaddle(data.status);
  const items = data.items as { price?: { id?: string } }[] | undefined;
  const plan = planFromPriceId(env, items?.[0]?.price?.id);
  const periodEndRaw = (data.current_billing_period as { ends_at?: string } | undefined)?.ends_at;
  const periodEnd = periodEndRaw ? new Date(periodEndRaw).getTime() : Date.now();
  const scheduledChange = data.scheduled_change as { action?: string } | null | undefined;
  const cancelAtPeriodEnd = scheduledChange?.action === "cancel" ? 1 : 0;

  if (!paddleSubscriptionId || !status || !plan) {
    console.error("paddle_webhook_incomplete_subscription_data");
    return;
  }

  // T1 (Spec-v3.0 Kap. 3.1a): sobald Paddle den Trial-Status meldet, gilt das
  // Trial fuer dieses Konto dauerhaft als verbraucht - unabhaengig davon, ob
  // die Subscription-Zeile spaeter auf 'active'/'canceled' wechselt.
  if (status === "trialing") {
    await markTrialUsedForUser(env.DB, userId);
  }

  const existing = await env.DB.prepare("SELECT * FROM subscriptions WHERE paddle_subscription_id = ?")
    .bind(paddleSubscriptionId)
    .first<{ id: string; first_purchase_at: number; status: string; past_due_since: number | null }>();

  const now = Date.now();
  const pastDueSince =
    status === "past_due"
      ? (existing?.past_due_since ?? (existing?.status !== "past_due" ? now : existing.past_due_since))
      : null;

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions SET status = ?, plan = ?, paddle_customer_id = ?, current_period_end = ?,
         cancel_at_period_end = ?, past_due_since = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(
        cancelAtPeriodEnd ? "cancel_scheduled" : status,
        plan,
        paddleCustomerId,
        periodEnd,
        cancelAtPeriodEnd,
        pastDueSince,
        now,
        existing.id,
      )
      .run();

    // Dunning-Mail (Wireframe 14.3 "Zahlung schlaegt fehl") nur beim
    // UEBERGANG in past_due, nicht bei jedem erneuten Webhook mit demselben
    // Status - sonst wuerde jede Paddle-Zustellung eine neue Mail ausloesen.
    if (status === "past_due" && existing.status !== "past_due") {
      const user = await getUserById(env.DB, userId);
      if (user) {
        await dispatchNotification(env, {
          event: "payment_failed",
          recipientEmail: user.email,
          recipientUserId: userId,
          payload: { graceEndsDate: new Date(now + PAST_DUE_GRACE_MS).toLocaleDateString("de-DE") },
        });
      }
    }
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, status, plan, paddle_customer_id, paddle_subscription_id, current_period_end,
         cancel_at_period_end, first_purchase_at, past_due_since, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId(),
        userId,
        cancelAtPeriodEnd ? "cancel_scheduled" : status,
        plan,
        paddleCustomerId,
        paddleSubscriptionId,
        periodEnd,
        cancelAtPeriodEnd,
        now,
        pastDueSince,
        now,
      )
      .run();

    // Konzept-Dok "Rechnungserstellung und Versand" Abschnitt 1: nur bei
    // 'active' (echte, sofortige Zahlung) - nicht bei 'trialing', da dort noch
    // nichts abgebucht wurde und "Zahlung erfolgreich" falsch waere.
    if (status === "active") {
      const user = await getUserById(env.DB, userId);
      if (user) {
        await dispatchNotification(env, {
          event: "payment_succeeded",
          recipientEmail: user.email,
          recipientUserId: userId,
          payload: {
            plan,
            amount: plan === "monthly" ? "4,99 €" : "49,99 €",
            periodEndDate: new Date(periodEnd).toLocaleDateString("de-DE"),
          },
        });
      }
    }
  }
}

async function storeLatestTransactionId(env: Env, data: Record<string, unknown>): Promise<void> {
  const transactionId = String(data.id ?? "");
  const subscriptionId = data.subscription_id ? String(data.subscription_id) : null;
  if (!transactionId || !subscriptionId) return;
  await env.DB.prepare(
    "UPDATE subscriptions SET latest_transaction_id = ? WHERE paddle_subscription_id = ?",
  )
    .bind(transactionId, subscriptionId)
    .run();
}

async function markSubscriptionCanceled(env: Env, data: Record<string, unknown>): Promise<void> {
  const paddleSubscriptionId = String(data.id ?? "");
  if (!paddleSubscriptionId) return;
  await env.DB.prepare(
    "UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE paddle_subscription_id = ?",
  )
    .bind(Date.now(), paddleSubscriptionId)
    .run();
}
