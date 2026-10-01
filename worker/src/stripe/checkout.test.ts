import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { createSubscriptionCheckout } from "./checkout";

const subscriptionsCreate = vi.fn();
const customersList = vi.fn();
const customersCreate = vi.fn();
vi.mock("./client", () => ({
  getStripeClient: () => ({
    customers: { list: customersList, create: customersCreate },
    subscriptions: { create: subscriptionsCreate },
  }),
}));

const env = {
  STRIPE_PRICE_ID_MONTHLY: "price_m",
  STRIPE_PRICE_ID_YEARLY: "price_y",
} as unknown as Env;

beforeEach(() => {
  subscriptionsCreate.mockReset();
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
