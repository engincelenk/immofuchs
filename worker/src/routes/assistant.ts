// /api/assistant + /api/expose-extract - bewusst UNVERSIONIERT unter ihrem
// heutigen Pfad (Stabilitätsregel, S3-1: keine Breaking Changes an
// Bestandsfunktionen). Prompt-/Modell-Logik bleibt exakt wie sie war - added
// wird ausschließlich ein vorgeschalteter Entitlement-/Consent-/Trial-Check
// (4.9, S5-2/3/4/5/7). Kein Hono-Routing-Parameter (":id" etc.) nötig, daher
// als einfache (Context) => Promise<Response>-Funktionen statt eigenem
// Sub-Router gehalten - index.ts hängt sie direkt ein.
import type { Context } from "hono";
import type { AssistantResponse, Env, ExposeExtractResponse, Tier } from "../types";
import { validateExposeExtractRequest, validateRequest, MAX_VERLAUF_TEXT_LEN } from "../validator";
import { buildSystemPrompt } from "../systemPrompt";
import { buildUserPayload } from "../promptBuilder";
import { callModel, callVisionModel } from "../modelRouter";
import { filterOutput } from "../outputFilter";
import { EXPOSE_JSON_SCHEMA, EXPOSE_SYSTEM_PROMPT } from "../exposePrompt";
import { parseExposeOutput } from "../exposeOutput";
import { authenticate } from "../auth/session";
import { getEntitlement } from "../entitlement";
import { hasConsent } from "../consent";
import { hasUsedExposeTrial, markExposeTrialUsed } from "../db";

const DEFAULT_FINN_FREE_DAILY_LIMIT = 5;
const DEFAULT_FINN_PRO_DAILY_LIMIT = 50;
const DEFAULT_FINN_FREE_MAX_TOKENS = 350;
const DEFAULT_FINN_PRO_MAX_TOKENS = 700;
const DEFAULT_GLOBAL_CUTOFF_RATIO = 0.7;

// Optionale Authentifizierung - Finn/Exposé bleiben auch anonym nutzbar
// (4.0: "Free bleibt komplett loginfrei"), Pro-Status wird nur mitgelesen,
// wenn ein gueltiges Session-Cookie/Bearer-Token vorhanden ist.
async function resolveIsPro(request: Request, env: Env): Promise<{ isPro: boolean; setCookie: string | null }> {
  const ctx = await authenticate(request, env);
  if (!ctx) return { isPro: false, setCookie: null };
  return getEntitlement(request, env, ctx.session.user_id);
}

