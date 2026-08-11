// Gutschein-Verwaltung ueber Paddle Discounts (Stufe F, Nutzer-Konzept
// 2026-08-11, Nutzer-Entscheidung: Paddle bleibt einzige Quelle fuer
// Rabattlogik statt eines eigenen D1-Gutscheinsystems - kein Risiko einer
// Diskrepanz zwischen angezeigtem und tatsaechlich abgerechnetem Preis).
// Endpunkt-Formen live gegen den konfigurierten Paddle-Sandbox-Account
// verifiziert (2026-08-11): GET/POST/PATCH /discounts, Code-Filter per
// Query-Param, discount_id als Feld bei der Transaktions-Erzeugung.
import type { Env } from "../types";
import { paddleFetch } from "./client";

export type DiscountType = "percentage" | "flat";

export interface PaddleDiscount {
  id: string;
  code: string | null;
  description: string;
  type: DiscountType;
  amount: string;
  status: "active" | "archived" | "expired";
  timesUsed: number;
  usageLimit: number | null;
  expiresAt: string | null;
}

interface RawDiscount {
  id: string;
  code?: string | null;
  description?: string;
  type?: DiscountType;
  amount?: string;
  status?: PaddleDiscount["status"];
  times_used?: number;
  usage_limit?: number | null;
  expires_at?: string | null;
}

function mapDiscount(d: RawDiscount): PaddleDiscount {
  return {
    id: String(d.id),
    code: d.code ?? null,
    description: d.description ?? "",
    type: d.type ?? "percentage",
    amount: d.amount ?? "0",
    status: d.status ?? "active",
    timesUsed: d.times_used ?? 0,
    usageLimit: d.usage_limit ?? null,
    expiresAt: d.expires_at ?? null,
  };
}

export async function listDiscounts(env: Env): Promise<PaddleDiscount[]> {
  // status-Filter explizit noetig (live gegen Paddle-Sandbox verifiziert,
  // 2026-08-11): ohne ihn liefert die Liste NUR aktive Gutscheine, archivierte
  // fallen sonst komplett raus - im Admin-Panel muessen sie aber sichtbar
  // bleiben, sonst liesse sich ein deaktivierter Gutschein nie reaktivieren.
  const result = await paddleFetch(
    env,
    "/discounts?per_page=100&order_by=created_at[DESC]&status=active,archived,expired",
    { method: "GET" },
  );
  if (!result.ok) {
    console.error("paddle_list_discounts_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_list_discounts_failed_${result.status}`);
  }
  const data = result.data as { data?: RawDiscount[] };
  return (data.data ?? []).map(mapDiscount);
}

export async function createDiscount(
  env: Env,
  input: { code: string; description: string; type: DiscountType; amount: string; usageLimit?: number | null },
): Promise<PaddleDiscount> {
  const body: Record<string, unknown> = {
    code: input.code,
    description: input.description,
    type: input.type,
    amount: input.amount,
    enabled_for_checkout: true,
    recur: false,
  };
  if (input.usageLimit) body.usage_limit = input.usageLimit;
  const result = await paddleFetch(env, "/discounts", { method: "POST", body });
  if (!result.ok) {
    console.error("paddle_create_discount_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_create_discount_failed_${result.status}`);
  }
  return mapDiscount((result.data as { data: RawDiscount }).data);
}

export async function setDiscountStatus(
  env: Env,
  discountId: string,
  status: "active" | "archived",
): Promise<void> {
  const result = await paddleFetch(env, `/discounts/${discountId}`, { method: "PATCH", body: { status } });
  if (!result.ok) throw new Error(`paddle_update_discount_failed_${result.status}`);
}

// Wird beim Checkout aufgerufen (routes/billing.ts): loest den vom Nutzer
// eingegebenen Code in eine Discount-ID auf, die die Transaktions-Erzeugung
// braucht (Paddle akzeptiert dort keinen rohen Code, nur discount_id).
// null bei unbekanntem/nicht fuer Checkout freigeschaltetem/archiviertem Code
// - der Aufrufer entscheidet, welchen Fehler er daraus macht.
export async function findUsableDiscountByCode(env: Env, code: string): Promise<PaddleDiscount | null> {
  const result = await paddleFetch(env, `/discounts?code=${encodeURIComponent(code)}`, { method: "GET" });
  if (!result.ok) {
    console.error("paddle_lookup_discount_failed", result.status, JSON.stringify(result.data).slice(0, 300));
    throw new Error(`paddle_lookup_discount_failed_${result.status}`);
  }
  const data = result.data as { data?: RawDiscount[] };
  const match = (data.data ?? []).find((d) => d.status === "active");
  return match ? mapDiscount(match) : null;
}
