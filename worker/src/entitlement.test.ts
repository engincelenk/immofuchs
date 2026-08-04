import { describe, it, expect } from "vitest";
import { computeIsPro, hasRole, PAST_DUE_GRACE_MS } from "./entitlement";
import type { SubscriptionRow } from "./db";

function sub(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: "sub-1",
    user_id: "user-1",
    status: "active",
    plan: "monthly",
    paddle_customer_id: "cust-1",
    paddle_subscription_id: "paddlesub-1",
    current_period_end: Date.now() + 1000,
    cancel_at_period_end: 0,
    first_purchase_at: Date.now() - 1000,
    past_due_since: null,
    renewal_reminder_sent_at: null,
    latest_transaction_id: null,
    updated_at: Date.now(),
    ...overrides,
  };
}

describe("computeIsPro", () => {
  const now = 1_700_000_000_000;

  it("kein Nutzer ohne Subscription", () => {
    expect(computeIsPro(null, now)).toBe(false);
  });

  it("active innerhalb der Periode ist Pro", () => {
    expect(computeIsPro(sub({ status: "active", current_period_end: now + 1000 }), now)).toBe(true);
  });

  it("active nach Periodenende ist NICHT Pro (Webhook haette aktualisieren muessen)", () => {
    expect(computeIsPro(sub({ status: "active", current_period_end: now - 1000 }), now)).toBe(false);
  });

  it("cancel_scheduled bleibt Pro bis zum Periodenende", () => {
    expect(
      computeIsPro(sub({ status: "cancel_scheduled", current_period_end: now + 1000 }), now),
    ).toBe(true);
  });

  it("past_due innerhalb der 3-Tage-Kulanzfrist bleibt Pro", () => {
    expect(
      computeIsPro(sub({ status: "past_due", past_due_since: now - (PAST_DUE_GRACE_MS - 1) }), now),
    ).toBe(true);
  });

  it("past_due nach Ablauf der Kulanzfrist verliert Pro", () => {
    expect(
      computeIsPro(sub({ status: "past_due", past_due_since: now - (PAST_DUE_GRACE_MS + 1) }), now),
    ).toBe(false);
  });

  it("past_due ohne past_due_since (Datenfehler) ist sicherheitshalber NICHT Pro", () => {
    expect(computeIsPro(sub({ status: "past_due", past_due_since: null }), now)).toBe(false);
  });

  it("canceled ist nie Pro", () => {
    expect(computeIsPro(sub({ status: "canceled" }), now)).toBe(false);
  });
});

describe("hasRole", () => {
  it("jeder Nutzer erfuellt 'customer'", () => {
    expect(hasRole({ role: "customer" }, "customer")).toBe(true);
    expect(hasRole({ role: "admin" }, "customer")).toBe(true);
  });

  it("'admin' verlangt exakt die Rolle", () => {
    expect(hasRole({ role: "admin" }, "admin")).toBe(true);
    expect(hasRole({ role: "customer" }, "admin")).toBe(false);
  });
});
