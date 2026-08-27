// Stripe-Checkout + Subscription-Lifecycle-Aufrufe (Spec Abschnitt 2, 5).
// Ersetzt paddle/checkout.ts 1:1 in der Funktion: Stripe Payment Element
// laeuft im Client - hier nur die server-zu-server-Anteile: Subscription mit
// offenem PaymentIntent erzeugen, kuendigen/reaktivieren/Tarifwechsel,
// Rueckerstattung anstossen.
import type { Env } from "../types";
import { getStripeClient } from "./client";

export type Plan = "monthly" | "yearly";

function priceIdFor(env: Env, plan: Plan): string {
  const id = plan === "monthly" ? env.STRIPE_PRICE_ID_MONTHLY : env.STRIPE_PRICE_ID_YEARLY;
  if (!id) throw new Error("stripe_price_not_configured");
  return id;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  /** ISO-3166-1 alpha-2, bereits in Grossbuchstaben (siehe routes/billing.ts). */
  country: string;
  company?: string;
  vatId?: string;
}

// Umsatzsteuer-Id: Stripe verlangt neben dem Wert einen TYP, der vom Land
// abhaengt. Wir decken ab, was fuer diese Kundschaft realistisch ist - EU
// (eu_vat), Schweiz und Grossbritannien. Fuer alles andere tragen wir lieber
// gar keine Id ein als eine mit falschem Typ, den Stripe zurueckweist.
const EU_VAT_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE",
  "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

function taxIdTypeFor(country: string): string | null {
  if (EU_VAT_COUNTRIES.has(country)) return "eu_vat";
  if (country === "CH") return "ch_vat";
  if (country === "GB") return "gb_vat";
  return null;
}

// Strasse und Hausnummer werden im Formular getrennt erfasst (AddressStep.jsx),
// Stripe kennt nur `address.line1`. Dieselbe Zusammensetzung nutzt der Client
// fuer die billing_details des Zahlungsmittels - beide muessen uebereinstimmen,
// sonst weichen Rechnungsanschrift und Karten-Anschrift voneinander ab.
function line1Of(address: BillingAddress): string {
  return [address.street, address.houseNumber].map((v) => (v || "").trim()).filter(Boolean).join(" ");
}

// Rechnungsempfaenger: Firma hat Vorrang, sonst die Privatperson.
function customerNameOf(address: BillingAddress): string | undefined {
  const company = address.company?.trim();
  if (company) return company;
  const person = [address.firstName, address.lastName]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(" ");
  return person || undefined;
}

// USt-IdNr. als Tax-Id am Kunden hinterlegen, damit sie auf der Rechnung
// erscheint. Bewusst "best effort": eine vom Nutzer falsch eingetippte Id darf
// den Kauf NICHT abbrechen - Stripe validiert das Format und wirft sonst.
// Bereits vorhandene, identische Ids werden nicht doppelt angelegt.
async function syncTaxId(env: Env, customerId: string, address: BillingAddress): Promise<void> {
  const value = address.vatId?.trim().toUpperCase();
  if (!value) return;
  const type = taxIdTypeFor(address.country);
  if (!type) return;
  const stripe = getStripeClient(env);
  try {
    const existing = await stripe.customers.listTaxIds(customerId, { limit: 20 });
    if (existing.data.some((entry) => entry.value?.toUpperCase() === value)) return;
    await stripe.customers.createTaxId(customerId, { type: type as never, value });
  } catch (err) {
    console.error("stripe_tax_id_failed", err instanceof Error ? err.message : "unknown");
  }
}

// Erzeugt (bzw. findet) den Stripe-Kunden fuer diesen Nutzer. user_id landet
// in customer.metadata, damit der Webhook die Zahlung dem richtigen Konto
// zuordnen kann. Die Rechnungsadresse (AddressStep.jsx) landet direkt auf dem
// Customer-Datensatz - Stripe Invoicing zieht die "Rechnung an"-Adresse von
// dort, nicht vom PaymentMethod (Spec Abschnitt 5: Adresse ist seit dem
// Wechsel weg von Paddle als Merchant of Record zwingend fuer eine
// vollstaendige Rechnung).
async function findOrCreateCustomer(
  env: Env,
  userId: string,
  email: string,
  address?: BillingAddress | null,
): Promise<string> {
  const stripe = getStripeClient(env);
  const existing = await stripe.customers.list({ email, limit: 1 });
  const match = existing.data.find((c) => c.metadata?.user_id === userId);
  const addressFields = address
    ? {
        name: customerNameOf(address),
        address: {
          line1: line1Of(address),
          postal_code: address.zip,
          city: address.city,
          country: address.country,
        },
        // Vor- und Nachname zusaetzlich einzeln: `customer.name` traegt bei
        // Firmenkunden den Firmennamen, die Ansprechperson waere sonst
        // nirgends hinterlegt.
        metadata: {
          user_id: userId,
          billing_first_name: address.firstName,
          billing_last_name: address.lastName,
          billing_company: address.company?.trim() || "",
        },
      }
    : {};
  if (match) {
    if (address) {
      await stripe.customers.update(match.id, addressFields);
      await syncTaxId(env, match.id, address);
    }
    return match.id;
  }
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
    ...addressFields,
  });
  if (address) await syncTaxId(env, customer.id, address);
  return customer.id;
}

