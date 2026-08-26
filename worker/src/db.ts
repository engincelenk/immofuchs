// Duenne Datenzugriffsschicht ueber D1 - buendelt alle SQL-Statements an einer
// Stelle, damit Auth-/Payment-/Objekt-Module keine rohen Queries verstreuen
// (Konvention: kleine, fokussierte Dateien, analog zum bestehenden Worker-Stil).
import type { Env } from "./types";
import { PLAN_PREIS_EUR } from "./preise";

export interface UserRow {
  id: string;
  email: string;
  // Migration 0015 (Konzept-Dok 1.6/3.3/8.8): nullable, da nur der Passwort-
  // Registrierungs-Screen ein Namensfeld hat - OAuth/Passkey/Magic-Link legen
  // Konten ohne Name an, nachtraeglich im Profil ergaenzbar.
  name: string | null;
  role: string;
  // Migration 0016 (Konzept-Dok "Access Management" Abschnitt 5): getrennt
  // von role - role definiert Berechtigungen, account_status den
  // Kontozustand. 'DELETED' wird aktuell nie gesetzt (Hard Delete statt
  // Soft Delete, siehe accountDeletion.ts).
  account_status: "ACTIVE" | "SUSPENDED" | "DELETED";
  created_at: number;
  last_login_at: number | null;
  // Passwort-Weg (Ergaenzung 04.08., Migration 0011): NULL = Konto hat kein
  // Passwort (reines OAuth/Passkey/Magic-Link-Konto).
  password_hash: string | null;
  password_set_at: number | null;
  email_verified_at: number | null;
  // T1 (Spec-v3.0 Kap. 3.1a): einmal gesetzt, nie zurueckgesetzt - persistiert
  // "hatte schon mal ein Trial", auch nachdem eine Subscription-Zeile von
  // 'trialing' auf 'active'/'canceled' gewechselt ist (Migration 0013).
  trial_used_at: number | null;
  // Kartenfreie Testphase (Migration 0025): 7 Tage ab der ersten
  // authentifizierten Anfrage, ohne Zahlungsdaten und ohne Paddle-Zeile.
  // Nicht zu verwechseln mit trial_used_at (bezahlter Paddle-Trial).
  app_trial_started_at: number | null;
  app_trial_ends_at: number | null;
  // Kap. 4.7 (Migration 0014): einziger abschaltbarer Mail-Kanal, alle
  // anderen (Zahlungsfehler, Kuendigung, Trial-Ende, ...) sind Pflicht.
  marketing_emails_enabled: number;
  // Neuer Login-/Test-Flow (Migration 0018): kostenloser Ersttest aller 6
  // Rechner kombiniert, einmal gesetzt nie zurueckgesetzt - unabhaengig von
  // trial_used_at (das ist der bezahlte 3-Tage-Paddle-Trial).
  calculator_trial_used_at: number | null;
  // Admin-MVP (Migration 0019): Merkmal quer zur Rolle, vom Admin-Panel
  // umschaltbar. Hat die frueherer Rolle 'test_user' abgeloest, damit ein
  // Nutzer gleichzeitig Kunde UND Testnutzer sein kann.
  is_test_user: number;
  // Migration 0023: pro-Nutzer-Alternative zur globalen, dev-only
  // TEST_EMAIL_REDIRECT_TO (siehe email.ts) - nur wirksam bei
  // is_test_user=1, faengt Mails an fiktive Testadressen (z.B.
  // test.admin@immofuchs.info) auch auf qa/prod ab.
  test_email_redirect_to: string | null;
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
  // 'trialing' seit Phase 3 (Migration 0012) - eigener Status, rechtlich
  // gleichwertig zu 'active' (siehe entitlement.ts, computeIsPro).
  status: "active" | "trialing" | "past_due" | "cancel_scheduled" | "canceled";
  plan: "monthly" | "yearly";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: number;
  cancel_at_period_end: number;
  first_purchase_at: number;
  past_due_since: number | null;
  renewal_reminder_sent_at: number | null;
  // Getrennt von renewal_reminder_sent_at (Migration 0012): sonst wuerde die
  // Trial-Erinnerung die spaetere Jahres-Erinnerung desselben Abos blockieren.
  trial_reminder_sent_at: number | null;
  latest_invoice_id: string | null;
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
    name: null,
    role: "customer",
    account_status: "ACTIVE",
    created_at: now,
    last_login_at: now,
    password_hash: null,
    password_set_at: null,
    email_verified_at: null,
    trial_used_at: null,
    app_trial_started_at: null,
    app_trial_ends_at: null,
    marketing_emails_enabled: 0,
    calculator_trial_used_at: null,
    is_test_user: 0,
    test_email_redirect_to: null,
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
  const hasPassword = await db
    .prepare("SELECT 1 FROM users WHERE id = ? AND password_hash IS NOT NULL")
    .bind(userId)
    .first();
  if (hasPassword) providers.push("password");
  return providers;
}

export type OAuthLoginResult =
  | { ok: true; user: UserRow }
  | { ok: false; error: "email_taken_other_method"; providers: string[] };

