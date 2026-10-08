// KI-Assistent-Consent vor der ersten Finn-Nutzung (Spec 3.2, 4.2, S5-7).
// Guideline 5.1.2(i): Weitergabe an Drittanbieter-KI (Gemini/Workers AI) muss
// offengelegt und explizit erlaubt werden. Session-basiert statt an `users`
// gebunden, weil Finn auch anonym genutzt wird (siehe Migration 0005).
import type { Env } from "./types";

export async function hasConsent(env: Env, sessionId: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 FROM assistant_consent WHERE session_id = ?")
    .bind(sessionId)
    .first();
  return row !== null;
}

export async function recordConsent(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO assistant_consent (session_id, consented_at) VALUES (?, ?)",
  )
    .bind(sessionId, Date.now())
    .run();
}
