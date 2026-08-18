import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Ergaenzende Billing-Faelle, die billing-checkout/-error-paths/-lifecycle
// bisher NICHT abdecken - alle bewusst zustandsNEUTRAL fuer die geteilten
// Fixtures test.monatlich/test.jaehrlich (siehe me.e2e.test.ts, das ihren
// aktiven Abo-Zustand voraussetzt).
//
// Bewusst NICHT hier (wuerden die Fixtures zerstoeren, siehe README.md
// "Was hier bewusst NICHT automatisiert ist"):
// - POST /billing/refund auf einem echten/synthetischen aktiven Abo
// - POST /billing/test-reset auf test.monatlich/test.jaehrlich (kuendigt das
//   Abo sofort - genau das Gegenteil dessen, was me.e2e.test.ts erwartet)
// - POST /billing/checkout mit gueltigem Rabattcode (kein Test-Discount-
//   Fixture vorhanden; siehe admin-lifecycle.e2e.test.ts fuer den Aufbau
//   eines Testcodes, falls E2E_SESSION_ADMIN gesetzt ist)
describe("Billing-Routen: weitere Faelle (zustandsneutral)", () => {
  it("GET /billing/portal ohne Abo (test.free) -> 404 no_active_subscription", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/portal");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_active_subscription" });
  });

  it("GET /billing/portal mit aktivem Abo (test.monatlich) -> 200 mit Paddle-Portal-URL", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/portal");
    const body = await res.json();
    expect(res.status, `Antwort: ${JSON.stringify(body)}`).toBe(200);
    expect(typeof body.url).toBe("string");
  });

  // IDOR-Schutz fuer Rechnungs-PDFs (4.10): eine frei erfundene Transaktions-
  // ID darf niemals eine URL liefern, auch nicht fuer ein Konto MIT aktivem
  // Abo - der Endpunkt muss pruefen, dass die ID zu EINER eigenen Transaktion
  // gehoert, nicht nur, dass ueberhaupt ein Kunde dahintersteht.
  it("GET /billing/invoices/:transactionId/pdf mit fremder/erfundener ID -> 403 not_your_transaction", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/invoices/txn_does_not_exist/pdf");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "not_your_transaction" });
  });

  it("GET /billing/invoices/:transactionId/pdf ohne Abo (test.free) -> 403 not_your_transaction", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/invoices/txn_irrelevant/pdf");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "not_your_transaction" });
  });

  it("POST /billing/checkout mit ungueltigem Rabattcode -> 400 invalid_discount_code", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly", discountCode: "DIESER-CODE-EXISTIERT-NICHT" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_discount_code" });
  });

  // already_on_plan ist bisher in keinem Test abgedeckt (billing-error-paths
  // prueft nur "kein Abo" und "ungueltiger Plan-Wert") - schreibt nichts,
  // da die Pruefung VOR jedem Paddle-Aufruf greift.
  it("POST /billing/change-plan auf den bereits aktiven Plan (test.monatlich) -> 400 already_on_plan", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "already_on_plan" });
  });
});

// POST /billing/test-reset mit einem ECHTEN (nicht is_test_user) Konto -> 403
// not_a_test_user ist hier bewusst NICHT getestet: alle drei Basis-Fixtures
// (free/monatlich/jaehrlich) sind laut README selbst Testkonten, es gibt
// aktuell kein Fixture, das garantiert is_test_user=0 hat. Siehe
// admin-lifecycle.e2e.test.ts fuer den Positivfall (is_test_user=1) an einem
// eigens dafuer angelegten Wegwerf-Konto.
