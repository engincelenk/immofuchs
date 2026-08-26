// worker/src/routes/admin.ts
// Nutzerverwaltung fuer das Admin Panel (Paket 7, Etappe 1 "Grundgeruest").
// Ab Migration 0016 (Access Management, Paket 5) nicht mehr rein lesend -
// POST /users/:id/status ist die erste schreibende Admin-Aktion. Die
// Bedien-Oberflaeche dafuer (Button im Admin Panel) ist bewusst NICHT Teil
// dieses Pakets, siehe Paket 6 "Admin Panel".
import { Hono } from "hono";
import type { Env } from "../types";
import {
  requireAuth,
  requireAdmin,
  requireAdminRead,
  requirePermission,
  requireCsrfOrigin,
  type AuthVars,
} from "../middleware";
import type { AdminUsersFilter, AdminAuditLogFilter, AdminSubscriptionFilterKey, SubscriptionRow } from "../db";
import {
  getUserById,
  getUserByEmail,
  createUser,
  updateUserName,
  getActiveSubscription,
  getLatestSubscriptionForUser,
  createManualSubscriptionForAdmin,
  resetTestUserSubscription,
  ADMIN_TEST_SUBSCRIPTION_PREFIX,
  listSubscriptionsForAdmin,
  getSubscriptionForAdmin,
  isAdminSubscriptionFilter,
  listUsersForAdmin,
  setUserAccountStatus,
  setUserRole,
  setUserFlags,
  addSupportNote,
  listSupportNotes,
  deleteAllSessionsForUser,
  getAdminDashboardStats,
  listAdminActivity,
  logAdminAction,
  listAdminAuditLog,
  listAuditLogAdmins,
} from "../db";
import { deleteAccountCompletely } from "../accountDeletion";
import { cancelImmediately } from "../stripe/checkout";
import { requestPasswordReset, sendPasswordSetupInvite } from "../auth/passwordAuth";
import { ROLE_PERMISSIONS, type Role } from "../entitlement";
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  setDiscountStatus,
  generateDiscountCode,
  type DiscountPatch,
} from "../stripe/discounts";
import { getInvoiceSummary, stripeDashboardSubscriptionUrl } from "../stripe/transactions";
import { sendEmail } from "../email";
import { dispatchNotification, type NotificationEvent } from "../notifications";

const PAGE_SIZE = 20;

// Genau die Rollen aus entitlement.ts - abgeleitet statt zweitkopiert, damit
// eine kuenftige vierte Rolle nicht an dieser Stelle vergessen wird.
const VALID_ROLES = Object.keys(ROLE_PERMISSIONS) as Role[];

// Obergrenze fuer die Mehrfach-Erzeugung (Auftrag nennt 10/50/100). Jeder
// Code ist ein eigener Stripe-Aufruf - ohne Deckel liesse sich der Worker
// mit einer einzigen Anfrage minutenlang beschaeftigen.
const MAX_BULK_DISCOUNTS = 100;

// Urspruenglich ein Paddle-spezifisches Format (Live-Befund 19.08.: ein Code
// mit Bindestrich wurde von Paddle mit "Does not match pattern
// '^[a-zA-Z0-9]{1,32}$'" abgelehnt, kam beim Admin aber nur als
// nichtssagender 502 an). Vorab hier geprueft statt einen kryptischen
// Anbieter-Fehler durchzureichen - dieselbe Vorsicht gilt fuer Stripes eigene
// Promotion-Code-Formatregeln.
const DISCOUNT_CODE_PATTERN = /^[A-Z0-9]{1,32}$/;

// Nutzer direkt anlegen (Nutzer-Entscheidung 2026-08-1X). Gleiches Muster wie
// in auth/magicLink.ts, hier lokal statt importiert, weil es dort nicht
// exportiert ist und Validierungs-Konstanten in diesem File ohnehin lokal
// gehalten werden (siehe VALID_ROLES/MAX_BULK_DISCOUNTS).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SUB_STATUSES = ["active", "trialing", "past_due", "cancel_scheduled", "canceled"] as const;
const VALID_SUB_PLANS = ["monthly", "yearly"] as const;

