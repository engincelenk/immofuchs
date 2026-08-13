// Letzte Zahlung eines Abos (Admin-MVP Abschnitt 8). Bewusst NICHT in D1
// gespiegelt: Paddle bleibt Merchant of Record und einzige Quelle fuer
// Zahlungsdaten (Auftrag Abschnitt 1C) - wir speichern nur die
// latest_transaction_id (Migration 0009) und holen den Rest bei Bedarf.
//
// Deshalb auch nur in der DETAIL-Ansicht, nie in der Liste: eine Tabelle mit
// 20 Zeilen wuerde sonst 20 Paddle-Aufrufe ausloesen.
import type { Env } from "../types";
import { paddleFetch } from "./client";

export interface PaddleTransactionSummary {
  id: string;
  status: string;
  billedAt: string | null;
  // Rohwerte von Paddle: Betrag in der kleinsten Waehrungseinheit als String,
  // Waehrung als ISO-Code. Formatiert wird erst in der Oberflaeche.
  grandTotal: string | null;
  currencyCode: string | null;
}

// Gibt null zurueck statt zu werfen, wenn Paddle nicht erreichbar oder nicht
// konfiguriert ist (lokale Entwicklung ohne API-Key): die Detailansicht soll
// dann "nicht verfuegbar" zeigen, nicht komplett scheitern - die restlichen
// Angaben stammen ohnehin aus D1.
export async function getTransactionSummary(
  env: Env,
  transactionId: string,
): Promise<PaddleTransactionSummary | null> {
  try {
    const res = await paddleFetch(env, `/transactions/${encodeURIComponent(transactionId)}`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = (res.data as { data?: Record<string, unknown> } | null)?.data;
    if (!data) return null;
    const totals = (data.details as { totals?: Record<string, unknown> } | undefined)?.totals;
    return {
      id: String(data.id ?? transactionId),
      status: String(data.status ?? "unknown"),
      billedAt: typeof data.billed_at === "string" ? data.billed_at : null,
      grandTotal: typeof totals?.grand_total === "string" ? totals.grand_total : null,
      currencyCode: typeof data.currency_code === "string" ? data.currency_code : null,
    };
  } catch (err) {
    console.error("paddle_transaction_lookup_failed", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

// Deep-Link ins Paddle-Dashboard (Auftrag Abschnitt 8, "In Paddle oeffnen").
//
// WICHTIG: Die Paddle-Doku dokumentiert den Pfad zu einem einzelnen Abo im
// Verkaeufer-Dashboard nicht (Stand 2026-08-13, geprueft). Der Pfad unten ist
// deshalb die beste bekannte Form, aber nicht garantiert - und genau darum
// ueber PADDLE_DASHBOARD_BASE_URL ueberschreibbar: sollte der Link ins Leere
// laufen, ist das eine Konfigurationsaenderung statt eines Deploys. Die
// Oberflaeche bietet zusaetzlich "ID kopieren" an, damit der Betreiber im
// Zweifel manuell im Dashboard suchen kann.
export function paddleDashboardSubscriptionUrl(env: Env, paddleSubscriptionId: string): string {
  const base =
    env.PADDLE_DASHBOARD_BASE_URL ||
    (env.PADDLE_ENV === "production"
      ? "https://vendors.paddle.com"
      : "https://sandbox-vendors.paddle.com");
  return `${base.replace(/\/+$/, "")}/subscriptions-v2/${encodeURIComponent(paddleSubscriptionId)}`;
}
