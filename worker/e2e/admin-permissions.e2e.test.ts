import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Permission-Grenze der Admin-Routen (middleware.ts: requireAdminRead /
// requireAdmin / requirePermission) - bisher fuer KEINE einzige Admin-Route
// verifiziert. Braucht kein Admin-Fixture: die Basis-Sessions haben
// role='customer' (siehe entitlement.ts ROLE_PERMISSIONS), deren
// Rechte-Set enthaelt keine der Admin-Permissions (user.read/user.manage/
// user.note/user.delete/subscription.*/discount.*) - jede dieser Routen MUSS
// daher fuer test.monatlich mit 403 antworten, unabhaengig von Pfad-
// Parametern oder Body (die Permission-Pruefung liegt in der Middleware-
// Kette VOR dem eigentlichen Handler, siehe routes/admin.ts). Die
// Kontowahl (monatlich statt eines Free-Kontos) spielt fuer dieses Ergebnis
// keine Rolle - es geht ausschliesslich um role='customer'.
//
// Fuer den POSITIV-Fall (ein echtes Admin-Konto darf diese Routen nutzen)
// siehe admin-lifecycle.e2e.test.ts (optional, braucht E2E_SESSION_ADMIN).
const DUMMY_ID = "e2e-does-not-exist";

const ADMIN_ROUTES: Array<{ method: string; path: string; label: string }> = [
  { method: "GET", path: "/api/v1/admin/users", label: "GET /users" },
  { method: "GET", path: `/api/v1/admin/users/${DUMMY_ID}`, label: "GET /users/:id" },
  { method: "POST", path: "/api/v1/admin/users", label: "POST /users" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/role`, label: "POST /users/:id/role" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/flags`, label: "POST /users/:id/flags" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/notes`, label: "POST /users/:id/notes" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/password-reset`, label: "POST /users/:id/password-reset" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/sessions/revoke`, label: "POST /users/:id/sessions/revoke" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/delete`, label: "POST /users/:id/delete" },
  { method: "POST", path: `/api/v1/admin/users/${DUMMY_ID}/status`, label: "POST /users/:id/status" },
  { method: "GET", path: "/api/v1/admin/subscriptions", label: "GET /subscriptions" },
  { method: "GET", path: `/api/v1/admin/subscriptions/${DUMMY_ID}`, label: "GET /subscriptions/:id" },
  { method: "GET", path: "/api/v1/admin/dashboard", label: "GET /dashboard" },
  { method: "GET", path: "/api/v1/admin/activity", label: "GET /activity" },
  { method: "GET", path: "/api/v1/admin/discounts", label: "GET /discounts" },
  { method: "POST", path: "/api/v1/admin/discounts", label: "POST /discounts" },
  { method: "POST", path: "/api/v1/admin/discounts/bulk", label: "POST /discounts/bulk" },
  { method: "POST", path: `/api/v1/admin/discounts/${DUMMY_ID}`, label: "POST /discounts/:id" },
  { method: "POST", path: `/api/v1/admin/discounts/${DUMMY_ID}/status`, label: "POST /discounts/:id/status" },
  { method: "GET", path: "/api/v1/admin/audit-log", label: "GET /audit-log" },
];

describe("Admin-Routen: 403 forbidden fuer Nicht-Admin-Konten (test.monatlich)", () => {
  it.each(ADMIN_ROUTES)("$label -> 403 forbidden", async ({ method, path }) => {
    const res = await apiFetch(sessions.monatlich(), path, {
      method,
      body: method === "POST" ? JSON.stringify({}) : undefined,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });
});
