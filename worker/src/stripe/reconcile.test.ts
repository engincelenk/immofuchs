import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import type { SubscriptionRow } from "../db";
import { diffSubscription, reconcileModeOf, reconcileOneSubscription, reconcileSubscriptions } from "./reconcile";
import { mapStripeSubscription } from "./subscriptionMapping";

const listMock = vi.fn();
const retrieveMock = vi.fn();
vi.mock("./client", () => ({
  getStripeClient: () => ({ subscriptions: { list: listMock, retrieve: retrieveMock } }),
}));
const logAdminActionMock = vi.fn();
vi.mock("../db", async (orig) => ({
  ...(await orig<typeof import("../db")>()),
  logAdminAction: (...a: unknown[]) => logAdminActionMock(...a),
  markTrialUsedForUser: vi.fn(),
}));

const PERIOD_END_S = Math.floor(new Date("2026-10-18T00:00:00.000Z").getTime() / 1000);

function stripeSub(over: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: { data: [{ price: { id: "price_monthly_1" }, current_period_end: PERIOD_END_S }] },
    cancel_at_period_end: false,
    latest_invoice: "in_1",
    metadata: { user_id: "user_1" },
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function row(over: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "row_1",
    user_id: "user_1",
    status: "active",
    plan: "monthly",
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    current_period_end: PERIOD_END_S * 1000,
    cancel_at_period_end: 0,
    first_purchase_at: 1,
    past_due_since: null,
    renewal_reminder_sent_at: null,
    trial_reminder_sent_at: null,
    latest_invoice_id: "in_1",
    updated_at: 1,
    stripe_event_created: null,
    ...over,
  };
}

// Minimales D1: liefert die vorgegebenen Zeilen und protokolliert Schreibzugriffe.
function fakeDb(rows: SubscriptionRow[], userIds: string[] = ["user_1"]) {
  const writes: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async all() {
              return { results: rows };
            },
            async first() {
              return sql.includes("FROM users") && userIds.includes(String(args[0])) ? { id: args[0] } : null;
            },
            async run() {
              writes.push({ sql, args });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Env["DB"];
  return { db, writes };
}

const baseEnv = {
  STRIPE_SECRET_KEY: "sk_test",
  STRIPE_PRICE_ID_MONTHLY: "price_monthly_1",
  STRIPE_PRICE_ID_YEARLY: "price_yearly_1",
} as Env;

beforeEach(() => {
  listMock.mockReset();
  retrieveMock.mockReset();
  logAdminActionMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("reconcileModeOf", () => {
  it("Default ist 'log', nur 'apply' und 'off' werden erkannt", () => {
    expect(reconcileModeOf({} as Env)).toBe("log");
    expect(reconcileModeOf({ STRIPE_RECONCILE_MODE: "apply" } as Env)).toBe("apply");
    expect(reconcileModeOf({ STRIPE_RECONCILE_MODE: "off" } as Env)).toBe("off");
    expect(reconcileModeOf({ STRIPE_RECONCILE_MODE: "quatsch" } as Env)).toBe("log");
  });
});

describe("diffSubscription", () => {
  it("keine Abweichung bei gleichem Stand", () => {
    expect(diffSubscription(row(), mapStripeSubscription(baseEnv, stripeSub()))).toEqual({});
  });
  it("cancel_at_period_end in Stripe -> erwartet cancel_scheduled", () => {
    const diff = diffSubscription(row(), mapStripeSubscription(baseEnv, stripeSub({ cancel_at_period_end: true })));
    expect(diff.status).toEqual({ d1: "active", stripe: "cancel_scheduled" });
    expect(diff.cancelAtPeriodEnd).toBeDefined();
  });
  it("incomplete in Stripe erzeugt keine Status-Abweichung", () => {
    expect(diffSubscription(row(), mapStripeSubscription(baseEnv, stripeSub({ status: "incomplete" }))).status).toBeUndefined();
  });
});

describe("reconcileSubscriptions", () => {
  it("modus 'off' ruft Stripe nicht auf", async () => {
    const { db } = fakeDb([row()]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "off" });
    expect(r.checked).toBe(0);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("modus 'log' meldet Abweichungen, schreibt aber nichts", async () => {
    listMock.mockResolvedValue({ data: [stripeSub({ status: "canceled" })], has_more: false });
    const { db, writes } = fakeDb([row()]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db });
    expect(r).toMatchObject({ mode: "log", diffs: 1, created: 0 });
    expect(writes).toHaveLength(0);
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });

  it("modus 'apply' korrigiert ein in Stripe gekuendigtes Abo und schreibt Audit-Log", async () => {
    listMock.mockResolvedValue({ data: [stripeSub({ status: "canceled" })], has_more: false });
    const { db, writes } = fakeDb([row()]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.diffs).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].args[0]).toBe("canceled"); // status
    expect(logAdminActionMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ action: "subscription.reconcile", targetId: "row_1", adminUserId: "system" }),
    );
  });

  it("gleicher Stand: keine Schreibzugriffe", async () => {
    listMock.mockResolvedValue({ data: [stripeSub()], has_more: false });
    const { db, writes } = fakeDb([row()]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r).toMatchObject({ checked: 1, diffs: 0 });
    expect(writes).toHaveLength(0);
  });

  it("legt ein Stripe-Abo mit user_id ohne D1-Zeile nachtraeglich an", async () => {
    listMock.mockResolvedValue({ data: [stripeSub()], has_more: false });
    const { db, writes } = fakeDb([]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.created).toBe(1);
    expect(writes[0].sql).toContain("INSERT INTO subscriptions");
  });

  it("legt nichts an, wenn das Konto nicht (mehr) existiert", async () => {
    listMock.mockResolvedValue({ data: [stripeSub()], has_more: false });
    const { db, writes } = fakeDb([], []);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.created).toBe(0);
    expect(writes).toHaveLength(0);
  });

  it("legt kein bereits gekuendigtes Stripe-Abo ohne D1-Zeile an", async () => {
    listMock.mockResolvedValue({ data: [stripeSub({ status: "canceled" })], has_more: false });
    const { db, writes } = fakeDb([]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.created).toBe(0);
    expect(writes).toHaveLength(0);
  });

  it("in der Liste fehlend + bei Stripe 404 -> als gekuendigt behandelt", async () => {
    listMock.mockResolvedValue({ data: [], has_more: false });
    retrieveMock.mockRejectedValue(Object.assign(new Error("nope"), { code: "resource_missing" }));
    const { db, writes } = fakeDb([row()]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.diffs).toBe(1);
    expect(writes[0].sql).toContain("status = 'canceled'");
  });

  it("ein Stripe-Fehler bei einer Zeile bricht den Lauf nicht ab", async () => {
    listMock.mockResolvedValue({ data: [stripeSub({ id: "sub_2" })], has_more: false });
    retrieveMock.mockRejectedValue(new Error("stripe down"));
    const { db } = fakeDb([row(), row({ id: "row_2", stripe_subscription_id: "sub_2" })]);
    const r = await reconcileSubscriptions({ ...baseEnv, DB: db, STRIPE_RECONCILE_MODE: "apply" });
    expect(r.errors).toBe(1);
    expect(r.checked).toBe(2);
  });
});

