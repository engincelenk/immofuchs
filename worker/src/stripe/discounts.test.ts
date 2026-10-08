import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { findUsableDiscountByCode } from "./discounts";

const listMock = vi.fn();
vi.mock("./client", () => ({ getStripeClient: () => ({ promotionCodes: { list: listMock } }) }));

function promo(code: string, active = true) {
  return {
    id: "promo_1",
    code,
    active,
    times_redeemed: 2,
    max_redemptions: 10,
    expires_at: null,
    coupon: { id: "c_1", name: "Sommer", percent_off: 10, amount_off: null, valid: true },
  };
}

beforeEach(() => listMock.mockReset());

describe("findUsableDiscountByCode (Checkout-Lookup)", () => {
  it("sucht nur aktive Promotion Codes", async () => {
    listMock.mockResolvedValue({ data: [promo("SOMMER")] });
    await findUsableDiscountByCode({} as Env, "SOMMER");
    expect(listMock.mock.calls[0][0]).toMatchObject({ code: "SOMMER", active: true, limit: 1 });
  });

  it("liefert die Coupon-ID fuer die Subscription-Erzeugung", async () => {
    listMock.mockResolvedValue({ data: [promo("SOMMER")] });
    const d = await findUsableDiscountByCode({} as Env, "SOMMER");
    expect(d).toMatchObject({ couponId: "c_1", code: "SOMMER", type: "percentage", amount: "10", status: "active" });
  });

  it("unbekannter/inaktiver Code -> null", async () => {
    listMock.mockResolvedValue({ data: [] });
    expect(await findUsableDiscountByCode({} as Env, "NOPE")).toBeNull();
  });
});
