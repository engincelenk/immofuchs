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
import { nutzerPayload, systemPromptFuer, type AnalyseProdukt } from "../analysePrompt";
import { parseAnalyseOutput } from "../analyseOutput";
import { parseExposeOutput } from "../exposeOutput";
import { authenticate } from "../auth/session";
import { ermittleZugang, type Zugang } from "../entitlement";
import { hasConsent } from "../consent";
import { getTrialCount, getUserById, incrementTrialUsage, type UserRow } from "../db";
import { TRIAL_LIMITS, trialTag } from "../trialLimits";

const DEFAULT_FINN_PRO_DAILY_LIMIT = 50;
const DEFAULT_FINN_FREE_MAX_TOKENS = 350;
const DEFAULT_FINN_PRO_MAX_TOKENS = 700;
const DEFAULT_GLOBAL_CUTOFF_RATIO = 0.7;

// Authentifizierung ist seit der Preispolitik 2026-08-20 Pflicht. Vorher
// waren Finn und der Exposé-Scan anonym nutzbar ("Free bleibt komplett
// loginfrei", 4.0) - mit dem Wegfall von Free gibt es keinen anonymen Zugang
// mehr, und die Kontingente haengen am Nutzer statt an der Session. Damit
// reicht "Cookies loeschen" nicht mehr fuer ein frisches Kontingent.
//
// Bewusst ohne den Entitlement-Cookie-Cache (getEntitlement): der speichert
// ein Boolean und koennte "Testphase" nicht von "Pro" unterscheiden. Ein
// D1-Read je Anfrage ist gegenueber dem Modell-Aufruf, der gleich folgt,
// nicht messbar.
interface Zugriff {
  user: UserRow;
  zugang: Zugang;
}

