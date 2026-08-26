import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";
import { preisText } from "../preise";
import { handleStripeWebhook, verifyStripeSignature } from "./webhook";
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
// zu pruefen ("ein doppelt geliefertes Event aendert nichts").
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("Stripe-Webhook-Signatur", () => {
  const env = { STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: "whsec_test_secret" } as Env;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { httpClient: Stripe.createFetchHttpClient() });

  async function signedHeader(payload: string, secret: string, timestamp?: number): Promise<string> {
    return stripe.webhooks.generateTestHeaderStringAsync({ payload, secret, timestamp });
  }

  it("akzeptiert eine korrekt signierte Nutzlast", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created", data: { object: {} } });
    const header = await signedHeader(payload, "whsec_test_secret");
    const event = await verifyStripeSignature(env, payload, header);
    expect(event?.id).toBe("evt_1");
  });

  it("lehnt eine manipulierte Nutzlast ab", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created", data: { object: {} } });
    const header = await signedHeader(payload, "whsec_test_secret");
    const tamperedPayload = JSON.stringify({ id: "evt_1_hacked", type: "customer.subscription.created", data: { object: {} } });
    expect(await verifyStripeSignature(env, tamperedPayload, header)).toBeNull();
  });

  it("lehnt eine mit falschem Secret signierte Nutzlast ab", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created", data: { object: {} } });
    const header = await signedHeader(payload, "whsec_wrong_secret");
    expect(await verifyStripeSignature(env, payload, header)).toBeNull();
  });

  it("lehnt einen fehlenden Signatur-Header ab", async () => {
    expect(await verifyStripeSignature(env, "{}", null)).toBeNull();
  });

  it("lehnt eine zu alte Signatur ab (Replay-Schutz, Stripe-Default-Toleranz)", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created", data: { object: {} } });
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // Stripe-Default-Toleranz ist 300s
    const header = await signedHeader(payload, "whsec_test_secret", oldTimestamp);
    expect(await verifyStripeSignature(env, payload, header)).toBeNull();
  });

  it("gibt null zurueck, wenn kein Webhook-Secret konfiguriert ist", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created", data: { object: {} } });
    const header = await signedHeader(payload, "whsec_test_secret");
    expect(await verifyStripeSignature({ ...env, STRIPE_WEBHOOK_SECRET: undefined }, payload, header)).toBeNull();
  });
});

