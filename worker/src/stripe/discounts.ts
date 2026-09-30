// Gutschein-Lookup fuers Checkout (Stripe Coupons + Promotion Codes). Angelegt,
// deaktiviert und geloescht werden Gutscheine ausschliesslich im Stripe-
// Dashboard (Nutzer-Entscheidung 2026-09-30) - die App loest beim Kauf nur
// noch den eingegebenen Code auf.
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
