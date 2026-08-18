import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Bewusst NICHT uebersprungen und nicht als "known failing" markiert: dieser
// Test ist der Regressionstest fuer den am 2026-08-18 gefundenen Bug
// (PADDLE_PRICE_ID_MONTHLY/YEARLY bzw. PADDLE_API_KEY auf dev fehlerhaft -
// Paddle antwortet mit 400 "items.0: Must validate one and only one schema",
// siehe release-notes.txt 1.20.1). Er bleibt rot, bis die Paddle-Konfiguration
// stimmt, und wird genau dadurch gruen - kein manuelles Update noetig.
describe("POST /billing/checkout — echte Paddle-Sandbox-Transaktion", () => {
  it.each(["monthly", "yearly"] as const)("erzeugt eine Draft-Transaktion fuer Plan=%s", async (plan) => {
    const res = await apiFetch(sessions.free(), "/api/v1/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    const body = await res.json();
    expect(res.status, `Antwort: ${JSON.stringify(body)}`).toBe(200);
    expect(body.transactionId).toEqual(expect.stringMatching(/^txn_/));
  });
});
