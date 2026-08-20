import { describe, it, expect, vi, beforeEach } from "vitest";
import { preisText } from "../preise";
import { handlePaddleWebhook, verifyPaddleSignature } from "./webhook";
import { isWebhookEventProcessed, markWebhookEventProcessed } from "../db";
import { dispatchNotification } from "../notifications";
import type { Env } from "../types";

// dispatchNotification baut/verschickt in echt eine Mail (siehe notifications.ts) -
// hier interessiert nur, OB und mit welchem Intent es aufgerufen wird, nicht der
// tatsaechliche Mailversand (der ist Sache von email.ts, dort separat zu testen).
vi.mock("../notifications", () => ({
  dispatchNotification: vi.fn(),
}));

// Minimaler In-Memory-Ersatz fuer D1Database - deckt nur die zwei
// Statements ab, die processed_webhook_events betreffen (isWebhookEventProcessed/
// markWebhookEventProcessed aus db.ts). Ausreichend, um die Idempotenz-Garantie
// zu pruefen ("ein doppelt geliefertes Event aendert nichts", Spec 4.6/4.13),
// ohne eine vollstaendige D1/Miniflare-Umgebung aufzusetzen.
function createFakeD1(): Env["DB"] {
  const processed = new Set<string>();
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first() {
              if (sql.includes("FROM processed_webhook_events")) {
                return processed.has(String(args[0])) ? { 1: 1 } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO processed_webhook_events")) {
                const alreadyPresent = processed.has(String(args[0]));
                processed.add(String(args[0]));
                return { meta: { changes: alreadyPresent ? 0 : 1 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
    // Nicht benutzte D1Database-Methoden fuer diesen Test irrelevant.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("Paddle-Webhook-Signatur (4.13)", () => {
  const env = { PADDLE_WEBHOOK_SECRET: "test-secret" } as Env;

  async function sign(secret: string, ts: string, body: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${body}`));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("akzeptiert eine korrekt signierte Nutzlast", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("test-secret", ts, body);
    expect(await verifyPaddleSignature(env, body, `ts=${ts};h1=${h1}`)).toBe(true);
  });

  it("lehnt eine manipulierte Nutzlast ab", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("test-secret", ts, body);
    const tamperedBody = JSON.stringify({ event_id: "evt_1_hacked", event_type: "subscription.created", data: {} });
    expect(await verifyPaddleSignature(env, tamperedBody, `ts=${ts};h1=${h1}`)).toBe(false);
  });

  it("lehnt eine mit falschem Secret signierte Nutzlast ab", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("wrong-secret", ts, body);
    expect(await verifyPaddleSignature(env, body, `ts=${ts};h1=${h1}`)).toBe(false);
  });

  it("lehnt einen fehlenden Signatur-Header ab", async () => {
    expect(await verifyPaddleSignature(env, "{}", null)).toBe(false);
  });
});

describe("Webhook-Idempotenz (4.6/4.13) — doppelt geliefertes Event ändert nichts", () => {
  it("ein Event wird nur beim ersten Mal als 'neu' markiert", async () => {
    const db = createFakeD1();
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(false);

    await markWebhookEventProcessed(db, "evt_42");
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(true);

    // Zweite Zustellung desselben Events (Paddle liefert "at least once"):
    // der Aufrufer (handlePaddleWebhook) prueft isWebhookEventProcessed VOR
    // jeder Aktion und bricht dann ab - hier wird nur sichergestellt, dass
    // ein wiederholtes markWebhookEventProcessed nicht fehlschlaegt und der
    // Zustand idempotent bleibt.
    await markWebhookEventProcessed(db, "evt_42");
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(true);
  });

  it("verschiedene Events werden unabhaengig verfolgt", async () => {
    const db = createFakeD1();
    await markWebhookEventProcessed(db, "evt_a");
    expect(await isWebhookEventProcessed(db, "evt_a")).toBe(true);
    expect(await isWebhookEventProcessed(db, "evt_b")).toBe(false);
  });
});

// ═══ handlePaddleWebhook: Status-/Plan-Mapping und Mail-Trigger ═══
// Die Tests oben decken nur Signaturpruefung + die reinen Idempotenz-
// Primitiven ab. Hier wird handlePaddleWebhook() end-to-end mit echten
// Paddle-Event-Payloads pro Typ durchgespielt, gegen ein D1-Fake mit
// users + subscriptions + processed_webhook_events.

interface FakeUser {
  id: string;
  email: string;
  trial_used_at: number | null;
}

interface FakeSubscription {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  paddle_customer_id: string;
  paddle_subscription_id: string;
  current_period_end: number;
  cancel_at_period_end: number;
  first_purchase_at: number;
  past_due_since: number | null;
  latest_transaction_id: string | null;
  updated_at: number;
}

function createFakeBillingD1(seed: { users?: FakeUser[]; subscriptions?: FakeSubscription[] } = {}) {
  const processed = new Set<string>();
  const users = new Map<string, FakeUser>((seed.users ?? []).map((u) => [u.id, u]));
  const subscriptions = new Map<string, FakeSubscription>((seed.subscriptions ?? []).map((s) => [s.id, s]));

  function findSubByPaddleId(paddleSubscriptionId: string): FakeSubscription | undefined {
    return [...subscriptions.values()].find((s) => s.paddle_subscription_id === paddleSubscriptionId);
  }

  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first() {
              // Kopien statt Live-Referenzen zurueckgeben - sonst wuerde ein
              // spaeterer run()-Aufruf (z.B. das UPDATE weiter unten) das
              // bereits gelesene "existing"-Objekt rueckwirkend veraendern,
              // was echtes D1 (SELECT liefert einen Snapshot) nie tun wuerde.
              if (sql.includes("FROM processed_webhook_events")) {
                return processed.has(String(args[0])) ? { 1: 1 } : null;
              }
              if (sql.includes("FROM subscriptions WHERE paddle_subscription_id")) {
                const found = findSubByPaddleId(String(args[0]));
                return found ? { ...found } : null;
              }
              if (sql.includes("FROM users WHERE id")) {
                const found = users.get(String(args[0]));
                return found ? { ...found } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO processed_webhook_events")) {
                const already = processed.has(String(args[0]));
                processed.add(String(args[0]));
                return { meta: { changes: already ? 0 : 1 } };
              }
              if (sql.includes("UPDATE subscriptions SET status = ?, plan = ?")) {
                const [status, plan, paddleCustomerId, periodEnd, cancelAtPeriodEnd, pastDueSince, updatedAt, id] =
                  args;
                const row = subscriptions.get(String(id));
                if (row) {
                  row.status = String(status);
                  row.plan = String(plan);
                  row.paddle_customer_id = String(paddleCustomerId);
                  row.current_period_end = Number(periodEnd);
                  row.cancel_at_period_end = Number(cancelAtPeriodEnd);
                  row.past_due_since = pastDueSince === null ? null : Number(pastDueSince);
                  row.updated_at = Number(updatedAt);
                }
                return { meta: { changes: row ? 1 : 0 } };
              }
              if (sql.includes("INSERT INTO subscriptions")) {
                const [
                  id,
                  userId,
                  status,
                  plan,
                  paddleCustomerId,
                  paddleSubscriptionId,
                  periodEnd,
                  cancelAtPeriodEnd,
                  firstPurchaseAt,
                  pastDueSince,
                  updatedAt,
                ] = args;
                subscriptions.set(String(id), {
                  id: String(id),
                  user_id: String(userId),
                  status: String(status),
                  plan: String(plan),
                  paddle_customer_id: String(paddleCustomerId),
                  paddle_subscription_id: String(paddleSubscriptionId),
                  current_period_end: Number(periodEnd),
                  cancel_at_period_end: Number(cancelAtPeriodEnd),
                  first_purchase_at: Number(firstPurchaseAt),
                  past_due_since: pastDueSince === null ? null : Number(pastDueSince),
                  latest_transaction_id: null,
                  updated_at: Number(updatedAt),
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("UPDATE subscriptions SET latest_transaction_id")) {
                const [transactionId, paddleSubscriptionId] = args;
                const row = findSubByPaddleId(String(paddleSubscriptionId));
                if (row) row.latest_transaction_id = String(transactionId);
                return { meta: { changes: row ? 1 : 0 } };
              }
              if (sql.includes("UPDATE subscriptions SET status = 'canceled'")) {
                const [updatedAt, paddleSubscriptionId] = args;
                const row = findSubByPaddleId(String(paddleSubscriptionId));
                if (row) {
                  row.status = "canceled";
                  row.updated_at = Number(updatedAt);
                }
                return { meta: { changes: row ? 1 : 0 } };
              }
              if (sql.includes("UPDATE users SET trial_used_at")) {
                const [trialUsedAt, userId] = args;
                const user = users.get(String(userId));
                if (user && user.trial_used_at === null) user.trial_used_at = Number(trialUsedAt);
                return { meta: { changes: user ? 1 : 0 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Env["DB"];

  return { db, users, subscriptions };
}

const billingEnv = {
  PADDLE_PRICE_ID_MONTHLY: "pri_monthly_1",
  PADDLE_PRICE_ID_YEARLY: "pri_yearly_1",
} as Env;

function subscriptionEventBody(
  eventId: string,
  eventType: "subscription.created" | "subscription.updated",
  data: Record<string, unknown>,
): string {
  return JSON.stringify({ event_id: eventId, event_type: eventType, data });
}

describe("handlePaddleWebhook — Status-/Plan-Mapping und Mail-Trigger", () => {
  beforeEach(() => {
    vi.mocked(dispatchNotification).mockClear();
  });

  it("subscription.created mit status=active legt eine neue Subscription an und loest die Willkommens-Mail aus", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const body = subscriptionEventBody("evt_1", "subscription.created", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    const row = [...subscriptions.values()][0];
    expect(row.status).toBe("active");
    expect(row.plan).toBe("monthly");
    expect(row.user_id).toBe("user_1");

    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event: "payment_succeeded",
        recipientEmail: "kunde@example.com",
        payload: expect.objectContaining({ plan: "monthly", amount: preisText("monthly") }),
      }),
    );
  });

  it("subscription.created mit status=trialing legt die Subscription an, markiert den Trial als verbraucht, aber loest KEINE Zahlungs-Mail aus", async () => {
    const { db, subscriptions, users } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const body = subscriptionEventBody("evt_2", "subscription.created", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "trialing",
      items: [{ price: { id: "pri_yearly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    const row = [...subscriptions.values()][0];
    expect(row.status).toBe("trialing");
    expect(row.plan).toBe("yearly");
    expect(users.get("user_1")?.trial_used_at).not.toBeNull();
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("subscription.updated: Uebergang von active zu past_due loest die Dunning-Mail EINMAL aus", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          paddle_customer_id: "ctm_1",
          paddle_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_transaction_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const body = subscriptionEventBody("evt_3", "subscription.updated", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "past_due",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    const row = subscriptions.get("sub_row_1")!;
    expect(row.status).toBe("past_due");
    expect(row.past_due_since).not.toBeNull();
    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: "payment_failed", recipientEmail: "kunde@example.com" }),
    );
  });

  it("subscription.updated: erneutes Event mit weiterhin past_due loest die Dunning-Mail NICHT nochmal aus", async () => {
    const pastDueSince = Date.now() - 1000;
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "past_due",
          plan: "monthly",
          paddle_customer_id: "ctm_1",
          paddle_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: pastDueSince,
          latest_transaction_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const body = subscriptionEventBody("evt_4", "subscription.updated", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "past_due",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    expect(subscriptions.get("sub_row_1")!.past_due_since).toBe(pastDueSince);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("subscription.updated mit scheduled_change=cancel setzt den Status auf cancel_scheduled statt auf den rohen Paddle-Status", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          paddle_customer_id: "ctm_1",
          paddle_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_transaction_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const body = subscriptionEventBody("evt_5", "subscription.updated", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: { action: "cancel" },
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    const row = subscriptions.get("sub_row_1")!;
    expect(row.status).toBe("cancel_scheduled");
    expect(row.cancel_at_period_end).toBe(1);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("subscription.canceled setzt den Status auf canceled", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          paddle_customer_id: "ctm_1",
          paddle_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_transaction_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const body = JSON.stringify({
      event_id: "evt_6",
      event_type: "subscription.canceled",
      data: { id: "sub_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    expect(subscriptions.get("sub_row_1")!.status).toBe("canceled");
  });

  it("transaction.completed speichert die latest_transaction_id auf der passenden Subscription", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          paddle_customer_id: "ctm_1",
          paddle_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_transaction_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const body = JSON.stringify({
      event_id: "evt_7",
      event_type: "transaction.completed",
      data: { id: "txn_1", subscription_id: "sub_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    expect(subscriptions.get("sub_row_1")!.latest_transaction_id).toBe("txn_1");
  });

  it("ein unbekannter Event-Typ wird als verarbeitet markiert, ohne Subscriptions oder Mails anzufassen", async () => {
    const { db, subscriptions } = createFakeBillingD1();
    const body = JSON.stringify({
      event_id: "evt_8",
      event_type: "invoice.paid",
      data: { id: "whatever" },
    });

    const result = await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    expect(result.ok).toBe(true);
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    expect(await isWebhookEventProcessed(db, "evt_8")).toBe(true);
  });

  it("ein bereits verarbeitetes Event aendert beim zweiten Zustellversuch nichts mehr (End-to-End-Idempotenz)", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const body = subscriptionEventBody("evt_9", "subscription.created", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);
    expect(subscriptions.size).toBe(1);
    expect(dispatchNotification).toHaveBeenCalledTimes(1);

    // Paddle liefert "at least once" - dieselbe Nutzlast kommt ein zweites Mal an.
    await handlePaddleWebhook({ ...billingEnv, DB: db }, body);

    expect(subscriptions.size).toBe(1); // keine zweite Zeile
    expect(dispatchNotification).toHaveBeenCalledTimes(1); // keine zweite Mail
  });

  it("fehlt custom_data.user_id, wird nichts angelegt und es wird nicht geworfen", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, subscriptions } = createFakeBillingD1();
    const body = subscriptionEventBody("evt_10", "subscription.created", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_monthly_1" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: {},
    });

    await expect(handlePaddleWebhook({ ...billingEnv, DB: db }, body)).resolves.toEqual({ ok: true });
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("ist die Preis-ID keinem bekannten Plan zuordenbar, wird nichts angelegt", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, subscriptions } = createFakeBillingD1();
    const body = subscriptionEventBody("evt_11", "subscription.created", {
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_unbekannt" } }],
      current_billing_period: { ends_at: "2026-09-18T00:00:00.000Z" },
      scheduled_change: null,
      custom_data: { user_id: "user_1" },
    });

    await expect(handlePaddleWebhook({ ...billingEnv, DB: db }, body)).resolves.toEqual({ ok: true });
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
