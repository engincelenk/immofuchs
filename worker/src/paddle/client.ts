// Duenner Paddle-Billing-API-Client (Spec 4.1, 4.6). Server-zu-Server, der
// API-Key verlaesst den Worker nie in Richtung Client (4.6, Punkt 1).
//
// HINWEIS (Platzhalter-Setup, siehe kommerzialisierung-setup.md): Ohne echten
// PADDLE_API_KEY/Sandbox-Konto (V-1, noch nicht angelegt) lassen sich diese
// Aufrufe nicht gegen die echte Paddle-API verifizieren. Endpunkt-Formen
// folgen der oeffentlichen Paddle-Billing-API-Referenz (Stand Wissensstand
// dieses Bausteins) - vor Sprint-3-Go-Live gegen die aktuelle Paddle-Doku
// gegenpruefen (IMP-01).
import type { Env } from "../types";

function baseUrl(env: Env): string {
  return env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export async function paddleFetch(
  env: Env,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (!env.PADDLE_API_KEY) throw new Error("paddle_not_configured");
  const res = await fetch(`${baseUrl(env)}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PADDLE_API_KEY}`,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}
