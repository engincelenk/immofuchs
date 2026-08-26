// Gutschein-Verwaltung ueber Stripe Coupons + Promotion Codes (Spec
// Abschnitt 2). Zwei Objekte statt einem wie bei Paddle Discounts: der
// Coupon traegt die Rabattlogik (Prozent/Festbetrag), der Promotion Code ist
// der vom Kunden eingegebene Code und verweist auf genau einen Coupon.
import type Stripe from "stripe";
import type { Env } from "../types";
import { getStripeClient } from "./client";

export type DiscountType = "percentage" | "flat";

export interface StripeDiscount {
  id: string; // Promotion-Code-ID (das, was beim Checkout referenziert wird)
  couponId: string;
  code: string | null;
  description: string;
  type: DiscountType;
  amount: string; // Prozent als "10", Festbetrag in Cent als String (Symmetrie zu Paddle-Form)
  status: "active" | "archived" | "expired";
  timesUsed: number;
  usageLimit: number | null;
  expiresAt: string | null;
}

function mapDiscount(promo: Stripe.PromotionCode, coupon: Stripe.Coupon): StripeDiscount {
  const type: DiscountType = coupon.percent_off != null ? "percentage" : "flat";
  const amount =
    coupon.percent_off != null ? String(coupon.percent_off) : String(coupon.amount_off ?? 0);
  const expiresAt = promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null;
  const status: StripeDiscount["status"] = !coupon.valid
    ? "expired"
    : promo.active
      ? "active"
      : "archived";
  return {
    id: promo.id,
    couponId: coupon.id,
    code: promo.code ?? null,
    description: coupon.name ?? "",
    type,
    amount,
    status,
    timesUsed: promo.times_redeemed ?? 0,
    usageLimit: promo.max_redemptions ?? null,
    expiresAt,
  };
}

export async function listDiscounts(env: Env): Promise<StripeDiscount[]> {
  const stripe = getStripeClient(env);
  const promoCodes = await stripe.promotionCodes.list({ limit: 100, expand: ["data.coupon"] });
  return promoCodes.data
    .filter((p): p is Stripe.PromotionCode & { coupon: Stripe.Coupon } => Boolean(p.coupon))
    .map((p) => mapDiscount(p, p.coupon));
}

export interface DiscountInput {
  code: string;
  description: string;
  type: DiscountType;
  amount: string;
  usageLimit?: number | null;
  expiresAt?: string | null;
}

export async function createDiscount(env: Env, input: DiscountInput): Promise<StripeDiscount> {
  const stripe = getStripeClient(env);
  const coupon = await stripe.coupons.create({
    name: input.description,
    duration: "once",
    percent_off: input.type === "percentage" ? Number(input.amount) : undefined,
    amount_off: input.type === "flat" ? Number(input.amount) : undefined,
    currency: input.type === "flat" ? "eur" : undefined,
  });
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: input.code,
    max_redemptions: input.usageLimit ?? undefined,
    expires_at: input.expiresAt ? Math.floor(new Date(input.expiresAt).getTime() / 1000) : undefined,
  });
  return mapDiscount(promo, coupon);
}

// Bearbeiten: Stripe erlaubt bei Coupons/Promotion Codes im Nachhinein DEUTLICH
// weniger als Paddle - Betrag, Typ, Nutzungslimit und Ablaufdatum sind nach
// dem Anlegen unveraenderlich (offizielle Stripe-API-Referenz). Aenderbar sind
// nur der Coupon-Name (hier als "description" gefuehrt) und aktiv/inaktiv
// (Promotion Code). Wer Betrag/Limit/Ablauf aendern will, muss den Gutschein
// archivieren und neu anlegen (Admin-UI "Duplizieren") - dieselbe
// Grundeinschraenkung galt sinngemaess schon bei Paddle fuer Code/Typ.
export interface DiscountPatch {
  description?: string;
  status?: "active" | "archived";
}

export async function updateDiscount(
  env: Env,
  promotionCodeId: string,
  patch: DiscountPatch,
): Promise<StripeDiscount> {
  const stripe = getStripeClient(env);
  const promo = await stripe.promotionCodes.retrieve(promotionCodeId, { expand: ["coupon"] });
  const couponId = typeof promo.coupon === "string" ? promo.coupon : promo.coupon.id;

  let coupon = typeof promo.coupon === "string" ? await stripe.coupons.retrieve(couponId) : promo.coupon;
  if (patch.description !== undefined) {
    coupon = await stripe.coupons.update(couponId, { name: patch.description });
  }
  let updatedPromo = promo;
  if (patch.status !== undefined) {
    updatedPromo = await stripe.promotionCodes.update(promotionCodeId, { active: patch.status === "active" });
  }
  return mapDiscount(updatedPromo, coupon);
}

export async function setDiscountStatus(
  env: Env,
  promotionCodeId: string,
  status: "active" | "archived",
): Promise<void> {
  const stripe = getStripeClient(env);
  await stripe.promotionCodes.update(promotionCodeId, { active: status === "active" });
}

// Mehrere Codes auf einmal - ohne 0/O/1/I/L: die Codes werden abgetippt oder
// vorgelesen, und genau diese Zeichen werden dabei verwechselt (gleiche Logik
// wie zuvor bei Paddle).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_SUFFIX_LENGTH = 6;

export function generateDiscountCode(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_SUFFIX_LENGTH));
  let suffix = "";
  for (const byte of bytes) suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean ? `${clean}-${suffix}` : suffix;
}

// Wird beim Checkout aufgerufen (routes/billing.ts): loest den vom Nutzer
// eingegebenen Code in eine Coupon-ID auf, die die Subscription-Erzeugung
// braucht. null bei unbekanntem/inaktivem Code - der Aufrufer entscheidet,
// welchen Fehler er daraus macht.
export async function findUsableDiscountByCode(env: Env, code: string): Promise<StripeDiscount | null> {
  const stripe = getStripeClient(env);
  const result = await stripe.promotionCodes.list({ code, active: true, limit: 1, expand: ["data.coupon"] });
  const match = result.data[0];
  if (!match?.coupon) return null;
  return mapDiscount(match, match.coupon);
}
