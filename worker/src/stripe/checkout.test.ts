import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { createSubscriptionCheckout, ensureYearlyToMonthlySchedule, cancelAtPeriodEnd } from "./checkout";

const subscriptionsCreate = vi.fn();
const subscriptionsRetrieve = vi.fn();
const subscriptionsUpdate = vi.fn();
const schedulesCreate = vi.fn();
const schedulesUpdate = vi.fn();
const schedulesRelease = vi.fn();
const customersList = vi.fn();
const customersCreate = vi.fn();
vi.mock("./client", () => ({
  getStripeClient: () => ({
    customers: { list: customersList, create: customersCreate },
    subscriptions: { create: subscriptionsCreate, retrieve: subscriptionsRetrieve, update: subscriptionsUpdate },
    subscriptionSchedules: { create: schedulesCreate, update: schedulesUpdate, release: schedulesRelease },
  }),
}));

const env = {
  STRIPE_PRICE_ID_MONTHLY: "price_m",
  STRIPE_PRICE_ID_YEARLY: "price_y",
} as unknown as Env;
const envMitFlag = { ...env, YEARLY_AUTO_MONTHLY: "true" } as unknown as Env;

beforeEach(() => {
  subscriptionsCreate.mockReset();
  subscriptionsRetrieve.mockReset();
  subscriptionsUpdate.mockReset();
  schedulesCreate.mockReset();
  schedulesUpdate.mockReset();
  schedulesRelease.mockReset();
  customersList.mockReset();
  customersCreate.mockReset();
  customersList.mockResolvedValue({ data: [] });
  customersCreate.mockResolvedValue({ id: "cus_1" });
  subscriptionsCreate.mockResolvedValue({
    id: "sub_1",
    latest_invoice: { payment_intent: { client_secret: "pi_secret" } },
  });
});

describe("createSubscriptionCheckout", () => {
  it("rechnet ohne Stripe Tax (Kleinunternehmer, § 19 UStG)", async () => {
    const result = await createSubscriptionCheckout(env, "user_1", "a@b.de", "monthly");
    expect(result).toEqual({ clientSecret: "pi_secret", subscriptionId: "sub_1" });
    expect(subscriptionsCreate.mock.calls[0][0].automatic_tax).toEqual({ enabled: false });
    expect(subscriptionsCreate.mock.calls[0][0].items).toEqual([{ price: "price_m" }]);
  });
});

describe("Jahresplan wechselt nach dem ersten Jahr in den Monatsplan", () => {
  const jahresSub = { id: "sub_1", schedule: null, cancel_at_period_end: false, items: { data: [{ price: { id: "price_y" } }] } };
  const schedule = {
    id: "sub_sched_1",
    phases: [
      {
        start_date: 1000,
        end_date: 2000,
        items: [{ price: "price_y", quantity: 1 }],
        discounts: [{ coupon: "co_1" }],
        default_payment_method: "pm_1",
      },
    ],
  };

  it("tut ohne Flag nichts", async () => {
    expect(await ensureYearlyToMonthlySchedule(env, "sub_1")).toBe(false);
    expect(schedulesCreate).not.toHaveBeenCalled();
  });

  it("legt Phase 1 (Jahr, unveraendert) und Phase 2 (ein Monat) an und loest danach", async () => {
    subscriptionsRetrieve.mockResolvedValue(jahresSub);
    schedulesCreate.mockResolvedValue(schedule);
    expect(await ensureYearlyToMonthlySchedule(envMitFlag, "sub_1")).toBe(true);
    expect(schedulesCreate).toHaveBeenCalledWith({ from_subscription: "sub_1" });
    const arg = schedulesUpdate.mock.calls[0][1];
    expect(arg.end_behavior).toBe("release");
    expect(arg.phases[0]).toMatchObject({
      items: [{ price: "price_y", quantity: 1 }],
      start_date: 1000,
      end_date: 2000,
      discounts: [{ coupon: "co_1" }],
      default_payment_method: "pm_1",
    });
    expect(arg.phases[1]).toEqual({ items: [{ price: "price_m", quantity: 1 }], iterations: 1 });
  });

  it("ueberspringt Monatsabos, vorhandene Schedules und bereits gekuendigte Abos", async () => {
    subscriptionsRetrieve.mockResolvedValue({ ...jahresSub, items: { data: [{ price: { id: "price_m" } }] } });
    expect(await ensureYearlyToMonthlySchedule(envMitFlag, "sub_1")).toBe(false);
    subscriptionsRetrieve.mockResolvedValue({ ...jahresSub, schedule: "sub_sched_9" });
    expect(await ensureYearlyToMonthlySchedule(envMitFlag, "sub_1")).toBe(false);
    subscriptionsRetrieve.mockResolvedValue({ ...jahresSub, cancel_at_period_end: true });
    expect(await ensureYearlyToMonthlySchedule(envMitFlag, "sub_1")).toBe(false);
    expect(schedulesCreate).not.toHaveBeenCalled();
  });

  it("Kuendigung loest eine vorhandene Schedule zuerst", async () => {
    subscriptionsRetrieve.mockResolvedValue({ ...jahresSub, schedule: "sub_sched_1" });
    await cancelAtPeriodEnd(env, "sub_1");
    expect(schedulesRelease).toHaveBeenCalledWith("sub_sched_1");
    expect(subscriptionsUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(schedulesRelease.mock.invocationCallOrder[0]).toBeLessThan(subscriptionsUpdate.mock.invocationCallOrder[0]);
  });

  it("Kuendigung ohne Schedule bleibt unveraendert", async () => {
    subscriptionsRetrieve.mockResolvedValue(jahresSub);
    await cancelAtPeriodEnd(env, "sub_1");
    expect(schedulesRelease).not.toHaveBeenCalled();
    expect(subscriptionsUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
  });
});
