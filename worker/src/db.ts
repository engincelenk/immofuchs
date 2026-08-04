// Duenne Datenzugriffsschicht ueber D1 - buendelt alle SQL-Statements an einer
// Stelle, damit Auth-/Payment-/Objekt-Module keine rohen Queries verstreuen
// (Konvention: kleine, fokussierte Dateien, analog zum bestehenden Worker-Stil).
import type { Env } from "./types";

export interface UserRow {
  id: string;
  email: string;
  role: string;
  created_at: number;
  last_login_at: number | null;
  // Passwort-Weg (Ergaenzung 04.08., Migration 0011): NULL = Konto hat kein
  // Passwort (reines OAuth/Passkey/Magic-Link-Konto).
  password_hash: string | null;
  password_set_at: number | null;
  email_verified_at: number | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  user_agent: string | null;
  last_seen_at: number | null;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  status: "active" | "past_due" | "cancel_scheduled" | "canceled";
  plan: "monthly" | "yearly";
  paddle_customer_id: string;
  paddle_subscription_id: string;
  current_period_end: number;
  cancel_at_period_end: number;
  first_purchase_at: number;
  past_due_since: number | null;
  renewal_reminder_sent_at: number | null;
  latest_transaction_id: string | null;
  updated_at: number;
}

export interface ObjectRow {
  id: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  title: string | null;
  plz: string | null;
  ort: string | null;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  score: number | null;
  score_label: string | null;
  input_data: string;
  result_data: string;
  source: "manuell" | "expose-scan";
  status: "in_pruefung" | "archiviert";
}

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 Tage, gleitend (4.5)
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 Minuten (4.4)

export function newId(): string {
  return crypto.randomUUID();
}

// ═══ Users / OAuth ═══

export async function getUserById(db: Env["DB"], id: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function getUserByEmail(db: Env["DB"], email: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}

export async function createUser(db: Env["DB"], email: string): Promise<UserRow> {
  const id = newId();
  const now = Date.now();
  await db
    .prepare("INSERT INTO users (id, email, role, created_at, last_login_at) VALUES (?, ?, 'customer', ?, ?)")
    .bind(id, email, now, now)
    .run();
  return {
    id,
    email,
    role: "customer",
    created_at: now,
    last_login_at: now,
    password_hash: null,
    password_set_at: null,
    email_verified_at: null,
  };
}

export async function touchUserLogin(db: Env["DB"], userId: string): Promise<void> {
  await db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(Date.now(), userId).run();
}

export async function findUserByOAuth(
  db: Env["DB"],
  provider: string,
  providerUserId: string,
): Promise<UserRow | null> {
  return db
    .prepare(
      `SELECT users.* FROM users
       JOIN oauth_identities ON oauth_identities.user_id = users.id
       WHERE oauth_identities.provider = ? AND oauth_identities.provider_user_id = ?`,
    )
    .bind(provider, providerUserId)
    .first<UserRow>();
}

export async function linkOAuthIdentity(
  db: Env["DB"],
  userId: string,
  provider: string,
  providerUserId: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO oauth_identities (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)",
    )
    .bind(newId(), userId, provider, providerUserId)
    .run();
}