// Datumsangaben aus der Oberflaeche kommen als "YYYY-MM-DD" (input[type=date]).
// Rueckgabe als ISO-8601-String; stripe/discounts.ts wandelt das beim
// Erzeugen in den von Stripe erwarteten Unix-Zeitstempel um. Ende des Tages
// in UTC, damit ein Gutschein am angegebenen Tag noch gilt und nicht um
// 00:00 verfaellt.
export function parseExpiryDate(value: unknown): string | null | undefined {
  if (value === null) return null; // ausdruecklich "laeuft nicht ab"
  if (typeof value !== "string" || !value.trim()) return undefined; // nicht mitgeschickt
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

// Kein Wildcard-Escaping mehr noetig (19.08., IMP-12-Nachtrag): listUsersForAdmin
// (db.ts) nutzt seither instr() statt LIKE fuer die E-Mail-Suche - instr() kennt
// %/_ nicht als Platzhalter, der Suchbegriff geht daher unveraendert durch.
//
// Alle Filter-/Sortierwerte werden gegen eine Whitelist geprueft und fallen
// sonst auf "kein Filter" bzw. den Standard zurueck - ein manipulierter
// Query-String darf weder SQL beeinflussen noch einen Fehler ausloesen.
export function parseAdminUsersQuery(
  query: URLSearchParams,
): { filter: AdminUsersFilter; page: number } {
  const search = (query.get("q") || "").trim();
  const rawPage = parseInt(query.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawRole = query.get("role") || "";
  const role = (VALID_ROLES as string[]).includes(rawRole) ? rawRole : null;

  const rawStatus = query.get("status") || "";
  const accountStatus = rawStatus === "ACTIVE" || rawStatus === "SUSPENDED" ? rawStatus : null;

  const rawSub = query.get("subscription") || "";
  const subscription = rawSub === "pro" || rawSub === "free" ? rawSub : null;

  const rawSort = query.get("sort") || "";
  const sort: AdminUsersFilter["sort"] =
    rawSort === "created_asc" || rawSort === "last_login_desc" || rawSort === "email_asc"
      ? rawSort
      : "created_desc";

  return { filter: { search, role, accountStatus, subscription, sort }, page };
}

// Zeitraum als Millisekunden-Zeitstempel (created_at ist in D1 ebenfalls ms).
// Ungueltige Werte werden zu null, nicht zu NaN - NaN im Binding wuerde die
// Query still leerlaufen lassen statt den Filter zu ignorieren.
export function parseAdminAuditQuery(
  query: URLSearchParams,
): { filter: AdminAuditLogFilter; page: number } {
  const rawPage = parseInt(query.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const num = (key: string): number | null => {
    const parsed = parseInt(query.get(key) || "", 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const str = (key: string): string | null => {
    const value = (query.get(key) || "").trim();
    return value || null;
  };
  return {
    filter: {
      adminEmail: str("admin"),
      action: str("action"),
      targetId: str("target"),
      from: num("from"),
      to: num("to"),
    },
    page,
  };
}

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

adminRoutes.get("/users", requireAuth, requireAdminRead, async (c) => {
  const { filter, page } = parseAdminUsersQuery(new URL(c.req.url).searchParams);
  const { users, total } = await listUsersForAdmin(c.env.DB, filter, page, PAGE_SIZE);
  return c.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      accountStatus: u.account_status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      isTestUser: Boolean(u.is_test_user),
      subscription: u.sub_status ? { status: u.sub_status, plan: u.sub_plan } : null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});

adminRoutes.get("/users/:id", requireAuth, requireAdminRead, async (c) => {
  const id = c.req.param("id");
  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ error: "not_found" }, 404);
  const [sub, notes] = await Promise.all([
    getActiveSubscription(c.env.DB, id),
    listSupportNotes(c.env.DB, id),
  ]);
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.account_status,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    emailVerified: Boolean(user.email_verified_at),
    isTestUser: Boolean(user.is_test_user),
    testEmailRedirectTo: user.test_email_redirect_to,
    // Ohne password_hash gibt es keinen Reset-Weg (reines OAuth-/Passkey-
    // Konto) - die UI soll den Knopf dann gar nicht erst anbieten, statt ihn
    // ins Leere laufen zu lassen. Der Hash selbst wird NIE ausgeliefert.
    hasPassword: Boolean(user.password_hash),
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          firstPurchaseAt: sub.first_purchase_at,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          stripeCustomerId: sub.stripe_customer_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
        }
      : null,
    supportNotes: notes.map((n) => ({
      id: n.id,
      note: n.note,
      adminEmail: n.admin_email,
      createdAt: n.created_at,
    })),
  });
});

