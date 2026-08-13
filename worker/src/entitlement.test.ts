import { describe, it, expect } from "vitest";
import { computeIsPro, hasPermission, hasRole, PAST_DUE_GRACE_MS } from "./entitlement";
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
    trial_reminder_sent_at: null,
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

  it("trialing innerhalb der Trial-Periode ist Pro (Phase 3)", () => {
    expect(computeIsPro(sub({ status: "trialing", current_period_end: now + 1000 }), now)).toBe(true);
  });

  it("trialing nach Ablauf der Trial-Periode ist NICHT Pro", () => {
    expect(computeIsPro(sub({ status: "trialing", current_period_end: now - 1000 }), now)).toBe(false);
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

describe("hasPermission (Konzept-Dok 8.2, Rollenmodell customer/support/admin)", () => {
  it("admin hat nur die im Dok gelisteten Admin-Permissions, keine Customer-Permissions", () => {
    expect(hasPermission({ role: "admin" }, "user.manage")).toBe(true);
    expect(hasPermission({ role: "admin" }, "security.manage")).toBe(true);
    expect(hasPermission({ role: "admin" }, "calculator.use")).toBe(false);
  });

  it("customer hat Produktfunktionen, keine Admin-Rechte", () => {
    expect(hasPermission({ role: "customer" }, "calculator.use")).toBe(true);
    expect(hasPermission({ role: "customer" }, "ai.use")).toBe(true);
    expect(hasPermission({ role: "customer" }, "profile.manage")).toBe(true);
    expect(hasPermission({ role: "customer" }, "invoice.read")).toBe(true);
    expect(hasPermission({ role: "customer" }, "user.manage")).toBe(false);
  });

  it("unbekannte/leere Rolle hat sicherheitshalber keine Permissions", () => {
    expect(hasPermission({ role: "unknown_role" }, "calculator.use")).toBe(false);
  });
});

// Admin-MVP Abschnitt 13: der springende Punkt der Support-Rolle ist, was sie
// NICHT darf - deshalb hier jede kritische Aktion einzeln als Negativ-Test.
// "UI-Verstecken alleine reicht nicht": diese Matrix ist die serverseitige
// Wahrheit, die requirePermission() in middleware.ts durchsetzt.
describe("hasPermission — Support-Rolle (Admin-MVP, Auftrag Abschnitt 13)", () => {
  it("support darf ansehen und Support-Notizen schreiben", () => {
    expect(hasPermission({ role: "support" }, "user.read")).toBe(true);
    expect(hasPermission({ role: "support" }, "user.note")).toBe(true);
    expect(hasPermission({ role: "support" }, "subscription.read")).toBe(true);
    expect(hasPermission({ role: "support" }, "discount.read")).toBe(true);
  });

  it("support darf NICHT aendern, loeschen oder Gutscheine verwalten", () => {
    expect(hasPermission({ role: "support" }, "user.manage")).toBe(false);
    expect(hasPermission({ role: "support" }, "user.delete")).toBe(false);
    expect(hasPermission({ role: "support" }, "discount.manage")).toBe(false);
    expect(hasPermission({ role: "support" }, "subscription.manage")).toBe(false);
    expect(hasPermission({ role: "support" }, "security.manage")).toBe(false);
  });

  it("admin darf alles, was support darf, und zusaetzlich die kritischen Aktionen", () => {
    expect(hasPermission({ role: "admin" }, "user.read")).toBe(true);
    expect(hasPermission({ role: "admin" }, "user.note")).toBe(true);
    expect(hasPermission({ role: "admin" }, "user.delete")).toBe(true);
    expect(hasPermission({ role: "admin" }, "discount.manage")).toBe(true);
  });

  it("customer kommt an keine einzige Admin-Permission", () => {
    expect(hasPermission({ role: "customer" }, "user.read")).toBe(false);
    expect(hasPermission({ role: "customer" }, "user.note")).toBe(false);
    expect(hasPermission({ role: "customer" }, "user.delete")).toBe(false);
    expect(hasPermission({ role: "customer" }, "discount.read")).toBe(false);
  });

  it("'test_user' ist keine Rolle mehr (Migration 0019) und hat daher keine Rechte", () => {
    expect(hasPermission({ role: "test_user" }, "user.read")).toBe(false);
    expect(hasPermission({ role: "test_user" }, "calculator.use")).toBe(false);
  });
});
