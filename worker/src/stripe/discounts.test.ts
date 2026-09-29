import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { listDiscounts } from "./discounts";

const listMock = vi.fn();
vi.mock("./client", () => ({ getStripeClient: () => ({ promotionCodes: { list: listMock } }) }));

function promo(id: string, code: string) {
  return {
    id,
    code,
    active: true,
    times_redeemed: 0,
    max_redemptions: null,
    expires_at: null,
    coupon: { id: `c_${id}`, name: "n", percent_off: 10, amount_off: null, valid: true },
  };
}

beforeEach(() => listMock.mockReset());

describe("listDiscounts (Paginierung)", () => {
  it("blaettert ueber alle Seiten, statt bei 100 abzuschneiden", async () => {
    listMock
      .mockResolvedValueOnce({ data: [promo("p1", "A"), promo("p2", "B")], has_more: true })
      .mockResolvedValueOnce({ data: [promo("p3", "C")], has_more: false });
    const result = await listDiscounts({} as Env);
    expect(result.map((d) => d.code)).toEqual(["A", "B", "C"]);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[0][0].starting_after).toBeUndefined();
    expect(listMock.mock.calls[1][0].starting_after).toBe("p2");
  });

  it("eine Seite genuegt -> ein Aufruf", async () => {
    listMock.mockResolvedValueOnce({ data: [promo("p1", "A")], has_more: false });
    expect(await listDiscounts({} as Env)).toHaveLength(1);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("bricht bei leerer Seite trotz has_more ab (keine Endlosschleife)", async () => {
    listMock.mockResolvedValue({ data: [], has_more: true });
    expect(await listDiscounts({} as Env)).toEqual([]);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("hoert nach der Seitenobergrenze auf", async () => {
    listMock.mockResolvedValue({ data: [promo("p1", "A")], has_more: true });
    await listDiscounts({} as Env);
    expect(listMock).toHaveBeenCalledTimes(20);
  });
});
