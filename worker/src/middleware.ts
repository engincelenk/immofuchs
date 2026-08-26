// Hono-Middleware fuer Auth/Entitlement/CSRF - buendelt, was vorher pro Route
// haendisch wiederholt werden muesste (Spec 5.2, Begruendung fuer die
// Hono-Migration in Sprint 3).
import { createMiddleware } from "hono/factory";
import type { Env } from "./types";
import { authenticate, checkCsrfOrigin } from "./auth/session";
import { getEntitlement, hasPermission, type Permission } from "./entitlement";
import type { UserRow } from "./db";
import { getUserById } from "./db";

export interface AuthVars {
  userId: string;
  user: UserRow;
  sessionId: string;
}

// Setzt c.var.userId/user/sessionId oder antwortet 401 - fuer alle
// /api/v1-Routen ausser den oeffentlichen Auth-Einstiegspunkten selbst.
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVars }>(
  async (c, next) => {
    const ctx = await authenticate(c.req.raw, c.env);
    if (!ctx) return c.json({ error: "not_authenticated" }, 401);
    const user = await getUserById(c.env.DB, ctx.session.user_id);
    if (!user) return c.json({ error: "not_authenticated" }, 401);
    // Access Management (Konzept-Dok Abschnitt 2/5, Migration 0016): ein
    // gesperrtes Konto behandelt sich wie "nicht angemeldet", nicht wie ein
    // eigener Fehlerfall - konsistent mit dem Login-Standard-Flow (Abschnitt
    // 2.2 der Neue-Phase-Doku: 401 -> Session wird invalidiert, Anmeldung
    // erforderlich), statt eines separaten "account_suspended"-Sonderpfads,
    // der im Frontend extra behandelt werden muesste.
    if (user.account_status === "SUSPENDED") return c.json({ error: "not_authenticated" }, 401);
    c.set("userId", user.id);
    c.set("user", user);
    c.set("sessionId", ctx.session.id);
    await next();
  },
);

export interface EntitlementVars extends AuthVars {
  isPro: boolean;
}

// Baut auf requireAuth auf: 402, falls kein aktives Pro-Abo (4.9). Setzt bei
// Cache-Miss automatisch den signierten Entitlement-Cookie auf der Response.
export const requirePro = createMiddleware<{ Bindings: Env; Variables: EntitlementVars }>(
  async (c, next) => {
    const result = await getEntitlement(c.req.raw, c.env, c.var.userId);
    if (result.setCookie) c.header("Set-Cookie", result.setCookie, { append: true });
    if (!result.isPro) return c.json({ error: "pro_required" }, 402);
    c.set("isPro", true);
    await next();
  },
);

// Admin Panel (Paket 7): baut auf requireAuth auf (c.var.user muss gesetzt
// sein), 403 falls die Rolle die verlangte Permission nicht hat. Bewusst
// permission-basiert statt "if role === 'admin'" (Neue-Phase-Konsolidiert.md
// Abschnitt 8.2, verbindliche technische Vorgabe) - eine kuenftige weitere
// Rolle liesse sich additiv ergaenzen, ohne diese Middleware umzubauen.
export function requirePermission(permission: Permission) {
  return createMiddleware<{ Bindings: Env; Variables: AuthVars }>(async (c, next) => {
    if (!hasPermission(c.var.user, permission)) return c.json({ error: "forbidden" }, 403);
    await next();
  });
}

// Zwei benannte Stufen fuer die Admin-Routen:
//  - requireAdminRead: ansehen (user.read)
//  - requireAdmin:     aendern (user.manage)
// Mit nur noch zwei Rollen (customer/admin) fallen beide aktuell auf
// dieselbe Rolle 'admin' zurueck - bleiben aber als eigene Permissions
// bestehen, damit eine kuenftige Rolle mit reinem Leserecht additiv
// ergaenzt werden kann. Kritische Aktionen tragen ihre eigene, engere
// Permission (user.delete, discount.manage) - "UI-Verstecken alleine reicht
// nicht", jede Route prueft serverseitig selbst.
export const requireAdminRead = requirePermission("user.read");
export const requireAdmin = requirePermission("user.manage");

// CSRF-Schutz (4.5, analog zum bestehenden CORS-Muster) fuer state-changing
// Routen. Getrennt von requireAuth, weil Webhook-Endpunkte (Stripe-Signatur
// statt Origin-Pruefung) und OAuth-Callbacks (GET) es nicht brauchen.
export const requireCsrfOrigin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!checkCsrfOrigin(c.req.raw, c.env.ALLOWED_ORIGIN)) {
    return c.json({ error: "csrf_origin_mismatch" }, 403);
  }
  await next();
});
