// E-Mail-Magic-Link (Spec 4.4, 4.5, 4.13). Reiner Link, kein OTP-Code
// (reibungsaermer mobil, s. Spec). Rate-Limit 5/Std./E-Mail ueber den
// bestehenden Durable-Object-Rate-Limiter (windowed-Variante, siehe
// sessionRateLimiter.ts), Namensraum "magiclink:"-praefixiert.
import type { Env } from "../types";
import { createMagicLink, consumeMagicLink, getUserByEmail, createUser } from "../db";
import { sendEmail } from "../email";
import { hashToken } from "./password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR_MS = 60 * 60 * 1000;
const MAGIC_LINK_HOURLY_LIMIT = 5;

export type RequestMagicLinkResult = { ok: true } | { ok: false; error: "invalid_email" | "rate_limited" };

// Wichtig (Account-Enumeration, 4.3/4.13): der Aufrufer bekommt bei gueltiger
// E-Mail-Syntax IMMER {ok:true} zurueck, unabhaengig davon, ob ein Konto
// existiert - der Unterschied entscheidet sich erst beim Klick auf den Link.
export async function requestMagicLink(
  env: Env,
  email: string,
): Promise<RequestMagicLinkResult> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 254) {
    return { ok: false, error: "invalid_email" };
  }

  const limiter = env.RATE_LIMITER_DO.getByName(`magiclink:${normalized}`);
  const rl = await limiter.checkAndIncrementWindow(MAGIC_LINK_HOURLY_LIMIT, HOUR_MS);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const token = crypto.randomUUID();
  await createMagicLink(env.DB, normalized, await hashToken(token));
  const link = `${env.APP_BASE_URL || "https://immofuchs.info"}/auth/magic-link?token=${token}`;
  await sendEmail(
    env,
    normalized,
    "Dein Login-Link fuer ImmoFuchs",
    `<p>Klicke auf den folgenden Link, um dich bei ImmoFuchs anzumelden. Der Link ist 15 Minuten gueltig:</p>
     <p><a href="${link}">${link}</a></p>
     <p>Falls du diese Anmeldung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
  );
  return { ok: true };
}

export type VerifyMagicLinkResult =
  | { ok: true; userId: string }
  | { ok: false; error: "invalid_or_expired" };

export async function verifyMagicLink(env: Env, token: string): Promise<VerifyMagicLinkResult> {
  const email = await consumeMagicLink(env.DB, await hashToken(token));
  if (!email) return { ok: false, error: "invalid_or_expired" };

  const existing = await getUserByEmail(env.DB, email);
  if (existing) return { ok: true, userId: existing.id };

  const user = await createUser(env.DB, email);
  return { ok: true, userId: user.id };
}
