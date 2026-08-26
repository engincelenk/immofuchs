import { describe, it, expect } from "vitest";
import { apiFetch, realProSessionId } from "./setup";

// Braucht einen Account mit einem ECHTEN (nicht synthetischen) Stripe-
// Testmodus-Abo - existiert erst, nachdem einmal ein echter Testmodus-Kauf
// durchgefuehrt wurde (E2E_SESSION_REAL_PRO, siehe README.md). Bis dahin
// uebersprungen, nicht rot - ein fehlendes Test-Fixture ist kein
// Produktfehler.
//
// Bewusst NICHT enthalten:
// - Plan wechseln: schreibt den neuen Plan nicht direkt (routes/billing.ts),
//   sondern wartet auf Stripes customer.subscription.updated-Webhook -
//   asynchron, ohne Polling nicht deterministisch testbar.
// - Rueckerstattung: wuerde das einzige persistente Test-Abo zerstoeren, das
//   diese Suite fuer jeden weiteren Lauf braucht - nur manuell zu pruefen.
//
// cancel + reactivate sind bewusst als Paar hier: beide schreiben D1 direkt
// im selben Request (kein Warten auf einen Webhook noetig) und die Suite
// verlaesst das Abo danach wieder im Ausgangszustand (aktiv), damit der
// naechste Lauf ohne manuelles Aufraeumen funktioniert.
describe.skipIf(!realProSessionId)("Billing-Lifecycle an einem echten Stripe-Testmodus-Abo", () => {
  const sessionId = realProSessionId as string;

  it("GET /billing/invoices liefert mindestens eine Transaktion", async () => {
    const res = await apiFetch(sessionId, "/api/v1/billing/invoices");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices.length).toBeGreaterThan(0);
  });

  it("POST /billing/cancel setzt cancel_scheduled und liefert das Periodenende", async () => {
    const res = await apiFetch(sessionId, "/api/v1/billing/cancel", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.periodEnd).toBe("number");
  });

  it("POST /billing/reactivate macht die Kuendigung rueckgaengig (Abo bleibt fuer den naechsten Lauf aktiv)", async () => {
    const res = await apiFetch(sessionId, "/api/v1/billing/reactivate", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