// Nutzer direkt anlegen (Nutzer-Entscheidung 2026-08-1X). Zugang laeuft ueber
// die bestehende Magic-Link-Infrastruktur (Einladungsmail) statt einer vom
// Admin vergebenen Passwort - konsistent mit dem sonst passwortlosen
// Grunddesign, kein neuer Auth-Pfad noetig. Eine optionale Test-Subscription
// gibt es nur bei isTestUser=true: echte Konten bekommen ihr Abo ausschliesslich
// ueber Stripe, nie manuell durch den Admin gesetzt.
adminRoutes.post("/users", requireAuth, requireAdmin, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return c.json({ error: "invalid_email" }, 400);

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
  const role = typeof body?.role === "string" ? body.role : "customer";
  if (!(VALID_ROLES as string[]).includes(role)) return c.json({ error: "invalid_role" }, 400);
  const isTestUser = body?.isTestUser === true;

  // Pro-Nutzer-Umleitung fuer fiktive Testadressen (Migration 0023) - gleiche
  // Regel wie bei der Test-Subscription: nur zusammen mit isTestUser, sonst
  // waere die Umleitung an einem Merkmal befestigt, das es fuer dieses Konto
  // gar nicht gibt.
  const rawRedirect = typeof body?.testEmailRedirectTo === "string" ? body.testEmailRedirectTo.trim() : "";
  let testEmailRedirectTo: string | null = null;
  if (rawRedirect) {
    if (!isTestUser) return c.json({ error: "redirect_requires_test_user" }, 400);
    if (!EMAIL_PATTERN.test(rawRedirect) || rawRedirect.length > 254) {
      return c.json({ error: "invalid_redirect_email" }, 400);
    }
    testEmailRedirectTo = rawRedirect.toLowerCase();
  }

  const rawSub = body?.subscription;
  let subInput: { status: SubscriptionRow["status"]; plan: SubscriptionRow["plan"] } | null = null;
  if (rawSub) {
    // Eine Test-Subscription ohne Testuser-Schalter waere ein Abo ohne
    // erkennbaren Grund, warum es keinen echten Stripe-Kauf dazu gibt.
    if (!isTestUser) return c.json({ error: "subscription_requires_test_user" }, 400);
    const validStatus = (VALID_SUB_STATUSES as readonly string[]).includes(rawSub.status);
    const validPlan = (VALID_SUB_PLANS as readonly string[]).includes(rawSub.plan);
    if (!validStatus || !validPlan) return c.json({ error: "invalid_subscription" }, 400);
    subInput = { status: rawSub.status, plan: rawSub.plan };
  }

  if (await getUserByEmail(c.env.DB, email)) return c.json({ error: "email_exists" }, 409);

  let user;
  try {
    // Zweite Absicherung gegen die vorherige Pruefung: users.email ist
    // UNIQUE (Migration 0001) - bei einer Race zwischen Check und Insert
    // schlaegt der D1-Constraint statt eines unklaren 500ers zu.
    user = await createUser(c.env.DB, email);
  } catch {
    return c.json({ error: "email_exists" }, 409);
  }
  if (role !== "customer") await setUserRole(c.env.DB, user.id, role);
  if (name) await updateUserName(c.env.DB, user.id, name);
  if (isTestUser) await setUserFlags(c.env.DB, user.id, { isTestUser, testEmailRedirectTo });
  if (subInput) await createManualSubscriptionForAdmin(c.env.DB, user.id, subInput);

  // Best-effort: ein fehlgeschlagener Mailversand soll die bereits angelegte
  // Nutzerzeile nicht ungeschehen machen - der Admin sieht am Ergebnis, ob die
  // Einladung rausging, und kann bei Bedarf ueber "Passwort-Reset senden"
  // bzw. erneutes Anlegen der Mail nachhelfen.
  // Bewusst sendPasswordSetupInvite() statt requestMagicLink() (bis
  // 2026-08-18 hier verwendet): ein Magic-Link loggt sofort ein, ohne je ein
  // Passwort zu verlangen - admin-angelegte Konten blieben dadurch dauerhaft
  // passwortlos. Der Invite-Link fuehrt stattdessen in denselben
  // Passwort-setzen-Screen wie "Passwort vergessen" (PasswordResetFlow.jsx).
  let inviteSent = true;
  try {
    await sendPasswordSetupInvite(c.env, user);
  } catch (err) {
    console.error("admin_create_user_invite_failed", err instanceof Error ? err.message : "unknown");
    inviteSent = false;
  }

  await logAdminAction(c.env.DB, {
    adminUserId: c.var.userId,
    adminEmail: c.var.user.email,
    action: "user.create",
    targetType: "user",
    targetId: user.id,
    details: { email, role, isTestUser, testEmailRedirectTo, subscription: subInput },
  });

  return c.json({ id: user.id, email, role, isTestUser, testEmailRedirectTo, inviteSent });
});

// Rolle aendern (Auftrag Abschnitt 6). Nur 'admin' (user.manage).
adminRoutes.post("/users/:id/role", requireAuth, requireAdmin, requireCsrfOrigin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const role = body && typeof body.role === "string" ? body.role : "";
  if (!(VALID_ROLES as string[]).includes(role)) return c.json({ error: "invalid_role" }, 400);

  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ error: "not_found" }, 404);

  // Gleiche Logik wie beim Selbst-Sperren: ein Admin darf sich nicht selbst
  // die Admin-Rechte nehmen, sonst sperrt ein Fehlklick den Zugang aus.
  if (id === c.var.userId && role !== "admin") {
    return c.json({ error: "cannot_demote_self" }, 400);
  }

  const from = user.role;
  if (from === role) return c.json({ ok: true, role });
  await setUserRole(c.env.DB, id, role);
  await logAdminAction(c.env.DB, {
    adminUserId: c.var.userId,
    adminEmail: c.var.user.email,
    action: "user.role_change",
    targetType: "user",
    targetId: id,
    details: { from, to: role, targetEmail: user.email },
  });
  return c.json({ ok: true, role });
});

// Testuser-Schalter (Auftrag Abschnitt 6).
adminRoutes.post("/users/:id/flags", requireAuth, requireAdmin, requireCsrfOrigin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const isTestUser = typeof body?.isTestUser === "boolean" ? body.isTestUser : undefined;
  const redirectProvided = typeof body?.testEmailRedirectTo === "string";
  if (isTestUser === undefined && !redirectProvided) return c.json({ error: "invalid_flags" }, 400);

  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ error: "not_found" }, 404);

  // Massgeblich fuer die Testuser-Regel ist der Stand NACH dieser Aenderung,
  // nicht der vorherige - sonst liesse sich hier ein Redirect setzen, waehrend
  // isTestUser im selben Aufruf gerade auf false wechselt.
  const effectiveIsTestUser = isTestUser !== undefined ? isTestUser : Boolean(user.is_test_user);
  let testEmailRedirectTo: string | null | undefined;
  if (redirectProvided) {
    const raw = body.testEmailRedirectTo.trim();
    if (raw) {
      if (!effectiveIsTestUser) return c.json({ error: "redirect_requires_test_user" }, 400);
      if (!EMAIL_PATTERN.test(raw) || raw.length > 254) return c.json({ error: "invalid_redirect_email" }, 400);
      testEmailRedirectTo = raw.toLowerCase();
    } else {
      testEmailRedirectTo = null;
    }
  }

  await setUserFlags(c.env.DB, id, { isTestUser, testEmailRedirectTo });
  if (isTestUser !== undefined && Boolean(user.is_test_user) !== isTestUser) {
    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.test_user_change",
      targetType: "user",
      targetId: id,
      details: { to: isTestUser, targetEmail: user.email },
    });
  }
  return c.json({ ok: true, isTestUser: effectiveIsTestUser, testEmailRedirectTo: testEmailRedirectTo !== undefined ? testEmailRedirectTo : user.test_email_redirect_to });
});

