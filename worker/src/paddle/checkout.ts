// Paddle-Checkout + Subscription-Lifecycle-Aufrufe (Spec 4.6, 4.11, 4.12).
// Das Overlay selbst (Paddle.js) laeuft im Client - hier nur die
// server-zu-server-Anteile: Transaktion erzeugen, kuendigen/reaktivieren,
// Rückerstattung anstossen.
import type { Env } from "../types";
import { paddleFetch } from "./client";

export type Plan = "monthly" | "yearly";

function priceIdFor(env: Env, plan: Plan): string {
  const id = plan === "monthly" ? env.PADDLE_PRICE_ID_MONTHLY : env.PADDLE_PRICE_ID_YEARLY;
  if (!id) throw new Error("paddle_price_not_configured");
  return id;
}

// Erzeugt eine Draft-Transaktion, die der Client per Paddle.Checkout.open({
// transactionId }) als Overlay oeffnet (4.6, Punkt 1-2). custom_data.user_id
// wird im Webhook wieder ausgelesen, um die Zahlung dem richtigen Konto
// zuzuordnen.
export async function createCheckoutTransaction(
  env: Env,
  userId: string,
  email: string,
  plan: Plan,
): Promise<{ transactionId: string }> {
  const result = await paddleFetch(env, "/transactions", {
    method: "POST",
    body: {
      items: [{ price_id: priceIdFor(env, plan), quantity: 1 }],
      customer: { email },
      custom_data: { user_id: userId },
    },
  });
  if (!result.ok) {
    // Detailtext mitloggen (Befund 05.08.): vorher stand nur der HTTP-Status im
    // Log, ohne Paddles eigentliche Fehlermeldung ("price not found" vs.
    // "invalid request" vs. ...) - das machte jede Diagnose zum Raten.
    console.error("paddle_create_transaction_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_create_transaction_failed_${result.status}`);
  }
  const data = result.data as { data?: { id?: string } };
  const transactionId = data.data?.id;
  if (!transactionId) throw new Error("paddle_transaction_id_missing");
  return { transactionId };
}

// Kündigung zum Periodenende (4.11, Standardfall, §312k-BGB-konform ueber
// den eigenen In-App-Flow, nicht nur Portal-Link).
export async function cancelAtPeriodEnd(env: Env, paddleSubscriptionId: string): Promise<void> {
  const result = await paddleFetch(env, `/subscriptions/${paddleSubscriptionId}/cancel`, {
    method: "POST",
    body: { effective_from: "next_billing_period" },
  });
  if (!result.ok) throw new Error(`paddle_cancel_failed_${result.status}`);
}

// Sofortige Kündigung (4.10, Art. 17 Konto-Löschung - "löschen" ist ein
// expliziter Endgueltigkeits-Wunsch, nicht zum Periodenende).
export async function cancelImmediately(env: Env, paddleSubscriptionId: string): Promise<void> {
  const result = await paddleFetch(env, `/subscriptions/${paddleSubscriptionId}/cancel`, {
    method: "POST",
    body: { effective_from: "immediately" },
  });
  if (!result.ok) throw new Error(`paddle_cancel_immediately_failed_${result.status}`);
}

// Reaktivierung: solange cancel_scheduled und die Periode noch laeuft, hebt
// dies die geplante Kuendigung wieder auf (4.11, S4-2).
export async function revokeScheduledCancellation(
  env: Env,
  paddleSubscriptionId: string,
): Promise<void> {
  const result = await paddleFetch(env, `/subscriptions/${paddleSubscriptionId}`, {
    method: "PATCH",
    body: { scheduled_change: null },
  });
  if (!result.ok) throw new Error(`paddle_reactivate_failed_${result.status}`);
}

// Tarifwechsel monatlich <-> jaehrlich (Phase 2). Paddle rechnet die
// Restlaufzeit des alten Tarifs sofort anteilig ab und stellt die Differenz
// direkt in Rechnung ("prorated_immediately") - der Nutzer bekommt den neuen
// Tarif also unmittelbar, nicht erst zum Periodenende. Der D1-Datensatz wird
// hier BEWUSST NICHT angefasst: Paddle schickt im Anschluss ein
// subscription.updated-Webhook, das der bestehende Handler bereits verarbeitet
// und das plan/current_period_end konsistent nachzieht (gleiche Begruendung
// wie beim Checkout-Flow, 4.6 - der Webhook ist die einzige Schreibquelle).
export async function changeSubscriptionPlan(
  env: Env,
  paddleSubscriptionId: string,
  plan: Plan,
): Promise<void> {
  const result = await paddleFetch(env, `/subscriptions/${paddleSubscriptionId}`, {
    method: "PATCH",
    body: {
      items: [{ price_id: priceIdFor(env, plan), quantity: 1 }],
      proration_billing_mode: "prorated_immediately",
    },
  });
  if (!result.ok) {
    console.error("paddle_change_plan_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_change_plan_failed_${result.status}`);
  }
}

// Customer-Portal-Session (4.6/4.7/4.10): Paddle uebernimmt Rechnungsuebersicht
// und Zahlungsmethoden-Aenderung selbst - kein Eigenbau. Die Session-URL ist
// kurzlebig, daher bei jedem Klick frisch angefordert statt zwischengespeichert.
export async function createPortalSession(env: Env, paddleCustomerId: string): Promise<{ url: string }> {
  const result = await paddleFetch(env, `/customers/${paddleCustomerId}/portal-sessions`, {
    method: "POST",
    body: {},
  });
  if (!result.ok) throw new Error(`paddle_portal_session_failed_${result.status}`);
  const data = result.data as { data?: { urls?: { general?: { overview?: string } } } };
  const url = data.data?.urls?.general?.overview;
  if (!url) throw new Error("paddle_portal_url_missing");
  return { url };
}

// Self-Service-Rueckerstattung (4.12): volle Rueckerstattung der letzten
// Transaktion dieser Subscription, ausgeloest innerhalb 14 Tagen ab
// first_purchase_at (vom aufrufenden Endpunkt geprueft, nicht hier).
export async function refundLatestTransaction(env: Env, transactionId: string): Promise<void> {
  const result = await paddleFetch(env, "/adjustments", {
    method: "POST",
    body: {
      action: "refund",
      transaction_id: transactionId,
      reason: "customer_request_14_day_guarantee",
      type: "full",
    },
  });
  if (!result.ok) throw new Error(`paddle_refund_failed_${result.status}`);
}

// ═══ Rechnungen (Phase 4) ═══
// Paddle ist Merchant of Record - die Rechnungen liegen dort, nicht in D1
// (4.10). Statt sie zu spiegeln (Steuer-/Adressdaten, die wir nach 4.13
// bewusst nicht vorhalten wollen), werden sie bei jedem Aufruf frisch geholt.

export interface PaddleInvoice {
  id: string;
  billedAt: string | null;
  // Betrag bleibt exakt so, wie Paddle ihn liefert: String in der kleinsten
  // Waehrungseinheit (Cent). Bewusst KEINE Waehrungsrechnung im Worker -
  // Rundung/Formatierung passiert im Frontend anhand von `currency`, damit es
  // hier keine zweite, abweichende Wahrheit zum Paddle-Beleg gibt.
  amount: string;
  currency: string;
  status: string;
}

export async function listTransactions(
  env: Env,
  paddleCustomerId: string,
): Promise<PaddleInvoice[]> {
  const result = await paddleFetch(
    env,
    `/transactions?customer_id=${encodeURIComponent(paddleCustomerId)}&status=billed,completed&order_by=billed_at[DESC]&per_page=50`,
    { method: "GET" },
  );
  if (!result.ok) {
    console.error("paddle_list_transactions_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_list_transactions_failed_${result.status}`);
  }
  const data = result.data as {
    data?: {
      id?: string;
      billed_at?: string | null;
      currency_code?: string;
      status?: string;
      details?: { totals?: { total?: string } };
    }[];
  };
  return (data.data ?? [])
    .filter((tx) => Boolean(tx.id))
    .map((tx) => ({
      id: String(tx.id),
      billedAt: tx.billed_at ?? null,
      amount: tx.details?.totals?.total ?? "0",
      currency: tx.currency_code ?? "EUR",
      status: tx.status ?? "unknown",
    }));
}

// Die zurueckgegebene URL ist kurzlebig und signiert (analog zur
// Portal-Session, s.o.) - daher bei jedem Klick frisch angefordert statt
// gespeichert.
export async function getInvoicePdfUrl(env: Env, transactionId: string): Promise<string> {
  const result = await paddleFetch(env, `/transactions/${transactionId}/invoice`, { method: "GET" });
  if (!result.ok) throw new Error(`paddle_invoice_pdf_failed_${result.status}`);
  const data = result.data as { data?: { url?: string } };
  const url = data.data?.url;
  if (!url) throw new Error("paddle_invoice_url_missing");
  return url;
}
