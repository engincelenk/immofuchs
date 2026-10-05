// Billing-Routen: Checkout-Subscription erzeugen, Stripe-Webhook empfangen,
// Kündigung/Reaktivierung/Refund. Ersetzt den bisherigen Paddle-Weg
// vollstaendig (Wechsel weg von Paddle als Merchant of Record, siehe
// docs/plans/2026-08-26-paddle-zu-stripe-migration-spec.md).
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireCsrfOrigin, type AuthVars } from "../middleware";
import {
  createSubscriptionCheckout,
  cancelImmediately,
  revokeScheduledCancellation,
  getPaidAmountCents,
  createPortalSession,
  changeSubscriptionPlan,
} from "../stripe/checkout";
import { findUsableDiscountByCode } from "../stripe/discounts";
import { handleStripeWebhook, verifyStripeSignature } from "../stripe/webhook";
import { getInvoiceSummary } from "../stripe/transactions";
import { getStripeClient } from "../stripe/client";
import { getActiveSubscription, getLatestSubscriptionForUser, resetTestUserSubscription, ADMIN_TEST_SUBSCRIPTION_PREFIX } from "../db";
import { dispatchNotification } from "../notifications";
import { berechneWiderruf } from "../stripe/withdrawal";
import { cleanName, formatZeitpunkt, kuendigen, widerrufen } from "../contractActions";

export const billingRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

billingRoutes.post("/checkout", requireAuth, requireCsrfOrigin, async (c) => {
  // Guard (Spec-v3.0 Kap. 3.0): Zahlungs-/Trial-Start ist erst nach
  // bestaetigter E-Mail erlaubt (Betrugspraevention, Rechnungsstellung).
  if (!c.var.user.email_verified_at) return c.json({ error: "email_not_verified" }, 403);
  const body = await c.req.json().catch(() => null);
  const plan = body?.plan === "yearly" ? "yearly" : body?.plan === "monthly" ? "monthly" : null;
  if (!plan) return c.json({ error: "invalid_plan" }, 400);

  // Doppelbuchung verhindern: wer ein laufendes, gekuendigtes oder offenes Abo hat, kauft nicht
  // erneut - Laufzeitwechsel, Reaktivierung und Zahlungsprobleme laufen ueber /change-plan,
  // /reactivate und /portal.
  const bestehend = await getActiveSubscription(c.env.DB, c.var.userId);
  if (bestehend) return c.json({ error: "already_subscribed" }, 409);

  // Stufe F (Gutscheine ueber Stripe Coupons/Promotion Codes): Code wird HIER
  // server-seitig gegen Stripe aufgeloest, nie vom Client vertrauenswuerdig
  // entgegengenommen - sonst koennte jeder Klient einen beliebigen
  // coupon-Wert mitschicken und sich selbst rabattieren.
  const rawCode = body && typeof body.discountCode === "string" ? body.discountCode.trim() : "";
  let couponId: string | null = null;
  if (rawCode) {
    try {
      const discount = await findUsableDiscountByCode(c.env, rawCode);
      if (!discount) return c.json({ error: "invalid_discount_code" }, 400);
      couponId = discount.couponId;
    } catch (err) {
      console.error("billing_discount_lookup_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "invalid_discount_code" }, 400);
    }
  }

  // Rechnungsadresse (AddressStep.jsx, zwingend seit dem Wechsel weg von
  // Paddle als Merchant of Record) - landet auf dem Stripe-Customer-Datensatz,
  // siehe stripe/checkout.ts/findOrCreateCustomer.
  // Feldumfang erweitert 2026-08-27 (Nutzer-Vorgabe): Vor-/Nachname, Strasse
  // UND Hausnummer getrennt, Land aus voller Liste, optional Firma und
  // USt-IdNr. Alle Pflichtfelder muessen nach dem Trimmen belegt sein - ein
  // leerer String ist hier so unbrauchbar wie ein fehlendes Feld, weil er
  // stillschweigend auf einer unvollstaendigen Rechnung landen wuerde.
  const rawAddress = body?.address;
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const country = str(rawAddress?.country).toUpperCase();
  const candidate = {
    firstName: str(rawAddress?.firstName),
    lastName: str(rawAddress?.lastName),
    street: str(rawAddress?.street),
    houseNumber: str(rawAddress?.houseNumber),
    zip: str(rawAddress?.zip),
    city: str(rawAddress?.city),
    country,
    company: str(rawAddress?.company) || undefined,
    vatId: str(rawAddress?.vatId) || undefined,
  };
  const addressComplete =
    Boolean(rawAddress) &&
    /^[A-Z]{2}$/.test(candidate.country) &&
    (["firstName", "lastName", "street", "houseNumber", "zip", "city"] as const).every(
      (key) => candidate[key].length > 0,
    );
  const address = addressComplete ? candidate : null;

  try {
    const { clientSecret } = await createSubscriptionCheckout(
      c.env,
      c.var.userId,
      c.var.user.email,
      plan,
      couponId,
      address,
    );
    return c.json({ clientSecret });
  } catch (err) {
    console.error("billing_checkout_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "checkout_failed" }, 502);
  }
});

// Kein requireAuth/CSRF - Stripe authentifiziert sich ueber die Signatur,
// nicht ueber Session/Origin (analog zum bisherigen Paddle-Webhook).
billingRoutes.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("Stripe-Signature");
  const event = await verifyStripeSignature(c.env, rawBody, signature ?? null);
  if (!event) return c.json({ error: "invalid_signature" }, 401);
  try {
    await handleStripeWebhook(c.env, event);
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_webhook_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "webhook_processing_failed" }, 500);
  }
});