// Erzeugt eine Subscription mit payment_behavior "default_incomplete": die
// erste Rechnung bleibt offen, bis der Kunde im Payment Element bezahlt. Der
// client_secret des zugehoerigen PaymentIntent geht ans Frontend
// (useAccount.js -> PaymentStep.jsx, Spec Abschnitt 5).
export async function createSubscriptionCheckout(
  env: Env,
  userId: string,
  email: string,
  plan: Plan,
  couponId?: string | null,
  address?: BillingAddress | null,
): Promise<{ clientSecret: string; subscriptionId: string }> {
  const stripe = getStripeClient(env);
  const customerId = await findOrCreateCustomer(env, userId, email, address);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceIdFor(env, plan) }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { user_id: userId },
    // Stufe F (Gutscheine ueber Stripe Coupons/Promotion Codes): discounts
    // statt eines rohen Codes - routes/billing.ts loest den vom Nutzer
    // eingegebenen Code vorher ueber findUsableCouponByCode() auf.
    discounts: couponId ? [{ coupon: couponId }] : undefined,
  });

  const invoice = subscription.latest_invoice;
  const paymentIntent =
    typeof invoice === "object" && invoice ? invoice.payment_intent : null;
  const clientSecret =
    typeof paymentIntent === "object" && paymentIntent ? paymentIntent.client_secret : null;
  if (!clientSecret) throw new Error("stripe_client_secret_missing");

  return { clientSecret, subscriptionId: subscription.id };
}

// Kuendigung zum Periodenende (Standardfall, §312k-BGB-konform ueber den
// eigenen In-App-Flow, nicht nur Portal-Link) - analog cancelAtPeriodEnd bei
// Paddle.
export async function cancelAtPeriodEnd(env: Env, stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripeClient(env);
  await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
}

// Sofortige Kuendigung (Art. 17 Konto-Loeschung - "loeschen" ist ein
// expliziter Endgueltigkeits-Wunsch, nicht zum Periodenende).
export async function cancelImmediately(env: Env, stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripeClient(env);
  await stripe.subscriptions.cancel(stripeSubscriptionId);
}

// Reaktivierung: solange cancel_at_period_end gesetzt und die Periode noch
// laeuft, hebt dies die geplante Kuendigung wieder auf.
export async function revokeScheduledCancellation(
  env: Env,
  stripeSubscriptionId: string,
): Promise<void> {
  const stripe = getStripeClient(env);
  await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: false });
}

// Tarifwechsel monatlich <-> jaehrlich (gleiche Grundannahme wie bisher:
// Wechsel erst zum Ende der aktuellen Abrechnungsperiode, keine sofortige
// Proration). "none" verschiebt die Differenz auf die naechste reguraere
// Rechnung statt sie sofort separat zu berechnen.
export async function changeSubscriptionPlan(
  env: Env,
  stripeSubscriptionId: string,
  plan: Plan,
): Promise<void> {
  const stripe = getStripeClient(env);
  const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = current.items.data[0]?.id;
  if (!itemId) throw new Error("stripe_subscription_item_missing");
  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, price: priceIdFor(env, plan) }],
    proration_behavior: "none",
  });
}

// Customer-Portal-Session (Rechnungsuebersicht, Zahlungsmethoden-Aenderung -
// kein Eigenbau). Die Session-URL ist kurzlebig, daher bei jedem Klick frisch
// angefordert statt zwischengespeichert.
export async function createPortalSession(
  env: Env,
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = getStripeClient(env);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

// Self-Service-Rueckerstattung: volle Rueckerstattung der zuletzt bezahlten
// Rechnung dieser Subscription, ausgeloest innerhalb 14 Tagen ab
// first_purchase_at (vom aufrufenden Endpunkt geprueft, nicht hier).
export async function refundLatestInvoice(env: Env, invoiceId: string): Promise<void> {
  const stripe = getStripeClient(env);
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const paymentIntentId =
    typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;
  if (!paymentIntentId) throw new Error("stripe_refund_payment_intent_missing");
  await stripe.refunds.create({ payment_intent: paymentIntentId });
}