// Login via Google/Apple: Erst-Login legt users+oauth_identities an (das *ist*
// die Registrierung, Spec-v3.0 Kap. 2.2). Anders als frueher KEINE
// automatische Verknuepfung mehr, falls dieselbe E-Mail bereits ueber eine
// andere Methode registriert ist (Kap. 0.1: Login-Methoden sind strikt
// getrennt und nachtraeglich nicht verknuepfbar) - das ist dann ein
// eigenstaendiger Fehlerfall (E1), kein Zusammenlegen der Konten.
export async function findOrCreateUserForOAuth(
  db: Env["DB"],
  provider: string,
  providerUserId: string,
  email: string,
): Promise<OAuthLoginResult> {
  const existing = await findUserByOAuth(db, provider, providerUserId);
  if (existing) {
    await touchUserLogin(db, existing.id);
    return { ok: true, user: existing };
  }
  const byEmail = await getUserByEmail(db, email);
  if (byEmail) {
    const providers = await listLinkedProviders(db, byEmail.id);
    return { ok: false, error: "email_taken_other_method", providers };
  }
  const user = await createUser(db, email);
  await linkOAuthIdentity(db, user.id, provider, providerUserId);
  return { ok: true, user };
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
  name: string,
): Promise<UserRow> {
  const id = newId();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, role, created_at, last_login_at, password_hash, password_set_at, email_verified_at)
       VALUES (?, ?, ?, 'customer', ?, NULL, ?, ?, NULL)`,
    )
    .bind(id, email, name, now, passwordHash, now)
    .run();
  return {
    id,
    email,
    name,
    role: "customer",
    account_status: "ACTIVE",
    created_at: now,
    last_login_at: null,
    password_hash: passwordHash,
    password_set_at: now,
    email_verified_at: null,
    trial_used_at: null,
    app_trial_started_at: null,
    app_trial_ends_at: null,
    marketing_emails_enabled: 0,
    calculator_trial_used_at: null,
    is_test_user: 0,
    test_email_redirect_to: null,
  };
}

// Direktes Update, kein Double-Opt-In (anders als updateUserEmail): der Name
// ist kein sicherheitskritisches Feld, eine gueltige Session genuegt.
export async function updateUserName(db: Env["DB"], userId: string, name: string): Promise<void> {
  await db.prepare("UPDATE users SET name = ? WHERE id = ?").bind(name, userId).run();
}

// Access Management (Konzept-Dok Abschnitt 2, "Benutzer sperren/entsperren").
// Setzt NUR account_status - loescht bewusst keine Sessions hier, das macht
// der Aufrufer explizit (siehe routes/admin.ts), damit diese reine
// Statusaenderung testbar bleibt, ohne Session-Nebenwirkungen mitzutesten.
export async function setUserAccountStatus(
  db: Env["DB"],
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<void> {
  await db.prepare("UPDATE users SET account_status = ? WHERE id = ?").bind(status, userId).run();
}

export async function setUserPasswordHash(db: Env["DB"], userId: string, passwordHash: string): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ?, password_set_at = ? WHERE id = ?")
    .bind(passwordHash, Date.now(), userId)
    .run();
}

// T1 (Spec-v3.0 Kap. 3.1a) - idempotent: einmal gesetzt, bleibt es stehen.
export async function markTrialUsedForUser(db: Env["DB"], userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET trial_used_at = ? WHERE id = ? AND trial_used_at IS NULL")
    .bind(Date.now(), userId)
    .run();
}

// Login-/Test-Flow (Migration 0018, seit 0022 pro Rechner statt kombiniert
// ueber alle 6 - Nutzer-Vorgabe 2026-08-18: 1x kombiniert -> 3x je Rechner).
// ═══ Verbrauch der Testphase (Migration 0025) ═══
//
// Ersetzt calculator_trial_usage (0022/0024) und expose_trial_used
// (0006/0021/0024). Ein Tabellenschema fuer alle Kontingente statt zwei
// Sonderfaelle, und an den Nutzer gebunden statt an die Session - siehe
// Kommentar in der Migration.

export type TrialFeature = "rechner" | "finn" | "expose" | "pdf" | "handout";

// Alle Zaehler der laufenden Testphase, als "feature:rechner" -> count.
// Zeilen aelterer Testphasen (anderes trial_start) werden nicht gelesen und
// zaehlen damit als 0.
// `tag` schraenkt auf einen Kalendertag ein (Tageskontingente seit Migration
// 0026); '' liefert die Zaehler, die ueber die ganze Phase laufen. Ohne diese
// Einschraenkung wuerden die Zeilen aller bisherigen Tage aufsummiert und das
// Tageslimit waere nach dem ersten Tag dauerhaft erschoepft.
export async function getTrialUsage(
  db: Env["DB"],
  userId: string,
  trialStart: number,
  tag = "",
): Promise<Record<string, number>> {
  const { results } = await db
    .prepare(
      "SELECT feature, rechner, count FROM trial_usage WHERE user_id = ? AND trial_start = ? AND tag = ?",
    )
    .bind(userId, trialStart, tag)
    .all<{ feature: string; rechner: string; count: number }>();
  const usage: Record<string, number> = {};
  for (const row of results) usage[`${row.feature}:${row.rechner}`] = row.count;
  return usage;
}

export async function getTrialCount(
  db: Env["DB"],
  userId: string,
  trialStart: number,
  feature: TrialFeature,
  rechner = "",
  tag = "",
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT count FROM trial_usage WHERE user_id = ? AND feature = ? AND rechner = ? AND tag = ? AND trial_start = ?",
    )
    .bind(userId, feature, rechner, tag, trialStart)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// Der CASE ist der Wechsel der Testphase: gehoert die vorhandene Zeile noch
// zur laufenden, wird hochgezaehlt - sonst faengt der Zaehler bei 1 an. Ein
// Aufraeumjob alter Zeilen eruebrigt sich dadurch.
export async function incrementTrialUsage(
  db: Env["DB"],
  userId: string,
  trialStart: number,
  feature: TrialFeature,
  rechner = "",
  tag = "",
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO trial_usage (user_id, feature, rechner, tag, count, trial_start) VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(user_id, feature, rechner, tag) DO UPDATE SET
         count = CASE WHEN trial_usage.trial_start = excluded.trial_start
                      THEN trial_usage.count + 1 ELSE 1 END,
         trial_start = excluded.trial_start`,
    )
    .bind(userId, feature, rechner, tag, trialStart)
    .run();
}

