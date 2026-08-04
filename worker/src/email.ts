// Duenner Resend-Wrapper (Spec 4.4, 4.14, V-5). Bewusst kein SDK-Paket -
// ein einzelner fetch-Aufruf, analog zum bestehenden Gemini-fetch-Stil in
// modelRouter.ts, keine zusaetzliche Abhaengigkeit fuer einen einzigen Call.
import type { Env } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Kein Wurf in Produktion gedacht, aber vor Sprint-1-Go-Live (Platzhalter-
    // Credentials, siehe kommerzialisierung-setup.md) soll das nicht den
    // ganzen Request-Handler crashen - Aufrufer entscheidet, wie kritisch das ist.
    console.error("resend_api_key_missing", "email_not_sent");
    throw new Error("email_not_configured");
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.MAGIC_LINK_FROM_EMAIL || "ImmoFuchs <login@immofuchs.info>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("resend_send_failed", res.status, detail.slice(0, 200));
    throw new Error(`email_send_failed_${res.status}`);
  }
}