// Abo eines Testusers direkt setzen (Nutzer-Auftrag 2026-08-20): wer den
// Checkout mit einem Testkonto durchspielt, hat danach ein echtes
// Stripe-Sandbox-Abo, das sich sonst nur ueber "Passwort vergessen" ->
// Login -> Kontobereich -> Kuendigen zuruecksetzen liesse - fuer wiederholte
// Checkout-Tests unpraktisch. Nutzt dieselben Bausteine wie der
// Selbstbedienungs-Reset (POST /billing/test-reset) und das Anlegen mit
// Test-Subscription (POST /users oben), nur admin-seitig auf ein beliebiges
// Testkonto anwendbar statt nur auf den eingeloggten Nutzer selbst.
adminRoutes.post(
  "/users/:id/subscription",
  requireAuth,
  requireAdmin,
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status : "";
    if (status && !(VALID_SUB_STATUSES as readonly string[]).includes(status)) {
      return c.json({ error: "invalid_subscription" }, 400);
    }
    const plan = typeof body?.plan === "string" ? body.plan : "monthly";
    if (status && !(VALID_SUB_PLANS as readonly string[]).includes(plan)) {
      return c.json({ error: "invalid_subscription" }, 400);
    }

    const user = await getUserById(c.env.DB, id);
    if (!user) return c.json({ error: "not_found" }, 404);
    if (!user.is_test_user) return c.json({ error: "subscription_requires_test_user" }, 400);

    // Echtes Sandbox-Abo (aus einem tatsaechlich durchgespielten Checkout,
    // erkennbar an der stripe_subscription_id OHNE das admin-test:-Praefix)
    // muss zuerst bei Stripe gekuendigt werden - sonst laeuft im Hintergrund
    // eine Sandbox-Subscription weiter, die hier nur aus D1 verschwindet.
    // status==="canceled" ausgenommen (gleiche Begruendung wie zuvor bei
    // Stripe): bei diesem Status gibt es ohnehin nichts mehr zu kuendigen.
    const existing = await getLatestSubscriptionForUser(c.env.DB, id);
    if (
      existing &&
      existing.status !== "canceled" &&
      existing.stripe_subscription_id &&
      !existing.stripe_subscription_id.startsWith(ADMIN_TEST_SUBSCRIPTION_PREFIX)
    ) {
      try {
        await cancelImmediately(c.env, existing.stripe_subscription_id);
      } catch (err) {
        console.error("admin_set_subscription_cancel_failed", err instanceof Error ? err.message : "unknown");
        return c.json({ error: "cancel_failed_try_again" }, 502);
      }
    }
    await resetTestUserSubscription(c.env.DB, id);
    if (status) {
      await createManualSubscriptionForAdmin(c.env.DB, id, {
        status: status as SubscriptionRow["status"],
        plan: plan as SubscriptionRow["plan"],
      });
    }

    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.subscription_set",
      targetType: "user",
      targetId: id,
      details: { targetEmail: user.email, status: status || "free", plan: status ? plan : null },
    });

    const sub = status ? await getActiveSubscription(c.env.DB, id) : null;
    return c.json({
      ok: true,
      subscription: sub ? { status: sub.status, plan: sub.plan } : null,
    });
  },
);

// Support-Notiz (Auftrag Abschnitt 6/7).
adminRoutes.post(
  "/users/:id/notes",
  requireAuth,
  requirePermission("user.note"),
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const note = body && typeof body.note === "string" ? body.note.trim() : "";
    if (!note || note.length > 2000) return c.json({ error: "invalid_note" }, 400);

    const user = await getUserById(c.env.DB, id);
    if (!user) return c.json({ error: "not_found" }, 404);

    const row = await addSupportNote(c.env.DB, {
      userId: id,
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      note,
    });
    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.note_add",
      targetType: "user",
      targetId: id,
      details: { targetEmail: user.email },
    });
    return c.json({
      note: { id: row.id, note: row.note, adminEmail: row.admin_email, createdAt: row.created_at },
    });
  },
);

// Passwort-Reset ausloesen (Auftrag Abschnitt 7). Verschickt exakt dieselbe
// Mail wie "Passwort vergessen" im Login - das Passwort selbst wird nie
// angezeigt und der Admin bekommt den Token nicht zu sehen.
adminRoutes.post(
  "/users/:id/password-reset",
  requireAuth,
  requireAdmin,
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const user = await getUserById(c.env.DB, id);
    if (!user) return c.json({ error: "not_found" }, 404);
    // Anders als im oeffentlichen Endpunkt ist hier KEINE neutrale Antwort
    // noetig (der Admin darf den Kontozustand ohnehin sehen) - ein klarer
    // Fehler ist hilfreicher als eine stille Erfolgsmeldung ohne Wirkung.
    if (!user.password_hash) return c.json({ error: "no_password_account" }, 400);

    await requestPasswordReset(c.env, user.email);
    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.password_reset",
      targetType: "user",
      targetId: id,
      details: { targetEmail: user.email },
    });
    return c.json({ ok: true });
  },
);