// Rechnungsuebersicht + Zahlungsmethode-Aenderung - kein Eigenbau, verweist
// auf Stripes gehostetes Kundenportal.
billingRoutes.get("/portal", requireAuth, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || !sub.stripe_customer_id) return c.json({ error: "no_active_subscription" }, 404);
  try {
    const returnUrl = `${c.env.APP_BASE_URL || "https://immofuchs.info"}/konto`;
    const { url } = await createPortalSession(c.env, sub.stripe_customer_id, returnUrl);
    return c.json({ url });
  } catch (err) {
    console.error("billing_portal_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "portal_failed" }, 502);
  }
});

billingRoutes.post("/cancel", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || sub.status === "canceled" || !sub.stripe_subscription_id) {
    return c.json({ error: "no_active_subscription" }, 404);
  }
  const res = await kuendigen(c.env, {
    email: c.var.user.email,
    name: "",
    receivedAt: Date.now(),
    channel: "account",
    user: c.var.user,
    sub,
  });
  if (!res.ok) return c.json({ error: res.error }, 502);
  return c.json({ ok: true, periodEnd: sub.current_period_end });
});

billingRoutes.post("/reactivate", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || sub.status !== "cancel_scheduled" || !sub.stripe_subscription_id) {
    return c.json({ error: "not_cancel_scheduled" }, 400);
  }
  try {
    await revokeScheduledCancellation(c.env, sub.stripe_subscription_id);
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

// Tarifwechsel monatlich <-> jaehrlich. Der neue Tarif wird NICHT hier nach
// D1 geschrieben - Stripe sendet ein customer.subscription.updated-Webhook,
// das der bestehende Handler verarbeitet und das die Zeile aktualisiert
// (gleiche Begruendung wie beim Checkout: der Webhook ist die einzige
// Schreibquelle fuer Plan/Periode, sonst gaebe es zwei Wahrheiten).
billingRoutes.post("/change-plan", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const plan = body?.plan === "yearly" ? "yearly" : body?.plan === "monthly" ? "monthly" : null;
  if (!plan) return c.json({ error: "invalid_plan" }, 400);

  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || !sub.stripe_subscription_id) return c.json({ error: "no_active_subscription" }, 404);
  if (sub.plan === plan) return c.json({ error: "already_on_plan" }, 400);

  try {
    await changeSubscriptionPlan(c.env, sub.stripe_subscription_id, plan);
    return c.json({ ok: true });
  } catch (err) {
    console.error("billing_change_plan_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "change_plan_failed" }, 502);
  }
});

// ═══ Rechnungen ═══
// Quelle ist Stripe Invoicing, nicht D1 - wir speichern nur die
// latest_invoice_id (Migration 0027) und holen den Beleg bei Bedarf frisch.

