// Auth-Routen (Spec 4.4, 4.5): Google/Apple-OAuth, E-Mail-Magic-Link,
// Passkey/WebAuthn, Session-Ende. Erst-Login = Registrierung (kein separater
// Screen) - die db.find*-Helfer legen bei Bedarf einen neuen Nutzer an.
import { Hono } from "hono";
import type { Env } from "../types";
import { buildGoogleAuthUrl, exchangeGoogleCode } from "../auth/google";
import { buildAppleAuthUrl, exchangeAppleCode } from "../auth/apple";
import { requestMagicLink, verifyMagicLink } from "../auth/magicLink";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "../auth/passkey";
import {
  loginWithPassword,
  registerWithPassword,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken,
} from "../auth/passwordAuth";
import { login, logout, extractSessionId, buildClearSessionCookie } from "../auth/session";
import { deleteAllSessionsForUser, findOrCreateUserForOAuth } from "../db";
import { deleteAccountCompletely } from "../accountDeletion";
import { requireAuth, requireCsrfOrigin, type AuthVars } from "../middleware";

const OAUTH_STATE_COOKIE = "if_oauth_state";
// D2 (Spec-v3.0 Kap. 4.5): einmalig, kurzlebig, HttpOnly - der Nachweis, dass
// diese OAuth-Runde eine Konto-Loeschung autorisiert statt eines normalen
// Logins. Enthaelt die userId der Session, die die Loeschung angestossen hat.
const DELETE_REAUTH_COOKIE = "if_delete_reauth";

export const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

function frontendBase(env: Env, req: Request): string {
  // APP_BASE_URL ist optional (Platzhalter-Setup, siehe kommerzialisierung-setup.md) -
  // ohne Konfiguration faellt der Worker auf die Origin des eingehenden Requests
  // zurueck (funktioniert lokal/dev, wo Frontend und der Redirect vom selben
  // Host aus angestossen werden).
  if (env.APP_BASE_URL) return env.APP_BASE_URL;
  return new URL(req.url).origin;
}

// Origin des Worker selbst (api-dev.immofuchs.info), NICHT die Frontend-Origin
// aus APP_BASE_URL - Links auf Worker-Endpunkte muessen hierhin zeigen.
function workerOrigin(req: Request): string {
  return new URL(req.url).origin;
}

function workerCallbackUrl(req: Request, path: string): string {
  return new URL(path, new URL(req.url).origin).toString();
}

function randomState(): string {
  return crypto.randomUUID();
}

// ═══ Google ═══