describe("Webhook-Idempotenz — doppelt geliefertes Event ändert nichts", () => {
  it("ein Event wird nur beim ersten Mal als 'neu' markiert", async () => {
    const db = createFakeD1();
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(false);

    await markWebhookEventProcessed(db, "evt_42");
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(true);

    // Zweite Zustellung desselben Events (Stripe liefert "at least once"):
    // der Aufrufer (handleStripeWebhook) prueft isWebhookEventProcessed VOR
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

// ═══ handleStripeWebhook: Status-/Plan-Mapping und Mail-Trigger ═══
// Die Tests oben decken nur Signaturpruefung + die reinen Idempotenz-
// Primitiven ab. Hier wird handleStripeWebhook() end-to-end mit
// Stripe-Event-Objekten pro Typ durchgespielt, gegen ein D1-Fake mit
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
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: number;
  cancel_at_period_end: number;
  first_purchase_at: number;
  past_due_since: number | null;
  latest_invoice_id: string | null;
  updated_at: number;
}

function createFakeBillingD1(seed: { users?: FakeUser[]; subscriptions?: FakeSubscription[] } = {}) {
  const processed = new Set<string>();
  const users = new Map<string, FakeUser>((seed.users ?? []).map((u) => [u.id, u]));
  const subscriptions = new Map<string, FakeSubscription>((seed.subscriptions ?? []).map((s) => [s.id, s]));

  function findSubByStripeId(stripeSubscriptionId: string): FakeSubscription | undefined {
    return [...subscriptions.values()].find((s) => s.stripe_subscription_id === stripeSubscriptionId);
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
              if (sql.includes("FROM subscriptions WHERE stripe_subscription_id")) {
                const found = findSubByStripeId(String(args[0]));
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
                const [status, plan, stripeCustomerId, periodEnd, cancelAtPeriodEnd, pastDueSince, updatedAt, id] =
                  args;
                const row = subscriptions.get(String(id));
                if (row) {
                  row.status = String(status);
                  row.plan = String(plan);
                  row.stripe_customer_id = String(stripeCustomerId);
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
                  stripeCustomerId,
                  stripeSubscriptionId,
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
                  stripe_customer_id: String(stripeCustomerId),
                  stripe_subscription_id: String(stripeSubscriptionId),
                  current_period_end: Number(periodEnd),
                  cancel_at_period_end: Number(cancelAtPeriodEnd),
                  first_purchase_at: Number(firstPurchaseAt),
                  past_due_since: pastDueSince === null ? null : Number(pastDueSince),
                  latest_invoice_id: null,
                  updated_at: Number(updatedAt),
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes("UPDATE subscriptions SET latest_invoice_id")) {
                const [invoiceId, stripeSubscriptionId] = args;
                const row = findSubByStripeId(String(stripeSubscriptionId));
                if (row) row.latest_invoice_id = String(invoiceId);
                return { meta: { changes: row ? 1 : 0 } };
              }
              if (sql.includes("UPDATE subscriptions SET status = 'canceled'")) {
                const [updatedAt, stripeSubscriptionId] = args;
                const row = findSubByStripeId(String(stripeSubscriptionId));
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
  STRIPE_PRICE_ID_MONTHLY: "price_monthly_1",
  STRIPE_PRICE_ID_YEARLY: "price_yearly_1",
} as Env;

function subscriptionEvent(
  eventId: string,
  eventType: "customer.subscription.created" | "customer.subscription.updated",
  data: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return { id: eventId, type: eventType, data: { object: data } };
}

describe("handleStripeWebhook — Status-/Plan-Mapping und Mail-Trigger", () => {
  beforeEach(() => {
    vi.mocked(dispatchNotification).mockClear();
  });

  it("customer.subscription.created mit status=active legt eine neue Subscription an und loest die Willkommens-Mail aus", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const event = subscriptionEvent("evt_1", "customer.subscription.created", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

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

  it("customer.subscription.created mit status=trialing legt die Subscription an, markiert den Trial als verbraucht, aber loest KEINE Zahlungs-Mail aus", async () => {
    const { db, subscriptions, users } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const event = subscriptionEvent("evt_2", "customer.subscription.created", {
      id: "sub_1",
      customer: "cus_1",
      status: "trialing",
      items: { data: [{ price: { id: "price_yearly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    const row = [...subscriptions.values()][0];
    expect(row.status).toBe("trialing");
    expect(row.plan).toBe("yearly");
    expect(users.get("user_1")?.trial_used_at).not.toBeNull();
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated: Uebergang von trialing zu active loest die Willkommens-Mail aus (Trial-Ende, erste echte Abbuchung)", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: Date.now() }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "trialing",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = subscriptionEvent("evt_trial_end", "customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    expect(subscriptions.get("sub_row_1")!.status).toBe("active");
    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: "payment_succeeded", recipientEmail: "kunde@example.com" }),
    );
  });

  it("customer.subscription.updated: Uebergang von active zu past_due loest die Dunning-Mail EINMAL aus", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = subscriptionEvent("evt_3", "customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "past_due",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    const row = subscriptions.get("sub_row_1")!;
    expect(row.status).toBe("past_due");
    expect(row.past_due_since).not.toBeNull();
    expect(dispatchNotification).toHaveBeenCalledTimes(1);
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: "payment_failed", recipientEmail: "kunde@example.com" }),
    );
  });

  it("customer.subscription.updated: erneutes Event mit weiterhin past_due loest die Dunning-Mail NICHT nochmal aus", async () => {
    const pastDueSince = Date.now() - 1000;
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "past_due",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: pastDueSince,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = subscriptionEvent("evt_4", "customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "past_due",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    expect(subscriptions.get("sub_row_1")!.past_due_since).toBe(pastDueSince);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated mit cancel_at_period_end=true setzt den Status auf cancel_scheduled statt auf den rohen Stripe-Status", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = subscriptionEvent("evt_5", "customer.subscription.updated", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: true,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    const row = subscriptions.get("sub_row_1")!;
    expect(row.status).toBe("cancel_scheduled");
    expect(row.cancel_at_period_end).toBe(1);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("customer.subscription.deleted setzt den Status auf canceled", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = { id: "evt_6", type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleStripeWebhook({ ...billingEnv, DB: db }, event as any);

    expect(subscriptions.get("sub_row_1")!.status).toBe("canceled");
  });

  it("invoice.payment_succeeded speichert die latest_invoice_id auf der passenden Subscription", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      subscriptions: [
        {
          id: "sub_row_1",
          user_id: "user_1",
          status: "active",
          plan: "monthly",
          stripe_customer_id: "cus_1",
          stripe_subscription_id: "sub_1",
          current_period_end: Date.now(),
          cancel_at_period_end: 0,
          first_purchase_at: Date.now(),
          past_due_since: null,
          latest_invoice_id: null,
          updated_at: Date.now(),
        },
      ],
    });

    const event = {
      id: "evt_7",
      type: "invoice.payment_succeeded",
      data: { object: { id: "in_1", subscription: "sub_1" } },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleStripeWebhook({ ...billingEnv, DB: db }, event as any);

    expect(subscriptions.get("sub_row_1")!.latest_invoice_id).toBe("in_1");
  });

  it("ein unbekannter Event-Typ wird als verarbeitet markiert, ohne Subscriptions oder Mails anzufassen", async () => {
    const { db, subscriptions } = createFakeBillingD1();
    const event = { id: "evt_8", type: "charge.refunded", data: { object: { id: "whatever" } } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleStripeWebhook({ ...billingEnv, DB: db }, event as any);

    expect(result.ok).toBe(true);
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    expect(await isWebhookEventProcessed(db, "evt_8")).toBe(true);
  });

  it("ein bereits verarbeitetes Event aendert beim zweiten Zustellversuch nichts mehr (End-to-End-Idempotenz)", async () => {
    const { db, subscriptions } = createFakeBillingD1({
      users: [{ id: "user_1", email: "kunde@example.com", trial_used_at: null }],
    });
    const event = subscriptionEvent("evt_9", "customer.subscription.created", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await handleStripeWebhook({ ...billingEnv, DB: db }, event);
    expect(subscriptions.size).toBe(1);
    expect(dispatchNotification).toHaveBeenCalledTimes(1);

    // Stripe liefert "at least once" - dasselbe Event kommt ein zweites Mal an.
    await handleStripeWebhook({ ...billingEnv, DB: db }, event);

    expect(subscriptions.size).toBe(1); // keine zweite Zeile
    expect(dispatchNotification).toHaveBeenCalledTimes(1); // keine zweite Mail
  });

  it("fehlt metadata.user_id, wird nichts angelegt und es wird nicht geworfen", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, subscriptions } = createFakeBillingD1();
    const event = subscriptionEvent("evt_10", "customer.subscription.created", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_monthly_1" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: {},
    });

    await expect(handleStripeWebhook({ ...billingEnv, DB: db }, event)).resolves.toEqual({ ok: true });
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("ist die Preis-ID keinem bekannten Plan zuordenbar, wird nichts angelegt", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, subscriptions } = createFakeBillingD1();
    const event = subscriptionEvent("evt_11", "customer.subscription.created", {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      items: { data: [{ price: { id: "price_unbekannt" } }] },
      current_period_end: Math.floor(new Date("2026-09-18T00:00:00.000Z").getTime() / 1000),
      cancel_at_period_end: false,
      metadata: { user_id: "user_1" },
    });

    await expect(handleStripeWebhook({ ...billingEnv, DB: db }, event)).resolves.toEqual({ ok: true });
    expect(subscriptions.size).toBe(0);
    expect(dispatchNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
