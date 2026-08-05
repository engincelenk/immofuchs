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
    // Dev-Notbehelf (05.08.): Ohne RESEND_API_KEY warf diese Funktion, was den
    // kompletten Auth-Flow lahmlegte - Registrierung, Magic-Link und
    // Passwort-Reset endeten in einem 500er, obwohl die eigentliche Logik lief.
    // Statt zu werfen wird der enthaltene Link jetzt ins Worker-Log geschrieben
    // (`wrangler tail --env dev`), damit der Flow ohne externen Mail-Anbieter
    // testbar ist.
    //
    // Bewusste Abwaegung: In Produktion MUSS RESEND_API_KEY gesetzt sein - dann
    // wird dieser Zweig nie erreicht. Faellt der Wert dort doch einmal weg,
    // sieht der Nutzer faelschlich "E-Mail gesendet"; deshalb console.error
    // (nicht warn), damit es im Log als Fehler auffaellt statt still zu bleiben.
    const link = html.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? "(kein Link im Text)";
    console.error("resend_api_key_missing", "email_not_sent", to, subject, "LINK:", link);
    return;
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