export async function listLinkedProviders(db: Env["DB"], userId: string): Promise<string[]> {
  const rows = await db
    .prepare("SELECT DISTINCT provider FROM oauth_identities WHERE user_id = ?")
    .bind(userId)
    .all<{ provider: string }>();
  const providers = rows.results.map((r) => r.provider);
  const hasPasskey = await db
    .prepare("SELECT 1 FROM passkey_credentials WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first();
  if (hasPasskey) providers.push("passkey");
  return providers;
}

// Registrierung/Login via Google/Apple: Erst-Login legt users+oauth_identities
// an (das *ist* die Registrierung, 4.4). Verknuepfung ueber verifizierte
// E-Mail, falls derselbe Nutzer spaeter mit einem zweiten Provider kommt.
export async function findOrCreateUserForOAuth(
  db: Env["DB"],
  provider: string,
  providerUserId: string,
  email: string,
): Promise<UserRow> {
  const existing = await findUserByOAuth(db, provider, providerUserId);
  if (existing) {
    await touchUserLogin(db, existing.id);
    return existing;
  }
  const byEmail = await getUserByEmail(db, email);
  if (byEmail) {
    await linkOAuthIdentity(db, byEmail.id, provider, providerUserId);
    await touchUserLogin(db, byEmail.id);
    return byEmail;
  }
  const user = await createUser(db, email);
  await linkOAuthIdentity(db, user.id, provider, providerUserId);
  return user;
}

// ═══ E-Mail + Passwort (Ergaenzung 04.08., Migration 0011) ═══

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 60 Minuten

// Erster Weg im Projekt mit eigenem Registrierungs-Screen (4.4) - legt den
// Nutzer sofort mit password_hash an, email_verified_at bleibt NULL bis zum
// Double-Opt-In (siehe consumeEmailVerificationToken).
export async function createUserWithPassword(
  db: Env["DB"],
  email: string,
  passwordHash: string,
): Promise<UserRow> {
  const id = newId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, role, created_at, last_login_at, password_hash, password_set_at, email_verified_at)
       VALUES (?, ?, 'customer', ?, NULL, ?, ?, NULL)`,
    )
    .bind(id, email, now, passwordHash, now)
    .run();
  return {
    id,
    email,
    role: "customer",
    created_at: now,
    last_login_at: null,
    password_hash: passwordHash,
    password_set_at: now,
    email_verified_at: null,
  };
}

export async function setUserPasswordHash(db: Env["DB"], userId: string, passwordHash: string): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ?, password_set_at = ? WHERE id = ?")
    .bind(passwordHash, Date.now(), userId)
    .run();
}

// Token wird nur gehasht abgelegt (4.5, 4.13, §13 Punkt 17) - Aufrufer
// uebergibt bereits hashToken(rawToken). pendingPasswordHash ist gesetzt,
// wenn dieser Token ein bestehendes OAuth-/Passkey-Konto mit einem Passwort
// verknuepft (Wireframe-Karte 16 "Stattdessen Passwort setzen"), sonst NULL
// (reine Registrierungs-Bestaetigung).
export async function createEmailVerificationToken(
  db: Env["DB"],
  userId: string,
  tokenHash: string,
  pendingPasswordHash: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO email_verification_tokens (token_hash, user_id, pending_password_hash, expires_at, used_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`,
    )
    .bind(tokenHash, userId, pendingPasswordHash, Date.now() + EMAIL_VERIFICATION_TTL_MS, Date.now())
    .run();
}

export async function consumeEmailVerificationToken(
  db: Env["DB"],
  tokenHash: string,
): Promise<{ userId: string; pendingPasswordHash: string | null } | null> {
  const row = await db
    .prepare(
      "SELECT user_id, pending_password_hash, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?",
    )
    .bind(tokenHash)
    .first<{ user_id: string; pending_password_hash: string | null; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at !== null || row.expires_at < Date.now()) return null;
  await db
    .prepare("UPDATE email_verification_tokens SET used_at = ? WHERE token_hash = ?")
    .bind(Date.now(), tokenHash)
    .run();
  return { userId: row.user_id, pendingPasswordHash: row.pending_password_hash };
}

export async function markEmailVerified(db: Env["DB"], userId: string): Promise<void> {
  await db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").bind(Date.now(), userId).run();
}

export async function createPasswordResetToken(db: Env["DB"], userId: string, tokenHash: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)",
    )
    .bind(tokenHash, userId, Date.now() + PASSWORD_RESET_TTL_MS, Date.now())
    .run();
}

export async function consumePasswordResetToken(db: Env["DB"], tokenHash: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at !== null || row.expires_at < Date.now()) return null;
  await db
    .prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?")
    .bind(Date.now(), tokenHash)
    .run();
  return row.user_id;
}

// Gestaffelter Brute-Force-Schutz (4.13): Warnung ab Versuch 3, Sperre 15
// Min. ab Versuch 5 - gezaehlt pro Konto UND pro IP (siehe passwordAuth.ts).
export async function recordLoginAttempt(
  db: Env["DB"],
  email: string,
  ipHash: string,
  success: boolean,
): Promise<void> {
  await db
    .prepare("INSERT INTO login_attempts (id, email, ip_hash, success, attempted_at) VALUES (?, ?, ?, ?, ?)")
    .bind(newId(), email, ipHash, success ? 1 : 0, Date.now())
    .run();
}

