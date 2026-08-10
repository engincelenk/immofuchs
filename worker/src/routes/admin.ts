// worker/src/routes/admin.ts
// Nutzerverwaltung fuer das Admin Panel (Paket 7, Etappe 1 "Grundgeruest").
// Rein lesend - siehe docs/superpowers/specs/2026-08-10-admin-panel-grundgeruest-design.md.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireAdmin, type AuthVars } from "../middleware";
import { getUserById, getActiveSubscription, listUsersForAdmin } from "../db";

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
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    emailVerified: Boolean(user.email_verified_at),
    subscription: sub
      ? { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end }
      : null,
  });
});
