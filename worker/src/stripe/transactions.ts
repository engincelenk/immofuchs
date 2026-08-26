// Letzte Zahlung eines Abos (Admin-Panel Detailansicht). Bewusst NICHT in D1
// gespiegelt: Stripe Invoicing bleibt einzige Quelle fuer Zahlungsdaten
// (analog zu paddle/transactions.ts) - wir speichern nur die
// latest_invoice_id (Migration 0027) und holen den Rest bei Bedarf.
//
// Deshalb auch nur in der DETAIL-Ansicht, nie in der Liste: eine Tabelle mit
// 20 Zeilen wuerde sonst 20 Stripe-Aufrufe ausloesen.
import type { Env } from "../types";
import { getStripeClient } from "./client";

export interface StripeInvoiceSummary {
  id: string;
  status: string;
  billedAt: string | null;
  // Rohwerte von Stripe: Betrag in der kleinsten Waehrungseinheit (Cent) als
  // String, Waehrung als ISO-Code (Symmetrie zur bisherigen Paddle-Form).
  // Formatiert wird erst in der Oberflaeche.
  grandTotal: string | null;
  currencyCode: string | null;
}

// Gibt null zurueck statt zu werfen, wenn Stripe nicht erreichbar oder nicht
// konfiguriert ist (lokale Entwicklung ohne API-Key): die Detailansicht soll
// dann "nicht verfuegbar" zeigen, nicht komplett scheitern.
export async function getInvoiceSummary(
  env: Env,
  invoiceId: string,
): Promise<StripeInvoiceSummary | null> {
  try {
    const stripe = getStripeClient(env);
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return {
      id: invoice.id ?? invoiceId,
      status: invoice.status ?? "unknown",
      billedAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
      grandTotal: invoice.total != null ? String(invoice.total) : null,
      currencyCode: invoice.currency ? invoice.currency.toUpperCase() : null,
    };
  } catch (err) {
    console.error("stripe_invoice_lookup_failed", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

// Deep-Link ins Stripe-Dashboard (ersetzt paddleDashboardSubscriptionUrl,
// Spec Abschnitt 2). Stripes Dashboard-URL-Schema ist stabil/dokumentiert
// (im Gegensatz zu Paddle) - kein ueberschreibbarer Basis-Pfad noetig.
export function stripeDashboardSubscriptionUrl(env: Env, stripeSubscriptionId: string): string {
  const base =
    env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
      ? "https://dashboard.stripe.com"
      : "https://dashboard.stripe.com/test";
  return `${base}/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`;
}
