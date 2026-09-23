// /api/v1/lage - Baustein "Lage" der Objektseite (objektseite-vereinfachung-
// 2026-09-23.md Abschnitt 8). Eigene, kleine Route statt eines weiteren
// Zweigs in /api/v1/analyse (routes/assistant.ts): der dortige Aufruf ist auf
// das gemeinsame Erkenntnis-Schema (summary/keyInsights/...) zugeschnitten,
// das zu einer web-gestuetzten Standort-Einordnung nicht passt - Fliesstext
// statt strukturierter KPI-Bewertung, siehe lagePrompt.ts. Middleware-Kette
// (requireAuth/requirePro/requireCsrfOrigin) und Consent-/Trial-Pruefung
// folgen trotzdem exakt demselben Muster wie export.ts/assistant.ts, damit
// dieselben Schutzmechanismen gelten.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requirePro, requireCsrfOrigin, type EntitlementVars } from "../middleware";
import { hasConsent } from "../consent";
import { getTrialCount, incrementTrialUsage } from "../db";
import { TRIAL_LIMITS, trialTag } from "../trialLimits";
import { callGroundedModel } from "../modelRouter";
import { lageSystemPrompt, lageUserPayload } from "../lagePrompt";
import { ermittleZugang } from "../entitlement";

export const lageRoutes = new Hono<{ Bindings: Env; Variables: EntitlementVars }>();

const MAX_FELD_LAENGE = 100;

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

lageRoutes.post("/", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const ort = text(body?.ort, MAX_FELD_LAENGE);
  const bundesland = text(body?.bundesland, MAX_FELD_LAENGE);
  const kreis = text(body?.kreis, MAX_FELD_LAENGE);
  if (!ort || !bundesland) {
    return c.json({ error: "ort_oder_bundesland_fehlt" }, 400);
  }

  // Bug-Fix (Nutzer-Befund 2026-09-23, per wrangler-tail-Mitschnitt bestaetigt):
  // hasConsent() prueft hier bisher c.var.sessionId - die AUTHENTIFIZIERTE
  // Server-Session aus requireAuth. Gespeichert wird die Einwilligung aber
  // unter der geraetegebundenen KI-Session (getSessionId() im Client,
  // assistantSession.js), genau wie bei allen anderen KI-Produkten (siehe
  // hasConsent(env, req.sessionId) in routes/assistant.ts). Beide IDs stammen
  // aus unterschiedlichen Raeumen und stimmen so gut wie nie ueberein -
  // jede Lage-Analyse bekam deshalb selbst direkt nach erteilter Einwilligung
  // wieder 412 zurueck. Jetzt wie ueberall sonst: sessionId kommt aus dem Body.
  const sessionId = text(body?.sessionId, 64) || "";
  if (!(await hasConsent(c.env, sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  // Trial-Kontingent wie Handout: TAEGLICH, objektuebergreifend (kein
  // rechner-Parameter noetig, siehe trialLimits.ts TAGESKONTINGENT).
  const zugang = await ermittleZugang(c.env, c.var.userId);
  if (zugang !== "pro") {
    const trialStart = c.var.user.app_trial_started_at;
    if (trialStart === null) return c.json({ error: "trial_limit_reached" }, 402);
    const tag = trialTag();
    const erzeugt = await getTrialCount(c.env.DB, c.var.userId, trialStart, "lage", "", tag);
    if (erzeugt >= TRIAL_LIMITS.lage) return c.json({ error: "trial_limit_reached" }, 402);
    await incrementTrialUsage(c.env.DB, c.var.userId, trialStart, "lage", "", tag);
  }

  try {
    const { text: antwort, grounded } = await callGroundedModel(
      c.env,
      lageSystemPrompt(),
      lageUserPayload(ort, kreis, bundesland),
    );
    return c.json({ text: antwort, grounded });
  } catch (err) {
    const grund = err instanceof Error ? err.message : "unknown_error";
    console.error("lage_model_call_failed", JSON.stringify({ ort, bundesland, grund }));
    return c.json({ error: "modell_nicht_erreichbar" }, 503);
  }
});
