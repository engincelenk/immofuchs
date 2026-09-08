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

// Der Schluessel aus dem Apple Developer Portal (.p8-Datei) ist rohes PKCS#8-PEM.
// Weil ein mehrzeiliger Wert in .dev.vars und in CI-Variablen unhandlich ist,
// wird er in der Praxis haeufig Base64-kodiert abgelegt - genau das war am
// 2026-09-09 die Ursache eines fehlschlagenden Apple-Logins: importPKCS8()
// akzeptiert ausschliesslich PEM ("pkcs8 must be PKCS#8 formatted string"),
// der Callback flog damit in seinen catch-Block und leitete mit
// login_error=oauth_failed zurueck - fuer den Nutzer sah der Login aus, als
// haette er geklappt, es entstand nur nie eine Session.
//
// Statt eine der beiden Formen zur einzig richtigen zu erklaeren (und die
// andere still scheitern zu lassen), werden hier beide akzeptiert: erkannt
// wird am BEGIN-Marker, alles andere wird als Base64 behandelt und dekodiert.
export function normalisierePrivateKey(roh: string): string {
  const wert = roh.trim();
  if (wert.includes("BEGIN")) return wert;
  try {
    return atob(wert.replace(/\s+/g, ""));
  } catch {
    // Weder PEM noch gueltiges Base64 - unveraendert weiterreichen, damit
    // importPKCS8() den aussagekraeftigen Originalfehler wirft.
    return wert;
  }
}

// Apple verlangt statt eines statischen Client-Secrets einen selbst signierten
// JWT (ES256), max. 6 Monate gueltig - hier bewusst kurzlebig (10 Minuten,
// pro Token-Exchange frisch erzeugt), das ist der von Apple empfohlene Weg
// und vermeidet ein langlebiges Geheimnis, das rotiert werden muesste.
async function generateAppleClientSecret(env: Env): Promise<string> {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_CLIENT_ID) {
    throw new Error("apple_oauth_not_configured");
  }
  const privateKey = await importPKCS8(normalisierePrivateKey(env.APPLE_PRIVATE_KEY), "ES256");
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
