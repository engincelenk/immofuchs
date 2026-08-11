// E-Mail + Passwort als fuenfter Login-/Registrierungsweg (Spec v8, 4.4, 4.5,
// 4.13; Wireframes 14.1, Karten 10-17). Erster Weg im Projekt mit eigenem
// Registrierungs-Screen - die anderen vier legen das Konto implizit beim
// Erst-Login an, dieser nicht (Double-Opt-In macht das noetig).
import type { Env } from "../types";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  createUserWithPassword,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  countRecentFailedAttempts,
  deleteAllSessionsForUser,
  getUserByEmail,
  getUserById,
  listLinkedProviders,
  markEmailVerified,
  recordLoginAttempt,
  setUserPasswordHash,
  touchUserLogin,
  type UserRow,
} from "../db";
import { sendEmail } from "../email";
import { hashPassword, hashToken, isPasswordLeaked, isValidEmail, isValidPasswordLength, verifyPassword } from "./password";

const HOUR_MS = 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const WARN_AFTER_ATTEMPTS = 3;
const LOCK_AFTER_ATTEMPTS = 5;
const REGISTER_HOURLY_LIMIT = 5;
const RESEND_HOURLY_LIMIT = 5;
const RESET_HOURLY_LIMIT = 5;

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

// Client-IP im Cloudflare-Worker-Kontext (CF-Connecting-IP) - "unknown" im
// lokalen Dev-Setup ohne Cloudflare-Edge davor, kein Blocker.
function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") || "unknown";
}

async function rateLimited(env: Env, key: string, limit: number): Promise<boolean> {
  const limiter = env.RATE_LIMITER_DO.getByName(key);
  const rl = await limiter.checkAndIncrementWindow(limit, HOUR_MS);
  return !rl.allowed;
}

// KORREKTUR 05.08.: zeigte vorher auf APP_BASE_URL - das ist die FRONTEND-
// Origin (dev.immofuchs.info), der Endpunkt /api/v1/auth/verify-email liegt
// aber im Worker (api-dev.immofuchs.info). Ergebnis war ein "Not Found" beim
// Klick auf den Bestaetigungslink. Der Worker-Origin kommt jetzt vom
// eingehenden Request, genau wie es routes/account.ts fuer den
// E-Mail-Wechsel bereits richtig macht.
// Gegenstueck: der Reset-Link (requestPasswordReset) zeigt bewusst weiter aufs
// Frontend - dort braucht es eine Eingabemaske, keinen Worker-Endpunkt.
function verifyLink(workerOrigin: string, token: string): string {
  return `${workerOrigin}/api/v1/auth/verify-email?token=${token}`;
}

// ═══ Registrierung ═══

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "invalid_password" | "invalid_name" | "rate_limited" }
  | { ok: false; error: "email_taken"; providers: string[] };

// Obergrenze rein zum Schutz vor Missbrauch (z. B. ganze Saetze als "Name") -
// keine inhaltliche Validierung des Namens selbst (Projektregel: keine
// Annahmen ueber gueltige Namensformate treffen).
const MAX_NAME_LENGTH = 100;

export async function registerWithPassword(
  env: Env,
  workerOrigin: string,
  emailRaw: string,
  password: string,
  acceptedTerms: boolean,
  nameRaw: string,
): Promise<RegisterResult> {
  const email = normalizeEmail(emailRaw);
  const name = nameRaw.trim();
  if (!isValidEmail(email) || !acceptedTerms) return { ok: false, error: "invalid_email" };
  if (!isValidPasswordLength(password)) return { ok: false, error: "invalid_password" };
  if (!name || name.length > MAX_NAME_LENGTH) return { ok: false, error: "invalid_name" };

  if (await rateLimited(env, `register:${email}`, REGISTER_HOURLY_LIMIT)) {
    return { ok: false, error: "rate_limited" };
  }

  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    // Haeufigster Registrierungs-Abbruch (4.4): der bestehende Weg wird
    // konkret benannt statt nur "E-Mail vergeben" zu melden. Enumeration hier
    // bewusst in Kauf genommen (4.4) - Reset-Flow bleibt dagegen neutral.
    const providers = await listLinkedProviders(env.DB, existing.id);
    if (existing.password_hash) providers.push("password");
    return { ok: false, error: "email_taken", providers };
  }

  // HIBP-Check ist best-effort (4.4) - ein Ausfall des Drittdiensts blockiert
  // die Registrierung nicht, s. isPasswordLeaked.
  const leaked = await isPasswordLeaked(password);
  const passwordHash = await hashPassword(password);
  const user = await createUserWithPassword(env.DB, email, passwordHash, name);

  const rawToken = crypto.randomUUID();
  await createEmailVerificationToken(env.DB, user.id, await hashToken(rawToken), null);
  // Versandfehler darf das bereits angelegte Konto nicht "verwaisen" lassen
  // (Befund 05.08.): vorher schlug ein Fehler hier bis zum Router durch, der
  // Nutzer bekam einen 500er - das Konto existierte aber schon, sodass ein
  // zweiter Versuch nur noch "email_taken" ergab, ohne Weg zur Bestaetigung.
  // Jetzt: Fehler protokollieren, {ok:true} zurueckgeben - der Nutzer landet
  // auf dem Bestaetigungs-Screen und kann "Erneut senden" nutzen.
  try {
    await sendEmail(
      env,
      email,
      "Bestätige deine E-Mail-Adresse bei ImmoFuchs",
      `<p>Willkommen bei ImmoFuchs! Bestätige deine E-Mail-Adresse mit einem Klick (24 Stunden gültig):</p>
       <p><a href="${verifyLink(workerOrigin, rawToken)}">${verifyLink(workerOrigin, rawToken)}</a></p>
       ${leaked ? "<p>Hinweis: Das gewählte Passwort taucht in bekannten Datenlecks auf. Wir empfehlen dir, es nach der Bestätigung zu ändern.</p>" : ""}
       <p>Falls du dich nicht bei ImmoFuchs registriert hast, kannst du diese E-Mail ignorieren.</p>`,
    );
  } catch (err) {
    console.error("verification_email_failed", err instanceof Error ? err.message : "unknown");
  }
  return { ok: true };
}

