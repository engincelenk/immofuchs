// Kuendigung und Widerruf eines Abos - gemeinsame Logik fuer die angemeldeten
// Routen (routes/billing.ts) und die oeffentlichen Seiten ohne Anmeldung
// (routes/publicContract.ts). Rechtsrahmen: § 312k BGB (Kuendigungsbutton, auch
// ohne Login erreichbar, Bestaetigung mit Inhalt, Datum UND Uhrzeit des
// Zugangs und Beendigungszeitpunkt) und § 356a BGB (Widerrufsfunktion,
// Eingangsbestaetigung mit Inhalt sowie Datum und Uhrzeit des Eingangs).
import type { Env } from "./types";
import { getActiveSubscription, getUserByEmail, newId, type SubscriptionRow, type UserRow } from "./db";
import { dispatchNotification } from "./notifications";
import { cancelAtPeriodEnd, getPaidAmountCents, withdrawSubscription } from "./stripe/checkout";
import { berechneWiderruf } from "./stripe/withdrawal";

// Zeitpunkt wie in den Bestaetigungen: Datum und Uhrzeit in deutscher Zeit.
export function formatZeitpunkt(ms: number): string {
  const text = new Date(ms).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${text} Uhr`;
}

export function formatDatum(ms: number): string {
  return new Date(ms).toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase().slice(0, 254) : "";
}

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 120) : "";
}

const eur = (cent: number) => (cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export type Kanal = "public" | "account";

async function logDeclaration(
  env: Env,
  e: {
    kind: "cancel" | "withdraw";
    email: string;
    name: string;
    receivedAt: number;
    userId: string | null;
    subscriptionId: string | null;
    channel: Kanal;
    outcome: string;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO contract_declarations (id, kind, email, name, received_at, user_id, subscription_id, channel, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(newId(), e.kind, e.email, e.name || null, e.receivedAt, e.userId, e.subscriptionId, e.channel, e.outcome)
      .run();
  } catch (err) {
    // Der Nachweis darf die eigentliche Erklaerung nie verhindern.
    console.error("contract_declaration_log_failed", err instanceof Error ? err.message : "unknown");
  }
}

const planLabel = (plan: string) => (plan === "yearly" ? "ImmoFuchs Pro (Jahresplan)" : "ImmoFuchs Pro (Monatsplan)");

export type KuendigungErgebnis =
  | { ok: true; gefunden: true; periodEnd: number }
  | { ok: true; gefunden: false }
  | { ok: false; error: "cancel_failed" };

// Kuendigung zum Ende der laufenden Abrechnungsperiode. Mit `user`/`sub` fuer den
// angemeldeten Fall; ohne beides wird ueber die E-Mail-Adresse gesucht.
export async function kuendigen(
  env: Env,
  input: { email: string; name: string; receivedAt: number; channel: Kanal; user?: UserRow; sub?: SubscriptionRow | null },
): Promise<KuendigungErgebnis> {
  const user = input.user ?? (await getUserByEmail(env.DB, input.email));
  const sub = input.sub !== undefined ? input.sub : user ? await getActiveSubscription(env.DB, user.id) : null;
  const log = (outcome: string) =>
    logDeclaration(env, {
      kind: "cancel",
      email: input.email,
      name: input.name,
      receivedAt: input.receivedAt,
      userId: user?.id ?? null,
      subscriptionId: sub?.id ?? null,
      channel: input.channel,
      outcome,
    });

  if (!user || !sub || sub.status === "canceled" || !sub.stripe_subscription_id) {
    await log("no_contract");
    return { ok: true, gefunden: false };
  }
  try {
    if (sub.status !== "cancel_scheduled") {
      await cancelAtPeriodEnd(env, sub.stripe_subscription_id);
      await env.DB.prepare(
        "UPDATE subscriptions SET status = 'cancel_scheduled', cancel_at_period_end = 1, updated_at = ? WHERE id = ?",
      )
        .bind(Date.now(), sub.id)
        .run();
    }
  } catch (err) {
    console.error("billing_cancel_failed", err instanceof Error ? err.message : "unknown");
    await log("failed");
    return { ok: false, error: "cancel_failed" };
  }
  await log("processed");
  await dispatchNotification(env, {
    event: "cancellation_confirmed",
    recipientEmail: user.email,
    recipientUserId: user.id,
    payload: {
      periodEndDate: formatDatum(sub.current_period_end),
      receivedAt: formatZeitpunkt(input.receivedAt),
      name: input.name,
      email: user.email,
      contract: planLabel(sub.plan),
    },
  });
  return { ok: true, gefunden: true, periodEnd: sub.current_period_end };
}

export type WiderrufErgebnis =
  | { ok: true; gefunden: true; erstattungCent: number; wertersatzCent: number }
  | { ok: true; gefunden: false }
  | { ok: true; gefunden: true; fristAbgelaufen: true }
  | { ok: false; error: "withdraw_failed" };

// Widerruf innerhalb von 14 Tagen: Eingangsbestaetigung (§ 356a Abs. 4 BGB), danach
// Teilerstattung abzueglich Wertersatz und sofortige Beendigung. Die erste Mail
// bestaetigt AUSSCHLIESSLICH den Eingang, nicht die Wirksamkeit.
export async function widerrufen(
  env: Env,
  input: { email: string; name: string; receivedAt: number; channel: Kanal; user?: UserRow; sub?: SubscriptionRow | null },
): Promise<WiderrufErgebnis> {
  const user = input.user ?? (await getUserByEmail(env.DB, input.email));
  const sub = input.sub !== undefined ? input.sub : user ? await getActiveSubscription(env.DB, user.id) : null;
  const log = (outcome: string) =>
    logDeclaration(env, {
      kind: "withdraw",
      email: input.email,
      name: input.name,
      receivedAt: input.receivedAt,
      userId: user?.id ?? null,
      subscriptionId: sub?.id ?? null,
      channel: input.channel,
      outcome,
    });

  if (!user || !sub || !sub.stripe_subscription_id) {
    await log("no_contract");
    return { ok: true, gefunden: false };
  }

  // Eingangsbestaetigung zuerst und unabhaengig vom Ergebnis der Pruefung.
  await dispatchNotification(env, {
    event: "withdrawal_received",
    recipientEmail: user.email,
    recipientUserId: user.id,
    payload: {
      receivedAt: formatZeitpunkt(input.receivedAt),
      name: input.name,
      email: user.email,
      contract: planLabel(sub.plan),
    },
  });

  try {
    let amountPaid = 0;
    let paymentIntentId: string | null = null;
    if (sub.latest_invoice_id) {
      const paid = await getPaidAmountCents(env, sub.latest_invoice_id);
      amountPaid = paid.amountPaid;
      paymentIntentId = paid.paymentIntentId;
    }
    const quote = berechneWiderruf({
      bezahltCent: amountPaid,
      plan: sub.plan === "yearly" ? "yearly" : "monthly",
      vertragsschluss: sub.first_purchase_at,
      jetzt: input.receivedAt,
    });
    if (!quote.imFrist) {
      await log("window_expired");
      await dispatchNotification(env, {
        event: "withdrawal_expired",
        recipientEmail: user.email,
        recipientUserId: user.id,
        payload: {},
      });
      return { ok: true, gefunden: true, fristAbgelaufen: true };
    }
    await withdrawSubscription(env, sub.stripe_subscription_id, {
      paymentIntentId,
      amountCents: quote.erstattungCent,
    });
    await env.DB.prepare("UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 0, updated_at = ? WHERE id = ?")
      .bind(Date.now(), sub.id)
      .run();
    await log("processed");
    await dispatchNotification(env, {
      event: "withdrawal_confirmed",
      recipientEmail: user.email,
      recipientUserId: user.id,
      payload: {
        erstattung: eur(quote.erstattungCent),
        wertersatz: eur(quote.wertersatzCent),
        tage: quote.tageGenutzt,
      },
    });
    return { ok: true, gefunden: true, erstattungCent: quote.erstattungCent, wertersatzCent: quote.wertersatzCent };
  } catch (err) {
    console.error("billing_withdraw_failed", err instanceof Error ? err.message : "unknown");
    await log("failed");
    return { ok: false, error: "withdraw_failed" };
  }
}