// Alle Sitzungen beenden (Auftrag Abschnitt 7).
adminRoutes.post(
  "/users/:id/sessions/revoke",
  requireAuth,
  requireAdmin,
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const user = await getUserById(c.env.DB, id);
    if (!user) return c.json({ error: "not_found" }, 404);

    await deleteAllSessionsForUser(c.env.DB, id);
    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.sessions_revoke",
      targetType: "user",
      targetId: id,
      details: { targetEmail: user.email },
    });
    return c.json({ ok: true });
  },
);

// Nutzer endgueltig loeschen (Auftrag Abschnitt 7 "Danger Zone"). Nutzt
// bewusst dieselbe Funktion wie die Selbstloeschung durch den Nutzer
// (accountDeletion.ts) - inklusive sofortiger Stripe-Kuendigung, sonst liefe
// ein Abo ohne zugehoeriges Konto weiter. Der Audit-Eintrag wird VOR dem
// Loeschen geschrieben, sonst gibt es bei einem Fehlschlag mittendrin keine
// Spur; er ueberlebt die Loeschung bewusst (siehe deleteUserCompletely).
adminRoutes.post(
  "/users/:id/delete",
  requireAuth,
  requirePermission("user.delete"),
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const user = await getUserById(c.env.DB, id);
    if (!user) return c.json({ error: "not_found" }, 404);
    if (id === c.var.userId) return c.json({ error: "cannot_delete_self" }, 400);

    await logAdminAction(c.env.DB, {
      adminUserId: c.var.userId,
      adminEmail: c.var.user.email,
      action: "user.delete",
      targetType: "user",
      targetId: id,
      details: { targetEmail: user.email, role: user.role },
    });
    try {
      await deleteAccountCompletely(c.env, id, user.email);
    } catch (err) {
      // Nur ein echter Stripe-Kuendigungsfehler (accountDeletion.ts wirft dafuer
      // "cancel_failed_try_again") bekommt die Stripe-spezifische Meldung - alles
      // andere (z.B. ein D1-Constraint-Fehler in deleteUserCompletely) landete
      // vorher faelschlich ebenfalls unter "Stripe-Kuendigung lief nicht durch"
      // und fuehrte bei der Fehlersuche auf die falsche Spur (gleiche Absicherung
      // wie zuvor bei Paddle, Befund 2026-08-18).
      const isStripeFailure = err instanceof Error && err.message === "cancel_failed_try_again";
      console.error("admin_delete_user_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: isStripeFailure ? "delete_failed_try_again" : "request_failed" }, 502);
    }
    return c.json({ ok: true });
  },
);

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

// ═══ Abos & Zahlungen (Admin-MVP Abschnitt 8) ═══
// Rein lesend. Betrag, Zahlungsstatus, Refund und Abrechnungszyklus bleiben
// bei Stripe - es gibt hier bewusst KEINE schreibende Route dafuer.