export async function countRecentFailedAttempts(
  db: Env["DB"],
  column: "email" | "ip_hash",
  value: string,
  sinceMs: number,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as n FROM login_attempts WHERE ${column} = ? AND success = 0 AND attempted_at > ?`,
    )
    .bind(value, Date.now() - sinceMs)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// Datenminimierung (4.13): Zeilen aelter als 24 Std. loeschen - vom
// bestehenden Renewal-Reminder-Cron mitgezogen (siehe scheduled.ts).
export async function cleanupOldLoginAttempts(db: Env["DB"], olderThanMs: number): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(Date.now() - olderThanMs).run();
}

// ═══ Magic Link ═══

// tokenHash statt Klartext-Token (§13 Punkt 17, analog zu den Passwort-Weg-
// Tokens, siehe auth/magicLink.ts): ein DB-Leak gibt damit keinen gueltigen
// Login-Link her. Die Spalte heisst weiterhin "token", enthaelt aber den Hash.
export async function createMagicLink(db: Env["DB"], email: string, tokenHash: string): Promise<void> {
  await db
    .prepare("INSERT INTO magic_links (token, email, expires_at, used_at) VALUES (?, ?, ?, NULL)")
    .bind(tokenHash, email, Date.now() + MAGIC_LINK_TTL_MS)
    .run();
}

// Gibt die E-Mail zurueck und markiert den Token als benutzt - Aufrufer prueft
// selbst, ob ein Nutzer mit dieser E-Mail existiert oder neu angelegt wird.
// Erwartet bereits den gehashten Token (Aufrufer hasht den Klartext-Token).
export async function consumeMagicLink(db: Env["DB"], tokenHash: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT email, expires_at, used_at FROM magic_links WHERE token = ?")
    .bind(tokenHash)
    .first<{ email: string; expires_at: number; used_at: number | null }>();
  if (!row) return null;
  if (row.used_at !== null) return null; // bereits verwendet
  if (row.expires_at < Date.now()) return null; // abgelaufen
  await db.prepare("UPDATE magic_links SET used_at = ? WHERE token = ?").bind(Date.now(), tokenHash).run();
  return row.email;
}

// ═══ Sessions ═══

export async function createSession(
  db: Env["DB"],
  userId: string,
  userAgent: string | null,
): Promise<SessionRow> {
  const id = newId();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, userId, now, expiresAt, userAgent, now)
    .run();
  return { id, user_id: userId, created_at: now, expires_at: expiresAt, user_agent: userAgent, last_seen_at: now };
}

// Session lesen + gleitend verlaengern (4.5) - wird bei jedem authentifizierten
// Aufruf aufgerufen, daher bewusst ein einzelnes Statement-Paar, kein Full-Row-Update
// bei jedem Feld.
export async function getAndTouchSession(
  db: Env["DB"],
  sessionId: string,
): Promise<SessionRow | null> {
  const row = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first<SessionRow>();
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  const now = Date.now();
  const newExpiry = now + SESSION_TTL_MS;
  await db
    .prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?")
    .bind(now, newExpiry, sessionId)
    .run();
  return { ...row, last_seen_at: now, expires_at: newExpiry };
}

export async function listSessionsForUser(db: Env["DB"], userId: string): Promise<SessionRow[]> {
  const rows = await db
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC")
    .bind(userId)
    .all<SessionRow>();
  return rows.results;
}

export async function deleteAllSessionsForUser(db: Env["DB"], userId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export async function deleteSession(db: Env["DB"], sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

// ═══ Subscriptions ═══

export async function getActiveSubscription(
  db: Env["DB"],
  userId: string,
): Promise<SubscriptionRow | null> {
  return db
    .prepare(
      `SELECT * FROM subscriptions WHERE user_id = ?
       AND status IN ('active', 'past_due', 'cancel_scheduled')
       ORDER BY updated_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<SubscriptionRow>();
}