export async function handleAssistant(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;
  // Kill-Switch (Konzept 2.8) - ueber Cloudflare-Dashboard-Variable ohne Redeploy schaltbar.
  if (env.ASSISTANT_ENABLED !== "true") {
    return c.json({ error: "assistant_disabled" }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const { isPro, setCookie } = await resolveIsPro(c.req.raw, env);
  if (setCookie) c.header("Set-Cookie", setCookie, { append: true });

  const freeMaxTokens = parseInt(env.FINN_FREE_MAX_TOKENS || "", 10) || DEFAULT_FINN_FREE_MAX_TOKENS;
  const proMaxTokens = parseInt(env.FINN_PRO_MAX_TOKENS || "", 10) || DEFAULT_FINN_PRO_MAX_TOKENS;
  const maxTokens = isPro ? proMaxTokens : freeMaxTokens;
  // Laengeres Verlaufsfenster fuer Pro (S5-4): der Zeichen-Cap muss mit
  // MAX_TOKENS mitwachsen, sonst kehrt der invalid_verlauf-Bug aus 1.55.96
  // fuer Pro-Nutzer zurueck (4.18.5).
  const maxVerlaufTextLen = Math.round((MAX_VERLAUF_TEXT_LEN * maxTokens) / DEFAULT_FINN_FREE_MAX_TOKENS);

  const validation = validateRequest(body, maxVerlaufTextLen);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }
  const req = validation.data;

  // KI-Consent vor der ersten Finn-Nutzung (Guideline 5.1.2(i), S5-7) - vor
  // jedem Kontingent-Verbrauch geprueft, damit ein fehlender Consent keine
  // Anfrage kostet.
  if (!(await hasConsent(env, req.sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  // Drei gestaffelte Schranken (siehe docs/code-review-2026-07-23.md, Punkt 1):
  //   1. global  - hartes Tages-Cap ueber alle Nutzer, deckelt die Kosten.
  //   2. ip      - pro CF-Connecting-IP.
  //   3. session - Free/Pro-abhaengiges Komfort-Limit pro Browser-Session
  //                (S5-3: Free 5/Tag, Pro 50/Tag statt frueher flach 50/Tag).
  const freeDailyLimit = parseInt(env.FINN_FREE_DAILY_LIMIT || "", 10) || DEFAULT_FINN_FREE_DAILY_LIMIT;
  const proDailyLimit = parseInt(env.FINN_PRO_DAILY_LIMIT || "", 10) || DEFAULT_FINN_PRO_DAILY_LIMIT;
  const dailyLimit = isPro ? proDailyLimit : freeDailyLimit;
  const ipLimit = parseInt(env.IP_DAILY_LIMIT || "", 10) || 60;
  const globalLimit = parseInt(env.GLOBAL_DAILY_LIMIT || "", 10) || 2000;
  // Pro-Reservierung (4.18.4, S5-5): Free-Anfragen pruefen gegen einen
  // niedrigeren Anteil desselben globalen Zaehlers, Pro gegen das volle Limit -
  // "ein ausgeschoepftes Free-Kontingent macht Finn fuer Pro nicht unbenutzbar".
  const cutoffRatio = parseFloat(env.FINN_FREE_GLOBAL_CUTOFF_RATIO || "") || DEFAULT_GLOBAL_CUTOFF_RATIO;
  const effectiveGlobalLimit = isPro ? globalLimit : Math.floor(globalLimit * cutoffRatio);

  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const globalLimiter = env.RATE_LIMITER_DO.getByName("global");
  const ipLimiter = env.RATE_LIMITER_DO.getByName(`ip:${ip}`);
  const sessionLimiter = env.RATE_LIMITER_DO.getByName(req.sessionId);

  const globalRl = await globalLimiter.checkAndIncrement(effectiveGlobalLimit);
  if (!globalRl.allowed) {
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }
  const ipRl = await ipLimiter.checkAndIncrement(ipLimit);
  if (!ipRl.allowed) {
    await globalLimiter.decrement();
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }
  const sessionRl = await sessionLimiter.checkAndIncrement(dailyLimit);
  if (!sessionRl.allowed) {
    await Promise.all([globalLimiter.decrement(), ipLimiter.decrement()]);
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }

  const systemPrompt = buildSystemPrompt(req.lang);
  const userPayload = buildUserPayload(req);

  let rawAnswer: string;
  try {
    rawAnswer = await callModel(env, req.lang, systemPrompt, userPayload, maxTokens);
  } catch (err) {
    // Absichtlich kein Logging von "frage"/"kontext" - nur strukturelle Fehlerinfo,
    // damit kein Nutzer-Freitext in Cloudflare-Logs landet (Konzept 2.9/2.10).
    console.error(
      "assistant_model_call_failed",
      err instanceof Error ? err.message : "unknown_error",
    );
    await Promise.all([
      globalLimiter.decrement(),
      ipLimiter.decrement(),
      sessionLimiter.decrement(),
    ]);
    return c.json({ error: "model_call_failed" }, 502);
  }

  const antwort = filterOutput(rawAnswer, req.lang);
  const tier = extractTier(req.kontext);

  const responseBody: AssistantResponse = { antwort, tier };
  return c.json(responseBody, 200);
}

export async function handleExposeExtract(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;
  if (env.EXPOSE_EXTRACT_ENABLED !== "true") {
    return c.json({ error: "expose_extract_disabled" }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const validation = validateExposeExtractRequest(body);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }
  const req = validation.data;

  const { isPro, setCookie } = await resolveIsPro(c.req.raw, env);
  if (setCookie) c.header("Set-Cookie", setCookie, { append: true });

  if (!(await hasConsent(env, req.sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  // 1x-Gate fuer anonyme Free-Nutzer (4.8, 4.0a, S5-2) - Pro hat kein
  // Pro-Gate mehr, bleibt aber den Fair-Use-Limits unten unterworfen.
  if (!isPro && (await hasUsedExposeTrial(env.DB, req.sessionId))) {
    return c.json({ error: "expose_trial_used" }, 403);
  }

  const dailyLimit = parseInt(env.EXPOSE_DAILY_LIMIT || "", 10) || 5;
  const ipLimit = parseInt(env.EXPOSE_IP_DAILY_LIMIT || "", 10) || 15;
  const globalLimit = parseInt(env.EXPOSE_GLOBAL_DAILY_LIMIT || "", 10) || 300;
  const ip = c.req.header("CF-Connecting-IP") || "unknown";

  const globalLimiter = env.RATE_LIMITER_DO.getByName("expose:global");
  const ipLimiter = env.RATE_LIMITER_DO.getByName(`expose:ip:${ip}`);
  const sessionLimiter = env.RATE_LIMITER_DO.getByName(`expose:${req.sessionId}`);

  const globalRl = await globalLimiter.checkAndIncrement(globalLimit);
  if (!globalRl.allowed) {
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }
  const ipRl = await ipLimiter.checkAndIncrement(ipLimit);
  if (!ipRl.allowed) {
    await globalLimiter.decrement();
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }
  const sessionRl = await sessionLimiter.checkAndIncrement(dailyLimit);
  if (!sessionRl.allowed) {
    await Promise.all([globalLimiter.decrement(), ipLimiter.decrement()]);
    return c.json({ error: "rate_limit_exceeded" }, 429);
  }

  const dateien = req.pdf ? [...req.images, req.pdf] : req.images;

  let rawAnswer: string;
  try {
    rawAnswer = await callVisionModel(env, EXPOSE_SYSTEM_PROMPT, EXPOSE_JSON_SCHEMA, dateien);
  } catch (err) {
    const grund = err instanceof Error ? err.message : "unknown_error";
    console.error("expose_extract_model_call_failed", grund);
    await Promise.all([
      globalLimiter.decrement(),
      ipLimiter.decrement(),
      sessionLimiter.decrement(),
    ]);
    const inhaltsproblem = grund.includes("pdf_ohne_text");
    return c.json({ error: inhaltsproblem ? "extraction_failed" : "model_call_failed" }, 502);
  }

  let ergebnis: ExposeExtractResponse;
  try {
    ergebnis = parseExposeOutput(rawAnswer);
  } catch (err) {
    console.error(
      "expose_extract_output_invalid",
      err instanceof Error ? err.message : "unknown_error",
    );
    await Promise.all([
      globalLimiter.decrement(),
      ipLimiter.decrement(),
      sessionLimiter.decrement(),
    ]);
    return c.json({ error: "extraction_failed" }, 502);
  }

  // Trial-Flag erst NACH erfolgreicher Extraktion setzen - ein gescheiterter
  // Versuch soll den einen kostenlosen Versuch nicht verbrauchen.
  if (!isPro) {
    await markExposeTrialUsed(env.DB, req.sessionId);
  }

  return c.json(ergebnis, 200);
}

function extractTier(kontext: Record<string, unknown>): Tier {
  const bewertung = kontext.bewertung;
  if (bewertung && typeof bewertung === "object" && !Array.isArray(bewertung)) {
    const tier = (bewertung as Record<string, unknown>).tier;
    if (tier === "green" || tier === "yellow" || tier === "red") return tier;
  }
  return null;
}
