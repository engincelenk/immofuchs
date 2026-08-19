import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiFetch, adminSessionId } from "./setup";

// Admin-Panel-Endpunkte (routes/admin.ts) - bisher fuer keine einzige
// schreibende Aktion e2e-getestet (siehe admin-permissions.e2e.test.ts fuer
// die 403-Grenze, die KEIN Admin-Fixture braucht). Dieser Block braucht ein
// echtes Admin-Konto (E2E_SESSION_ADMIN, siehe README.md) und ueberspringt
// sich selbst, solange das fehlt - genau wie billing-lifecycle.e2e.test.ts
// fuer E2E_SESSION_REAL_PRO.
//
// Zwei Kategorien von Tests:
//  1. Selbstschutz-Guards (cannot_demote_self/cannot_suspend_self/
//     cannot_delete_self) direkt am Admin-Konto selbst - sicher, weil die
//     Pruefung VOR jeder Mutation greift und den Vorgang ablehnt.
//  2. Voller Lebenszyklus an einem eigens angelegten Wegwerf-Testnutzer
//     (E2E-Praefix in der E-Mail) - wird am Ende wieder geloescht, beruehrt
//     keine der geteilten Fixtures (test.monatlich/jaehrlich).
//
// Bewusst NICHT hier: POST /discounts/bulk (mehrere echte Paddle-Aufruf pro
// Lauf, siehe Kommentar in routes/admin.ts zu Paddle-Ratelimits) - der
// einfache Discount-Test unten deckt denselben Code-Pfad einmal ab.
describe.skipIf(!adminSessionId)("Admin-Lifecycle (E2E_SESSION_ADMIN)", () => {
  const sessionId = adminSessionId as string;
  let selfId: string;

  beforeAll(async () => {
    const res = await apiFetch(sessionId, "/api/v1/me");
    const body = await res.json();
    selfId = body.id;
  });

  it("POST /users/:id/role auf sich selbst mit role != admin -> 400 cannot_demote_self", async () => {
    const res = await apiFetch(sessionId, `/api/v1/admin/users/${selfId}/role`, {
      method: "POST",
      body: JSON.stringify({ role: "customer" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "cannot_demote_self" });
  });

  it("POST /users/:id/status auf sich selbst mit SUSPENDED -> 400 cannot_suspend_self", async () => {
    const res = await apiFetch(sessionId, `/api/v1/admin/users/${selfId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "cannot_suspend_self" });
  });

  it("POST /users/:id/delete auf sich selbst -> 400 cannot_delete_self", async () => {
    const res = await apiFetch(sessionId, `/api/v1/admin/users/${selfId}/delete`, { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "cannot_delete_self" });
  });

  it("GET /dashboard liefert Kennzahlen", async () => {
    const res = await apiFetch(sessionId, "/api/v1/admin/dashboard");
    expect(res.status).toBe(200);
  });

  it("GET /activity liefert den Aktivitaets-Feed", async () => {
    const res = await apiFetch(sessionId, "/api/v1/admin/activity");
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).entries)).toBe(true);
  });

  it("GET /subscriptions liefert die Abo-Liste", async () => {
    const res = await apiFetch(sessionId, "/api/v1/admin/subscriptions");
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).subscriptions)).toBe(true);
  });

  it("GET /audit-log liefert das Audit-Log (die eigenen obigen Aktionen tauchen darin auf)", async () => {
    const res = await apiFetch(sessionId, "/api/v1/admin/audit-log");
    expect(res.status).toBe(200);
    expect(Array.isArray((await res.json()).entries)).toBe(true);
  });

  describe("Voller Nutzer-Lebenszyklus an einem Wegwerf-Testkonto", () => {
    const email = `e2e-admin-lifecycle-${randomUUID()}@immofuchs.info`;
    let userId: string;

    afterAll(async () => {
      if (userId) await apiFetch(sessionId, `/api/v1/admin/users/${userId}/delete`, { method: "POST" });
    });

    it("POST /users legt den Wegwerf-Nutzer an", async () => {
      const res = await apiFetch(sessionId, "/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, name: "E2E Lifecycle", role: "customer", isTestUser: false }),
      });
      const body = await res.json();
      expect(res.status, `Antwort: ${JSON.stringify(body)}`).toBe(200);
      expect(body.email).toBe(email);
      userId = body.id;
    });

    it("POST /users mit derselben E-Mail -> 409 email_exists", async () => {
      const res = await apiFetch(sessionId, "/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, role: "customer" }),
      });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "email_exists" });
    });

    it("GET /users/:id liefert das gerade angelegte Detail", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}`);
      expect(res.status).toBe(200);
      expect((await res.json()).email).toBe(email);
    });

    it("GET /users findet den Nutzer per Suchbegriff", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users?q=${encodeURIComponent(email)}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.users.some((u: { id: string }) => u.id === userId)).toBe(true);
    });

    it("POST /users/:id/flags setzt isTestUser=true", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/flags`, {
        method: "POST",
        body: JSON.stringify({ isTestUser: true }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, isTestUser: true });
    });

    it("POST /users/:id/notes fuegt eine Support-Notiz hinzu", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "E2E-Testnotiz" }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).note.note).toBe("E2E-Testnotiz");
    });

    it("POST /users/:id/status suspendiert und entsperrt den Nutzer wieder", async () => {
      const suspend = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "SUSPENDED" }),
      });
      expect(suspend.status).toBe(200);
      expect(await suspend.json()).toEqual({ ok: true, accountStatus: "SUSPENDED" });

      const unsuspend = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      expect(unsuspend.status).toBe(200);
      expect(await unsuspend.json()).toEqual({ ok: true, accountStatus: "ACTIVE" });
    });

    it("POST /users/:id/role aendert die Rolle des Wegwerf-Nutzers", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, role: "admin" });
    });

    it("POST /users/:id/sessions/revoke -> 200 ok (auch ohne aktive Sessions)", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/sessions/revoke`, { method: "POST" });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("POST /users/:id/password-reset -> 400 no_password_account (Konto ohne Passwort)", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/users/${userId}/password-reset`, { method: "POST" });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "no_password_account" });
    });
  });

  describe("Discount-Lebenszyklus (eigens angelegter Testcode)", () => {
    // Kein Bindestrich (19.08.-Befund via wrangler tail): Paddle akzeptiert nur
    // ^[a-zA-Z0-9]{1,32}$ als Discount-Code, ein "E2E-XXXXXXXX" scheiterte mit
    // 502 create_discount_failed - alle nachfolgenden update/archive-Tests
    // liefen dadurch gegen /admin/discounts/undefined (404).
    const code = `E2E${randomUUID().slice(0, 8).toUpperCase()}`;
    let discountId: string;

    it("POST /discounts legt einen Testcode an", async () => {
      const res = await apiFetch(sessionId, "/api/v1/admin/discounts", {
        method: "POST",
        body: JSON.stringify({ code, description: "E2E Testcode", type: "percentage", amount: "5" }),
      });
      const body = await res.json();
      expect(res.status, `Antwort: ${JSON.stringify(body)}`).toBe(200);
      expect(body.discount.code).toBe(code);
      discountId = body.discount.id;
    });

    it("GET /discounts listet den Testcode", async () => {
      const res = await apiFetch(sessionId, "/api/v1/admin/discounts");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.discounts.some((d: { id: string }) => d.id === discountId)).toBe(true);
    });

    it("POST /discounts/:id bearbeitet die Beschreibung", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/discounts/${discountId}`, {
        method: "POST",
        body: JSON.stringify({ description: "E2E Testcode (bearbeitet)" }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).discount.description).toBe("E2E Testcode (bearbeitet)");
    });

    // Kein DELETE-Endpunkt fuer Discounts (Absicht laut Kommentar in
    // routes/admin.ts) - Aufraeumen heisst hier: archivieren statt loeschen.
    it("POST /discounts/:id/status archiviert den Testcode (Aufraeumen)", async () => {
      const res = await apiFetch(sessionId, `/api/v1/admin/discounts/${discountId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "archived" }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, status: "archived" });
    });
  });
});
