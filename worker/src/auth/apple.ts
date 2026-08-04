// "Sign in with Apple" (Spec 4.4, 4.5). Apple verlangt response_mode=form_post
// sobald zusaetzliche Scopes (email) angefragt werden - der Callback-Handler in
// index.ts muss den Request deshalb als POST/form-urlencoded lesen, nicht als
// GET-Query wie bei Google.
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import type { Env } from "../types";

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  return jwks;
}

export function buildAppleAuthUrl(env: Env, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "form_post",
    scope: "email",
    state,
  });
  return `${APPLE_AUTH_URL}?${params.toString()}`;
}

// Apple verlangt statt eines statischen Client-Secrets einen selbst signierten
// JWT (ES256), max. 6 Monate gueltig - hier bewusst kurzlebig (10 Minuten,
// pro Token-Exchange frisch erzeugt), das ist der von Apple empfohlene Weg
// und vermeidet ein langlebiges Geheimnis, das rotiert werden muesste.
async function generateAppleClientSecret(env: Env): Promise<string> {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_CLIENT_ID) {
    throw new Error("apple_oauth_not_configured");
  }
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .setAudience("https://appleid.apple.com")
    .setSubject(env.APPLE_CLIENT_ID)
    .sign(privateKey);
}

export interface AppleIdentity {
  providerUserId: string; // "sub"
  email: string;
}

export async function exchangeAppleCode(
  env: Env,
  code: string,
  redirectUri: string,
): Promise<AppleIdentity> {
  const clientSecret = await generateAppleClientSecret(env);
  const res = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID || "",
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`apple_token_exchange_failed_${res.status}`);
  }
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("apple_id_token_missing");

  const { payload } = await jwtVerify(body.id_token, getJwks(), {
    issuer: "https://appleid.apple.com",
    audience: env.APPLE_CLIENT_ID,
  });

  const sub = payload.sub;
  const email = payload.email;
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("apple_email_missing");
  }
  // Bekannte Einschraenkung (4.4): Apples "E-Mail verbergen"-Relay liefert eine
  // andere Adresse als die echte - dann entstehen zwei getrennte Konten, falls
  // derselbe Nutzer zuvor mit der echten Adresse per Google registriert war.
  // Fuer den Start akzeptiert, kein manuelles Merge in v1.
  return { providerUserId: sub, email };
}