authRoutes.get("/google/start", (c) => {
  const state = randomState();
  const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/google/callback");
  const url = buildGoogleAuthUrl(c.env, redirectUri, state);
  c.header(
    "Set-Cookie",
    `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  );
  return c.redirect(url, 302);
});

// D2 (Spec-v3.0 Kap. 4.5): Konto-Loeschung fuer Google-Konten ohne Passwort -
// derselbe OAuth-Roundtrip wie /google/start, aber requireAuth-geschuetzt und
// mit zusaetzlichem Cookie, das die callback-Route auf "loeschen statt
// einloggen" umschaltet (siehe /google/callback).
authRoutes.get("/delete-reauth/google", requireAuth, (c) => {
  const state = randomState();
  const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/google/callback");
  const url = buildGoogleAuthUrl(c.env, redirectUri, state);
  c.header("Set-Cookie", `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`, {
    append: true,
  });
  c.header(
    "Set-Cookie",
    `${DELETE_REAUTH_COOKIE}=${c.var.userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    { append: true },
  );
  return c.redirect(url, 302);
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = readCookie(c.req.raw, OAUTH_STATE_COOKIE);
  const base = frontendBase(c.env, c.req.raw);
  // Einmalig lesen: unabhaengig vom Ausgang darf dieser Cookie kein zweites
  // Mal etwas autorisieren.
  const deleteReauthUserId = readCookie(c.req.raw, DELETE_REAUTH_COOKIE);
  if (deleteReauthUserId) {
    c.header("Set-Cookie", `${DELETE_REAUTH_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, {
      append: true,
    });
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return c.redirect(`${base}/?login_error=oauth_state_mismatch`, 302);
  }
  try {
    const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/google/callback");
    const identity = await exchangeGoogleCode(c.env, code, redirectUri);
    const result = await findOrCreateUserForOAuth(c.env.DB, "google", identity.providerUserId, identity.email);

    if (deleteReauthUserId) {
      // D2: nur loeschen, wenn die frisch bestaetigte Google-Identitaet
      // tatsaechlich zu dem Konto gehoert, das die Loeschung angestossen hat -
      // sonst koennte ein zweites, ebenfalls bei Google eingeloggtes Konto
      // (falscher Tab/falsches Profil) ein fremdes Konto loeschen.
      if (!result.ok || result.user.id !== deleteReauthUserId) {
        return c.redirect(`${base}/?login_error=delete_reauth_failed`, 302);
      }
      try {
        await deleteAccountCompletely(c.env, result.user.id, result.user.email);
      } catch {
        return c.redirect(`${base}/?login_error=delete_reauth_failed`, 302);
      }
      const sessionId = extractSessionId(c.req.raw);
      if (sessionId) await logout(c.env, sessionId);
      c.header("Set-Cookie", buildClearSessionCookie(), { append: true });
      return c.redirect(`${base}/?account_deleted=1`, 302);
    }

    if (!result.ok) {
      return c.redirect(`${base}/?login_error=oauth_email_taken&providers=${encodeURIComponent(result.providers.join(","))}`, 302);
    }
    const { cookie } = await login(c.env, result.user.id, c.req.header("User-Agent") || null);
    c.header("Set-Cookie", cookie, { append: true });
    return c.redirect(`${base}/?login_success=1`, 302);
  } catch (err) {
    console.error("google_oauth_callback_failed", err instanceof Error ? err.message : "unknown");
    return c.redirect(`${base}/?login_error=oauth_failed`, 302);
  }
});

// ═══ Apple ═══
// response_mode=form_post - Apple postet an den Callback, kein GET-Query.

authRoutes.get("/apple/start", (c) => {
  const state = randomState();
  const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/apple/callback");
  const url = buildAppleAuthUrl(c.env, redirectUri, state);
  c.header(
    "Set-Cookie",
    `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  );
  return c.redirect(url, 302);
});

// D2 (Spec-v3.0 Kap. 4.5) - analog zu /delete-reauth/google.
authRoutes.get("/delete-reauth/apple", requireAuth, (c) => {
  const state = randomState();
  const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/apple/callback");
  const url = buildAppleAuthUrl(c.env, redirectUri, state);
  c.header("Set-Cookie", `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`, {
    append: true,
  });
  c.header(
    "Set-Cookie",
    `${DELETE_REAUTH_COOKIE}=${c.var.userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    { append: true },
  );
  return c.redirect(url, 302);
});

authRoutes.post("/apple/callback", async (c) => {
  const body = await c.req.parseBody();
  const code = typeof body.code === "string" ? body.code : undefined;
  const state = typeof body.state === "string" ? body.state : undefined;
  const cookieState = readCookie(c.req.raw, OAUTH_STATE_COOKIE);
  const base = frontendBase(c.env, c.req.raw);
  const deleteReauthUserId = readCookie(c.req.raw, DELETE_REAUTH_COOKIE);
  if (deleteReauthUserId) {
    c.header("Set-Cookie", `${DELETE_REAUTH_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, {
      append: true,
    });
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return c.redirect(`${base}/?login_error=oauth_state_mismatch`, 302);
  }
  try {
    const redirectUri = workerCallbackUrl(c.req.raw, "/api/v1/auth/apple/callback");
    const identity = await exchangeAppleCode(c.env, code, redirectUri);
    const result = await findOrCreateUserForOAuth(c.env.DB, "apple", identity.providerUserId, identity.email);

    if (deleteReauthUserId) {
      if (!result.ok || result.user.id !== deleteReauthUserId) {
        return c.redirect(`${base}/?login_error=delete_reauth_failed`, 302);
      }
      try {
        await deleteAccountCompletely(c.env, result.user.id, result.user.email);
      } catch {
        return c.redirect(`${base}/?login_error=delete_reauth_failed`, 302);
      }
      const sessionId = extractSessionId(c.req.raw);
      if (sessionId) await logout(c.env, sessionId);
      c.header("Set-Cookie", buildClearSessionCookie(), { append: true });
      return c.redirect(`${base}/?account_deleted=1`, 302);
    }

    if (!result.ok) {
      return c.redirect(`${base}/?login_error=oauth_email_taken&providers=${encodeURIComponent(result.providers.join(","))}`, 302);
    }
    const { cookie } = await login(c.env, result.user.id, c.req.header("User-Agent") || null);
    c.header("Set-Cookie", cookie, { append: true });
    return c.redirect(`${base}/?login_success=1`, 302);
  } catch (err) {
    console.error("apple_oauth_callback_failed", err instanceof Error ? err.message : "unknown");
    return c.redirect(`${base}/?login_error=oauth_failed`, 302);
  }
});

// ═══ E-Mail Magic-Link ═══

authRoutes.post("/magic-link/request", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  const result = await requestMagicLink(c.env, workerOrigin(c.req.raw), email);
  if (!result.ok && result.error === "invalid_email") return c.json({ error: "invalid_email" }, 400);
  if (!result.ok && result.error === "rate_limited") return c.json({ error: "rate_limited" }, 429);
  // Immer dieselbe Erfolgsmeldung, unabhaengig von Konto-Existenz (4.3/4.13).
  return c.json({ ok: true });
});

authRoutes.get("/magic-link/verify", async (c) => {
  const token = c.req.query("token") || "";
  const base = frontendBase(c.env, c.req.raw);
  const result = await verifyMagicLink(c.env, token);
  if (!result.ok) return c.redirect(`${base}/?login_error=magic_link_invalid`, 302);
  const { cookie } = await login(c.env, result.userId, c.req.header("User-Agent") || null);
  c.header("Set-Cookie", cookie, { append: true });
  return c.redirect(`${base}/?login_success=1`, 302);
});

// ═══ E-Mail + Passwort (Ergaenzung 04.08., Spec v8 4.4/4.5/4.13) ═══
// Fuenfter Login-Weg. Reihenfolge im Modal bewusst nachrangig (4.3, IMP-14) -
// die vier passwortlosen Wege bleiben unveraendert die primaeren Buttons.

authRoutes.post("/register", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  const password = body && typeof body.password === "string" ? body.password : "";
  const acceptedTerms = Boolean(body && body.acceptedTerms === true);
  const name = body && typeof body.name === "string" ? body.name : "";
  // Turnstile-Token und IP wandern durch bis in registerWithPassword - die
  // Pruefung gehoert vor das Anlegen des Kontos, nicht daneben.
  const turnstileToken = body && typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const result = await registerWithPassword(
    c.env,
    workerOrigin(c.req.raw),
    email,
    password,
    acceptedTerms,
    name,
    turnstileToken,
    c.req.header("CF-Connecting-IP") ?? null,
  );
  if (!result.ok) {
    if (result.error === "rate_limited") return c.json({ error: result.error }, 429);
    if (result.error === "bot_check_failed") return c.json({ error: result.error }, 403);
    if (result.error === "email_taken") return c.json({ error: result.error, providers: result.providers }, 409);
    return c.json({ error: result.error }, 400);
  }
  return c.json({ ok: true });
});