// Startet die Testphase beim ersten authentifizierten Zugriff. Das UPDATE
// setzt nur, wenn noch nichts gesetzt ist - zwei gleichzeitige Anfragen
// koennen die Phase also nicht zweimal starten oder verlaengern.
export async function startAppTrialIfNew(
  db: Env["DB"],
  userId: string,
  dauerMs: number,
): Promise<{ startedAt: number; endsAt: number } | null> {
  const jetzt = Date.now();
  const ergebnis = await db
    .prepare(
      `UPDATE users SET app_trial_started_at = ?, app_trial_ends_at = ?
       WHERE id = ? AND app_trial_started_at IS NULL`,
    )
    .bind(jetzt, jetzt + dauerMs, userId)
    .run();
  if (!ergebnis.meta.changes) return null;
  return { startedAt: jetzt, endsAt: jetzt + dauerMs };
}

// Kap. 4.7 (Migration 0014).
export async function setMarketingEmailsEnabled(db: Env["DB"], userId: string, enabled: boolean): Promise<void> {
  await db
    .prepare("UPDATE users SET marketing_emails_enabled = ? WHERE id = ?")
    .bind(enabled ? 1 : 0, userId)
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

// Gegenstueck zu deleteAllSessionsForUser fuer die Passwort-AENDERUNG durch
// den eingeloggten Nutzer selbst (Phase 2, POST /account/password): die
// Session-Invalidierung ist auch hier Pflicht (4.13), aber das Geraet, an dem
// die Aenderung gerade stattgefunden hat, darf nicht mitabgemeldet werden -
// im Unterschied zum Reset per Token (passwordAuth.ts, resetPassword), wo es
// keine vertrauenswuerdige "aktuelle" Session gibt.
export async function deleteOtherSessionsForUser(
  db: Env["DB"],
  userId: string,
  keepSessionId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?")
    .bind(userId, keepSessionId)
    .run();
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
       AND status IN ('active', 'trialing', 'past_due', 'cancel_scheduled')
       ORDER BY updated_at DESC LIMIT 1`,
    )
    .bind(userId)
    .first<SubscriptionRow>();
}

// Fuer die Rechnungsuebersicht (Phase 4): hier zaehlt NICHT der aktive
// Status, sondern nur, ob es ueberhaupt jemals eine paddle_customer_id gab -
// wer gekuendigt hat, muss seine alten Rechnungen weiterhin abrufen koennen.
export async function getLatestSubscriptionForUser(
  db: Env["DB"],
  userId: string,
): Promise<SubscriptionRow | null> {
  return db
    .prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
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

// Trial-Erinnerung (Phase 3): der Nutzer hat beim Trial-Start eine
// Zahlungsmethode hinterlegt und wird nach 3 Tagen automatisch belastet -
// ohne Vorwarnung waere das eine unangenehme Ueberraschung. Bewusst kuerzeres
// Fenster als beim Jahresabo (1 statt 7 Tage): bei einem 3-Tage-Trial wuerde
// ein laengerer Vorlauf die Mail zu nah am Trial-Start ausloesen, direkt nach
// dem Willkommens-Screen, der dasselbe bereits sagt.
export async function listTrialsEndingSoon(
  db: Env["DB"],
  withinMs: number,
): Promise<(SubscriptionRow & { email: string })[]> {
  const now = Date.now();
  const rows = await db
    .prepare(
      `SELECT subscriptions.*, users.email as email FROM subscriptions
       JOIN users ON users.id = subscriptions.user_id
       WHERE subscriptions.status = 'trialing'
         AND subscriptions.cancel_at_period_end = 0
         AND subscriptions.trial_reminder_sent_at IS NULL
         AND subscriptions.current_period_end BETWEEN ? AND ?`,
    )
    .bind(now, now + withinMs)
    .all<SubscriptionRow & { email: string }>();
  return rows.results;
}

export async function markTrialReminderSent(db: Env["DB"], subscriptionId: string): Promise<void> {
  await db
    .prepare("UPDATE subscriptions SET trial_reminder_sent_at = ? WHERE id = ?")
    .bind(Date.now(), subscriptionId)
    .run();
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

// Zaehler statt Boolean-Flag (Nutzer-Vorgabe 2026-08-18: 1x -> 3x Free-
// Kontingent). Der Aufrufer (assistant.ts) vergleicht den Rueckgabewert
// selbst gegen sein Limit, damit die Zahl an einer einzigen Stelle steht.
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

// ═══ Admin Panel — Nutzerverwaltung (Paket 7, Etappe 1, rein lesend) ═══

export interface AdminUserSummary {
  id: string;
  email: string;
  role: string;
  account_status: "ACTIVE" | "SUSPENDED" | "DELETED";
  created_at: number;
  last_login_at: number | null;
  is_test_user: number;
  // Aus dem LEFT JOIN auf subscriptions - NULL, wenn der Nutzer kein
  // laufendes Abo hat (Free). Der Auftrag verlangt "Abo" als Spalte und als
  // Filter in der Nutzerliste (Abschnitt 4).
  sub_status: string | null;
  sub_plan: string | null;
}

export interface AdminUsersFilter {
  search: string;
  role: string | null;
  accountStatus: string | null;
  // "pro" = laufendes Abo (active/trialing/cancel_scheduled/past_due),
  // "free" = keine solche Zeile. Bewusst diese zwei groben Werte statt jedes
  // einzelnen Paddle-Status: als Listenfilter ist "zahlt / zahlt nicht" die
  // Frage, die Feinheiten stehen im Bereich "Abos & Zahlungen".
  subscription: "pro" | "free" | null;
  sort: "created_desc" | "created_asc" | "last_login_desc" | "email_asc";
}

// Whitelist statt String-Interpolation des Sortier-Parameters: der Wert kommt
// aus der Query-String und darf niemals ungeprueft in SQL landen.
const ADMIN_USER_SORT_SQL: Record<AdminUsersFilter["sort"], string> = {
  created_desc: "users.created_at DESC",
  created_asc: "users.created_at ASC",
  // NULLS LAST von Hand: SQLite sortiert NULL sonst vor allen Werten, damit
  // stuenden "hat sich nie angemeldet" ganz oben statt ganz unten.
  last_login_desc: "users.last_login_at IS NULL, users.last_login_at DESC",
  email_asc: "users.email ASC",
};

// Nur diese Abo-Zustaende gelten als "laufend" - identisch zur Definition in
// getActiveSubscription (db.ts) und computeIsPro (entitlement.ts).
const LIVE_SUB_STATUSES = "'active','trialing','cancel_scheduled','past_due'";

// instr() statt LIKE (Live-Befund 19.08., IMP-12-Nachtrag): D1 wirft ab einer
// gewissen (undokumentierten) Musterlaenge "SQLITE_ERROR: LIKE or GLOB pattern
// too complex" - traf bei langen E-Mail-Suchbegriffen (z.B. eine komplette
// UUID-Adresse aus der Admin-Oberflaeche) zuverlaessig zu 500ern. instr()
// braucht kein Escaping fuer %/_ (kein Wildcard-Mechanismus, reine Teilstring-
// Suche) und hat kein Musterlaengen-Limit - deckt den bisherigen Zweck
// (Teilstring, gross-/kleinschreibungsunabhaengig) ohne die Einschraenkung ab.
// parseAdminUsersQuery (routes/admin.ts) escaped den Suchbegriff seit diesem
// Wechsel bewusst nicht mehr - das war nur fuer LIKE noetig.
export async function listUsersForAdmin(
  db: Env["DB"],
  filter: AdminUsersFilter,
  page: number,
  pageSize: number,
): Promise<{ users: AdminUserSummary[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const where: string[] = ["instr(lower(users.email), lower(?)) > 0"];
  const params: unknown[] = [filter.search];
  if (filter.role) {
    where.push("users.role = ?");
    params.push(filter.role);
  }
  if (filter.accountStatus) {
    where.push("users.account_status = ?");
    params.push(filter.accountStatus);
  }
  if (filter.subscription === "pro") where.push("sub.id IS NOT NULL");
  if (filter.subscription === "free") where.push("sub.id IS NULL");

  // Der JOIN muss auch fuer den COUNT gelten, sonst zaehlt die Gesamtzahl
  // beim Abo-Filter andere Zeilen als die Liste zeigt (falsche Pagination).
  const from = `FROM users LEFT JOIN subscriptions sub
      ON sub.user_id = users.id AND sub.status IN (${LIVE_SUB_STATUSES})`;
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows, countRow] = await Promise.all([
    db
      .prepare(
        `SELECT users.id, users.email, users.role, users.account_status, users.created_at,
                users.last_login_at, users.is_test_user,
                sub.status AS sub_status, sub.plan AS sub_plan
         ${from} ${whereSql}
         ORDER BY ${ADMIN_USER_SORT_SQL[filter.sort]} LIMIT ? OFFSET ?`,
      )
      .bind(...params, pageSize, offset)
      .all<AdminUserSummary>(),
    db
      .prepare(`SELECT COUNT(*) as n ${from} ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
  ]);
  return { users: rows.results, total: countRow?.n ?? 0 };
}

