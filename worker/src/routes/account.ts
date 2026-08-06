// Konto-Verwaltung (Spec 4.10): "Mein Konto", E-Mail ändern, Datenexport
// (Art. 20), Konto löschen (Art. 17), Geräte-Übersicht.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireCsrfOrigin, type AuthVars } from "../middleware";
import { isProUncached } from "../entitlement";
import {
  listLinkedProviders,
  getActiveSubscription,
  listSessionsForUser,
  createEmailChangeRequest,
  consumeEmailChangeRequest,
  updateUserEmail,
  getUserByEmail,
  deleteUserCompletely,
  deleteOtherSessionsForUser,
  setUserPasswordHash,
} from "../db";
import { hashPassword, isValidPasswordLength, verifyPassword } from "../auth/password";
import { sendEmail } from "../email";
import { dispatchNotification } from "../notifications";
import { cancelImmediately } from "../paddle/checkout";
import { buildClearSessionCookie, extractSessionId, logout } from "../auth/session";

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

accountRoutes.get("/me", requireAuth, async (c) => {
  const [isPro, providers, sub] = await Promise.all([
    isProUncached(c.env, c.var.userId),
    listLinkedProviders(c.env.DB, c.var.userId),
    getActiveSubscription(c.env.DB, c.var.userId),
  ]);
  return c.json({
    id: c.var.user.id,
    email: c.var.user.email,
    role: c.var.user.role,
    linkedProviders: providers,
    isPro,
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          firstPurchaseAt: sub.first_purchase_at,
        }
      : null,
  });
});

accountRoutes.get("/account/devices", requireAuth, async (c) => {
  const sessions = await listSessionsForUser(c.env.DB, c.var.userId);
  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      current: s.id === c.var.sessionId,
      createdAt: s.created_at,
      lastSeenAt: s.last_seen_at,
      userAgent: s.user_agent,
    })),
  });
});

accountRoutes.post("/account/email", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const newEmail = body && typeof body.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return c.json({ error: "invalid_email" }, 400);

  const collision = await getUserByEmail(c.env.DB, newEmail);
  if (collision && collision.id !== c.var.userId) {
    // Bewusst dieselbe generische Antwort wie beim Magic-Link-Versand
    // (Account-Enumeration, 4.13) - kein Hinweis, ob die Ziel-Adresse bereits
    // vergeben ist.
    return c.json({ ok: true });
  }

  const token = await createEmailChangeRequest(c.env.DB, c.var.userId, newEmail);
  const base = c.env.APP_BASE_URL || new URL(c.req.url).origin;
  const confirmUrl = `${new URL(c.req.url).origin}/api/v1/account/email/confirm?token=${token}`;
  await sendEmail(
    c.env,
    newEmail,
    "Bestätige deine neue E-Mail-Adresse bei ImmoFuchs",
    `<p>Bestätige den Wechsel zu dieser Adresse mit einem Klick (15 Minuten gültig):</p>
     <p><a href="${confirmUrl}">${confirmUrl}</a></p>
     <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren - deine bisherige
     Adresse bleibt unveraendert. <a href="${base}">Zurück zu ImmoFuchs</a></p>`,
  );
  return c.json({ ok: true });
});

accountRoutes.get("/account/email/confirm", async (c) => {
  const token = c.req.query("token") || "";
  const base = c.env.APP_BASE_URL || new URL(c.req.url).origin;
  const result = await consumeEmailChangeRequest(c.env.DB, token);
  if (!result) return c.redirect(`${base}/?email_change_error=invalid_or_expired`, 302);
  await updateUserEmail(c.env.DB, result.userId, result.newEmail);
  return c.redirect(`${base}/?email_change_success=1`, 302);
});

