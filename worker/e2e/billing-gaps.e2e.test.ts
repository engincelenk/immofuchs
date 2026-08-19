import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Ergaenzende Billing-Faelle, die billing-checkout/-lifecycle bisher NICHT
// abdecken - alle bewusst zustandsNEUTRAL fuer die geteilten Fixtures
// test.monatlich/test.jaehrlich (siehe me.e2e.test.ts, das ihren aktiven
// Abo-Zustand voraussetzt).
//
// Seit 2026-08-18 (test.free geloescht, siehe release-notes.txt) auch die
// drei Validierungsfaelle aus dem ehemaligen billing-error-paths.e2e.test.ts,
// die NICHT den "kein Abo"-Zustand brauchen (Pruefung greift laut
// routes/billing.ts VOR jedem Subscription-Lookup) - deshalb gefahrlos auf
// test.monatlich umgestellt statt ersatzlos gestrichen. Echte "kein Abo"-
// Faelle (cancel/change-plan/refund ohne Abo, leere Rechnungsliste) sind
// dagegen ersatzlos entfallen, siehe README.md "Was hier bewusst NICHT
// automatisiert ist".
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

  it("POST /billing/checkout mit ungueltigem Rabattcode -> 400 invalid_discount_code", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly", discountCode: "DIESER-CODE-EXISTIERT-NICHT" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_discount_code" });
  });

  // already_on_plan ist bisher in keinem anderen Test abgedeckt - schreibt
  // nichts, da die Pruefung VOR jedem Paddle-Aufruf greift.
  it("POST /billing/change-plan auf den bereits aktiven Plan (test.monatlich) -> 400 already_on_plan", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "already_on_plan" });
  });

  // Aus dem ehemaligen billing-error-paths.e2e.test.ts uebernommen: die
  // invalid_plan-Pruefung liegt VOR jedem Subscription-Lookup (siehe
  // routes/billing.ts change-plan-Handler), daher unabhaengig vom
  // Abo-Zustand des verwendeten Kontos - test.monatlich ist hier sicher.
  it("POST /billing/change-plan mit ungueltigem Plan -> 400 invalid_plan", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/change-plan", {
      method: "POST",
      body: JSON.stringify({ plan: "weekly" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_plan" });
  });

  // Aus dem ehemaligen billing-error-paths.e2e.test.ts uebernommen: die
  // Bedingung ist "kein Abo ODER Status != cancel_scheduled" (siehe
  // routes/billing.ts reactivate-Handler) - trifft auf test.monatlich
  // (Status "active") ebenso zu wie auf ein Konto ganz ohne Abo, daher
  // gefahrlos uebertragbar.
  it("POST /billing/reactivate ohne cancel_scheduled (test.monatlich, Status aktiv) -> 400 not_cancel_scheduled", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/reactivate", { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "not_cancel_scheduled" });
  });

  // Aus dem ehemaligen billing-error-paths.e2e.test.ts uebernommen: die
  // invalid_plan-Pruefung im Checkout-Handler liegt VOR jedem Discount-
  // Lookup und vor jedem Paddle-Aufruf (siehe routes/billing.ts), daher
  // unabhaengig vom Abo-Zustand.
  it("POST /billing/checkout mit ungueltigem Plan -> 400 invalid_plan", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "lifetime" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_plan" });
  });
});

// POST /billing/test-reset mit einem ECHTEN (nicht is_test_user) Konto -> 403
// not_a_test_user ist hier bewusst NICHT getestet: die verbleibenden
// Basis-Fixtures (monatlich/jaehrlich) sind laut README selbst Testkonten,
// es gibt aktuell kein Fixture, das garantiert is_test_user=0 hat. Siehe
// admin-lifecycle.e2e.test.ts fuer den Positivfall (is_test_user=1) an einem
// eigens dafuer angelegten Wegwerf-Konto.
//
// Ersatzlos entfallen (2026-08-18, test.free geloescht, siehe
// release-notes.txt): die "kein Abo"-Fehlerpfade, die zwingend ein Konto
// OHNE aktives Abo brauchten (cancel/refund/change-plan/portal/invoice-pdf
// ohne Abo -> 404, leere Rechnungsliste) - eine Uebertragung auf
// monatlich/jaehrlich wuerde entweder ein echtes Abo faelschlich anzeigen
// lassen (invoices/portal) oder es sogar tatsaechlich kuendigen/erstatten
// (cancel/refund) - beides nicht akzeptabel fuer geteilte Fixtures. Siehe
// worker/e2e/README.md fuer den vollen Hinweis zu dieser Coverage-Luecke.
