import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { cardExpiredBy, sendCardExpiryReminders } from "./cardExpiry";

const retrieveMock = vi.fn();
vi.mock("./client", () => ({
  getStripeClient: () => ({ subscriptions: { retrieve: retrieveMock } }),
}));
const dispatchMock = vi.fn();
vi.mock("../notifications", () => ({ dispatchNotification: (...a: unknown[]) => dispatchMock(...a) }));
const listMock = vi.fn();
const markMock = vi.fn();
vi.mock("../db", () => ({
  listSubscriptionsForCardCheck: (...a: unknown[]) => listMock(...a),
  markCardExpiryChecked: (...a: unknown[]) => markMock(...a),
}));

const PERIOD_END = Date.UTC(2026, 10, 15); // 15.11.2026

function candidate(over: Record<string, unknown> = {}) {
  return {
    id: "row_1",
    user_id: "user_1",
    email: "a@b.de",
    stripe_subscription_id: "sub_1",
    current_period_end: PERIOD_END,
    ...over,
  };
}

function stripeSub(card: { exp_month: number; exp_year: number; last4?: string } | null) {
  return { default_payment_method: card ? { card: { last4: "4242", ...card } } : null, customer: "cus_1" };
}

const env = { DB: {} } as unknown as Env;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cardExpiredBy", () => {
  it("Karte gilt bis Ende des Ablaufmonats", () => {
    expect(cardExpiredBy(11, 2026, Date.UTC(2026, 10, 30, 23, 59))).toBe(false);
    expect(cardExpiredBy(11, 2026, Date.UTC(2026, 11, 1))).toBe(true);
  });
  it("Ablauf vor der Abbuchung -> true, danach -> false", () => {
    expect(cardExpiredBy(10, 2026, PERIOD_END)).toBe(true);
    expect(cardExpiredBy(12, 2026, PERIOD_END)).toBe(false);
  });
});

describe("sendCardExpiryReminders", () => {
  it("sendet eine Mail und merkt sich die Periode, wenn die Karte vor der Abbuchung ablaeuft", async () => {
    listMock.mockResolvedValue([candidate()]);
    retrieveMock.mockResolvedValue(stripeSub({ exp_month: 10, exp_year: 2026 }));
    await sendCardExpiryReminders(env);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock.mock.calls[0][1]).toMatchObject({
      event: "card_expiring",
      recipientEmail: "a@b.de",
      payload: { expiry: "10/2026", last4: "4242" },
    });
    expect(markMock).toHaveBeenCalledWith(env.DB, "row_1", PERIOD_END);
  });

  it("sendet nichts, wenn die Karte noch gueltig ist, markiert aber als geprueft", async () => {
    listMock.mockResolvedValue([candidate()]);
    retrieveMock.mockResolvedValue(stripeSub({ exp_month: 12, exp_year: 2027 }));
    await sendCardExpiryReminders(env);
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(markMock).toHaveBeenCalledWith(env.DB, "row_1");
  });

  it("ohne hinterlegte Karte keine Mail", async () => {
    listMock.mockResolvedValue([candidate()]);
    retrieveMock.mockResolvedValue(stripeSub(null));
    await sendCardExpiryReminders(env);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("Stripe-Fehler bei einem Abo blockiert die uebrigen nicht und markiert nicht als geprueft", async () => {
    listMock.mockResolvedValue([candidate(), candidate({ id: "row_2", stripe_subscription_id: "sub_2" })]);
    retrieveMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(stripeSub({ exp_month: 10, exp_year: 2026 }));
    await sendCardExpiryReminders(env);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(markMock).toHaveBeenCalledTimes(1);
    expect(markMock.mock.calls[0][1]).toBe("row_2");
  });

  it("ohne faellige Abos kein Stripe-Aufruf", async () => {
    listMock.mockResolvedValue([]);
    await sendCardExpiryReminders(env);
    expect(retrieveMock).not.toHaveBeenCalled();
  });
});
