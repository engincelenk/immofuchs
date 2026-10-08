// Standby-Betrieb (qa als Zwilling von prod).
//
// qa teilt sich mit prod dieselbe D1-Datenbank (siehe wrangler.toml, [env.qa.d1_databases]) und laeuft
// im Normalbetrieb mit STANDBY = "true". Es liest dann die echten Daten, darf aber nichts tun, was
// nach aussen wirkt oder Kundendaten veraendert:
//   - keine Mails und keine Push-Nachrichten (email.ts, push.ts),
//   - keine Hintergrundjobs (scheduled.ts),
//   - keine schreibenden Anfragen ausser Anmelden/Abmelden, Assistent und Admin-Bereich (standbyGuard).
// Dadurch kann auch Stripe nicht aus Versehen von qa aus veraendert werden (Kaeufe, Kuendigungen,
// Erstattungen laufen alle ueber gesperrte POST-Routen).
//
// Beim Umschalten (Failover) wird STANDBY auf "false" gestellt, siehe docs/betrieb/notfall-runbook.md.
import { createMiddleware } from "hono/factory";
import type { Env } from "./types";

export function isStandby(env: Pick<Env, "STANDBY">): boolean {
  return env.STANDBY === "true";
}

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Schreibende Anfragen, die im Standby trotzdem erlaubt sind: ohne sie liesse sich qa nicht pruefen.
const ALLOWED_WRITES = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/apple/callback", // Apple ruft den Rueckweg per POST auf
  "/api/assistant", // KI-Chat: schreibt nur Zaehler im Durable Object
]);

export function standbyAllows(method: string, pathname: string): boolean {
  if (READ_METHODS.has(method.toUpperCase())) return true;
  if (pathname.startsWith("/api/v1/admin/")) return true; // nur fuer Admins erreichbar
  return ALLOWED_WRITES.has(pathname);
}

export const standbyGuard = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (isStandby(c.env) && !standbyAllows(c.req.method, new URL(c.req.url).pathname)) {
    return c.json({ error: "standby" }, 503);
  }
  await next();
});
