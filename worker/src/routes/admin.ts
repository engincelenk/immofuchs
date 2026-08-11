// worker/src/routes/admin.ts
// Nutzerverwaltung fuer das Admin Panel (Paket 7, Etappe 1 "Grundgeruest").
// Ab Migration 0016 (Access Management, Paket 5) nicht mehr rein lesend -
// POST /users/:id/status ist die erste schreibende Admin-Aktion. Die
// Bedien-Oberflaeche dafuer (Button im Admin Panel) ist bewusst NICHT Teil
// dieses Pakets, siehe Paket 6 "Admin Panel".
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireAdmin, requireCsrfOrigin, type AuthVars } from "../middleware";
import {
  getUserById,
  getActiveSubscription,
  listUsersForAdmin,
  setUserAccountStatus,
  deleteAllSessionsForUser,
  getAdminDashboardStats,
  logAdminAction,
  listAdminAuditLog,
} from "../db";

const PAGE_SIZE = 20;

// LIKE-Wildcards (%/_) im Nutzer-Suchbegriff sind sonst ungewollte Platzhalter
// (z.B. wuerde die Suche nach "max_50" auch "maxX50" treffen) - deshalb hier
// escaped, mit '\' als ESCAPE-Zeichen (siehe listUsersForAdmin in db.ts).
// Der Backslash selbst muss zuerst escaped werden, sonst wuerde ein
// nutzereingegebener Backslash das Escaping der nachfolgenden Zeichen stoeren.
export function parseAdminUsersQuery(query: URLSearchParams): { search: string; page: number } {
  const rawSearch = (query.get("q") || "").trim();
  const search = rawSearch.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const rawPage = parseInt(query.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return { search, page };
}

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

adminRoutes.get("/users", requireAuth, requireAdmin, async (c) => {
  const { search, page } = parseAdminUsersQuery(new URL(c.req.url).searchParams);
  const { users, total } = await listUsersForAdmin(c.env.DB, search, page, PAGE_SIZE);
  return c.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      accountStatus: u.account_status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});

adminRoutes.get("/users/:id", requireAuth, requireAdmin, async (c) => {
  const id = c.req.param("id");
  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ error: "not_found" }, 404);
  const sub = await getActiveSubscription(c.env.DB, id);
  return c.json({
    id: user.id,
    email: user.email,
    role: user.role,
    accountStatus: user.account_status,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    emailVerified: Boolean(user.email_verified_at),
    subscription: sub
      ? { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end }
      : null,
  });
});

// Access Management (Konzept-Dok Abschnitt 2: "Benutzer sperren/entsperren").
// Beim Sperren zusaetzlich alle Sessions beenden - sonst bliebe eine bereits
// laufende Sitzung des gesperrten Nutzers bis zum naechsten /me-Aufruf
// gueltig. Beim Entsperren keine Session-Aktion noetig (Nutzer muss sich
// ohnehin neu anmelden, da seine alte Session laengst beendet ist).
adminRoutes.post("/users/:id/status", requireAuth, requireAdmin, requireCsrfOrigin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const status = body && typeof body.status === "string" ? body.status : "";
  if (status !== "ACTIVE" && status !== "SUSPENDED") return c.json({ error: "invalid_status" }, 400);

  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ error: "not_found" }, 404);

  // Ein Admin kann sich nicht selbst aussperren - sonst waere ein
  // Fehlklick der letzte Zugriff auf das eigene Konto.
  if (id === c.var.userId && status === "SUSPENDED") {
    return c.json({ error: "cannot_suspend_self" }, 400);
  }

  const from = user.account_status;
  await setUserAccountStatus(c.env.DB, id, status);
  if (status === "SUSPENDED") await deleteAllSessionsForUser(c.env.DB, id);
  await logAdminAction(c.env.DB, {
    adminUserId: c.var.userId,
    adminEmail: c.var.user.email,
    action: status === "SUSPENDED" ? "user.suspend" : "user.unsuspend",
    targetType: "user",
    targetId: id,
    details: { from, to: status, targetEmail: user.email },
  });
  return c.json({ ok: true, accountStatus: status });
});

// Dashboard (Konzept-Dok Abschnitt 3, MVP-Pflicht #1).
adminRoutes.get("/dashboard", requireAuth, requireAdmin, async (c) => {
  const stats = await getAdminDashboardStats(c.env.DB);
  return c.json(stats);
});

// Audit Log (Konzept-Dok Abschnitt 13/6, MVP-Pflicht #7).
adminRoutes.get("/audit-log", requireAuth, requireAdmin, async (c) => {
  const rawPage = parseInt(new URL(c.req.url).searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const { entries, total } = await listAdminAuditLog(c.env.DB, page, PAGE_SIZE);
  return c.json({
    entries: entries.map((e) => ({
      id: e.id,
      adminEmail: e.admin_email,
      action: e.action,
      targetType: e.target_type,
      targetId: e.target_id,
      details: e.details ? JSON.parse(e.details) : null,
      createdAt: e.created_at,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});