// ═══ E-Mail-Bestätigung (Double-Opt-In) ═══
// Kein "Passwort nachtraeglich verknuepfen" mehr (Spec-v3.0 Kap. 0.1: Login-
// Methoden sind strikt getrennt und nicht nachtraeglich verknuepfbar) - ein
// Registrierungsversuch mit bereits ueber Google/Apple/Passkey belegter
// E-Mail ist ein reiner Fehlerfall (siehe registerWithPassword/E1/L3), kein
// Angebot, das bestehende Konto per Passwort zu ergaenzen.

export type VerifyEmailResult = { ok: true; userId: string } | { ok: false };

export async function verifyEmailToken(env: Env, token: string): Promise<VerifyEmailResult> {
  const result = await consumeEmailVerificationToken(env.DB, await hashToken(token));
  if (!result) return { ok: false };
  await markEmailVerified(env.DB, result.userId);
  await touchUserLogin(env.DB, result.userId);
  return { ok: true, userId: result.userId };
}

export type ResendResult = { ok: true } | { ok: false; error: "rate_limited" };

export async function resendVerification(
  env: Env,
  workerOrigin: string,
  emailRaw: string,
): Promise<ResendResult> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return { ok: true }; // keine Enumeration ueber Syntaxfehler hinaus noetig
  if (await rateLimited(env, `verify-resend:${email}`, RESEND_HOURLY_LIMIT)) {
    return { ok: false, error: "rate_limited" };
  }
  const user = await getUserByEmail(env.DB, email);
  if (user && !user.email_verified_at && user.password_hash) {
    const rawToken = crypto.randomUUID();
    await createEmailVerificationToken(env.DB, user.id, await hashToken(rawToken), null);
    await sendEmail(
      env,
      email,
      "Dein neuer Bestätigungslink für ImmoFuchs",
      `<p>Hier ist dein neuer Bestätigungslink (24 Stunden gültig):</p>
       <p><a href="${verifyLink(workerOrigin, rawToken)}">${verifyLink(workerOrigin, rawToken)}</a></p>`,
    );
  }
  return { ok: true };
}

// ═══ Login ═══

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; error: "invalid_credentials"; warn: boolean }
  | { ok: false; error: "email_not_verified" }
  | { ok: false; error: "locked"; retryAfterSeconds: number }
  | { ok: false; error: "oauth_only"; providers: string[] };

// Gestaffelter Brute-Force-Schutz (4.13): gezaehlt pro Konto UND pro IP -
// nur pro Konto laedt zu Password-Spraying ueber viele Adressen ein, nur pro
// IP sperrt ganze Firmen-/Mobilfunk-NATs aus. Beide Zaehler muessen unter dem
// Limit bleiben, sonst gilt der Login als gesperrt.
export async function loginWithPassword(env: Env, req: Request, emailRaw: string, password: string): Promise<LoginResult> {
  const email = normalizeEmail(emailRaw);
  const ipHash = await hashToken(clientIp(req));

  const [failedByEmail, failedByIp] = await Promise.all([
    countRecentFailedAttempts(env.DB, "email", email, LOCKOUT_WINDOW_MS),
    countRecentFailedAttempts(env.DB, "ip_hash", ipHash, LOCKOUT_WINDOW_MS),
  ]);
  if (failedByEmail >= LOCK_AFTER_ATTEMPTS || failedByIp >= LOCK_AFTER_ATTEMPTS) {
    return { ok: false, error: "locked", retryAfterSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000) };
  }

  const user = await getUserByEmail(env.DB, email);

  if (user && !user.password_hash) {
    // Konto existiert, wurde aber ueber Google/Apple/Passkey angelegt und hat
    // nie ein Passwort bekommen - eigenstaendiger Fehlerfall (L3, Kap. 0.1),
    // keine automatische Verknuepfung. Zaehlt bewusst nicht als Fehlversuch:
    // die eingegebenen Zugangsdaten sind nicht falsch, nur die falsche Methode.
    const providers = await listLinkedProviders(env.DB, user.id);
    return { ok: false, error: "oauth_only", providers };
  }

  const valid = user?.password_hash ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !valid) {
    await recordLoginAttempt(env.DB, email, ipHash, false);
    // Fehlermeldung nie "Passwort falsch" (4.13) - der Aufrufer zeigt immer
    // "E-Mail oder Passwort stimmt nicht", egal welcher der beiden Faelle es war.
    return { ok: false, error: "invalid_credentials", warn: failedByEmail + 1 >= WARN_AFTER_ATTEMPTS };
  }

  if (!user.email_verified_at) {
    // Zaehlt bewusst nicht als Fehlversuch - richtige Zugangsdaten, nur noch
    // nicht bestaetigt.
    return { ok: false, error: "email_not_verified" };
  }

  await recordLoginAttempt(env.DB, email, ipHash, true);
  await touchUserLogin(env.DB, user.id);
  return { ok: true, userId: user.id };
}

