// Stripe-Webhook-Verarbeitung (Spec Abschnitt 3). Signaturpruefung zuerst,
// Idempotenz-Check gegen processed_webhook_events VOR jeder Aktion (Stripe
// liefert Events "at least once", gleiches Prinzip wie bisher bei Paddle -
// siehe worker/src/stripe/webhook.test.ts).
import type Stripe from "stripe";
import type { Env } from "../types";
import { preisText } from "../preise";
import { getUserById, isWebhookEventProcessed, markTrialUsedForUser, markWebhookEventProcessed, newId } from "../db";
import { dispatchNotification } from "../notifications";
import { PAST_DUE_GRACE_MS } from "../entitlement";
import { getStripeClient } from "./client";

export async function verifyStripeSignature(
  env: Env,
  rawBody: string,
  signatureHeader: string | null,
): Promise<Stripe.Event | null> {
  if (!env.STRIPE_WEBHOOK_SECRET || !signatureHeader) return null;
  try {
    const stripe = getStripeClient(env);
    // constructEventAsync statt constructEvent: Cloudflare Workers stellt
    // Node's `crypto`-Modul nicht bereit, das SDK nutzt hier Web Crypto (async).
    return await stripe.webhooks.constructEventAsync(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("stripe_signature_verification_failed", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

// Stripe kennt 'trialing', 'active', 'past_due', 'canceled', 'unpaid',
// 'incomplete', 'incomplete_expired'. Die bestehende Vier-Wert-Logik
// ('active'/'trialing'/'past_due'/'canceled') bleibt.
//
// Live-Befund (2026-08-27, gegen den echten Stripe-Testmodus verifiziert,
// siehe Spec Abschnitt 9.2 "muss geprueft werden"): subscriptions.create()
// mit payment_behavior:"default_incomplete" (stripe/checkout.ts) loest SOFORT
// ein customer.subscription.created-Event mit Status 'incomplete' aus -
// lange BEVOR der Kunde ueberhaupt die Kartendaten eingegeben hat. Wurde das
// wie 'unpaid' auf 'canceled' abgebildet, legte der allererste Webhook eine
// D1-Zeile mit status='canceled' an; der spaetere echte Uebergang zu
// 'active'/'trialing' lief dadurch als UPDATE von 'canceled' statt als
// INSERT bzw. als Uebergang von 'trialing' - und traf keine der beiden
// Willkommens-Mail-Bedingungen in upsertSubscriptionFromStripe() mehr
// (siehe dort). 'incomplete'/'incomplete_expired' sind reines
// Vor-Zahlung-Rauschen ohne jede Entitlement-Bedeutung (kein Kunde hat
// jemals Zugriff, solange dieser Status steht) und werden deshalb jetzt statt
// dessen komplett ignoriert (null) - der naechste Webhook mit einem echten
// Status legt die Zeile dann sauber per INSERT an. 'unpaid' bleibt auf
// 'canceled' abgebildet: das betrifft eine BEREITS bezahlte Subscription,
// deren Verlaengerung nach allen Dunning-Versuchen endgueltig fehlschlug -
// dort existiert die D1-Zeile schon und der Uebergang ist inhaltlich korrekt.
function statusFromStripe(stripeStatus: unknown): "active" | "trialing" | "past_due" | "canceled" | null {
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing") return "trialing";
  if (stripeStatus === "past_due") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "unpaid") return "canceled";
  return null;
}

function planFromPriceId(env: Env, priceId: unknown): "monthly" | "yearly" | null {
  if (priceId === env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

export async function handleStripeWebhook(env: Env, event: Stripe.Event): Promise<{ ok: boolean }> {
  // Idempotenz VOR jeder Aktion - ein bereits verarbeitetes Event aendert
  // garantiert nichts mehr, egal wie oft Stripe es erneut zustellt.
  if (await isWebhookEventProcessed(env.DB, event.id)) {
    return { ok: true };
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await upsertSubscriptionFromStripe(env, event.data.object as Stripe.Subscription);
  } else if (event.type === "customer.subscription.deleted") {
    await markSubscriptionCanceled(env, event.data.object as Stripe.Subscription);
  } else if (event.type === "invoice.payment_succeeded") {
    await storeLatestInvoiceId(env, event.data.object as Stripe.Invoice);
  } else if (event.type === "invoice.payment_failed") {
    // Kein Paddle-Aequivalent (Spec Abschnitt 3, Punkt 9.2): bei Paddle kam
    // der past_due-Uebergang implizit ueber subscription.updated mit, Stripe
    // trennt das staerker in eigene Invoice-Events. Der past_due-Uebergang
    // selbst (inkl. Dunning-Mail) wird trotzdem ueber
    // customer.subscription.updated abgedeckt, sobald Stripe den
    // Subscription-Status entsprechend aendert - dieser Zweig sorgt nur
    // dafuer, dass ein fehlgeschlagener Zahlungsversuch nicht mangels
    // gehandhabtem Event-Typ als "unbekannt" durchrutscht.
  }
  // Der Subscription-Status bleibt die massgebliche Quelle fuer Entitlement -
  // invoice.payment_succeeded liefert nur die Rechnungs-ID nach.

  await markWebhookEventProcessed(env.DB, event.id);
  return { ok: true };
}

async function upsertSubscriptionFromStripe(env: Env, sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.user_id;
  if (!userId) {
    console.error("stripe_webhook_missing_user_id");
    return;
  }
  const stripeSubscriptionId = sub.id;
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Stripe garantiert die Zustellreihenfolge von Webhook-Events NICHT (Live-
  // Befund 2026-08-27: Rechnungsuebersicht blieb nach dem allerersten Kauf
  // dauerhaft leer). invoice.payment_succeeded traf teils EHER ein als
  // dieses subscription.updated/created - storeLatestInvoiceId() lief dann
  // gegen ein UPDATE ohne passende Zeile (die entsteht ja erst hier unten
  // per INSERT), und Stripes Idempotenz-Garantie ("at least once") stellt
  // dasselbe Event nie wieder zu - die Rechnungs-ID war fuer den ersten
  // Abrechnungszyklus fuer immer verloren. sub.latest_invoice traegt dieselbe
  // ID bereits am Subscription-Objekt selbst (wie sub.customer oben), macht
  // das Race also komplett ueberfluessig: die ID kommt direkt von hier statt
  // vom separaten Event.
  const latestInvoiceId =
    typeof sub.latest_invoice === "string"
      ? sub.latest_invoice
      : (sub.latest_invoice?.id ?? null);
  const status = statusFromStripe(sub.status);
  const priceId = sub.items.data[0]?.price?.id;
  const plan = planFromPriceId(env, priceId);
  const periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : Date.now();
  const cancelAtPeriodEnd = sub.cancel_at_period_end ? 1 : 0;

  // Kein Fehler, sondern erwartetes Vor-Zahlung-Rauschen ('incomplete'/
  // 'incomplete_expired', siehe statusFromStripe) - kein console.error, das
  // waere bei jedem einzelnen Checkout-Start ein falscher Alarm im Log.
  if (!status) return;

  if (!stripeSubscriptionId || !plan) {
    console.error("stripe_webhook_incomplete_subscription_data");
    return;
  }

  // T1: sobald Stripe den Trial-Status meldet, gilt das Trial fuer dieses
  // Konto dauerhaft als verbraucht - unabhaengig davon, ob die
  // Subscription-Zeile spaeter auf 'active'/'canceled' wechselt (gleiches
  // Verhalten wie zuvor bei Paddle).
  if (status === "trialing") {
    await markTrialUsedForUser(env.DB, userId);
  }

  const existing = await env.DB.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?")
    .bind(stripeSubscriptionId)
    .first<{ id: string; first_purchase_at: number; status: string; past_due_since: number | null }>();

  const now = Date.now();
  const pastDueSince =
    status === "past_due"
      ? (existing?.past_due_since ?? (existing?.status !== "past_due" ? now : existing.past_due_since))
      : null;

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions SET status = ?, plan = ?, stripe_customer_id = ?, current_period_end = ?,
         cancel_at_period_end = ?, past_due_since = ?, latest_invoice_id = COALESCE(?, latest_invoice_id), updated_at = ? WHERE id = ?`,
    )
      .bind(
        cancelAtPeriodEnd ? "cancel_scheduled" : status,
        plan,
        stripeCustomerId,
        periodEnd,
        cancelAtPeriodEnd,
        pastDueSince,
        latestInvoiceId,
        now,
        existing.id,
      )
      .run();

    // Dunning-Mail nur beim UEBERGANG in past_due, nicht bei jedem erneuten
    // Webhook mit demselben Status - sonst wuerde jede Stripe-Zustellung eine
    // neue Mail ausloesen (gleiche Logik wie bisher bei Paddle).
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

    // Willkommens-Mail beim Uebergang trialing -> active (erste echte
    // Abbuchung nach Trial-Ende) - gleiche Logik wie zuvor bei Paddle.
    if (status === "active" && existing.status === "trialing") {
      const user = await getUserById(env.DB, userId);
      if (user) {
        await dispatchNotification(env, {
          event: "payment_succeeded",
          recipientEmail: user.email,
          recipientUserId: userId,
          payload: {
            plan,
            amount: preisText(plan),
            periodEndDate: new Date(periodEnd).toLocaleDateString("de-DE"),
          },
        });
      }
    }
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, status, plan, stripe_customer_id, stripe_subscription_id, current_period_end,
         cancel_at_period_end, first_purchase_at, past_due_since, latest_invoice_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId(),
        userId,
        cancelAtPeriodEnd ? "cancel_scheduled" : status,
        plan,
        stripeCustomerId,
        stripeSubscriptionId,
        periodEnd,
        cancelAtPeriodEnd,
        now,
        pastDueSince,
        latestInvoiceId,
        now,
      )
      .run();

    // Nur bei 'active' (echte, sofortige Zahlung) - nicht bei 'trialing', da
    // dort noch nichts abgebucht wurde.
    if (status === "active") {
      const user = await getUserById(env.DB, userId);
      if (user) {
        await dispatchNotification(env, {
          event: "payment_succeeded",
          recipientEmail: user.email,
          recipientUserId: userId,
          payload: {
            plan,
            amount: preisText(plan),
            periodEndDate: new Date(periodEnd).toLocaleDateString("de-DE"),
          },
        });
      }
    }
  }
}

async function storeLatestInvoiceId(env: Env, invoice: Stripe.Invoice): Promise<void> {
  const invoiceId = invoice.id;
  const subField = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const subscriptionId = typeof subField === "string" ? subField : subField?.id ?? null;
  if (!invoiceId || !subscriptionId) return;
  await env.DB.prepare(
    "UPDATE subscriptions SET latest_invoice_id = ? WHERE stripe_subscription_id = ?",
  )
    .bind(invoiceId, subscriptionId)
    .run();
}

async function markSubscriptionCanceled(env: Env, sub: Stripe.Subscription): Promise<void> {
  const stripeSubscriptionId = sub.id;
  if (!stripeSubscriptionId) return;
  await env.DB.prepare(
    "UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?",
  )
    .bind(Date.now(), stripeSubscriptionId)
    .run();
}
