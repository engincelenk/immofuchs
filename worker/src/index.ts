import type { AssistantResponse, Env, Tier } from "./types";
import { validateRequest } from "./validator";
import { buildSystemPrompt } from "./systemPrompt";
import { buildUserPayload } from "./promptBuilder";
import { callModel } from "./modelRouter";
import { filterOutput } from "./outputFilter";

export { SessionRateLimiter } from "./sessionRateLimiter";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/assistant") {
      return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
    }

    // Kill-Switch (Konzept 2.8) - ueber Cloudflare-Dashboard-Variable ohne Redeploy schaltbar.
    if (env.ASSISTANT_ENABLED !== "true") {
      return jsonResponse({ error: "assistant_disabled" }, 503, corsHeaders);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400, corsHeaders);
    }

    const validation = validateRequest(body);
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400, corsHeaders);
    }
    const req = validation.data;

    // Drei gestaffelte Schranken (siehe docs/code-review-2026-07-23.md, Punkt 1):
    //   1. global  - hartes Tages-Cap ueber alle Nutzer, deckelt die Kosten,
    //                da das Session-Limit ueber rotierende sessionId umgehbar ist.
    //   2. ip      - pro CF-Connecting-IP, bremst Missbrauch ohne fremde Nutzer
    //                (hinter geteiltem NAT) zu hart zu treffen.
    //   3. session - unveraendertes Komfort-Limit pro Browser-Session.
    // Reihenfolge global→ip→session; wird eine spaetere Schranke abgelehnt,
    // werden die bereits gezaehlten frueheren zurueckgebucht.
    const dailyLimit = parseInt(env.DAILY_REQUEST_LIMIT, 10) || 20;
    const ipLimit = parseInt(env.IP_DAILY_LIMIT || "", 10) || 60;
    const globalLimit = parseInt(env.GLOBAL_DAILY_LIMIT || "", 10) || 2000;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    const globalLimiter = env.RATE_LIMITER_DO.getByName("global");
    const ipLimiter = env.RATE_LIMITER_DO.getByName(`ip:${ip}`);
    const sessionLimiter = env.RATE_LIMITER_DO.getByName(req.sessionId);

    const globalRl = await globalLimiter.checkAndIncrement(globalLimit);
    if (!globalRl.allowed) {
      return jsonResponse({ error: "rate_limit_exceeded" }, 429, corsHeaders);
    }
    const ipRl = await ipLimiter.checkAndIncrement(ipLimit);
    if (!ipRl.allowed) {
      await globalLimiter.decrement();
      return jsonResponse({ error: "rate_limit_exceeded" }, 429, corsHeaders);
    }
    const sessionRl = await sessionLimiter.checkAndIncrement(dailyLimit);
    if (!sessionRl.allowed) {
      await Promise.all([globalLimiter.decrement(), ipLimiter.decrement()]);
      return jsonResponse({ error: "rate_limit_exceeded" }, 429, corsHeaders);
    }

    const systemPrompt = buildSystemPrompt(req.lang);
    const userPayload = buildUserPayload(req);

    let rawAnswer: string;
    try {
      rawAnswer = await callModel(env, req.lang, systemPrompt, userPayload);
    } catch (err) {
      // Absichtlich kein Logging von "frage"/"kontext" - nur strukturelle Fehlerinfo,
      // damit kein Nutzer-Freitext in Cloudflare-Logs landet (Konzept 2.9/2.10).
      console.error("assistant_model_call_failed", err instanceof Error ? err.message : "unknown_error");
      // Fehlgeschlagener Request darf kein Kontingent kosten - alle drei
      // Schranken zurueckbuchen (Punkt 3 des Reviews).
      await Promise.all([globalLimiter.decrement(), ipLimiter.decrement(), sessionLimiter.decrement()]);
      return jsonResponse({ error: "model_call_failed" }, 502, corsHeaders);
    }

    const antwort = filterOutput(rawAnswer, req.lang);
    const tier = extractTier(req.kontext);

    const responseBody: AssistantResponse = { antwort, tier };
    return jsonResponse(responseBody, 200, corsHeaders);
  },
} satisfies ExportedHandler<Env>;

function extractTier(kontext: Record<string, unknown>): Tier {
  const bewertung = kontext.bewertung;
  if (bewertung && typeof bewertung === "object" && !Array.isArray(bewertung)) {
    const tier = (bewertung as Record<string, unknown>).tier;
    if (tier === "green" || tier === "yellow" || tier === "red") return tier;
  }
  return null;
}

function buildCorsHeaders(origin: string | null, allowedOrigin: string): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  // Kommagetrennte Liste erlaubt mehrere Origins gleichzeitig (z. B. lokaler
  // Dev-Server + echte Produktions-Domain), ohne dass ein Redeploy noetig
  // wird, sobald die andere Seite auch live geht.
  const allowed = allowedOrigin.split(",").map((o) => o.trim());
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(data: unknown, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
