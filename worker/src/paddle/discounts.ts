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
    console.error("paddle_list_discounts_failed", result.status, JSON.stringify(result.data).slice(0, 1000));
    throw new Error(`paddle_list_discounts_failed_${result.status}`);
  }
  const data = result.data as { data?: RawDiscount[] };
  return (data.data ?? []).map(mapDiscount);
}

export interface DiscountInput {
  code: string;
  description: string;
  type: DiscountType;
  amount: string;
  usageLimit?: number | null;
  // ISO-8601-Zeitstempel oder null. Paddle kennt NUR ein Ablaufdatum -
  // ein Startdatum (Auftrag Abschnitt 9) gibt es in der API nicht, ein
  // Gutschein gilt ab dem Anlegen (offizielle Referenz, 2026-08-13 geprueft).
  expiresAt?: string | null;
}

export async function createDiscount(env: Env, input: DiscountInput): Promise<PaddleDiscount> {
  const body: Record<string, unknown> = {
    code: input.code,
    description: input.description,
    type: input.type,
    amount: input.amount,
    enabled_for_checkout: true,
    recur: false,
  };
  if (input.usageLimit) body.usage_limit = input.usageLimit;
  if (input.expiresAt) body.expires_at = input.expiresAt;
  const result = await paddleFetch(env, "/discounts", { method: "POST", body });
  if (!result.ok) {
    console.error("paddle_create_discount_failed", result.status, JSON.stringify(result.data).slice(0, 1000));
    throw new Error(`paddle_create_discount_failed_${result.status}`);
  }
  return mapDiscount((result.data as { data: RawDiscount }).data);
}

// Bearbeiten (Auftrag Abschnitt 9). Alle vier Felder sind laut Paddle-Referenz
// per PATCH aenderbar (2026-08-13 geprueft). Bewusst NICHT aenderbar gemacht:
// der Code selbst und der Rabatt-Typ - beide waeren zwar technisch moeglich,
// wuerden aber einen bereits verteilten Gutschein still zu einem anderen
// machen. Wer das braucht, legt einen neuen an (dafuer gibt es "Duplizieren").
export interface DiscountPatch {
  description?: string;
  amount?: string;
  usageLimit?: number | null;
  expiresAt?: string | null;
  status?: "active" | "archived";
}

export async function updateDiscount(
  env: Env,
  discountId: string,
  patch: DiscountPatch,
): Promise<PaddleDiscount> {
  const body: Record<string, unknown> = {};
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.amount !== undefined) body.amount = patch.amount;
  if (patch.status !== undefined) body.status = patch.status;
  // usageLimit und expiresAt duerfen ausdruecklich auf null gesetzt werden
  // ("unbegrenzt" / "laeuft nicht ab"), deshalb hier die Pruefung auf
  // undefined statt auf Falsy - `if (patch.usageLimit)` wuerde das Loeschen
  // eines Limits verschlucken.
  if (patch.usageLimit !== undefined) body.usage_limit = patch.usageLimit;
  if (patch.expiresAt !== undefined) body.expires_at = patch.expiresAt;

  const result = await paddleFetch(env, `/discounts/${discountId}`, { method: "PATCH", body });
  if (!result.ok) {
    console.error("paddle_update_discount_failed", result.status, JSON.stringify(result.data).slice(0, 1000));
    throw new Error(`paddle_update_discount_failed_${result.status}`);
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

// Mehrere Codes auf einmal (Auftrag Abschnitt 9, "Nice to have"). Ohne
// 0/O/1/I/L: die Codes werden abgetippt oder vorgelesen, und genau diese
// Zeichen werden dabei verwechselt.
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
// eingegebenen Code in eine Discount-ID auf, die die Transaktions-Erzeugung
// braucht (Paddle akzeptiert dort keinen rohen Code, nur discount_id).
// null bei unbekanntem/nicht fuer Checkout freigeschaltetem/archiviertem Code
// - der Aufrufer entscheidet, welchen Fehler er daraus macht.
export async function findUsableDiscountByCode(env: Env, code: string): Promise<PaddleDiscount | null> {
  const result = await paddleFetch(env, `/discounts?code=${encodeURIComponent(code)}`, { method: "GET" });
  if (!result.ok) {
    console.error("paddle_lookup_discount_failed", result.status, JSON.stringify(result.data).slice(0, 1000));
    throw new Error(`paddle_lookup_discount_failed_${result.status}`);
  }
  const data = result.data as { data?: RawDiscount[] };
  const match = (data.data ?? []).find((d) => d.status === "active");
  return match ? mapDiscount(match) : null;
}