// Passwort aendern bzw. erstmalig setzen (Phase 2, 4.10/4.13). Zwei Faelle:
//  - Konto MIT password_hash: currentPassword ist Pflicht und muss stimmen -
//    sonst koennte ein fremdes, offen stehendes Geraet das Konto uebernehmen.
//  - Konto OHNE password_hash (reines OAuth-/Passkey-/Magic-Link-Konto): kein
//    currentPassword noetig, der Nutzer hat sich ueber eine gueltige Session
//    bereits authentifiziert. Das ist NICHT dasselbe wie die unbeaufsichtigte
//    "Stattdessen Passwort setzen"-Verknuepfung per E-Mail (passwordAuth.ts),
//    die es ohne Session gibt und deshalb Double-Opt-In braucht.
accountRoutes.post("/account/password", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const currentPassword = body && typeof body.currentPassword === "string" ? body.currentPassword : null;
  const newPassword = body && typeof body.newPassword === "string" ? body.newPassword : "";

  // Gleiche Laengen-Regel wie Registrierung und Reset (auth/password.ts,
  // BSI-/NIST-Linie: min. 10 Zeichen, keine Zeichenklassen-Pflicht).
  if (!isValidPasswordLength(newPassword)) return c.json({ error: "invalid_password" }, 400);

  const existingHash = c.var.user.password_hash;
  if (existingHash) {
    if (!currentPassword) return c.json({ error: "current_password_required" }, 400);
    if (!(await verifyPassword(currentPassword, existingHash))) {
      return c.json({ error: "invalid_credentials" }, 401);
    }
  }

  await setUserPasswordHash(c.env.DB, c.var.userId, await hashPassword(newPassword));
  // Session-Invalidierung ist Pflicht, nicht optional (4.13) - aber ohne das
  // Geraet abzumelden, an dem der Nutzer die Aenderung gerade vorgenommen hat.
  await deleteOtherSessionsForUser(c.env.DB, c.var.userId, c.var.sessionId);

  try {
    await dispatchNotification(c.env, {
      event: "password_changed",
      recipientEmail: c.var.user.email,
      recipientUserId: c.var.userId,
      payload: {},
    });
  } catch (err) {
    // Sicherheitshinweis ist wichtig, aber kein Blocker fuer die bereits
    // erfolgte Aenderung - sonst haette der Nutzer ein neues Passwort und
    // trotzdem eine Fehlermeldung vor sich.
    console.error("password_changed_notice_failed", err instanceof Error ? err.message : "unknown");
  }
  return c.json({ ok: true });
});

accountRoutes.get("/account/export", requireAuth, async (c) => {
  const [providers, sub, sessions] = await Promise.all([
    listLinkedProviders(c.env.DB, c.var.userId),
    getActiveSubscription(c.env.DB, c.var.userId),
    listSessionsForUser(c.env.DB, c.var.userId),
  ]);
  // DSGVO Art. 20 - bewusst schlanker Datenfussabdruck: Rechnungs-/
  // Zahlungsdetails liegen bei Paddle als Merchant of Record, nicht hier (4.10).
  const exportData = {
    account: {
      id: c.var.user.id,
      email: c.var.user.email,
      createdAt: c.var.user.created_at,
      linkedProviders: providers,
    },
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          firstPurchaseAt: sub.first_purchase_at,
          paddleCustomerIdReference: sub.paddle_customer_id,
        }
      : null,
    sessions: sessions.map((s) => ({ createdAt: s.created_at, lastSeenAt: s.last_seen_at, userAgent: s.user_agent })),
    exportedAt: Date.now(),
  };
  return c.json(exportData, 200, {
    "Content-Disposition": "attachment; filename=immofuchs-daten-export.json",
  });
});

accountRoutes.post("/account/delete", requireAuth, requireCsrfOrigin, async (c) => {
  const sub = await getActiveSubscription(c.env.DB, c.var.userId);
  if (sub && sub.status !== "canceled") {
    // "Löschen" ist ein expliziter Endgültigkeits-Wunsch - sofortige
    // Kündigung, nicht zum Periodenende (4.10, im Unterschied zu 4.11).
    try {
      await cancelImmediately(c.env, sub.paddle_subscription_id);
    } catch (err) {
      console.error("account_delete_paddle_cancel_failed", err instanceof Error ? err.message : "unknown");
      return c.json({ error: "cancel_failed_try_again" }, 502);
    }
  }
  const email = c.var.user.email;
  await deleteUserCompletely(c.env.DB, c.var.userId);

  const sessionId = extractSessionId(c.req.raw);
  if (sessionId) await logout(c.env, sessionId);
  c.header("Set-Cookie", buildClearSessionCookie(), { append: true });

  try {
    await dispatchNotification(c.env, { event: "account_deleted", recipientEmail: email, payload: {} });
  } catch {
    // Bestaetigungsmail ist Kulanz, kein Blocker fuer die eigentliche Loeschung.
  }
  return c.json({ ok: true });
});
