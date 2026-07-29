import type { AssistantResponse, Env, ExposeExtractResponse, Tier } from "./types";
import { validateExposeExtractRequest, validateRequest } from "./validator";
import { buildSystemPrompt } from "./systemPrompt";
import { buildUserPayload } from "./promptBuilder";
import { callModel, callVisionModel } from "./modelRouter";
import { filterOutput } from "./outputFilter";
import { EXPOSE_JSON_SCHEMA, EXPOSE_SYSTEM_PROMPT } from "./exposePrompt";
import { parseExposeOutput } from "./exposeOutput";

export { SessionRateLimiter } from "./sessionRateLimiter";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/assistant" && url.pathname !== "/api/expose-extract") {
      return jsonResponse({ error: "not_found" }, 404, corsHeaders);
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
    }
    if (url.pathname === "/api/expose-extract") {
      return handleExposeExtract(request, env, corsHeaders);
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
      console.error(
        "assistant_model_call_failed",
        err instanceof Error ? err.message : "unknown_error",
      );
      // Fehlgeschlagener Request darf kein Kontingent kosten - alle drei
      // Schranken zurueckbuchen (Punkt 3 des Reviews).
      await Promise.all([
        globalLimiter.decrement(),
        ipLimiter.decrement(),
        sessionLimiter.decrement(),
      ]);
      return jsonResponse({ error: "model_call_failed" }, 502, corsHeaders);
    }

    const antwort = filterOutput(rawAnswer, req.lang);
    const tier = extractTier(req.kontext);

    const responseBody: AssistantResponse = { antwort, tier };
    return jsonResponse(responseBody, 200, corsHeaders);
  },
} satisfies ExportedHandler<Env>;

// ═══ /api/expose-extract ═══
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 11.
// Bewusst ein eigener Handler statt einer Erweiterung des Assistenten-Pfads:
// eigener Kill-Switch, eigene (niedrigere) Limits, eigenes Kostenprofil.
// Kein Zwischenspeichern - der Worker hat kein Speicher-Binding, die Bilder
// leben nur im Ausfuehrungskontext dieser einen Anfrage.
async function handleExposeExtract(
  request: Request,
  env: Env,
  corsHeaders: HeadersInit,
): Promise<Response> {
  // Eigener Kill-Switch, unabhaengig von ASSISTANT_ENABLED (Spec 11.4).
  // Bewusst "opt-in": fehlt die Variable, ist der Endpunkt aus.
  if (env.EXPOSE_EXTRACT_ENABLED !== "true") {
    return jsonResponse({ error: "expose_extract_disabled" }, 503, corsHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400, corsHeaders);
  }

  const validation = validateExposeExtractRequest(body);
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400, corsHeaders);
  }
  const req = validation.data;

  // Gleiche dreistufige Schranke wie /api/assistant, aber eigener Namensraum
  // im Durable Object ("expose:"-Praefix) und deutlich niedrigere Werte -
  // Bild-Calls sind teurer als Text-Calls (Spec 11.3). Der Praefix kann nicht
  // mit einer sessionId kollidieren, da SESSION_ID_PATTERN keinen Doppelpunkt
  // erlaubt.
  const dailyLimit = parseInt(env.EXPOSE_DAILY_LIMIT || "", 10) || 5;
  const ipLimit = parseInt(env.EXPOSE_IP_DAILY_LIMIT || "", 10) || 15;
  const globalLimit = parseInt(env.EXPOSE_GLOBAL_DAILY_LIMIT || "", 10) || 300;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const globalLimiter = env.RATE_LIMITER_DO.getByName("expose:global");
  const ipLimiter = env.RATE_LIMITER_DO.getByName(`expose:ip:${ip}`);
  const sessionLimiter = env.RATE_LIMITER_DO.getByName(`expose:${req.sessionId}`);

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

  // Bilder und PDF gehen als eine einzige Anfrage ans Modell, damit Kontext
  // ueber die Abschnitte hinweg erhalten bleibt (Spec 2/3): ein Expose ist
  // eine Serie von Screenshots, kein Einzelbild.
  const dateien = req.pdf ? [...req.images, req.pdf] : req.images;

  let rawAnswer: string;
  try {
    rawAnswer = await callVisionModel(env, EXPOSE_SYSTEM_PROMPT, EXPOSE_JSON_SCHEMA, dateien);
  } catch (err) {
    // Erst hier ist wirklich Schluss: Gemini UND der Workers-AI-Fallback sind
    // gescheitert (Spec 11.6 ist damit ueberholt, siehe modelRouter.ts).
    // Wie beim Chat: kein Logging von Nutzerinhalten, nur der Fehlertyp.
    const grund = err instanceof Error ? err.message : "unknown_error";
    console.error("expose_extract_model_call_failed", grund);
    await Promise.all([
      globalLimiter.decrement(),
      ipLimiter.decrement(),
      sessionLimiter.decrement(),
    ]);
    // Ein PDF ohne Textebene ist kein Dienstausfall, sondern eine Datei, aus
    // der sich nichts holen laesst - der Nutzer soll etwas anderes probieren,
    // nicht "gleich nochmal".
    const inhaltsproblem = grund.includes("pdf_ohne_text");
    return jsonResponse(
      { error: inhaltsproblem ? "extraction_failed" : "model_call_failed" },
      502,
      corsHeaders,
    );
  }

  let ergebnis: ExposeExtractResponse;
  try {
    ergebnis = parseExposeOutput(rawAnswer);
  } catch (err) {
    // Unbrauchbare Modellantwort kostet ebenfalls kein Kontingent - der
    // Nutzer hat nichts bekommen, was er verwenden koennte.
    console.error(
      "expose_extract_output_invalid",
      err instanceof Error ? err.message : "unknown_error",
    );
    await Promise.all([
      globalLimiter.decrement(),
      ipLimiter.decrement(),
      sessionLimiter.decrement(),
    ]);
    return jsonResponse({ error: "extraction_failed" }, 502, corsHeaders);
  }

  return jsonResponse(ergebnis, 200, corsHeaders);
}

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