// Für den Renewal-Reminder-Cron (S4-4): jährliche, aktive, nicht bereits
// gekündigte Abos, deren Periode in den nächsten `withinMs` endet und für die
// noch keine Erinnerung verschickt wurde.
export async function listSubscriptionsDueForRenewalReminder(
  db: Env["DB"],
  withinMs: number,
): Promise<(SubscriptionRow & { email: string })[]> {
  const now = Date.now();
  const rows = await db
    .prepare(
      `SELECT subscriptions.*, users.email as email FROM subscriptions
       JOIN users ON users.id = subscriptions.user_id
       WHERE subscriptions.plan = 'yearly'
         AND subscriptions.status = 'active'
         AND subscriptions.cancel_at_period_end = 0
         AND subscriptions.renewal_reminder_sent_at IS NULL
         AND subscriptions.current_period_end BETWEEN ? AND ?`,
    )
    .bind(now, now + withinMs)
    .all<SubscriptionRow & { email: string }>();
  return rows.results;
}

export async function markRenewalReminderSent(db: Env["DB"], subscriptionId: string): Promise<void> {
  await db
    .prepare("UPDATE subscriptions SET renewal_reminder_sent_at = ? WHERE id = ?")
    .bind(Date.now(), subscriptionId)
    .run();
}

export async function getSubscriptionByPaddleId(
  db: Env["DB"],
  paddleSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  return db
    .prepare("SELECT * FROM subscriptions WHERE paddle_subscription_id = ?")
    .bind(paddleSubscriptionId)
    .first<SubscriptionRow>();
}

// ═══ Webhook-Idempotenz ═══

export async function isWebhookEventProcessed(db: Env["DB"], eventId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM processed_webhook_events WHERE event_id = ?")
    .bind(eventId)
    .first();
  return row !== null;
}

export async function markWebhookEventProcessed(db: Env["DB"], eventId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO processed_webhook_events (event_id, processed_at) VALUES (?, ?)")
    .bind(eventId, Date.now())
    .run();
}

// ═══ Objects ═══

export async function listObjectsForUser(db: Env["DB"], userId: string): Promise<ObjectRow[]> {
  const rows = await db
    .prepare("SELECT * FROM objects WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(userId)
    .all<ObjectRow>();
  return rows.results;
}

export async function countObjectsForUser(db: Env["DB"], userId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM objects WHERE user_id = ?")
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getObjectById(db: Env["DB"], id: string): Promise<ObjectRow | null> {
  return db.prepare("SELECT * FROM objects WHERE id = ?").bind(id).first<ObjectRow>();
}

export interface NewObjectInput {
  id: string; // clientseitig erzeugt (uuid) - Voraussetzung fuer Dedupe beim Import (4.17)
  title: string | null;
  plz: string | null;
  ort: string | null;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  score: number | null;
  scoreLabel: string | null;
  inputData: unknown;
  resultData: unknown;
  source: "manuell" | "expose-scan";
}

// INSERT OR IGNORE (statt INSERT) - macht den Aufruf idempotent bei
// Netzwerk-Retries UND ist die Grundlage fuer den Free->Pro-Import (S5b-2):
// ein doppelt gesendetes Objekt (gleiche clientseitige uuid) erzeugt keinen
// Duplikat-Fehler, sondern wird stillschweigend uebersprungen.
export async function insertObjectIfNew(
  db: Env["DB"],
  userId: string,
  input: NewObjectInput,
): Promise<{ created: boolean }> {
  const now = Date.now();
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO objects
        (id, user_id, created_at, updated_at, title, plz, ort, kaufpreis, wohnflaeche,
         score, score_label, input_data, result_data, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_pruefung')`,
    )
    .bind(
      input.id,
      userId,
      now,
      now,
      input.title,
      input.plz,
      input.ort,
      input.kaufpreis,
      input.wohnflaeche,
      input.score,
      input.scoreLabel,
      JSON.stringify(input.inputData),
      JSON.stringify(input.resultData),
      input.source,
    )
    .run();
  return { created: (result.meta.changes ?? 0) > 0 };
}

export async function updateObject(
  db: Env["DB"],
  id: string,
  fields: Partial<
    Pick<
      ObjectRow,
      "title" | "plz" | "ort" | "kaufpreis" | "wohnflaeche" | "score" | "score_label" | "status"
    >
  > & { input_data?: unknown; result_data?: unknown },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(key === "input_data" || key === "result_data" ? JSON.stringify(value) : value);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);
  await db.prepare(`UPDATE objects SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteObject(db: Env["DB"], id: string): Promise<void> {
  await db.prepare("DELETE FROM objects WHERE id = ?").bind(id).run();
}

// ═══ Exposé-Trial (4.8, 4.0a, S5-2) ═══
// Dauerhaftes "schon einmal benutzt"-Flag, getrennt von den taeglichen
// Durable-Object-Kostenschranken (siehe Migration 0006).

export async function hasUsedExposeTrial(db: Env["DB"], sessionId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM expose_trial_used WHERE session_id = ?").bind(sessionId).first();
  return row !== null;
}

export async function markExposeTrialUsed(db: Env["DB"], sessionId: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO expose_trial_used (session_id, used_at) VALUES (?, ?)")
    .bind(sessionId, Date.now())
    .run();
}

// ═══ Push-Tokens (4.11, 10.0, S7-1) ═══

export interface PushTokenRow {
  token: string;
  user_id: string;
  platform: "ios" | "android";
}

export async function upsertPushToken(
  db: Env["DB"],
  userId: string,
  token: string,
  platform: "ios" | "android",
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO push_tokens (token, user_id, platform, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at`,
    )
    .bind(token, userId, platform, now, now)
    .run();
}

export async function removePushToken(db: Env["DB"], token: string): Promise<void> {
  await db.prepare("DELETE FROM push_tokens WHERE token = ?").bind(token).run();
}

export async function listPushTokensForUser(db: Env["DB"], userId: string): Promise<PushTokenRow[]> {
  const rows = await db
    .prepare("SELECT token, user_id, platform FROM push_tokens WHERE user_id = ?")
    .bind(userId)
    .all<PushTokenRow>();
  return rows.results;
}

export async function listPushTokensForUsers(
  db: Env["DB"],
  userIds: string[],
): Promise<PushTokenRow[]> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(",");
  const rows = await db
    .prepare(`SELECT token, user_id, platform FROM push_tokens WHERE user_id IN (${placeholders})`)
    .bind(...userIds)
    .all<PushTokenRow>();
  return rows.results;
}

