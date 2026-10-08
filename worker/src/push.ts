// Nativer Push (Phase D, S7-1) — zweiter Versandweg neben E-Mail, dockt an
// die bestehende Notification-Intent-Logik an (notifications.ts), OHNE deren
// Trigger-Logik neu zu schreiben (10.0: "generische Notification-Intent-
// Erzeugung, damit Phase D den Push-Kanal andocken kann").
//
// HINWEIS (Platzhalter-Setup): Ohne echtes Firebase-Projekt/APNs-Key bleibt
// jeder Aufruf hier ein sauberes No-Op (kein Crash, kein Fehler nach aussen) -
// siehe docs/kommerzialisierung-setup.md fuer die Einrichtung. Beide
// Implementierungen (FCM HTTP v1, APNs HTTP/2) sind vollstaendig, aber bisher
// nicht gegen echte Geraete/Projekte verifizierbar (kein Mac, keine
// Firebase-/Apple-Push-Zugangsdaten in dieser Umgebung).
import { SignJWT, importPKCS8 } from "jose";
import type { Env } from "./types";
import { listPushTokensForUser, removePushToken, type PushTokenRow } from "./db";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ═══ FCM (Android) — HTTP v1 API, OAuth2 via Service Account ═══

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(env: Env): Promise<string> {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("firebase_not_configured");
  if (cachedFcmAccessToken && cachedFcmAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedFcmAccessToken.token;
  }
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const privateKey = await importPKCS8(account.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`fcm_oauth_failed_${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedFcmAccessToken = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

async function sendFcmPush(env: Env, token: string, payload: PushPayload): Promise<{ invalidToken: boolean }> {
  const accessToken = await getFcmAccessToken(env);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data || {},
        },
      }),
    },
  );
  if (res.status === 404 || res.status === 400) {
    // Token ungueltig/abgelaufen - aus push_tokens entfernen (Aufrufer entscheidet).
    return { invalidToken: true };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("fcm_send_failed", res.status, detail.slice(0, 200));
  }
  return { invalidToken: false };
}

// ═══ APNs (iOS) — HTTP/2 API, JWT-Auth-Token (ES256) ═══

let cachedApnsJwt: { token: string; issuedAt: number } | null = null;

async function getApnsJwt(env: Env): Promise<string> {
  if (!env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_PRIVATE_KEY) {
    throw new Error("apns_not_configured");
  }
  // Apple erlaubt dasselbe Auth-Token bis zu 1 Stunde wiederzuverwenden -
  // Neuerzeugung bei jedem Push waere unnoetiger Overhead.
  if (cachedApnsJwt && Date.now() - cachedApnsJwt.issuedAt < 55 * 60 * 1000) {
    return cachedApnsJwt.token;
  }
  const privateKey = await importPKCS8(env.APNS_PRIVATE_KEY, "ES256");
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APNS_KEY_ID })
    .setIssuer(env.APNS_TEAM_ID)
    .setIssuedAt(now)
    .sign(privateKey);
  cachedApnsJwt = { token, issuedAt: Date.now() };
  return token;
}

async function sendApnsPush(env: Env, token: string, payload: PushPayload): Promise<{ invalidToken: boolean }> {
  const jwt = await getApnsJwt(env);
  const host = env.APNS_ENV === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": env.APNS_BUNDLE_ID || "",
      "apns-push-type": "alert",
    },
    body: JSON.stringify({
      aps: { alert: { title: payload.title, body: payload.body } },
      ...(payload.data || {}),
    }),
  });
  if (res.status === 410 || res.status === 400) {
    return { invalidToken: true };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("apns_send_failed", res.status, detail.slice(0, 200));
  }
  return { invalidToken: false };
}

// ═══ Oeffentliche Schnittstelle ═══
// Best-effort, fire-and-forget-tauglich: wirft nie, raeumt ungueltige Tokens
// selbst auf. Ohne konfigurierte Credentials (Platzhalter-Setup) einfach
// still ein No-Op pro Plattform.
export async function sendPushToUser(env: Env, userId: string, payload: PushPayload): Promise<void> {
  const tokens = await listPushTokensForUser(env.DB, userId);
  await Promise.all(tokens.map((t) => sendPushToToken(env, t, payload)));
}

async function sendPushToToken(env: Env, row: PushTokenRow, payload: PushPayload): Promise<void> {
  try {
    const result =
      row.platform === "android"
        ? await sendFcmPush(env, row.token, payload)
        : await sendApnsPush(env, row.token, payload);
    if (result.invalidToken) {
      await removePushToken(env.DB, row.token);
    }
  } catch (err) {
    // Push ist ein Zusatzkanal (E-Mail bleibt der garantierte Weg) - ein
    // Fehler hier darf den Rest der Benachrichtigung nicht verhindern.
    console.error("push_send_failed", row.platform, err instanceof Error ? err.message : "unknown");
  }
}
