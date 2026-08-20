// Bot-Schutz der Registrierung (Preispolitik 2026-08-20, Schritt A).
//
// Warum ueberhaupt: mit dem Wegfall von Free ist die Registrierung die
// einzige Tuer ins Produkt, und dahinter liegt eine kostenlose Testphase mit
// echten Modellkosten. Ein Skript, das Konten am Fliessband anlegt, greift
// damit direkt das AI-Budget an. Das bisherige Rate-Limit half dagegen nicht:
// es zaehlte je E-MAIL-Adresse, eine neue Adresse hatte also ein frisches
// Kontingent.
//
// Turnstile statt eines Raetsel-Captchas: fuer echte Nutzer unsichtbar, fuer
// Massenanlage teuer. Die Pruefung passiert ausschliesslich hier im Worker -
// ein Token, das nur der Browser prueft, ist kein Schutz.
import type { Env } from "./types";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileErgebnis {
  ok: boolean;
  // Nur fuer die Logs - Turnstile-Fehlercodes ("invalid-input-response",
  // "timeout-or-duplicate", ...). Nie an den Client, der bekommt 403.
  codes?: string[];
}

// Ohne konfiguriertes Secret laesst die Pruefung durch, statt jede
// Registrierung zu blockieren. Das ist bewusst die weiche Richtung: eine
// fehlende Variable in einer Umgebung soll die Anmeldung nicht abschalten -
// sichtbar wird es ueber die Warnung im Log.
export async function pruefeTurnstile(
  env: Env,
  token: unknown,
  ip: string | null,
): Promise<TurnstileErgebnis> {
  if (!env.TURNSTILE_SECRET) {
    console.warn("turnstile_secret_missing");
    return { ok: true };
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, codes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const ergebnis = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (ergebnis.success === true) return { ok: true };
    return { ok: false, codes: ergebnis["error-codes"] ?? [] };
  } catch (err) {
    // Ein Ausfall von Cloudflares Endpunkt darf keine Registrierung
    // verhindern - gleiche Haltung wie beim HIBP-Check in password.ts
    // (best effort, kein harter Blocker).
    console.error("turnstile_verify_failed", err instanceof Error ? err.message : "unknown_error");
    return { ok: true };
  }
}