authRoutes.get("/verify-email", async (c) => {
  const token = c.req.query("token") || "";
  const base = frontendBase(c.env, c.req.raw);
  const result = await verifyEmailToken(c.env, token);
  if (!result.ok) return c.redirect(`${base}/?login_error=verify_invalid`, 302);
  const { cookie } = await login(c.env, result.userId, c.req.header("User-Agent") || null);
  c.header("Set-Cookie", cookie, { append: true });
  return c.redirect(`${base}/?login_success=1`, 302);
});

authRoutes.post("/resend-verification", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  const result = await resendVerification(c.env, workerOrigin(c.req.raw), email);
  if (!result.ok) return c.json({ error: result.error }, 429);
  return c.json({ ok: true });
});

authRoutes.post("/login", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  const password = body && typeof body.password === "string" ? body.password : "";
  const result = await loginWithPassword(c.env, c.req.raw, email, password);
  if (!result.ok) {
    if (result.error === "locked") return c.json({ error: result.error, retryAfterSeconds: result.retryAfterSeconds }, 423);
    if (result.error === "email_not_verified") return c.json({ error: result.error }, 403);
    if (result.error === "oauth_only") return c.json({ error: result.error, providers: result.providers }, 401);
    return c.json({ error: result.error, warn: result.warn }, 401);
  }
  const { cookie } = await login(c.env, result.userId, c.req.header("User-Agent") || null);
  c.header("Set-Cookie", cookie, { append: true });
  return c.json({ ok: true });
});