// ═══ E-Mail-Änderung (4.10) ═══

const EMAIL_CHANGE_TTL_MS = 15 * 60 * 1000;

export async function createEmailChangeRequest(
  db: Env["DB"],
  userId: string,
  newEmail: string,
): Promise<string> {
  const token = newId();
  await db
    .prepare(
      "INSERT INTO email_change_requests (token, user_id, new_email, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)",
    )
    .bind(token, userId, newEmail, Date.now() + EMAIL_CHANGE_TTL_MS)
    .run();
  return token;
}

export async function consumeEmailChangeRequest(
  db: Env["DB"],
  token: string,
): Promise<{ userId: string; newEmail: string } | null> {
  const row = await db
    .prepare("SELECT user_id, new_email, expires_at, used_at FROM email_change_requests WHERE token = ?")
    .bind(token)
    .first<{ user_id: string; new_email: string; expires_at: number; used_at: number | null }>();
  if (!row || row.used_at !== null || row.expires_at < Date.now()) return null;
  await db
    .prepare("UPDATE email_change_requests SET used_at = ? WHERE token = ?")
    .bind(Date.now(), token)
    .run();
  return { userId: row.user_id, newEmail: row.new_email };
}

export async function updateUserEmail(db: Env["DB"], userId: string, newEmail: string): Promise<void> {
  await db.prepare("UPDATE users SET email = ? WHERE id = ?").bind(newEmail, userId).run();
}

// ═══ Art. 17 — Konto vollständig löschen ═══
// Reihenfolge wichtig: erst abhängige Zeilen, dann users selbst (D1/SQLite
// erzwingt hier keine FK-Kaskade). Paddle-Kündigung passiert VOR diesem
// Aufruf beim aufrufenden Endpunkt (paddle/checkout.ts), nicht hier - reine
// D1-Aufräumfunktion.
export async function deleteUserCompletely(db: Env["DB"], userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM oauth_identities WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM passkey_credentials WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM objects WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM email_change_requests WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}