// ═══ Admin Panel — schreibende Nutzer-Aktionen (Admin-MVP Abschnitt 6/7) ═══

export async function setUserRole(db: Env["DB"], userId: string, role: string): Promise<void> {
  await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
}

export async function setUserFlags(
  db: Env["DB"],
  userId: string,
  flags: { isTestUser?: boolean; testEmailRedirectTo?: string | null },
): Promise<void> {
  if (flags.isTestUser !== undefined) {
    await db
      .prepare("UPDATE users SET is_test_user = ? WHERE id = ?")
      .bind(flags.isTestUser ? 1 : 0, userId)
      .run();
  }
  if (flags.testEmailRedirectTo !== undefined) {
    await db
      .prepare("UPDATE users SET test_email_redirect_to = ? WHERE id = ?")
      .bind(flags.testEmailRedirectTo, userId)
      .run();
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Praefix synthetischer paddle_*_id-Werte fuer vom Admin direkt angelegte
// Testnutzer (siehe createManualSubscriptionForAdmin) - auch in
// accountDeletion.ts genutzt, um bei der Loeschung zu erkennen, dass es
// keine echte Paddle-Subscription zu kuendigen gibt (Bugreport 2026-08-18:
// 502 beim Loeschen eines Testusers mit Fake-Abo, weil cancelImmediately()
// diese ID unbesehen an die echte Paddle-API schickte).
export const ADMIN_TEST_SUBSCRIPTION_PREFIX = "admin-test:";

// Synthetische Subscription-Zeile fuer einen vom Admin direkt angelegten
// Testnutzer (Nutzer-Entscheidung 2026-08-1X, "User direkt anlegen") - es
// gibt dafuer keinen echten Stripe-Checkout, deshalb eine klar erkennbare
// stripe_*_id ("admin-test:<uuid>") statt einer echten Stripe-ID. Nur ueber
// die Admin-Route erreichbar und dort an is_test_user=true gebunden, damit
// keine echten Kundenkonten auf diesem Weg ein Abo ohne Zahlung bekommen.
// Zeitstempel je Status plausibel gesetzt, damit computeIsPro() (entitlement.ts)
// dieselbe Logik anwendet wie bei einer echten, per Webhook gespiegelten
// Subscription - keine Sonderbehandlung fuer Testzeilen.
export async function createManualSubscriptionForAdmin(
  db: Env["DB"],
  userId: string,
  input: { status: SubscriptionRow["status"]; plan: SubscriptionRow["plan"] },
): Promise<void> {
  const now = Date.now();
  const periodMs = input.plan === "yearly" ? 365 * DAY_MS : 30 * DAY_MS;
  // 'canceled' heisst "Laufzeit bereits vorbei" - current_period_end liegt
  // deshalb in der Vergangenheit, nicht in der Zukunft wie bei allen anderen
  // Zustaenden.
  const currentPeriodEnd = input.status === "canceled" ? now - DAY_MS : now + periodMs;
  const syntheticId = `${ADMIN_TEST_SUBSCRIPTION_PREFIX}${newId()}`;
  await db
    .prepare(
      `INSERT INTO subscriptions
        (id, user_id, status, plan, stripe_customer_id, stripe_subscription_id, current_period_end,
         cancel_at_period_end, first_purchase_at, past_due_since, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      userId,
      input.status,
      input.plan,
      syntheticId,
      syntheticId,
      currentPeriodEnd,
      input.status === "cancel_scheduled" ? 1 : 0,
      now,
      input.status === "past_due" ? now : null,
      now,
    )
    .run();
}

// ═══ Admin Panel — Abos & Zahlungen (Admin-MVP Abschnitt 8, rein lesend) ═══
// Bewusst keine schreibenden Funktionen: Betrag, Zahlungsstatus, Refund und
// Abrechnungszyklus gehoeren zu Paddle (Auftrag Abschnitt 8, "keine eigene
// Billing-Logik"). D1 haelt nur die Spiegelung, die der Webhook pflegt.

export interface AdminSubscriptionRow extends SubscriptionRow {
  // Aus dem JOIN auf users - die Liste zeigt den Nutzer, nicht die user_id.
  email: string;
}

// Die Filter des Auftrags ("Aktiv / Trial / Gekuendigt / Zahlung
// fehlgeschlagen") sind teils EIN Status, teils zwei: "Gekuendigt" umfasst
// sowohl das bereits beendete Abo als auch das zum Periodenende gekuendigte,
// das operativ dieselbe Frage beantwortet ("wer geht weg?").
const ADMIN_SUB_FILTER_STATUSES: Record<string, readonly string[]> = {
  active: ["active"],
  trialing: ["trialing"],
  canceled: ["canceled", "cancel_scheduled"],
  past_due: ["past_due"],
};

export type AdminSubscriptionFilterKey = keyof typeof ADMIN_SUB_FILTER_STATUSES;

export function isAdminSubscriptionFilter(value: string): value is AdminSubscriptionFilterKey {
  return Object.prototype.hasOwnProperty.call(ADMIN_SUB_FILTER_STATUSES, value);
}

export async function listSubscriptionsForAdmin(
  db: Env["DB"],
  statusFilter: AdminSubscriptionFilterKey | null,
  page: number,
  pageSize: number,
): Promise<{ subscriptions: AdminSubscriptionRow[]; total: number }> {
  const offset = (page - 1) * pageSize;
  let whereSql = "";
  const params: unknown[] = [];
  if (statusFilter) {
    const statuses = ADMIN_SUB_FILTER_STATUSES[statusFilter];
    // Platzhalter statt String-Interpolation, obwohl die Werte aus einer
    // festen Tabelle kommen - der Filterschluessel selbst ist Nutzereingabe.
    whereSql = `WHERE s.status IN (${statuses.map(() => "?").join(",")})`;
    params.push(...statuses);
  }
  const from = "FROM subscriptions s JOIN users u ON u.id = s.user_id";
  const [rows, countRow] = await Promise.all([
    db
      .prepare(
        `SELECT s.*, u.email AS email ${from} ${whereSql}
         ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, pageSize, offset)
      .all<AdminSubscriptionRow>(),
    db
      .prepare(`SELECT COUNT(*) as n ${from} ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
  ]);
  return { subscriptions: rows.results, total: countRow?.n ?? 0 };
}

export async function getSubscriptionForAdmin(
  db: Env["DB"],
  id: string,
): Promise<AdminSubscriptionRow | null> {
  return db
    .prepare(
      `SELECT s.*, u.email AS email FROM subscriptions s
       JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
    .bind(id)
    .first<AdminSubscriptionRow>();
}

// ═══ Admin Panel — Support-Notizen (Migration 0019) ═══

export interface SupportNoteRow {
  id: string;
  user_id: string;
  admin_user_id: string;
  admin_email: string;
  note: string;
  created_at: number;
}

export async function addSupportNote(
  db: Env["DB"],
  entry: { userId: string; adminUserId: string; adminEmail: string; note: string },
): Promise<SupportNoteRow> {
  const row: SupportNoteRow = {
    id: newId(),
    user_id: entry.userId,
    admin_user_id: entry.adminUserId,
    admin_email: entry.adminEmail,
    note: entry.note,
    created_at: Date.now(),
  };
  await db
    .prepare(
      `INSERT INTO user_support_notes (id, user_id, admin_user_id, admin_email, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.user_id, row.admin_user_id, row.admin_email, row.note, row.created_at)
    .run();
  return row;
}

export async function listSupportNotes(db: Env["DB"], userId: string): Promise<SupportNoteRow[]> {
  const rows = await db
    .prepare("SELECT * FROM user_support_notes WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<SupportNoteRow>();
  return rows.results;
}

// ═══ Admin Panel — Dashboard (Paket 6, MVP-Pflicht #1) ═══
// Deckt exakt das "Beispiel" aus dem Konzept-Dok Abschnitt 3 ab (Nutzer
// gesamt, Aktive Abos, Trial Nutzer, MRR, Kuendigungen Monat) - nicht die
// volle Kennzahlenliste (neue Registrierungen heute/Woche, ARR, Conversion
// Rate, Churn Rate, CLV, Systemstatus). Diese brauchen zusaetzliche
// Zeitreihen-/Kohorten-Logik bzw. externe Statuschecks und sind bewusst
// spaeteren Etappen vorbehalten.
export interface AdminDashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  mrr: number;
  cancellationsThisMonth: number;
  // Admin-MVP Abschnitt 3 ("zusaetzlich, sofern die Daten bereits verfuegbar
  // sind"): neue Nutzer im laufenden Monat ist aus users.created_at direkt
  // ableitbar. "Umsatz aktueller Monat" ist es NICHT - tatsaechliche
  // Zahlungen liegen bei Paddle, in D1 stehen nur Abo-Zustaende. Eine
  // Hochrechnung aus Planpreisen waere eine erfundene Zahl und fehlt deshalb.
  newUsersThisMonth: number;
}

// Preise seit 2026-08-20 aus src/preise.ts - der frueher hier stehende
// Kommentar ("zwei Zahlen an zwei Stellen, keine eigene Datei wert") hat sich
// bei der ersten echten Preisaenderung als falsch erwiesen: es waren fuenf
// Stellen.

export async function getAdminDashboardStats(db: Env["DB"]): Promise<AdminDashboardStats> {
  const monthStart = (() => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  })();

  const [totalUsersRow, planRows, trialRow, cancelRow, newUsersRow] = await Promise.all([
    db.prepare("SELECT COUNT(*) as n FROM users").first<{ n: number }>(),
    db
      .prepare(
        `SELECT plan, COUNT(*) as n FROM subscriptions WHERE status IN ('active','cancel_scheduled') GROUP BY plan`,
      )
      .all<{ plan: string; n: number }>(),
    db.prepare(`SELECT COUNT(*) as n FROM subscriptions WHERE status = 'trialing'`).first<{ n: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) as n FROM subscriptions WHERE status IN ('cancel_scheduled','canceled') AND updated_at >= ?`,
      )
      .bind(monthStart)
      .first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) as n FROM users WHERE created_at >= ?")
      .bind(monthStart)
      .first<{ n: number }>(),
  ]);

  let activeSubscriptions = 0;
  let mrr = 0;
  for (const row of planRows.results) {
    activeSubscriptions += row.n;
    mrr +=
      row.plan === "monthly"
        ? row.n * PLAN_PREIS_EUR.monthly
        : row.n * (PLAN_PREIS_EUR.yearly / 12);
  }

  return {
    totalUsers: totalUsersRow?.n ?? 0,
    activeSubscriptions,
    trialUsers: trialRow?.n ?? 0,
    mrr: Math.round(mrr * 100) / 100,
    cancellationsThisMonth: cancelRow?.n ?? 0,
    newUsersThisMonth: newUsersRow?.n ?? 0,
  };
}

