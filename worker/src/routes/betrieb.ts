// Fehlermeldungen aus der App (Scope Abschnitt D): jede Fehlermeldung, die ein Nutzer sieht, wird anonym gezaehlt.
// Ohne Anmeldung erreichbar, deshalb streng begrenzt: feste Liste von Funktionen, kurzer Code aus [a-z0-9_],
// keine Freitexte, keine Eingaben, Tageslimit je IP und insgesamt.
import { Hono } from "hono";
import type { Env } from "../types";
import { meldeFehler } from "../betrieb";

// Hinweis: Im Standby (qa) sperrt standbyGuard diesen POST - Meldungen von qa gehen bewusst verloren, qa ist nur Zwilling im Wartebetrieb.
export const betriebPublicRoutes = new Hono<{ Bindings: Env }>();

export const CLIENT_FUNKTIONEN = [
  "expose", "analyse", "lage", "alternativ", "finn", "login", "checkout", "rechner", "absturz",
] as const;

const CLIENT_CODE = /^(netz|render|modell_aus|antwort_unbrauchbar|fehler_dienst|fehler_unlesbar|fehler_\d{3})$/;
const MAX_BODY_BYTES = 1024;
const IP_LIMIT = 40;
const GLOBAL_LIMIT = 2000;

export function pruefeClientMeldung(body: unknown): { funktion: string; code: string; version: string | null } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.funktion !== "string" || !(CLIENT_FUNKTIONEN as readonly string[]).includes(b.funktion)) return null;
  // Feste Codes statt Freitext: verhindert beliebig viele Gruppen und Texte, die in den KI-Bericht gelangen.
  if (typeof b.code !== "string" || !CLIENT_CODE.test(b.code)) return null;
  const version = typeof b.version === "string" && /^[\w.-]{1,20}$/.test(b.version) ? b.version : null;
  return { funktion: b.funktion, code: b.code, version };
}

betriebPublicRoutes.post("/client-error", async (c) => {
  const laenge = Number(c.req.header("Content-Length") ?? "0");
  if (laenge > MAX_BODY_BYTES) return c.json({ error: "too_large" }, 413);
  let body: unknown;
  try {
    const roh = await c.req.text();
    if (roh.length > MAX_BODY_BYTES) return c.json({ error: "too_large" }, 413);
    body = JSON.parse(roh);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const m = pruefeClientMeldung(body);
  if (!m) return c.json({ error: "invalid_report" }, 400);

  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  try {
    // Erst die IP, dann global: sonst verbraucht ein Einzelner mit Anfragen ueber seinem IP-Limit das Tageskontingent aller.
    const proIp = await c.env.RATE_LIMITER_DO.getByName(`clienterr:ip:${ip}`).checkAndIncrement(IP_LIMIT);
    if (!proIp.allowed) return c.body(null, 204);
    const global = await c.env.RATE_LIMITER_DO.getByName("clienterr:global").checkAndIncrement(GLOBAL_LIMIT);
    if (!global.allowed) return c.body(null, 204);
  } catch {
    return c.body(null, 204); // Begrenzer nicht erreichbar: lieber nichts melden als ungebremst schreiben
  }
  await meldeFehler(c.env, {
    bereich: `client:${m.funktion}`,
    code: m.code,
    schwere: "W",
    detail: m.version ? `v${m.version}` : undefined,
  });
  return c.body(null, 204);
});
