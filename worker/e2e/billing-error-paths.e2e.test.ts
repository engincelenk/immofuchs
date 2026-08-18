import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// test.free hat garantiert kein Abo (is_test_user, keine subscriptions-Zeile)
// - genau deshalb hier verwendet: alle Faelle unten muessen unabhaengig vom
// aktuellen Paddle-Konfigurationsstand stabil funktionieren, weil sie D1
// pruefen, BEVOR ueberhaupt ein Paddle-Aufruf stattfindet (siehe
// routes/billing.ts).
describe("Billing-Routen: Fehlerpfade ohne aktives Abo (test.free)", () => {
  it("POST /billing/cancel ohne Abo -> 404 no_active_subscription", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/cancel", { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_active_subscription" });
  });

  it("POST /billing/change-plan ohne Abo -> 404 no_active_subscription", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_active_subscription" });
  });

  it("POST /billing/change-plan mit ungueltigem Plan -> 400 invalid_plan", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "weekly" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_plan" });
  });

  it("POST /billing/reactivate ohne cancel_scheduled -> 400 not_cancel_scheduled", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/reactivate", { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "not_cancel_scheduled" });
  });

  it("POST /billing/refund ohne Abo -> 404 no_active_subscription", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/refund", { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_active_subscription" });
  });

  it("GET /billing/invoices ohne Abo -> 200 mit leerer Liste (kein Fehler)", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/invoices");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ invoices: [] });
  });

  it("POST /billing/checkout mit ungueltigem Plan -> 400 invalid_plan", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "lifetime" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_plan" });
  });
});
