import { describe, expect, it } from "vitest";
import { isCheckoutOpenFor, isCheckoutPublic } from "./checkoutGate";

// Minimaler D1-Ersatz: liefert fuer SELECT die vorgegebene Zeile (oder wirft).
function fakeDb(row: { value: string } | null | "throw") {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => {
          if (row === "throw") throw new Error("no such table: app_settings");
          return row;
        },
      }),
    }),
  } as never;
}
const customer = { role: "customer", is_test_user: 0 };

describe("checkoutGate", () => {
  it("ist ohne Variable und ohne Override offen (dev, qa)", async () => {
    expect(await isCheckoutPublic({ DB: fakeDb(null) })).toBe(true);
  });
  it("sperrt bei CHECKOUT_ENABLED=false alle ausser Admins und Testusern", async () => {
    const env = { CHECKOUT_ENABLED: "false", DB: fakeDb(null) };
    expect(await isCheckoutOpenFor(env, customer)).toBe(false);
    expect(await isCheckoutOpenFor(env, { role: "admin", is_test_user: 0 })).toBe(true);
    expect(await isCheckoutOpenFor(env, { role: "customer", is_test_user: 1 })).toBe(true);
  });
  it("DB-Override schlaegt die Variable (Admin-Schalter)", async () => {
    expect(await isCheckoutPublic({ CHECKOUT_ENABLED: "false", DB: fakeDb({ value: "true" }) })).toBe(true);
    expect(await isCheckoutPublic({ CHECKOUT_ENABLED: "true", DB: fakeDb({ value: "false" }) })).toBe(false);
  });
  it("faellt ohne migrierte Tabelle auf die Variable zurueck", async () => {
    expect(await isCheckoutPublic({ CHECKOUT_ENABLED: "false", DB: fakeDb("throw") })).toBe(false);
  });
});