async function resolveZugriff(request: Request, env: Env): Promise<Zugriff | null> {
  const ctx = await authenticate(request, env);
  if (!ctx) return null;
  const [user, zugang] = await Promise.all([
    getUserById(env.DB, ctx.session.user_id),
    ermittleZugang(env, ctx.session.user_id),
  ]);
  if (!user) return null;
  return { user, zugang };
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

  const zugriff = await resolveZugriff(c.req.raw, env);
  if (!zugriff) return c.json({ error: "not_authenticated" }, 401);
  if (zugriff.zugang === "keiner") return c.json({ error: "pro_required" }, 402);
  const isPro = zugriff.zugang === "pro";

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
  //   3. Kontingent - Pro: Tageslimit je Session (S5-3, unveraendert).
  //                    Testphase: festes Kontingent JE RECHNER fuer die
  //                    ganze Phase, am Nutzer haengend (Migration 0025).
  const proDailyLimit = parseInt(env.FINN_PRO_DAILY_LIMIT || "", 10) || DEFAULT_FINN_PRO_DAILY_LIMIT;
  const ipLimit = parseInt(env.IP_DAILY_LIMIT || "", 10) || 60;
  const globalLimit = parseInt(env.GLOBAL_DAILY_LIMIT || "", 10) || 2000;
  // Pro-Reservierung (4.18.4, S5-5): Anfragen aus der Testphase pruefen gegen
  // einen niedrigeren Anteil desselben globalen Zaehlers, Pro gegen das volle
  // Limit - ein ausgeschoepftes Testkontingent macht Finn fuer zahlende
  // Nutzer nicht unbenutzbar.
  const cutoffRatio = parseFloat(env.FINN_FREE_GLOBAL_CUTOFF_RATIO || "") || DEFAULT_GLOBAL_CUTOFF_RATIO;
  const effectiveGlobalLimit = isPro ? globalLimit : Math.floor(globalLimit * cutoffRatio);

  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const globalLimiter = env.RATE_LIMITER_DO.getByName("global");
  const ipLimiter = env.RATE_LIMITER_DO.getByName(`ip:${ip}`);
  // Nur noch Pro braucht den Session-Zaehler (Tageslimit). Das Kontingent der
  // Testphase liegt in D1 am Nutzer, siehe unten.
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
  const trialStart = zugriff.user.app_trial_started_at;
  if (isPro) {
    const sessionRl = await sessionLimiter.checkAndIncrement(proDailyLimit);
    if (!sessionRl.allowed) {
      await Promise.all([globalLimiter.decrement(), ipLimiter.decrement()]);
      return c.json({ error: "rate_limit_exceeded" }, 429);
    }
  } else {
    // Testphase: Kontingent je Rechner und Tag, in D1 am Nutzer. Geprueft
    // wird vorher, gezaehlt erst nach einer erfolgreichen Antwort (siehe
    // unten) - ein Modell-Fehler soll kein Kontingent kosten.
    const verbraucht =
      trialStart === null
        ? TRIAL_LIMITS.finn
        : await getTrialCount(env.DB, zugriff.user.id, trialStart, "finn", req.rechner, trialTag());
    if (verbraucht >= TRIAL_LIMITS.finn) {
      await Promise.all([globalLimiter.decrement(), ipLimiter.decrement()]);
      return c.json({ error: "trial_limit_reached" }, 402);
    }
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
      isPro ? sessionLimiter.decrement() : Promise.resolve(),
    ]);
    return c.json({ error: "model_call_failed" }, 502);
  }

  const antwort = filterOutput(rawAnswer, req.lang);
  const tier = extractTier(req.kontext);

  // Kontingent der Testphase erst nach der erfolgreichen Antwort erhoehen -
  // gleiche Haltung wie beim Exposé-Scan weiter unten.
  if (!isPro && trialStart !== null) {
    await incrementTrialUsage(env.DB, zugriff.user.id, trialStart, "finn", req.rechner, trialTag());
  }

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

  const zugriff = await resolveZugriff(c.req.raw, env);
  if (!zugriff) return c.json({ error: "not_authenticated" }, 401);
  if (zugriff.zugang === "keiner") return c.json({ error: "pro_required" }, 402);
  const isPro = zugriff.zugang === "pro";
  const trialStart = zugriff.user.app_trial_started_at;

  if (!(await hasConsent(env, req.sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  // Kontingent der Testphase (Migration 0025, seit 0026 je Tag): der Scan
  // gehoert zum OBJEKT, nicht zum Rechner - ein Exposé wird einmal gelesen und
  // fliesst danach in jeden Rechner. Deshalb ein gemeinsames Kontingent statt
  // eines je Rechner. Pro unterliegt nur den Fair-Use-Limits unten.
  if (!isPro) {
    const verbraucht =
      trialStart === null
        ? TRIAL_LIMITS.expose
        : await getTrialCount(env.DB, zugriff.user.id, trialStart, "expose", "", trialTag());
    if (verbraucht >= TRIAL_LIMITS.expose) {
      return c.json({ error: "trial_limit_reached" }, 402);
    }
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

  // Zaehler erst NACH erfolgreicher Extraktion erhoehen - ein gescheiterter
  // Versuch soll kein Kontingent verbrauchen.
  if (!isPro && trialStart !== null) {
    await incrementTrialUsage(env.DB, zugriff.user.id, trialStart, "expose", "", trialTag());
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

// ── AI-Engine: strukturierte Objektauswertung ───────────────────────────────
//
// Neu 2026-09, deshalb versioniert unter /api/v1/ (die beiden Handler oben
// bleiben unversioniert, weil sie Bestandsfunktionen sind).
//
// NUR PRO (Nutzerentscheidung 2026-09-05). Anders als beim Chat gibt es hier
// kein Testkontingent: die Auswertung wird am Objekt gespeichert und ist damit
// dauerhaft wertvoll, nicht fluechtig wie eine Chatantwort.
const ANALYSE_MAX_TOKENS = 900;

export async function handleObjektAnalyse(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const b = body as Record<string, unknown>;

  const produkt = b.produkt === "hebel" ? "hebel" : b.produkt === "analyse" ? "analyse" : null;
  if (!produkt) return c.json({ error: "unbekanntes_produkt" }, 400);

  const kennzahlen = b.kennzahlen;
  if (typeof kennzahlen !== "object" || kennzahlen === null || Array.isArray(kennzahlen)) {
    return c.json({ error: "kennzahlen_fehlen" }, 400);
  }
  // Der Freitext-Hinweis geht mit an das Modell - deshalb hart begrenzt, damit
  // er nicht als Traeger fuer Prompt-Injection oder als Datenkanal dient.
  const hinweis = typeof b.hinweis === "string" ? b.hinweis.slice(0, 500) : "";

  const zugriff = await resolveZugriff(c.req.raw, env);
  if (!zugriff) return c.json({ error: "not_authenticated" }, 401);
  if (zugriff.zugang !== "pro") return c.json({ error: "pro_required" }, 402);

  const sessionId = typeof b.sessionId === "string" ? b.sessionId : "";
  if (!(await hasConsent(env, sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  // Fair-Use wie beim Chat: die Auswertung ist teurer als eine Chatantwort,
  // deshalb ein eigener, knapperer Zaehler je Nutzer und Tag.
  const tagesLimit = parseInt(env.ANALYSE_DAILY_LIMIT || "", 10) || 20;
  const limiter = env.RATE_LIMITER_DO.getByName(`analyse:${zugriff.user.id}`);
  const rl = await limiter.checkAndIncrement(tagesLimit);
  if (!rl.allowed) return c.json({ error: "rate_limit_exceeded" }, 429);

  let roh: string;
  try {
    roh = await callModel(
      env,
      "de",
      systemPromptFuer(produkt as AnalyseProdukt),
      nutzerPayload(kennzahlen as Record<string, unknown>, hinweis),
      ANALYSE_MAX_TOKENS,
    );
  } catch {
    // Kontingent zurueckgeben: der Nutzer hat kein Ergebnis bekommen.
    await limiter.decrement();
    return c.json({ error: "modell_nicht_erreichbar" }, 503);
  }

  const ergebnis = parseAnalyseOutput(roh);
  if (!ergebnis) {
    await limiter.decrement();
    return c.json({ error: "unbrauchbare_antwort" }, 502);
  }

  // filterOutput NACH dem Parsen, nicht davor: es ersetzt bei Verdacht den
  // gesamten Text durch einen Fallback-Satz. Auf das rohe JSON angewandt
  // wuerde dieser Satz zur "Kernaussage" - der Nutzer bekaeme eine
  // Fehlermeldung als Analyseergebnis serviert. Stattdessen pruefen wir den
  // zusammengesetzten Text und verwerfen im Verdachtsfall das ganze Ergebnis.
  const gesamttext = [
    ergebnis.kernaussage,
    ...ergebnis.abschnitte.map((a) => a.text),
  ].join(" ");
  if (filterOutput(gesamttext, "de") !== gesamttext) {
    await limiter.decrement();
    return c.json({ error: "unbrauchbare_antwort" }, 502);
  }

  return c.json({ produkt, ergebnis });
}
