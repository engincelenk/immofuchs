// Billing-Routen (Spec 4.6, 4.11, 4.12): Checkout-Transaktion erzeugen,
// Paddle-Webhook empfangen, Kündigung/Reaktivierung/Refund.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireCsrfOrigin, type AuthVars } from "../middleware";
import { createCheckoutTransaction, cancelAtPeriodEnd, cancelImmediately, revokeScheduledCancellation, refundLatestTransaction, createPortalSession, changeSubscriptionPlan, listTransactions, getInvoicePdfUrl } from "../paddle/checkout";
import { handlePaddleWebhook, verifyPaddleSignature } from "../paddle/webhook";
import { getActiveSubscription, getLatestSubscriptionForUser } from "../db";
import { dispatchNotification } from "../notifications";

export const billingRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

const REFUND_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

billingRoutes.post("/checkout", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const plan = body?.plan === "yearly" ? "yearly" : body?.plan === "monthly" ? "monthly" : null;
  if (!plan) return c.json({ error: "invalid_plan" }, 400);
  try {
    const { transactionId } = await createCheckoutTransaction(c.env, c.var.userId, c.var.user.email, plan);
    return c.json({ transactionId });
  } catch (err) {
    console.error("billing_checkout_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "checkout_failed" }, 502);
  }
});

// Kein requireAuth/CSRF - Paddle authentifiziert sich ueber die Signatur, nicht
// ueber Session/Origin (4.6, 4.13).
billingRoutes.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("Paddle-Signature");
  const valid = await verifyPaddleSignature(c.env, rawBody, signature ?? null);
  if (!valid) return c.json({ error: "invalid_signature" }, 401);
  try {
    await handlePaddleWebhook(c.env, rawBody);
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_webhook_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "webhook_processing_failed" }, 500);
  }
});

// Rechnungsuebersicht + Zahlungsmethode-Aenderung (4.7, 4.10) - kein
// Eigenbau, verweist auf Paddles gehostetes Kundenportal.
billingRoutes.get("/portal", requireAuth, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub) return c.json({ error: "no_active_subscription" }, 404);
  try {
    const { url } = await createPortalSession(c.env, sub.paddle_customer_id);
    return c.json({ url });
  } catch (err) {
    console.error("billing_portal_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "portal_failed" }, 502);
  }
});

billingRoutes.post("/cancel", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || sub.status === "canceled") return c.json({ error: "no_active_subscription" }, 404);
  try {
    await cancelAtPeriodEnd(c.env, sub.paddle_subscription_id);
    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'cancel_scheduled', cancel_at_period_end = 1, updated_at = ? WHERE id = ?",
    )
      .bind(Date.now(), sub.id)
      .run();
    await dispatchNotification(c.env, {
      event: "cancellation_confirmed",
      recipientEmail: c.var.user.email,
      recipientUserId: c.var.userId,
      payload: { periodEndDate: new Date(sub.current_period_end).toLocaleDateString("de-DE") },
    });
    return c.json({ ok: true, periodEnd: sub.current_period_end });
  } catch (err) {
    console.error("billing_cancel_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "cancel_failed" }, 502);
  }
});

billingRoutes.post("/reactivate", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || sub.status !== "cancel_scheduled") {
    return c.json({ error: "not_cancel_scheduled" }, 400);
  }
  try {
    await revokeScheduledCancellation(c.env, sub.paddle_subscription_id);
    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'active', cancel_at_period_end = 0, updated_at = ? WHERE id = ?",
    )
      .bind(Date.now(), sub.id)
      .run();
    await dispatchNotification(c.env, {
      event: "reactivation_confirmed",
      recipientEmail: c.var.user.email,
      recipientUserId: c.var.userId,
      payload: {},
    });
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_reactivate_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "reactivate_failed" }, 502);
  }
});

// Tarifwechsel monatlich <-> jaehrlich (Phase 2). Der neue Tarif wird NICHT
// hier nach D1 geschrieben - Paddle sendet ein subscription.updated-Webhook,
// das der bestehende Handler verarbeitet und das die Zeile aktualisiert
// (gleiche Begruendung wie beim Checkout: der Webhook ist die einzige
// Schreibquelle fuer Plan/Periode, sonst gaebe es zwei Wahrheiten).
billingRoutes.post("/change-plan", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const plan = body?.plan === "yearly" ? "yearly" : body?.plan === "monthly" ? "monthly" : null;
  if (!plan) return c.json({ error: "invalid_plan" }, 400);

  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub) return c.json({ error: "no_active_subscription" }, 404);
  if (sub.plan === plan) return c.json({ error: "already_on_plan" }, 400);

  try {
    await changeSubscriptionPlan(c.env, sub.paddle_subscription_id, plan);
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_change_plan_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "change_plan_failed" }, 502);
  }
});

// ═══ Rechnungen (Phase 4) ═══
// Quelle ist die Paddle-API, nicht D1 - Paddle ist Merchant of Record und
// haelt die rechtlich massgeblichen Belege (4.10).

billingRoutes.get("/invoices", requireAuth, async (c) => {
  // Ohne Subscription hat der Nutzer schlicht keine Rechnungen - das ist der
  // Normalfall fuer Free-Nutzer und kein Fehler, daher 200 mit leerer Liste.
  const sub = await getLatestSubscriptionForUser(c.env.DB, c.var.userId);
  if (!sub || !sub.paddle_customer_id) return c.json({ invoices: [] });
  try {
    const invoices = await listTransactions(c.env, sub.paddle_customer_id);
    return c.json({ invoices });
  } catch (err) {
    console.error("billing_invoices_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "invoices_failed" }, 502);
  }
});

billingRoutes.get("/invoices/:transactionId/pdf", requireAuth, async (c) => {
  const transactionId = c.req.param("transactionId");
  const sub = await getLatestSubscriptionForUser(c.env.DB, c.var.userId);
  if (!sub || !sub.paddle_customer_id) return c.json({ error: "not_your_transaction" }, 403);
  try {
    // Sicherheitskern dieses Endpunkts: die transaction_id aus dem Pfad wird
    // NIE ungeprueft an Paddle weitergereicht. Sonst koennte jeder
    // eingeloggte Nutzer mit einer geratenen/abgeschauten ID die Rechnung
    // eines fremden Kunden ziehen (IDOR) - Paddle selbst kennt unsere
    // Nutzer-Zuordnung nicht und wuerde die URL bereitwillig ausstellen.
    const invoices = await listTransactions(c.env, sub.paddle_customer_id);
    if (!invoices.some((inv) => inv.id === transactionId)) {
      return c.json({ error: "not_your_transaction" }, 403);
    }
    const url = await getInvoicePdfUrl(c.env, transactionId);
    return c.json({ url });
  } catch (err) {
    console.error("billing_invoice_pdf_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "invoice_pdf_failed" }, 502);
  }
});

billingRoutes.post("/refund", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub) return c.json({ error: "no_active_subscription" }, 404);
  if (Date.now() - sub.first_purchase_at > REFUND_WINDOW_MS) {
    return c.json({ error: "refund_window_expired" }, 400);
  }
  if (!sub.latest_transaction_id) return c.json({ error: "no_transaction_on_file" }, 400);
  try {
    await refundLatestTransaction(c.env, sub.latest_transaction_id);
    await cancelImmediately(c.env, sub.paddle_subscription_id);
    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE id = ?",
    )
      .bind(Date.now(), sub.id)
      .run();
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_refund_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "refund_failed" }, 502);
  }
});