describe("reconcileOneSubscription (Admin-Button)", () => {
  const admin = { adminUserId: "admin_1", adminEmail: "chef@immofuchs.info" };

  it("korrigiert IMMER, auch wenn der Cron-Modus 'log' ist, und loggt den echten Admin", async () => {
    retrieveMock.mockResolvedValue(stripeSub({ status: "canceled" }));
    const { db, writes } = fakeDb([]);
    const out = await reconcileOneSubscription({ ...baseEnv, DB: db }, row(), admin);
    expect(out.result).toBe("corrected");
    expect(writes).toHaveLength(1);
    expect(writes[0].args[0]).toBe("canceled");
    expect(logAdminActionMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ adminUserId: "admin_1", adminEmail: "chef@immofuchs.info", action: "subscription.reconcile" }),
    );
  });

  it("gleicher Stand -> unchanged, nichts geschrieben", async () => {
    retrieveMock.mockResolvedValue(stripeSub());
    const { db, writes } = fakeDb([]);
    expect(await reconcileOneSubscription({ ...baseEnv, DB: db }, row(), admin)).toEqual({ result: "unchanged" });
    expect(writes).toHaveLength(0);
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });

  it("admin-test:-Abo oder ohne Stripe-ID -> not_applicable, kein Stripe-Aufruf", async () => {
    const { db } = fakeDb([]);
    const env = { ...baseEnv, DB: db };
    expect(await reconcileOneSubscription(env, row({ stripe_subscription_id: "admin-test:abc" }), admin)).toEqual({ result: "not_applicable" });
    expect(await reconcileOneSubscription(env, row({ stripe_subscription_id: null }), admin)).toEqual({ result: "not_applicable" });
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("in Stripe nicht vorhanden -> als gekuendigt korrigiert", async () => {
    retrieveMock.mockRejectedValue(Object.assign(new Error("nope"), { code: "resource_missing" }));
    const { db, writes } = fakeDb([]);
    const out = await reconcileOneSubscription({ ...baseEnv, DB: db }, row(), admin);
    expect(out.result).toBe("corrected");
    expect(writes[0].sql).toContain("status = 'canceled'");
  });

  it("Stripe-Fehler wird durchgereicht (Route antwortet 502) statt 'unchanged' vorzutaeuschen", async () => {
    retrieveMock.mockRejectedValue(new Error("stripe down"));
    const { db } = fakeDb([]);
    await expect(reconcileOneSubscription({ ...baseEnv, DB: db }, row(), admin)).rejects.toThrow("stripe down");
  });
});
