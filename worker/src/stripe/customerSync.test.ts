import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";
import { customerPatchFor, reconcileCustomers, syncCustomerFromUser } from "./customerSync";

const retrieveMock = vi.fn();
const updateMock = vi.fn();
const listMock = vi.fn();
vi.mock("./client", () => ({
  getStripeClient: () => ({ customers: { retrieve: retrieveMock, update: updateMock, list: listMock } }),
}));
const getUserMock = vi.fn();
const getSubMock = vi.fn();
vi.mock("../db", async (orig) => ({
  ...(await orig<typeof import("../db")>()),
  getUserById: (...a: unknown[]) => getUserMock(...a),
  getLatestSubscriptionForUser: (...a: unknown[]) => getSubMock(...a),
}));

const env = { STRIPE_SECRET_KEY: "sk_test" } as Env;

beforeEach(() => {
  for (const m of [retrieveMock, updateMock, listMock, getUserMock, getSubMock]) m.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("customerPatchFor", () => {
  it("gleicher Stand -> leer (E-Mail ohne Beachtung der Gross-/Kleinschreibung)", () => {
    expect(customerPatchFor({ email: "A@b.de", name: "Max" }, { email: "a@B.de", name: "Firma GmbH" })).toEqual({});
  });
  it("E-Mail weicht ab -> E-Mail", () => {
    expect(customerPatchFor({ email: "neu@b.de", name: null }, { email: "alt@b.de", name: "X" })).toEqual({ email: "neu@b.de" });
  });
  it("Name nur setzen, wenn Stripe noch keinen hat - Rechnungsname (z.B. Firma) wird NIE ueberschrieben", () => {
    expect(customerPatchFor({ email: "a@b.de", name: "Max" }, { email: "a@b.de", name: "Firma GmbH" })).toEqual({});
    expect(customerPatchFor({ email: "a@b.de", name: "Max" }, { email: "a@b.de", name: null })).toEqual({ name: "Max" });
  });
});

describe("syncCustomerFromUser", () => {
  const user = { id: "u1", email: "neu@b.de", name: "Max" };

  it("schickt eine geaenderte E-Mail an Stripe", async () => {
    getSubMock.mockResolvedValue({ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" });
    getUserMock.mockResolvedValue(user);
    retrieveMock.mockResolvedValue({ id: "cus_1", email: "alt@b.de", name: "Firma" });
    await syncCustomerFromUser(env, "u1");
    expect(updateMock).toHaveBeenCalledWith("cus_1", { email: "neu@b.de" });
  });

  it("Nutzer ohne Stripe-Kunde -> kein Stripe-Aufruf", async () => {
    getSubMock.mockResolvedValue(null);
    await syncCustomerFromUser(env, "u1");
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("admin-test:-Abo -> kein Stripe-Aufruf", async () => {
    getSubMock.mockResolvedValue({ stripe_customer_id: "cus_1", stripe_subscription_id: "admin-test:x" });
    await syncCustomerFromUser(env, "u1");
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("Stripe-Fehler wird geschluckt (best effort), nicht geworfen", async () => {
    getSubMock.mockResolvedValue({ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" });
    getUserMock.mockResolvedValue(user);
    retrieveMock.mockRejectedValue(new Error("stripe down"));
    await expect(syncCustomerFromUser(env, "u1")).resolves.toBeUndefined();
  });

  it("geloeschter Stripe-Kunde -> nichts zu tun", async () => {
    getSubMock.mockResolvedValue({ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" });
    getUserMock.mockResolvedValue(user);
    retrieveMock.mockResolvedValue({ id: "cus_1", deleted: true });
    await syncCustomerFromUser(env, "u1");
    expect(updateMock).not.toHaveBeenCalled();
  });
});

function fakeDb(rows: unknown[]) {
  return {
    prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Env["DB"];
}

describe("reconcileCustomers", () => {
  const rows = [{ customer_id: "cus_1", user_id: "u1", email: "neu@b.de", name: "Max" }];
  const listed = { data: [{ id: "cus_1", email: "alt@b.de", name: "Firma" }], has_more: false };

  it("Modus 'log' (Default) meldet nur, schreibt nichts nach Stripe", async () => {
    listMock.mockResolvedValue(listed);
    const r = await reconcileCustomers({ ...env, DB: fakeDb(rows) });
    expect(r).toMatchObject({ checked: 1, diffs: 1, updated: 0 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("Modus 'apply' zieht Stripe nach", async () => {
    listMock.mockResolvedValue(listed);
    const r = await reconcileCustomers({ ...env, DB: fakeDb(rows), STRIPE_RECONCILE_MODE: "apply" });
    expect(r.updated).toBe(1);
    expect(updateMock).toHaveBeenCalledWith("cus_1", { email: "neu@b.de" });
  });

  it("Modus 'off' ruft Stripe nicht auf", async () => {
    await reconcileCustomers({ ...env, DB: fakeDb(rows), STRIPE_RECONCILE_MODE: "off" });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("Kunde nicht in der Liste -> uebersprungen, nichts geraten", async () => {
    listMock.mockResolvedValue({ data: [], has_more: false });
    const r = await reconcileCustomers({ ...env, DB: fakeDb(rows), STRIPE_RECONCILE_MODE: "apply" });
    expect(r.checked).toBe(0);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ein Update-Fehler bricht den Lauf nicht ab", async () => {
    listMock.mockResolvedValue({
      data: [
        { id: "cus_1", email: "alt@b.de", name: "F" },
        { id: "cus_2", email: "alt2@b.de", name: "F" },
      ],
      has_more: false,
    });
    updateMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({});
    const two = [...rows, { customer_id: "cus_2", user_id: "u2", email: "neu2@b.de", name: null }];
    const r = await reconcileCustomers({ ...env, DB: fakeDb(two), STRIPE_RECONCILE_MODE: "apply" });
    expect(r).toMatchObject({ errors: 1, updated: 1 });
  });

  it("blaettert ueber mehrere Kundenseiten", async () => {
    listMock
      .mockResolvedValueOnce({ data: [{ id: "cus_0", email: "x@x.de", name: "x" }], has_more: true })
      .mockResolvedValueOnce(listed);
    const r = await reconcileCustomers({ ...env, DB: fakeDb(rows) });
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[1][0]).toMatchObject({ starting_after: "cus_0" });
    expect(r.checked).toBe(1);
  });
});