// ═══ Admin Panel — Letzte Aktivitaeten (Admin-MVP Abschnitt 3) ═══
// Read-Only-Feed aus dem, was D1 wirklich weiss. Bewusst KEINE eigene
// Ereignistabelle dafuer: die vier Quellen unten tragen ihren Zeitstempel
// bereits, eine zusaetzliche Tabelle waere eine zweite Wahrheit, die beim
// Schreiben vergessen werden kann.
//
// Nicht enthalten (Auftrag nennt es, D1 hat es nicht): "Gutschein
// eingeloest" - Einloesungen passieren bei Paddle, wir speichern dazu nichts.
// Auch reine Logins fehlen: login_attempts wird nach 24 Stunden vom Cron
// geleert (Brute-Force-Schutz, kein Verlauf), ein Feed daraus waere je nach
// Tageszeit mal voll und mal leer. users.last_login_at zeigt nur den
// jeweils letzten Login und wuerde denselben Nutzer nie zweimal zeigen -
// beides waere irrefuehrender als die Auslassung.
export interface AdminActivityEntry {
  kind: "user.registered" | "subscription.started" | "subscription.canceled" | "admin.action";
  at: number;
  // Wer/was betroffen ist - bei Admin-Aktionen der ausfuehrende Admin.
  subject: string;
  detail: string | null;
}