authRoutes.post("/password-reset/request", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  await requestPasswordReset(c.env, email);
  // Immer {ok:true} (4.13, neutrale Antwort) - unabhaengig von Konto-Existenz.
  return c.json({ ok: true });
});

authRoutes.post("/password-reset/confirm", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token : "";
  const newPassword = body && typeof body.newPassword === "string" ? body.newPassword : "";
  const result = await resetPassword(c.env, token, newPassword);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

// ═══ Passkey ═══

authRoutes.post("/passkey/register/options", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body && typeof body.email === "string" ? body.email : "";
  if (!email) return c.json({ error: "invalid_email" }, 400);
  const options = await startPasskeyRegistration(c.env, email);
  return c.json({ options });
});

authRoutes.post("/passkey/register/verify", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || !body.response) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const result = await finishPasskeyRegistration(
    c.env,
    body.email,
    body.response,
    typeof body.deviceLabel === "string" ? body.deviceLabel : null,
  );
  if (!result.ok) return c.json({ error: result.error }, 400);
  const { session, cookie } = await login(c.env, result.userId, c.req.header("User-Agent") || null);
  c.header("Set-Cookie", cookie, { append: true });
  // Token zusaetzlich im Body (10.0, S1-4/S6-2): Passkey ist der einzige
  // Login-Weg, der ohne Browser-Redirect auskommt - native Clients (Capacitor,
  // Phase D) speichern ihn in Secure Storage statt eines Cookies, das auf der
  // lokalen Capacitor-Origin nicht verlaesslich funktioniert. Web-Clients
  // ignorieren dieses Feld einfach (Cookie reicht dort).
  return c.json({ ok: true, token: session.id });
});

authRoutes.post("/passkey/login/options", requireCsrfOrigin, async (c) => {
  const flowId = crypto.randomUUID();
  const options = await startPasskeyLogin(c.env, flowId);
  return c.json({ flowId, options });
});

authRoutes.post("/passkey/login/verify", requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.flowId !== "string" || !body.response) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const result = await finishPasskeyLogin(c.env, body.flowId, body.response);
  if (!result.ok) return c.json({ error: result.error }, 400);
  const { session, cookie } = await login(c.env, result.userId, c.req.header("User-Agent") || null);
  c.header("Set-Cookie", cookie, { append: true });
  return c.json({ ok: true, token: session.id });
});

// ═══ Logout ═══

authRoutes.post("/logout", requireCsrfOrigin, async (c) => {
  const sessionId = extractSessionId(c.req.raw);
  if (sessionId) await logout(c.env, sessionId);
  c.header("Set-Cookie", buildClearSessionCookie(), { append: true });
  return c.json({ ok: true });
});

authRoutes.post("/logout-all", requireAuth, requireCsrfOrigin, async (c) => {
  await deleteAllSessionsForUser(c.env.DB, c.var.userId);
  c.header("Set-Cookie", buildClearSessionCookie(), { append: true });
  return c.json({ ok: true });
});

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}