export function parseAdminSubscriptionsQuery(
  query: URLSearchParams,
): { status: AdminSubscriptionFilterKey | null; page: number } {
  const rawPage = parseInt(query.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawStatus = (query.get("status") || "").trim();
  return { status: isAdminSubscriptionFilter(rawStatus) ? rawStatus : null, page };
}

// Ohne Stripe-Aufruf pro Zeile - der waere bei 20 Zeilen 20 Anfragen. Der
// "letzte Zahlungsstatus" der Liste wird deshalb aus dem gespiegelten Status
// abgeleitet, die echte Transaktion holt erst die Detailansicht.
function paymentStateFromRow(row: { status: string; past_due_since: number | null }): string {
  if (row.status === "past_due") return "failed";
  if (row.status === "trialing") return "none";
  return "ok";
}

adminRoutes.get("/subscriptions", requireAuth, requirePermission("subscription.read"), async (c) => {
  const { status, page } = parseAdminSubscriptionsQuery(new URL(c.req.url).searchParams);
  const { subscriptions, total } = await listSubscriptionsForAdmin(c.env.DB, status, page, PAGE_SIZE);
  return c.json({
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      email: s.email,
      // "Produkt" ist im Auftrag eine eigene Spalte - es gibt aktuell genau
      // ein Produkt, deshalb konstant statt aus der DB (dort steht es nicht).
      product: "ImmoFuchs Pro",
      plan: s.plan,
      status: s.status,
      startedAt: s.first_purchase_at,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: Boolean(s.cancel_at_period_end),
      pastDueSince: s.past_due_since,
      paymentState: paymentStateFromRow(s),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});

adminRoutes.get("/subscriptions/:id", requireAuth, requirePermission("subscription.read"), async (c) => {
  const sub = await getSubscriptionForAdmin(c.env.DB, c.req.param("id"));
  if (!sub) return c.json({ error: "not_found" }, 404);
  // Genau ein Stripe-Aufruf, und nur wenn es ueberhaupt eine Rechnung gibt.
  // Schlaegt er fehl (kein API-Key lokal, Stripe nicht erreichbar), liefert
  // der Helfer null - die uebrigen Angaben kommen aus D1 und die Ansicht
  // bleibt benutzbar.
  const lastPayment = sub.latest_invoice_id
    ? await getInvoiceSummary(c.env, sub.latest_invoice_id)
    : null;
  return c.json({
    id: sub.id,
    userId: sub.user_id,
    email: sub.email,
    product: "ImmoFuchs Pro",
    plan: sub.plan,
    status: sub.status,
    startedAt: sub.first_purchase_at,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    pastDueSince: sub.past_due_since,
    paymentState: paymentStateFromRow(sub),
    // Waehrend der Testphase ist current_period_end das Trial-Ende, sonst der
    // naechste Abbuchungstermin (gleiche Unterscheidung wie im Kundenbereich).
    trialEndsAt: sub.status === "trialing" ? sub.current_period_end : null,
    stripeCustomerId: sub.stripe_customer_id,
    stripeSubscriptionId: sub.stripe_subscription_id,
    latestInvoiceId: sub.latest_invoice_id,
    lastPayment,
    stripeUrl: sub.stripe_subscription_id ? stripeDashboardSubscriptionUrl(c.env, sub.stripe_subscription_id) : null,
  });
});

// Dashboard (Konzept-Dok Abschnitt 3, MVP-Pflicht #1).
adminRoutes.get("/dashboard", requireAuth, requireAdminRead, async (c) => {
  const stats = await getAdminDashboardStats(c.env.DB);
  return c.json(stats);
});

// Letzte Aktivitaeten (Admin-MVP Abschnitt 3). Read-Only, feste Obergrenze -
// der Feed ist eine Uebersicht, kein Export.
const ACTIVITY_LIMIT = 20;

adminRoutes.get("/activity", requireAuth, requireAdminRead, async (c) => {
  const entries = await listAdminActivity(c.env.DB, ACTIVITY_LIMIT);
  return c.json({ entries });
});

// Gutscheine (Stufe F, Nutzer-Konzept 2026-08-11) - Stripe bleibt einzige
// Quelle fuer Rabattdaten, D1 speichert dazu nichts. "amount" ist bei
// type==="percentage" ein reiner Prozentwert ("10" = 10%), bei "flat" ein
// Betrag in der kleinsten Waehrungseinheit (Cent) - siehe Stripe-API.
adminRoutes.get("/discounts", requireAuth, requirePermission("discount.read"), async (c) => {
  try {
    const discounts = await listDiscounts(c.env);
    return c.json({ discounts });
  } catch (err) {
    console.error("admin_list_discounts_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "discounts_failed" }, 502);
  }
});

adminRoutes.post(
  "/discounts",
  requireAuth,
  requirePermission("discount.manage"),
  requireCsrfOrigin,
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const code = body && typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const description = body && typeof body.description === "string" ? body.description.trim() : "";
    const type = body?.type === "flat" ? "flat" : body?.type === "percentage" ? "percentage" : null;
    const amount = body && typeof body.amount === "string" ? body.amount.trim() : "";
    const usageLimit = Number.isInteger(body?.usageLimit) && body.usageLimit > 0 ? body.usageLimit : null;
    const expiresAt = parseExpiryDate(body?.expiresAt) ?? null;
    if (!code || !description || !type || !amount) return c.json({ error: "invalid_discount" }, 400);
    // Vorab geprueft (siehe DISCOUNT_CODE_PATTERN oben, historisch aus einem
    // Stripe-Befund), damit ein Admin sofort einen verstaendlichen 400 statt
    // eines kryptischen 502 vom Zahlungsanbieter sieht.
    if (!DISCOUNT_CODE_PATTERN.test(code)) return c.json({ error: "invalid_discount_code" }, 400);

    try {
      const discount = await createDiscount(c.env, { code, description, type, amount, usageLimit, expiresAt });
      await logAdminAction(c.env.DB, {
        adminUserId: c.var.userId,
        adminEmail: c.var.user.email,
        action: "discount.create",
        targetType: "discount",
        targetId: discount.id,
        details: { code: discount.code, type: discount.type, amount: discount.amount },
      });
      return c.json({ discount });
    } catch (err) {
      console.error("admin_create_discount_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "create_discount_failed" }, 502);
    }
  },
);

// Mehrere Codes auf einmal (Auftrag Abschnitt 9). Jeder Code ist ein eigener
// Stripe-Aufruf - bewusst nacheinander statt parallel, um nicht in
// Stripe-Ratelimits zu laufen. Bereits erzeugte Codes bleiben bestehen, wenn
// einer scheitert: sie sind gueltige Gutscheine, ein Rueckbau waere
// schlimmer als ein Teilergebnis. Die Antwort meldet beides ehrlich.
adminRoutes.post(
  "/discounts/bulk",
  requireAuth,
  requirePermission("discount.manage"),
  requireCsrfOrigin,
  async (c) => {
    const body = await c.req.json().catch(() => null);
    const count = Number.isInteger(body?.count) ? body.count : 0;
    const description = body && typeof body.description === "string" ? body.description.trim() : "";
    const type = body?.type === "flat" ? "flat" : body?.type === "percentage" ? "percentage" : null;
    const amount = body && typeof body.amount === "string" ? body.amount.trim() : "";
    const prefix = body && typeof body.prefix === "string" ? body.prefix : "";
    const usageLimit = Number.isInteger(body?.usageLimit) && body.usageLimit > 0 ? body.usageLimit : null;
    const expiresAt = parseExpiryDate(body?.expiresAt) ?? null;

    if (count < 1 || count > MAX_BULK_DISCOUNTS) return c.json({ error: "invalid_count" }, 400);
    if (!description || !type || !amount) return c.json({ error: "invalid_discount" }, 400);

    const created: string[] = [];
    let failed = 0;
    for (let i = 0; i < count; i++) {
      try {
        const discount = await createDiscount(c.env, {
          code: generateDiscountCode(prefix),
          description,
          type,
          amount,
          usageLimit,
          expiresAt,
        });
        created.push(discount.code || discount.id);
      } catch (err) {
        console.error("admin_bulk_discount_failed", err instanceof Error ? err.message : "unknown");
        failed++;
      }
    }

    // Ein Audit-Eintrag fuer den ganzen Vorgang statt 100 einzelner - der Log
    // soll die Aktion des Admins abbilden, nicht jede Stripe-Anfrage.
    if (created.length > 0) {
      await logAdminAction(c.env.DB, {
        adminUserId: c.var.userId,
        adminEmail: c.var.user.email,
        action: "discount.bulk_create",
        targetType: "discount",
        targetId: `bulk:${created.length}`,
        details: { requested: count, created: created.length, failed, type, amount, prefix: prefix || null },
      });
    }
    if (created.length === 0) return c.json({ error: "create_discount_failed" }, 502);
    return c.json({ codes: created, requested: count, failed });
  },
);

// Bearbeiten: nur Beschreibung und Status. Stripe erlaubt bei Coupons/
// Promotion Codes nach dem Anlegen KEINE Aenderung von Betrag, Nutzungslimit
// oder Ablaufdatum mehr (offizielle API-Referenz - deutlich enger als Stripe,
// siehe stripe/discounts.ts). Code und Rabatt-Typ waren schon bei Stripe
// bewusst nicht aenderbar; dafuer gibt es "Duplizieren".
adminRoutes.post(
  "/discounts/:id",
  requireAuth,
  requirePermission("discount.manage"),
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const patch: DiscountPatch = {};

    if (typeof body?.description === "string" && body.description.trim()) {
      patch.description = body.description.trim();
    }
    if (body?.status === "active" || body?.status === "archived") patch.status = body.status;

    if (Object.keys(patch).length === 0) return c.json({ error: "invalid_discount" }, 400);

    try {
      const discount = await updateDiscount(c.env, id, patch);
      await logAdminAction(c.env.DB, {
        adminUserId: c.var.userId,
        adminEmail: c.var.user.email,
        action: "discount.update",
        targetType: "discount",
        targetId: id,
        details: { code: discount.code, changed: Object.keys(patch) },
      });
      return c.json({ discount });
    } catch (err) {
      console.error("admin_update_discount_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "update_discount_failed" }, 502);
    }
  },
);

adminRoutes.post(
  "/discounts/:id/status",
  requireAuth,
  requirePermission("discount.manage"),
  requireCsrfOrigin,
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const status = body && typeof body.status === "string" ? body.status : "";
    if (status !== "active" && status !== "archived") return c.json({ error: "invalid_status" }, 400);

    try {
      await setDiscountStatus(c.env, id, status);
      await logAdminAction(c.env.DB, {
        adminUserId: c.var.userId,
        adminEmail: c.var.user.email,
        action: status === "archived" ? "discount.deactivate" : "discount.activate",
        targetType: "discount",
        targetId: id,
        details: { to: status },
      });
      return c.json({ ok: true, status });
    } catch (err) {
      console.error("admin_update_discount_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "update_discount_failed" }, 502);
    }
  },
);

// Audit Log (Konzept-Dok Abschnitt 13/6, MVP-Pflicht #7). Read-Only, ohne
// Bearbeiten/Loeschen - es gibt bewusst keine schreibende Route dafuer.
adminRoutes.get("/audit-log", requireAuth, requireAdminRead, async (c) => {
  const { filter, page } = parseAdminAuditQuery(new URL(c.req.url).searchParams);
  const [{ entries, total }, admins] = await Promise.all([
    listAdminAuditLog(c.env.DB, page, PAGE_SIZE, filter),
    listAuditLogAdmins(c.env.DB),
  ]);
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
    // Auswahlwerte fuer den Admin-Filter gleich mitliefern - spart der UI
    // einen zweiten Endpunkt fuer eine sehr kurze Liste.
    admins,
  });
});

// Test-Versand aller E-Mail-Vorlagen (Nutzeranfrage 2026-08-26): schickt
// jede im System vorkommende Mail-Vorlage einmal an den eingeloggten Admin
// selbst, damit Layout/Inhalt im echten Postfach geprueft werden koennen,
// ohne jeden Ausloeser (Registrierung, Kuendigung, Zahlungsfehler, ...)
// einzeln durchspielen zu muessen. Auf dev landet dank
// TEST_EMAIL_REDIRECT_TO ohnehin alles bei derselben Testadresse - die Route
// bleibt trotzdem bewusst dauerhaft admin-geschuetzt (requireAdmin), damit
// sie nicht zum offenen Mail-Spam-Endpunkt wird. 9 Ereignisse laufen ueber
// dispatchNotification() (identischer Code-Pfad wie im echten Betrieb), die
// uebrigen 8 sind direkte sendEmail()-Aufrufe (Registrierung, Login,
// Passwort) - deren Inhalt ist hier 1:1 aus den jeweiligen Quellstellen
// uebernommen, damit die Vorschau exakt der echten Mail entspricht statt nur
// aehnlich zu sein. payment_succeeded deckt zwei Tabellenzeilen ab (Kauf
// ohne Trial UND Trial-Ende) - beide verschicken exakt dieselbe Vorlage, ein
// zweiter Versand waere reines Duplikat.
adminRoutes.post("/test-emails", requireAuth, requireAdmin, requireCsrfOrigin, async (c) => {
  const to = c.var.user.email;
  const exampleLink = `${c.env.APP_BASE_URL || "https://immofuchs.info"}/?example=1`;
  const results: { key: string; ok: boolean; error?: string }[] = [];

  async function tryDirect(key: string, subject: string, html: string) {
    try {
      await sendEmail(c.env, to, subject, html);
      results.push({ key, ok: true });
    } catch (err) {
      results.push({ key, ok: false, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  async function tryNotify(key: string, event: NotificationEvent, payload: Record<string, unknown>) {
    try {
      await dispatchNotification(c.env, { event, recipientEmail: to, payload });
      results.push({ key, ok: true });
    } catch (err) {
      results.push({ key, ok: false, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  // ═══ 1-8: direkte sendEmail()-Aufrufe (Inhalt aus auth/passwordAuth.ts,
  // auth/magicLink.ts, routes/account.ts uebernommen) ═══
  await tryDirect(
    "register_verify",
    "Bestätige deine E-Mail-Adresse bei ImmoFuchs",
    `<p>Willkommen bei ImmoFuchs! Bestätige deine E-Mail-Adresse mit einem Klick (24 Stunden gültig):</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>
     <p>Falls du dich nicht bei ImmoFuchs registriert hast, kannst du diese E-Mail ignorieren.</p>`,
  );
  await tryDirect(
    "resend_verify",
    "Dein neuer Bestätigungslink für ImmoFuchs",
    `<p>Hier ist dein neuer Bestätigungslink (24 Stunden gültig):</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>`,
  );
  await tryDirect(
    "magic_link",
    "Dein Login-Link fuer ImmoFuchs",
    `<p>Klicke auf den folgenden Link, um dich bei ImmoFuchs anzumelden. Der Link ist 15 Minuten gueltig:</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>
     <p>Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
  );
  await tryDirect(
    "password_reset",
    "Passwort zurücksetzen bei ImmoFuchs",
    `<p>Setze dein Passwort mit einem Klick zurück (60 Minuten gültig):</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>
     <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren - dein Passwort bleibt unverändert.</p>`,
  );
  await tryDirect(
    "password_reset_oauth_only",
    "Passwort zurücksetzen bei ImmoFuchs",
    `<p>Für dein ImmoFuchs-Konto wurde ein Passwort-Reset angefragt. Dieses Konto wurde mit Google erstellt und hat kein Passwort.</p>
     <p>Bitte melde dich über diese Anmeldemethode an.</p>
     <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
  );
  await tryDirect(
    "password_setup_invite",
    "Dein ImmoFuchs-Konto wurde angelegt",
    `<p>Für dich wurde ein ImmoFuchs-Konto angelegt. Setze mit einem Klick dein Passwort, um dich anzumelden (60 Minuten gültig):</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>
     <p>Falls du das nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>`,
  );
  await tryDirect(
    "password_changed_direct",
    "Dein ImmoFuchs-Passwort wurde geändert",
    `<p>Dein Passwort wurde soeben geändert. Alle anderen Geräte wurden zur Sicherheit abgemeldet.</p>
     <p>Warst du das nicht? Bitte kontaktiere umgehend unseren Support.</p>`,
  );
  await tryDirect(
    "email_change_confirm",
    "Bestätige deine neue E-Mail-Adresse bei ImmoFuchs",
    `<p>Bestätige den Wechsel zu dieser Adresse mit einem Klick (15 Minuten gültig):</p>
     <p><a href="${exampleLink}">${exampleLink}</a></p>
     <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren - deine bisherige
     Adresse bleibt unveraendert. <a href="${c.env.APP_BASE_URL || "https://immofuchs.info"}">Zurück zu ImmoFuchs</a></p>`,
  );

  // ═══ 9-17: ueber dispatchNotification() - identischer Pfad wie live ═══
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE");
  const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("de-DE");
  await tryNotify("renewal_reminder", "renewal_reminder", { periodEndDate: inOneWeek, amount: "59,99 €" });
  await tryNotify("cancellation_confirmed", "cancellation_confirmed", { periodEndDate: inOneWeek });
  await tryNotify("reactivation_confirmed", "reactivation_confirmed", {});
  await tryNotify("account_deleted", "account_deleted", {});
  await tryNotify("payment_failed", "payment_failed", { graceEndsDate: inOneWeek });
  await tryNotify("payment_succeeded", "payment_succeeded", {
    plan: "yearly",
    amount: "59,99 €",
    periodEndDate: inOneWeek,
  });
  await tryNotify("password_changed_notify", "password_changed", {});
  await tryNotify("email_change_requested", "email_change_requested", { newEmail: "neue-adresse@beispiel.de" });
  await tryNotify("trial_ending", "trial_ending", { periodEndDate: inOneDay, amount: "59,99 €" });

  await logAdminAction(c.env.DB, {
    adminUserId: c.var.userId,
    adminEmail: c.var.user.email,
    action: "test_emails.sent",
    targetType: "system",
    targetId: "test_emails",
    details: { to, count: results.length },
  });

  return c.json({ ok: true, to, results });
});