export async function listAdminActivity(db: Env["DB"], limit: number): Promise<AdminActivityEntry[]> {
  // Jede Quelle liefert hoechstens `limit` Zeilen; zusammengefuehrt und
  // sortiert bleiben davon die neuesten `limit` uebrig. Das ist korrekt,
  // weil keine Quelle mehr als `limit` neuere Eintraege haben kann, als sie
  // selbst geliefert hat.
  const [users, started, canceled, admin] = await Promise.all([
    db
      .prepare("SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT ?")
      .bind(limit)
      .all<{ email: string; created_at: number }>(),
    db
      .prepare(
        `SELECT u.email, s.plan, s.status, s.first_purchase_at FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.first_purchase_at DESC LIMIT ?`,
      )
      .bind(limit)
      .all<{ email: string; plan: string; status: string; first_purchase_at: number }>(),
    db
      .prepare(
        `SELECT u.email, s.status, s.updated_at FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         WHERE s.status IN ('canceled','cancel_scheduled')
         ORDER BY s.updated_at DESC LIMIT ?`,
      )
      .bind(limit)
      .all<{ email: string; status: string; updated_at: number }>(),
    db
      .prepare(
        "SELECT admin_email, action, details, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT ?",
      )
      .bind(limit)
      .all<{ admin_email: string; action: string; details: string | null; created_at: number }>(),
  ]);

  const entries: AdminActivityEntry[] = [
    ...users.results.map((r) => ({
      kind: "user.registered" as const,
      at: r.created_at,
      subject: r.email,
      detail: null,
    })),
    ...started.results.map((r) => ({
      kind: "subscription.started" as const,
      at: r.first_purchase_at,
      subject: r.email,
      detail: r.plan,
    })),
    ...canceled.results.map((r) => ({
      kind: "subscription.canceled" as const,
      at: r.updated_at,
      subject: r.email,
      detail: r.status,
    })),
    ...admin.results.map((r) => {
      let targetEmail: string | null = null;
      try {
        targetEmail = r.details ? (JSON.parse(r.details).targetEmail ?? null) : null;
      } catch {
        // Kaputtes/altes details-JSON darf den ganzen Feed nicht kippen.
        targetEmail = null;
      }
      return {
        kind: "admin.action" as const,
        at: r.created_at,
        subject: r.admin_email,
        detail: targetEmail ? `${r.action} · ${targetEmail}` : r.action,
      };
    }),
  ];

  return entries.sort((a, b) => b.at - a.at).slice(0, limit);
}

