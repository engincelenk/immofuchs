// KI-Assistent-Consent (Spec 3.2, S5-7, Guideline 5.1.2(i)). Eigener,
// oeffentlicher (nicht requireAuth) Endpunkt - Consent wird auch anonym vor
// dem ersten Finn-Aufruf gebraucht, ein Login existiert zu dem Zeitpunkt oft
// noch nicht.
import { Hono } from "hono";
import type { Env } from "../types";
import { hasConsent, recordConsent } from "../consent";

export const consentRoutes = new Hono<{ Bindings: Env }>();

const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

consentRoutes.get("/", async (c) => {
  const sessionId = c.req.query("sessionId") || "";
  if (!SESSION_ID_PATTERN.test(sessionId)) return c.json({ error: "invalid_session_id" }, 400);
  return c.json({ consented: await hasConsent(c.env, sessionId) });
});

consentRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const sessionId = body && typeof body.sessionId === "string" ? body.sessionId : "";
  if (!SESSION_ID_PATTERN.test(sessionId)) return c.json({ error: "invalid_session_id" }, 400);
  await recordConsent(c.env, sessionId);
  return c.json({ ok: true });
});
