// Google Identity Services / OAuth 2.0 + OIDC (Spec 4.4, 4.5).
// Erst-Login = Registrierung (kein separater Screen) - db.findOrCreateUserForOAuth
// uebernimmt das Anlegen.
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return jwks;
}

export function buildGoogleAuthUrl(env: Env, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    // "consent" waere hier zu aufdringlich fuer einen Login, der bei jedem
    // Aufruf neu erscheint - "select_account" reicht fuer den Anwendungsfall.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleIdentity {
  providerUserId: string; // "sub"
  email: string;
}

export async function exchangeGoogleCode(
  env: Env,
  code: string,
  redirectUri: string,
): Promise<GoogleIdentity> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("google_oauth_not_configured");
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    throw new Error(`google_token_exchange_failed_${res.status}`);
  }
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) throw new Error("google_id_token_missing");

  const { payload } = await jwtVerify(body.id_token, getJwks(), {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
  });

  const sub = payload.sub;
  const email = payload.email;
  const emailVerified = payload.email_verified;
  if (typeof sub !== "string" || typeof email !== "string" || emailVerified !== true) {
    // Unverifizierte E-Mail wird bewusst abgelehnt statt sie als Kontoschluessel
    // zu benutzen (Account-Uebernahme-Risiko) - siehe Konten-Verknuepfung 4.4.
    throw new Error("google_email_not_verified");
  }
  return { providerUserId: sub, email };
}