// ═══ Admin Panel — Audit Log (Paket 6, MVP-Pflicht #7) ═══
export interface AdminAuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: number;
}

export async function logAdminAction(
  db: Env["DB"],
  entry: {
    adminUserId: string;
    adminEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_audit_log (id, admin_user_id, admin_email, action, target_type, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      entry.adminUserId,
      entry.adminEmail,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.details ? JSON.stringify(entry.details) : null,
      Date.now(),
    )
    .run();
}

export interface AdminAuditLogFilter {
  adminEmail: string | null;
  action: string | null;
  // targetId statt E-Mail: die E-Mail des betroffenen Nutzers steht nur im
  // details-JSON und ist dort nicht indizierbar - die ID ist der stabile,
  // eindeutige Bezug (und genau das, was die UI beim Klick auf einen Nutzer
  // ohnehin zur Hand hat).
  targetId: string | null;
  from: number | null;
  to: number | null;
}

export async function listAdminAuditLog(
  db: Env["DB"],
  page: number,
  pageSize: number,
  filter?: AdminAuditLogFilter,
): Promise<{ entries: AdminAuditLogEntry[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter?.adminEmail) {
    where.push("admin_email = ?");
    params.push(filter.adminEmail);
  }
  if (filter?.action) {
    where.push("action = ?");
    params.push(filter.action);
  }
  if (filter?.targetId) {
    where.push("target_id = ?");
    params.push(filter.targetId);
  }
  if (filter?.from !== null && filter?.from !== undefined) {
    where.push("created_at >= ?");
    params.push(filter.from);
  }
  if (filter?.to !== null && filter?.to !== undefined) {
    where.push("created_at <= ?");
    params.push(filter.to);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows, countRow] = await Promise.all([
    db
      .prepare(`SELECT * FROM admin_audit_log ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, pageSize, offset)
      .all<AdminAuditLogEntry>(),
    db
      .prepare(`SELECT COUNT(*) as n FROM admin_audit_log ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
  ]);
  return { entries: rows.results, total: countRow?.n ?? 0 };
}

// Fuer den Audit-Filter "Admin": nur die Konten, die tatsaechlich schon eine
// Aktion protokolliert haben - eine Liste aller Admins waere laenger und
// enthielte Eintraege, zu denen es gar keine Log-Zeilen gibt.
export async function listAuditLogAdmins(db: Env["DB"]): Promise<string[]> {
  const rows = await db
    .prepare("SELECT DISTINCT admin_email FROM admin_audit_log ORDER BY admin_email ASC")
    .all<{ admin_email: string }>();
  return rows.results.map((r) => r.admin_email);
}

// ═══ QA: Testkonto-Reset (2026-08-18) ═══
// Ausschliesslich fuer is_test_user-Konten (Aufrufer in routes/billing.ts
// prueft das VOR jedem Aufruf) - loescht die Subscription-Zeile(n) und setzt
// trial_used_at zurueck, damit sich derselbe Testaccount beliebig oft von
// "kein Abo" aus neu durchspielen laesst (Checkout -> Trial -> Kuendigen ->
// Reset -> von vorne), ohne bei jedem Durchlauf einen neuen Nutzer anzulegen.
// Die Stripe-seitige Kuendigung passiert VOR diesem Aufruf beim aufrufenden
// Endpunkt (analog zu deleteUserCompletely) - reine D1-Aufraeumfunktion.
export async function resetTestUserSubscription(db: Env["DB"], userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").bind(userId),
    db.prepare("UPDATE users SET trial_used_at = NULL WHERE id = ?").bind(userId),
  ]);
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
    // Support-Notizen gehoeren zum geloeschten Konto (Migration 0019) und
    // verschwinden mit ihm. Der admin_audit_log bleibt bewusst stehen - er
    // dokumentiert, WER geloescht hat, und muss die Loeschung ueberleben.
    db.prepare("DELETE FROM user_support_notes WHERE user_id = ?").bind(userId),
    // push_tokens (Migration 0010) und trial_usage (Migration 0025)
    // haben FOREIGN KEY REFERENCES users(id), D1 erzwingt foreign_keys=ON -
    // ohne diese beiden Zeilen schlaegt DELETE FROM users darunter mit einem
    // FK-Constraint-Fehler fehl (Befund 2026-08-18: useforai@web.de liess sich
    // deswegen nicht loeschen, obwohl gar kein Abo/Paddle involviert war - der
    // Admin-Endpunkt zeigte faelschlich die Paddle-Fehlermeldung).
    db.prepare("DELETE FROM push_tokens WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM trial_usage WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}