// ═══ Passwort vergessen / zurücksetzen ═══

export async function requestPasswordReset(env: Env, emailRaw: string): Promise<{ ok: true }> {
  const email = normalizeEmail(emailRaw);
  // Immer {ok:true} nach aussen (4.13, neutrale Antwort - Gegensatz zur
  // Registrierung, wo der bestehende Weg bewusst benannt wird, 4.4).
  if (!isValidEmail(email)) return { ok: true };
  if (await rateLimited(env, `reset-request:${email}`, RESET_HOURLY_LIMIT)) return { ok: true };

  const user = await getUserByEmail(env.DB, email);
  // Nur Konten mit bestehendem Passwort bekommen einen Reset-Link - ein
  // reines OAuth-/Passkey-Konto soll nicht ueber diesen Weg ein Passwort
  // bekommen (dafuer existiert die separate "Stattdessen Passwort
  // setzen"-Bestaetigung, s.o.), sonst waere das ein zweiter,
  // unbeaufsichtigter Weg, ein Passwort auf ein fremdes Konto zu legen.
  if (user?.password_hash) {
    const rawToken = crypto.randomUUID();
    await createPasswordResetToken(env.DB, user.id, await hashToken(rawToken));
    const base = env.APP_BASE_URL || "https://immofuchs.info";
    const link = `${base}/?reset_token=${rawToken}`;
    await sendEmail(
      env,
      email,
      "Passwort zurücksetzen bei ImmoFuchs",
      `<p>Setze dein Passwort mit einem Klick zurück (60 Minuten gültig):</p>
       <p><a href="${link}">${link}</a></p>
       <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren - dein Passwort bleibt unverändert.</p>`,
    );
  } else if (user) {
    // P4 (Spec-v3.0 Kap. 2.5): Konto existiert, hat aber nie ein Passwort
    // bekommen (Google/Apple/Passkey) - statt eines Reset-Links (den es dafuer
    // nicht geben kann, Kap. 0.1) bekommt der Nutzer den Hinweis auf seine
    // urspruengliche Anmeldemethode. Nach aussen bleibt die Antwort trotzdem
    // immer {ok:true} (keine Enumeration).
    const providers = await listLinkedProviders(env.DB, user.id);
    const label = providers.map(providerDisplayName).join(" bzw. ") || "einer anderen Methode";
    await sendEmail(
      env,
      email,
      "Passwort zurücksetzen bei ImmoFuchs",
      `<p>Für dein ImmoFuchs-Konto wurde ein Passwort-Reset angefragt. Dieses Konto wurde mit ${label} erstellt und hat kein Passwort.</p>
       <p>Bitte melde dich über diese Anmeldemethode an.</p>
       <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
    );
  }
  return { ok: true };
}

function providerDisplayName(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "apple") return "Apple";
  if (provider === "passkey") return "Passkey";
  return provider;
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: "invalid_or_expired" | "invalid_password" };

export async function resetPassword(env: Env, token: string, newPassword: string): Promise<ResetPasswordResult> {
  if (!isValidPasswordLength(newPassword)) return { ok: false, error: "invalid_password" };
  const userId = await consumePasswordResetToken(env.DB, await hashToken(token));
  if (!userId) return { ok: false, error: "invalid_or_expired" };

  const passwordHash = await hashPassword(newPassword);
  await setUserPasswordHash(env.DB, userId, passwordHash);
  // Session-Invalidierung ist Pflicht, nicht optional (4.13) - sonst behielte
  // ein Angreifer nach dem Zuruecksetzen seine Session.
  await deleteAllSessionsForUser(env.DB, userId);

  const user = await getUserById(env.DB, userId);
  if (user) {
    await sendEmail(
      env,
      user.email,
      "Dein ImmoFuchs-Passwort wurde geändert",
      `<p>Dein Passwort wurde soeben geändert. Alle anderen Geräte wurden zur Sicherheit abgemeldet.</p>
       <p>Warst du das nicht? Bitte kontaktiere umgehend unseren Support.</p>`,
    ).catch((err) => console.error("password_changed_notice_failed", err instanceof Error ? err.message : "unknown"));
  }
  return { ok: true };
}

export type { UserRow };