billingRoutes.get("/invoices", requireAuth, async (c) => {
  // Ohne Subscription hat der Nutzer schlicht keine Rechnungen - das ist der
  // Normalfall fuer Free-Nutzer und kein Fehler, daher 200 mit leerer Liste.
  const sub = await getLatestSubscriptionForUser(c.env.DB, c.var.userId);
  if (!sub || !sub.latest_invoice_id) return c.json({ invoices: [] });
  try {
    const invoice = await getInvoiceSummary(c.env, sub.latest_invoice_id);
    return c.json({ invoices: invoice ? [invoice] : [] });
  } catch (err) {
    console.error("billing_invoices_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "invoices_failed" }, 502);
  }
});

billingRoutes.get("/invoices/:invoiceId/pdf", requireAuth, async (c) => {
  const invoiceId = c.req.param("invoiceId");
  const sub = await getLatestSubscriptionForUser(c.env.DB, c.var.userId);
  // Sicherheitskern dieses Endpunkts: die invoice_id aus dem Pfad wird NIE
  // ungeprueft an Stripe weitergereicht. Sonst koennte jeder eingeloggte
  // Nutzer mit einer geratenen/abgeschauten ID die Rechnung eines fremden
  // Kunden ziehen (IDOR).
  if (!sub || sub.latest_invoice_id !== invoiceId) {
    return c.json({ error: "not_your_transaction" }, 403);
  }
  try {
    const stripe = getStripeClient(c.env);
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (!invoice.invoice_pdf) return c.json({ error: "invoice_pdf_missing" }, 404);
    return c.json({ url: invoice.invoice_pdf });
  } catch (err) {
    console.error("billing_invoice_pdf_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "invoice_pdf_failed" }, 502);
  }
});

// ═══ Widerruf (§ 355 BGB, Verbraucher, 14 Tage) ═══
// Vorschau: ob der Widerruf noch moeglich ist und was erstattet wuerde. Gleiche
// Rechnung wie beim Absenden (withdrawalQuote), damit Vorschau und Ergebnis
// nicht auseinanderlaufen.
async function withdrawalQuote(c: { env: Env; var: AuthVars }) {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || !sub.stripe_subscription_id) return { sub: null as null };
  let amountPaid = 0;
  let paymentIntentId: string | null = null;
  if (sub.latest_invoice_id) {
    const paid = await getPaidAmountCents(c.env, sub.latest_invoice_id);
    amountPaid = paid.amountPaid;
    paymentIntentId = paid.paymentIntentId;
  }
  const quote = berechneWiderruf({
    bezahltCent: amountPaid,
    plan: sub.plan === "yearly" ? "yearly" : "monthly",
    vertragsschluss: sub.first_purchase_at,
    jetzt: Date.now(),
  });
  return { sub, quote, amountPaid, paymentIntentId };
}

billingRoutes.get("/withdraw-preview", requireAuth, async (c) => {
  try {
    const q = await withdrawalQuote(c);
    if (!q.sub) return c.json({ eligible: false, reason: "no_active_subscription" });
    return c.json({
      eligible: q.quote.imFrist,
      daysLeft: q.quote.tageUebrig,
      daysUsed: q.quote.tageGenutzt,
      paidCents: q.amountPaid,
      compensationCents: q.quote.wertersatzCent,
      refundCents: q.quote.erstattungCent,
      currency: "eur",
    });
  } catch (err) {
    console.error("billing_withdraw_preview_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "withdraw_preview_failed" }, 502);
  }
});

billingRoutes.post("/withdraw", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (!sub || !sub.stripe_subscription_id) return c.json({ error: "no_active_subscription" }, 404);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = cleanName(body?.name);
  // § 356a Abs. 2 BGB: der Name gehoert zu den Pflichtangaben der Widerrufserklaerung.
  if (name.length < 2) return c.json({ error: "invalid_name" }, 400);
  const receivedAt = Date.now();
  const res = await widerrufen(c.env, {
    email: c.var.user.email,
    name,
    receivedAt,
    channel: "account",
    user: c.var.user,
    sub,
  });
  if (!res.ok) return c.json({ error: res.error }, 502);
  if (!res.gefunden) return c.json({ error: "no_active_subscription" }, 404);
  if ("fristAbgelaufen" in res) return c.json({ error: "withdrawal_window_expired" }, 400);
  return c.json({
    ok: true,
    refundCents: res.erstattungCent,
    compensationCents: res.wertersatzCent,
    receivedAt: formatZeitpunkt(receivedAt),
  });
});

// QA: Testkonto-Reset (2026-08-18) - NUR fuer is_test_user-Konten, damit sich
// derselbe Testaccount beliebig oft von "kein Abo" aus neu durchspielen laesst
// (Checkout -> Trial -> Kuendigen -> Reset -> von vorne), ohne bei jedem
// Durchlauf einen neuen Nutzer anzulegen. Lehnt bei echten Kundenkonten sofort
// ab (403), unabhaengig vom sonstigen Abo-Zustand - siehe requireAuth/is_test_user
// oben. Synthetische Admin-Test-Abos (admin-test:-Praefix) werden nicht an
// Stripe gemeldet, dieselbe Absicherung wie in accountDeletion.ts (Bugreport
// 2026-08-18: 502 beim Loeschen eines Testusers mit Fake-Abo).
billingRoutes.post("/test-reset", requireAuth, requireCsrfOrigin, async (c) => {
  if (!c.var.user.is_test_user) return c.json({ error: "not_a_test_user" }, 403);
  const sub = await getLatestSubscriptionForUser(c.env.DB, c.var.userId);
  if (sub?.stripe_subscription_id && !sub.stripe_subscription_id.startsWith(ADMIN_TEST_SUBSCRIPTION_PREFIX)) {
    try {
      await cancelImmediately(c.env, sub.stripe_subscription_id);
    } catch (err) {
      console.error("billing_test_reset_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "test_reset_failed" }, 502);
    }
  }
  await resetTestUserSubscription(c.env.DB, c.var.userId);
  return c.json({ ok: true });
});
