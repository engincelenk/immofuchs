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

// Rechnungs-Pflichtangaben fuer Kleinunternehmer (§ 14 Abs. 4, § 19 UStG): Hinweis auf die
// Steuerbefreiung als Fusszeile und die Steuernummer als Zusatzfeld. Beides setzen wir am
// Kunden, damit es unabhaengig von den Dashboard-Einstellungen auf jeder Rechnung steht.
// Die Steuernummer kommt aus INVOICE_TAX_NUMBER (wrangler.toml); solange sie leer ist (Platzhalter),
// erscheint kein Feld - lieber keine Angabe als eine falsche. Sprache Deutsch, weil es eine
// deutsche Rechnung ist.
export const INVOICE_FOOTER = "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";

export function invoiceFieldsFor(env: Env) {
  const taxNumber = env.INVOICE_TAX_NUMBER?.trim();
  return {
    preferred_locales: ["de"],
    invoice_settings: {
      footer: INVOICE_FOOTER,
      ...(taxNumber ? { custom_fields: [{ name: "Steuernummer", value: taxNumber }] } : {}),
    },
  };
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
      await stripe.customers.update(match.id, { ...invoiceFieldsFor(env), ...addressFields });
      await syncTaxId(env, match.id, address);
    }
    return match.id;
  }
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
    ...invoiceFieldsFor(env),
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
    // Kleinunternehmerregelung (§ 19 UStG, seit 2026-10-01): keine
    // Umsatzsteuer - Stripe Tax bleibt aus, der Preis ist der Endbetrag. Der
    // Pflichthinweis auf der Rechnung kommt aus der Standard-Fusszeile im
    // Stripe-Dashboard (Rechnungsvorlage). Vorher Regelbesteuerung mit
    // automatic_tax: { enabled: true }.
    automatic_tax: { enabled: false },
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
  // Haengt eine Schedule (Jahres- zu Monatsplan) an der Subscription, laesst
  // Stripe direkte Aenderungen nicht zu - erst loesen, dann kuendigen.
  await releaseScheduleIfAny(env, stripeSubscriptionId);
  await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
}

// ── Jahresplan -> danach Monatsplan (AGB Ziffer 6) ─────────────────────────
// Eine stillschweigende Verlaengerung um jeweils ein weiteres Jahr ist gegenueber
// Verbrauchern nach § 309 Nr. 9 BGB unwirksam. Deshalb bekommt ein Jahresabo
// eine Stripe Subscription Schedule: Phase 1 = das laufende Jahr zum Jahrespreis,
// Phase 2 = ein Monat zum Monatspreis, danach "release" - die Subscription
// laeuft dann als normales Monatsabo weiter (jederzeit zum Monatsende kuendbar).
// Best effort und per Flag YEARLY_AUTO_MONTHLY abgesichert: schlaegt es fehl,
// bleibt das Abo wie bisher ein Jahresabo, der Aufrufer protokolliert nur.
function idOf(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "id" in v && typeof (v as { id: unknown }).id === "string") {
    return (v as { id: string }).id;
  }
  return null;
}

export async function ensureYearlyToMonthlySchedule(env: Env, stripeSubscriptionId: string): Promise<boolean> {
  if (env.YEARLY_AUTO_MONTHLY !== "true") return false;
  if (!env.STRIPE_PRICE_ID_YEARLY || !env.STRIPE_PRICE_ID_MONTHLY) return false;
  const stripe = getStripeClient(env);
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId !== env.STRIPE_PRICE_ID_YEARLY || sub.schedule || sub.cancel_at_period_end) return false;

  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: stripeSubscriptionId });
  const p0 = schedule.phases[0];
  if (!p0) throw new Error("stripe_schedule_phase_missing");
  const discounts = (p0.discounts ?? [])
    .map((d) => idOf((d as { coupon?: unknown }).coupon))
    .filter((id): id is string => !!id)
    .map((coupon) => ({ coupon }));
  const defaultPm = idOf(p0.default_payment_method);
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: p0.items.map((i) => ({ price: idOf(i.price) as string, quantity: i.quantity ?? 1 })),
        start_date: p0.start_date,
        end_date: p0.end_date,
        ...(discounts.length > 0 ? { discounts } : {}),
        ...(defaultPm ? { default_payment_method: defaultPm } : {}),
      },
      { items: [{ price: env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }], iterations: 1 },
    ],
  });
  return true;
}

export async function releaseScheduleIfAny(env: Env, stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripeClient(env);
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const scheduleId = idOf(sub.schedule);
  if (!scheduleId) return;
  await stripe.subscriptionSchedules.release(scheduleId);
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
  // Nach der Kuendigung war die Schedule geloest - bei einem Jahresabo wieder anlegen.
  try {
    await ensureYearlyToMonthlySchedule(env, stripeSubscriptionId);
  } catch (err) {
    console.error("yearly_schedule_failed", err instanceof Error ? err.message : "unknown");
  }
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
  await releaseScheduleIfAny(env, stripeSubscriptionId);
  const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const itemId = current.items.data[0]?.id;
  if (!itemId) throw new Error("stripe_subscription_item_missing");
  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: itemId, price: priceIdFor(env, plan) }],
    proration_behavior: "none",
  });
  if (plan === "yearly") {
    try {
      await ensureYearlyToMonthlySchedule(env, stripeSubscriptionId);
    } catch (err) {
      console.error("yearly_schedule_failed", err instanceof Error ? err.message : "unknown");
    }
  }
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

// Widerruf (§ 355 BGB): was fuer die erste Rechnung tatsaechlich bezahlt wurde.
// Quelle ist Stripe (nach Gutschein/Rabatt), nicht der Listenpreis.
export async function getPaidAmountCents(
  env: Env,
  invoiceId: string,
): Promise<{ amountPaid: number; paymentIntentId: string | null }> {
  const stripe = getStripeClient(env);
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const paymentIntentId =
    typeof invoice.payment_intent === "string" ? invoice.payment_intent : (invoice.payment_intent?.id ?? null);
  return { amountPaid: invoice.amount_paid ?? 0, paymentIntentId };
}

// Teilrueckerstattung (Betrag abzueglich Wertersatz) und anschliessend sofortige
// Beendigung der Subscription. Erst erstatten, dann beenden: scheitert die
// Erstattung, bleibt das Abo unveraendert und der Nutzer kann es erneut versuchen.
export async function withdrawSubscription(
  env: Env,
  stripeSubscriptionId: string,
  refund: { paymentIntentId: string | null; amountCents: number },
): Promise<void> {
  const stripe = getStripeClient(env);
  if (refund.amountCents > 0) {
    if (!refund.paymentIntentId) throw new Error("stripe_refund_payment_intent_missing");
    await stripe.refunds.create({
      payment_intent: refund.paymentIntentId,
      amount: refund.amountCents,
      reason: "requested_by_customer",
      metadata: { grund: "widerruf" },
    });
  }
  await stripe.subscriptions.cancel(stripeSubscriptionId);
}
