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
// Weil ein mehrzeiliger Wert in .dev.vars/CI-Variablen unhandlich ist, wird er
// oft Base64-kodiert abgelegt (2026-09-09, erster Fund) - und beim manuellen
// Einfuegen ueber das Cloudflare-Dashboard vom Handy aus (zweiter Fund,
// gleicher Tag) falten mobile Textfelder die Zeilenumbrueche der PEM-Datei
// beim Kopieren gern zu Leerzeichen zusammen oder lassen sie ganz weg -
// importPKCS8() verlangt aber echte Zeilenumbrueche zwischen den
// BEGIN/END-Markern und dem Base64-Block ("pkcs8 must be PKCS#8 formatted
// string"). Beide Faelle fuehrten zum selben Symptom: Login sah erfolgreich
// aus, es entstand aber nie eine Session.
//
// Deshalb wird hier nicht nur zwischen PEM und Base64 unterschieden, sondern
// aus jeder erkennbaren Form (PEM mit intakten Umbruechen, PEM mit verlorenen/
// verschobenen Umbruechen, oder die ganze PEM-Datei Base64-kodiert als eine
// Zeile) ein sauberes, kanonisches PEM mit 64-Zeichen-Zeilen zurueckgebaut -
// unabhaengig davon, wie das Einfuegen die Formatierung zerstoert hat.
function zuKanonischemPem(wert: string): string | null {
  const nutzlast = wert
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  if (!nutzlast) return null;
  const zeilen = nutzlast.match(/.{1,64}/g) ?? [nutzlast];
  return `-----BEGIN PRIVATE KEY-----\n${zeilen.join("\n")}\n-----END PRIVATE KEY-----`;
}

export function normalisierePrivateKey(roh: string): string {
  const wert = roh.trim();
  if (wert.includes("BEGIN")) return zuKanonischemPem(wert) ?? wert;
  // Kein Marker vorhanden: entweder die ganze PEM-Datei wurde als ein
  // Base64-String abgelegt (Marker stecken dann erst NACH dem Dekodieren
  // im Klartext), oder es ist gar kein Schluessel - dann soll importPKCS8()
  // seinen eigenen, aussagekraeftigen Fehler werfen duerfen.
  try {
    const dekodiert = atob(wert.replace(/\s+/g, ""));
    if (!dekodiert.includes("BEGIN")) return wert;
    return zuKanonischemPem(dekodiert) ?? wert;
  } catch {
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
    // Apples Grund NICHT verschlucken (Bugreport 2026-09-09): der Status
    // allein ("400") sagt nichts - Apple liefert im Body {"error":"..."} und
    // unterscheidet damit die eigentlichen Faelle: invalid_client (JWT bzw.
    // Team-/Key-ID/Services-ID passen nicht zusammen), invalid_grant (Code
    // verbraucht/abgelaufen oder redirect_uri weicht ab), invalid_request.
    // Ohne dieses Feld ist die Fehlersuche reines Raten - dieselbe Lehre wie
    // bei analyse_model_call_failed (routes/assistant.ts). Der Body enthaelt
    // keine Geheimnisse, nur den Fehlercode.
    const detail = await res.text().catch(() => "");
    // Bei invalid_client sagt Apple NICHT, welcher Bestandteil nicht passt.
    // Deshalb hier die nicht-geheimen Kopfdaten des selbst signierten JWT
    // mitgeben: kid (muss die Key-ID sein), iss (Team-ID), sub (Services-ID),
    // aud und Laufzeit. Damit ist ohne Raten erkennbar, ob einer der drei
    // Bezeichner falsch im Secret liegt. Signatur und Schluessel bleiben
    // aussen vor - beides taucht hier bewusst NICHT auf.
    let jwtInfo = "";
    try {
      const [kopf, nutz] = clientSecret.split(".");
      const b64 = (s: string) => JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/")));
      const h = b64(kopf);
      const p = b64(nutz);
      jwtInfo = ` | jwt: alg=${h.alg} kid=${h.kid} iss=${p.iss} sub=${p.sub} aud=${p.aud} gueltig=${p.exp - p.iat}s`;
    } catch {
      jwtInfo = " | jwt: nicht lesbar";
    }
    throw new Error(
      `apple_token_exchange_failed_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}${jwtInfo}`,
    );
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
