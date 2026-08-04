// Passkey/WebAuthn (Spec 4.2, 4.4, 4.5, Sprint 2 S2-2). Kein externer
// Provider - Registrierung und Verifikation laufen komplett im Worker ueber
// @simplewebauthn/server. Der Browser-Prompt (Face ID/Windows Hello/
// Fingerabdruck) wird clientseitig durch @simplewebauthn/browser ausgeloest,
// hier nur die Server-Ceremony.
//
// Zwei getrennte Flows, weil der Client vor dem ersten Versuch nicht wissen
// kann, ob fuer dieses Geraet/diese E-Mail bereits ein Passkey existiert:
//   - register/*: neuer Passkey, an eine E-Mail gebunden (legt bei Bedarf
//     einen neuen Nutzer an, analog zum OAuth-Erst-Login = Registrierung, 4.4)
//   - login/*: "usernameless"/discoverable Login ueber alle Credentials des
//     Geraets, ohne vorherige E-Mail-Eingabe
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import type { Env } from "../types";
import { getUserByEmail, createUser, newId } from "../db";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 Minuten

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function storeChallenge(
  env: Env,
  key: string,
  challenge: string,
  purpose: "register" | "login",
): Promise<void> {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO passkey_challenges (challenge_key, challenge, purpose, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(key, challenge, purpose, Date.now() + CHALLENGE_TTL_MS)
    .run();
}

async function consumeChallenge(
  env: Env,
  key: string,
  purpose: "register" | "login",
): Promise<string | null> {
  const row = await env.DB.prepare(
    "SELECT challenge, purpose, expires_at FROM passkey_challenges WHERE challenge_key = ?",
  )
    .bind(key)
    .first<{ challenge: string; purpose: string; expires_at: number }>();
  await env.DB.prepare("DELETE FROM passkey_challenges WHERE challenge_key = ?").bind(key).run();
  if (!row || row.purpose !== purpose || row.expires_at < Date.now()) return null;
  return row.challenge;
}

// ═══ Registrierung ═══

export async function startPasskeyRegistration(
  env: Env,
  email: string,
): Promise<PublicKeyCredentialCreationOptionsOut> {
  const normalized = email.trim().toLowerCase();
  const existingUser = await getUserByEmail(env.DB, normalized);
  const existingCreds = existingUser
    ? await env.DB.prepare("SELECT credential_id FROM passkey_credentials WHERE user_id = ?")
        .bind(existingUser.id)
        .all<{ credential_id: string }>()
    : { results: [] as { credential_id: string }[] };

  const options = await generateRegistrationOptions({
    rpName: env.WEBAUTHN_RP_NAME,
    rpID: env.WEBAUTHN_RP_ID,
    userName: normalized,
    // Discoverable Credential (residentKey required) - Voraussetzung fuer den
    // usernamelosen Login-Flow unten.
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    excludeCredentials: existingCreds.results.map((c) => ({ id: c.credential_id })),
  });

  await storeChallenge(env, normalized, options.challenge, "register");
  return options as PublicKeyCredentialCreationOptionsOut;
}

export type FinishPasskeyRegistrationResult =
  | { ok: true; userId: string }
  | { ok: false; error: "challenge_missing_or_expired" | "verification_failed" };

export async function finishPasskeyRegistration(
  env: Env,
  email: string,
  response: RegistrationResponseJSON,
  deviceLabel: string | null,
): Promise<FinishPasskeyRegistrationResult> {
  const normalized = email.trim().toLowerCase();
  const expectedChallenge = await consumeChallenge(env, normalized, "register");
  if (!expectedChallenge) return { ok: false, error: "challenge_missing_or_expired" };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
    });
  } catch (err) {
    console.error("passkey_registration_verify_failed", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "verification_failed" };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "verification_failed" };
  }

  const { credential } = verification.registrationInfo;
  let user = await getUserByEmail(env.DB, normalized);
  if (!user) user = await createUser(env.DB, normalized);

  await env.DB.prepare(
    `INSERT INTO passkey_credentials
       (id, user_id, credential_id, public_key, sign_count, device_label, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      user.id,
      credential.id,
      uint8ToBase64(credential.publicKey),
      credential.counter,
      deviceLabel,
      Date.now(),
      Date.now(),
    )
    .run();

  return { ok: true, userId: user.id };
}

// ═══ Login (usernameless/discoverable) ═══

export async function startPasskeyLogin(env: Env, flowId: string): Promise<PublicKeyCredentialRequestOptionsOut> {
  const options = await generateAuthenticationOptions({
    rpID: env.WEBAUTHN_RP_ID,
    userVerification: "preferred",
    // Bewusst leer: discoverable Credentials liefern die Auswahl direkt vom
    // Authenticator, der Server kennt den Nutzer vor der Antwort noch nicht.
    allowCredentials: [],
  });
  await storeChallenge(env, flowId, options.challenge, "login");
  return options as PublicKeyCredentialRequestOptionsOut;
}

export type FinishPasskeyLoginResult =
  | { ok: true; userId: string }
  | { ok: false; error: "challenge_missing_or_expired" | "credential_unknown" | "verification_failed" };

export async function finishPasskeyLogin(
  env: Env,
  flowId: string,
  response: AuthenticationResponseJSON,
): Promise<FinishPasskeyLoginResult> {
  const expectedChallenge = await consumeChallenge(env, flowId, "login");
  if (!expectedChallenge) return { ok: false, error: "challenge_missing_or_expired" };

  const credRow = await env.DB.prepare(
    "SELECT * FROM passkey_credentials WHERE credential_id = ?",
  )
    .bind(response.id)
    .first<{
      id: string;
      user_id: string;
      credential_id: string;
      public_key: string;
      sign_count: number;
    }>();
  if (!credRow) return { ok: false, error: "credential_unknown" };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      credential: {
        id: credRow.credential_id,
        publicKey: base64ToUint8(credRow.public_key),
        counter: credRow.sign_count,
      },
    });
  } catch (err) {
    console.error("passkey_login_verify_failed", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "verification_failed" };
  }
  if (!verification.verified) return { ok: false, error: "verification_failed" };

  await env.DB.prepare(
    "UPDATE passkey_credentials SET sign_count = ?, last_used_at = ? WHERE credential_id = ?",
  )
    .bind(verification.authenticationInfo.newCounter, Date.now(), response.id)
    .run();

  return { ok: true, userId: credRow.user_id };
}

// Nur fuer TypeScript-Bequemlichkeit re-exportiert (die konkreten Typen aus
// @simplewebauthn/types sind hier nicht direkt importiert, um die
// Abhaengigkeitsflaeche klein zu halten - `options` wird 1:1 an den Client
// durchgereicht, der Worker liest daraus nichts weiter).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicKeyCredentialCreationOptionsOut = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicKeyCredentialRequestOptionsOut = any;
