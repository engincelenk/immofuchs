import type { Env, InlineDatei, Lang } from "./types";
import { meldeFehler, type SondenPunkt } from "./betrieb";

const MAX_TOKENS = 350; // erhoeht von 220 fuer laengere Antworten (~160 statt 80 Woerter)
// mit aktiven Stellschrauben-Vorschlaegen, bewusste Produktentscheidung (siehe release-notes.txt)
const TEMPERATURE = 0.3; // niedrig fuer konsistentere Antworten, siehe Konzept 2.9
const MODEL_TIMEOUT_MS = 20000; // Schutz gegen haengende/degradierte Model-Calls (siehe release-notes.txt)

const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Google-Deprecation, zweiter Durchlauf. "gemini-2.0-flash-lite" fiel zum
// 01.06.2026 weg, der Nachfolger "gemini-2.5-flash-lite" jetzt ebenfalls:
// Google antwortet seit 2026-09 mit 404 "This model is no longer available to
// new users. Please update your code to use models/gemini-3.5-flash-lite".
//
// Beide Male lief derselbe Ablauf: Der Gemini-Call scheiterte, der Code fiel
// still auf Workers AI zurueck - und weil der Fallback selbst kaputt war
// (siehe callWorkersAI), wurde aus einer Modell-Umbenennung ein kompletter
// Ausfall der AI-Engine. Ueber env.GEMINI_MODEL ohne Redeploy wechselbar.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

// Alle Sprachen primaer ueber Gemini (bessere Antwortqualitaet als das kostenlose
// Llama 3.3 auch fuer DE/EN, siehe release-notes.txt) - Workers AI nur noch als
// Fallback, falls Gemini scheitert (z.B. Kontingent/429), nicht mehr sprachbasiert
// geroutet. `lang` bleibt Parameter, weil callGemini/callWorkersAI ihn nicht
// brauchen, aber die Funktionssignatur von index.ts unveraendert bleiben soll.

// maxTokens optional ueberschreibbar (Sprint 5, S5-4): der einzige Pro-
// Unterschied auf Modellebene ist mehr Antwortlaenge (350->700), nicht ein
// anderes Modell (Stufe 1, 4.18.3) - modelRouter-Logik selbst bleibt sonst
// unangetastet (Stabilitaetsregel).
export async function callModel(
  env: Env,
  _lang: Lang,
  systemPrompt: string,
  userPayload: string,
  maxTokens: number = MAX_TOKENS,
): Promise<string> {
  try {
    // callGemini bricht via eigenem AbortController nach MODEL_TIMEOUT_MS ab
    // und cancelt dabei den fetch - deshalb hier kein zusaetzliches withTimeout.
    return await callGemini(env, systemPrompt, userPayload, maxTokens);
  } catch (err) {
    // Fallback auf Workers AI (Llama), z.B. wenn Gemini-Kontingent erschoepft ist
    // (429) - schwaechere Antwortqualitaet, aber besser als ein harter Fehler.
    // env.AI.run kennt keinen Cancel, daher hier der withTimeout-Wrapper.
    logFallbackAlert("gemini_call_failed_fallback_workers_ai", err);
    await meldeFehler(env, { bereich: "ki", code: "fallback_workers_ai", schwere: "W", detail: err instanceof Error ? err.message : undefined });
    // Scheitert AUCH der Fallback, muss der urspruengliche Grund mitkommen.
    // Sonst steht am Ende nur "workers_ai_unexpected_response" und der
    // eigentliche Ausloeser - der Gemini-Fehler - ist nicht mehr feststellbar
    // (Befund 2026-09-06).
    try {
      return await withTimeout(
        callWorkersAI(env, systemPrompt, userPayload, maxTokens),
        MODEL_TIMEOUT_MS,
      );
    } catch (fallbackErr) {
      const primaer = err instanceof Error ? err.message : "unknown_error";
      const sekundaer = fallbackErr instanceof Error ? fallbackErr.message : "unknown_error";
      throw new Error(`gemini=${primaer} | fallback=${sekundaer}`);
    }
  }
}

// S0-3: sichtbare Fallback-Alarmierung statt reinem console.error - der Fall
// vom 01.06.2026 (stiller Fallback auf das schwaechere Llama-Modell ueber
// Wochen unbemerkt) soll sich nicht wiederholen. Bewusst additiv, keine
// Aenderung an der Modell-Auswahl-Logik selbst (4.18.1a, Nutzerentscheidung
// 03.08.: kein vorgezogener Modellwechsel). Ohne eigene Alerting-Infrastruktur
// ist ein strukturiertes, klar suchbares Log-Prefix die pragmatische Umsetzung -
// ein echter Alert-Webhook kann spaeter ergaenzt werden, ohne Aufrufer anzufassen.
function logFallbackAlert(event: string, err: unknown): void {
  console.error(
    `[FALLBACK_ALERT] ${event}`,
    JSON.stringify({ event, message: err instanceof Error ? err.message : "unknown_error", ts: Date.now() }),
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`model_timeout_${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function callWorkersAI(
  env: Env,
  systemPrompt: string,
  userPayload: string,
  maxTokens: number,
): Promise<string> {
  const result = await env.AI.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
    max_tokens: maxTokens,
    temperature: TEMPERATURE,
  });

  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const obj = result as { response?: unknown; choices?: unknown };
    if (typeof obj.response === "string") return obj.response;
    // OpenAI-kompatible Form (Befund 2026-09-06): Workers AI liefert fuer
    // llama-3.3-70b `{choices:[{message:{content}}]}`. Der Code kannte nur
    // die aeltere `{response}`-Form und warf deshalb, OBWOHL das Modell
    // korrekt geantwortet hatte. Damit war der Fallback wirkungslos - genau
    // dann, wenn er gebraucht wurde.
    if (Array.isArray(obj.choices)) {
      const inhalt = (obj.choices[0] as { message?: { content?: unknown } } | undefined)?.message
        ?.content;
      if (typeof inhalt === "string") return inhalt;
    }
  }
  // Die tatsaechliche Form mitgeben - "unexpected" allein sagt nicht, WAS kam.
  throw new Error(
    `workers_ai_unexpected_response:${JSON.stringify(result)?.slice(0, 60) ?? typeof result}`,
  );
}

// ═══ Vision-Call fuer /api/expose-extract ═══
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 11.5/11.6.
// Bewusst OHNE Workers-AI-Fallback: Llama 3.3 kann keine Bilder verarbeiten.
// Schlaegt Gemini fehl, gibt es keinen Ausweichpfad, nur einen Fehlerzustand.
const VISION_MAX_TOKENS = 8192; // ein voller Datensatz nach Schema, nicht ein Chat-Absatz
const VISION_TEMPERATURE = 0; // Extraktion, nicht Formulierung - so wenig Streuung wie moeglich
const VISION_TIMEOUT_MS = 60000; // 15 Bilder brauchen deutlich laenger als ein Text-Call

// Dasselbe Modell wie der Text-Chat (Nutzerentscheidung 2026-07-27), jetzt
// aktualisiert auf "gemini-2.5-flash-lite" (siehe DEFAULT_GEMINI_MODEL oben -
// "gemini-2.0-flash-lite" ist seit 01.06.2026 abgeschaltet). Ueber
// EXPOSE_GEMINI_MODEL ohne Redeploy wechselbar, falls sich die
// Extraktionsqualitaet als zu schwach erweist.
const DEFAULT_VISION_MODEL = "gemini-3.5-flash-lite";

// Fallback-Modell auf Workers AI. Die urspruengliche Spec-Annahme "kein
// Vision-Fallback moeglich" galt fuer Llama 3.3 (Text-Chat) - inzwischen liegen
// bildfaehige Modelle auf dem Konto. Mistral Small 3.1 nimmt Bilder als
// Data-URL entgegen (genau das Format, das der Client liefert) und kann per
// `guided_json` auf das Schema gezwungen werden.
const DEFAULT_VISION_FALLBACK = "@cf/mistralai/mistral-small-3.1-24b-instruct";

// Kette: Gemini (Hauptmodell) -> Gemini (zweites Modell) -> Workers AI.
// Befund 2026-11-05 (Prod): Gemini antwortete mit 503 (Ueberlastung), der Code fiel sofort auf
// Workers AI zurueck, dessen Antwortform nicht gelesen wurde - Nutzer sah "nicht auswerten".
// Deshalb: vorlaeufige Fehler (429/5xx) werden wiederholt, danach springt ein zweites Gemini-Modell
// (andere Kapazitaet als das Lite-Modell) ein, erst dann das schwaechere Workers AI.
const DEFAULT_VISION_MODEL_2 = "gemini-3.5-flash";
const VISION_RETRY_WARTEN_MS = [1000, 3000];

const RECITATION_ZUSATZ = `

WICHTIG: Formuliere alle Textfelder frei in eigenen Worten, kuerzer als die Vorlage, und zitiere nichts woertlich. Keine Beschreibung laenger als 400 Zeichen.`;

// 429 und 5xx sind vorlaeufig (Last, Kontingent-Spitze); 4xx wie 400/404 sind dauerhaft.
function istVorlaeufig(err: unknown): boolean {
  return err instanceof Error && /gemini_vision_request_failed_(429|500|502|503|504)/.test(err.message);
}

function wartePause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geminiVisionMitWiederholung(
  env: Env,
  model: string,
  systemPrompt: string,
  dateien: InlineDatei[],
): Promise<string> {
  let prompt = systemPrompt;
  let recitationVersucht = false;
  for (let versuch = 0; ; versuch++) {
    try {
      return await callGeminiVision(env, prompt, dateien, model);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // RECITATION: Antwort enthielte lange Passagen des Quelltexts - einmal mit Vorgabe wiederholen.
      if (msg.includes("finish=RECITATION") && !recitationVersucht) {
        recitationVersucht = true;
        logFallbackAlert(`gemini_vision_recitation_retry:${model}`, err);
        prompt = systemPrompt + RECITATION_ZUSATZ;
        continue;
      }
      if (istVorlaeufig(err) && versuch < VISION_RETRY_WARTEN_MS.length) {
        logFallbackAlert(`gemini_vision_retry:${model}`, err);
        await wartePause(VISION_RETRY_WARTEN_MS[versuch]);
        continue;
      }
      throw err;
    }
  }
}

export async function callVisionModel(
  env: Env,
  systemPrompt: string,
  schema: object,
  dateien: InlineDatei[],
): Promise<string> {
  const modelle = [
    env.EXPOSE_GEMINI_MODEL || DEFAULT_VISION_MODEL,
    env.EXPOSE_GEMINI_MODEL_2 || DEFAULT_VISION_MODEL_2,
  ].filter((m, i, alle) => alle.indexOf(m) === i);

  const fehler: string[] = [];
  for (const model of modelle) {
    try {
      return await geminiVisionMitWiederholung(env, model, systemPrompt, dateien);
    } catch (err) {
      fehler.push(`${model}=${err instanceof Error ? err.message : "unknown_error"}`);
      logFallbackAlert(`gemini_vision_failed:${model}`, err);
      await meldeFehler(env, { bereich: "expose", code: "fallback_gemini_modell", schwere: "W", detail: `${model}: ${err instanceof Error ? err.message : "?"}` });
    }
  }

  logFallbackAlert("gemini_vision_failed_fallback_workers_ai", new Error(fehler.join(" | ")));
  await meldeFehler(env, { bereich: "expose", code: "fallback_workers_ai", schwere: "W", detail: fehler.join(" | ") });
  try {
    return await withTimeout(
      callWorkersAiVision(env, systemPrompt, schema, dateien),
      VISION_TIMEOUT_MS,
    );
  } catch (fallbackErr) {
    // Beide Ebenen im Fehlertext, sonst ist der Ausloeser spaeter nicht mehr feststellbar.
    const sekundaer = fallbackErr instanceof Error ? fallbackErr.message : "unknown_error";
    throw new Error(`${fehler.join(" | ")} | workers_ai=${sekundaer}`);
  }
}

async function callWorkersAiVision(
  env: Env,
  systemPrompt: string,
  schema: object,
  dateien: InlineDatei[],
): Promise<string> {
  const model = (env.EXPOSE_VISION_FALLBACK_MODEL || DEFAULT_VISION_FALLBACK) as
    keyof AiModels;

  const inhalt: unknown[] = [{ type: "text", text: systemPrompt }];

  for (const f of dateien) {
    if (f.mimeType === "application/pdf") {
      // Bildmodelle koennen kein PDF ("cannot identify image file"), deshalb
      // vorher ueber die Markdown-Konvertierung von Workers AI in Text
      // wandeln. Gemini bekommt das PDF weiterhin im Original - dort bleibt
      // das Layout erhalten, hier geht es nur um die Rettung (Spec 11.6).
      const text = await pdfZuText(env, f);
      inhalt.push({
        type: "text",
        text: `Inhalt des hochgeladenen Expose-PDF als Text:\n\n${text}`,
      });
      continue;
    }
    inhalt.push({ type: "image_url", image_url: { url: `data:${f.mimeType};base64,${f.data}` } });
  }

  const result = (await env.AI.run(model, {
    messages: [{ role: "user", content: inhalt }],
    guided_json: schema,
    max_tokens: VISION_MAX_TOKENS,
    temperature: VISION_TEMPERATURE,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)) as unknown;

  return leseWorkersAiVisionAntwort(result);
}

// Workers AI liefert je nach Modell `{response}`, `{description}` oder die OpenAI-Form
// `{choices:[{message:{content}}]}` (Befund 2026-11-05, vorher bei Llama schon 2026-09-06).
// `response` kann bei guided_json auch schon ein geparstes Objekt sein.
export function leseWorkersAiVisionAntwort(result: unknown): string {
  if (typeof result === "string") return result;
  const obj = (result ?? {}) as {
    response?: unknown;
    description?: unknown;
    choices?: { message?: { content?: unknown }; text?: unknown }[];
  };
  const kandidaten: unknown[] = [
    obj.response,
    obj.description,
    obj.choices?.[0]?.message?.content,
    obj.choices?.[0]?.text,
  ];
  for (const k of kandidaten) {
    if (typeof k === "string" && k.trim().length > 0) return k;
    if (k && typeof k === "object") return JSON.stringify(k);
  }
  throw new Error(
    `workers_ai_vision_unexpected_response:${JSON.stringify(result)?.slice(0, 120) ?? typeof result}`,
  );
}

// PDF -> Text ueber die Markdown-Konvertierung von Workers AI (env.AI.toMarkdown).
// Bewusst kein PDF-Parser im Client: das waere ein zusaetzliches Paket im
// Bundle einer PWA, die sonst ohne solche Abhaengigkeiten auskommt.
async function pdfZuText(env: Env, datei: InlineDatei): Promise<string> {
  const blob = base64ZuBlob(datei.data, datei.mimeType);
  const konvertiert = await env.AI.toMarkdown([{ name: "expose.pdf", blob }]);
  const eintrag = Array.isArray(konvertiert) ? konvertiert[0] : konvertiert;
  const text = (eintrag as { data?: unknown })?.data;
  if (typeof text !== "string" || text.trim().length === 0) {
    // Passiert bei reinen Scan-PDFs ohne Textebene - dann gibt es hier nichts
    // zu holen und der Nutzer braucht eine ehrliche Meldung, keinen Fantasie-
    // Datensatz (siehe extraction_failed in index.ts).
    throw new Error("pdf_ohne_text");
  }
  return text;
}

function base64ZuBlob(base64: string, mimeType: string): Blob {
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function callGeminiVision(
  env: Env,
  systemPrompt: string,
  dateien: InlineDatei[],
  modelOverride?: string,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }
  const model = modelOverride || env.EXPOSE_GEMINI_MODEL || DEFAULT_VISION_MODEL;

  const parts = dateien.map((f) => ({
    inline_data: { mime_type: f.mimeType, data: f.data },
  }));

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            maxOutputTokens: VISION_MAX_TOKENS,
            temperature: VISION_TEMPERATURE,
            // Zwingt das Modell auf JSON - erspart das Abfangen von
            // Markdown-Codebloecken im Regelfall (exposeOutput.ts faengt den
            // Rest trotzdem ab, falls das Modell sich nicht daran haelt).
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(abortTimer);
  }

  if (!res.ok) {
    // Googles Fehlertext mitgeben (503 "high demand" vs. 429 Kontingent vs. 404 Modell weg).
    const detail = (await res.text().catch(() => "")).slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`gemini_vision_request_failed_${res.status}:${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    // Grund mitgeben (Befund 2026-10-05: Gemini lieferte beim echten Expose keinen Text, im Log
    // stand nur "unexpected_response" und der Ausweichpfad lieferte unvollstaendige Felder).
    const grund = [
      `finish=${json.candidates?.[0]?.finishReason ?? "none"}`,
      `block=${json.promptFeedback?.blockReason ?? "none"}`,
      `kandidaten=${json.candidates?.length ?? 0}`,
      `parts=${json.candidates?.[0]?.content?.parts?.length ?? 0}`,
      `promptTokens=${json.usageMetadata?.promptTokenCount ?? "?"}`,
      `antwortTokens=${json.usageMetadata?.candidatesTokenCount ?? "?"}`,
      `gedankenTokens=${json.usageMetadata?.thoughtsTokenCount ?? "?"}`,
    ].join(" ");
    throw new Error(`gemini_vision_unexpected_response ${grund}`);
  }
  return text;
}

async function callGemini(
  env: Env,
  systemPrompt: string,
  userPayload: string,
  maxTokens: number,
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }

  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Neuere ("Authorization")-Keys, an ein Service-Konto gebunden,
          // werden per Header authentifiziert, nicht per ?key=-Query-Parameter.
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPayload }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: TEMPERATURE },
        }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(abortTimer);
  }

  if (!res.ok) {
    // Googles Fehlertext mitgeben: bei 404 nennt er das Modell, bei 400 das
    // beanstandete Feld. Ohne ihn ist ein blosses "failed_404" nicht
    // diagnostizierbar (Befund 2026-09-06).
    const detail = (await res.text().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`gemini_request_failed_${res.status}:${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("gemini_unexpected_response");
  }
  return text;
}

// ═══ Call fuer /api/v1/lage (Lage-Analyse) ═══
// Spec: docs/technical_specs/objektseite-vereinfachung-2026-09-23.md
// Abschnitt 8. Urspruenglich mit Google-Search-Grounding (tools:
// [{google_search:{}}]) gebaut - Nutzer-Vorgabe 2026-09-10 war live
// recherchierte, aktuelle Standort-Fakten. Live-Test 2026-09-23 zeigte einen
// 429 von Google ("exceeded your current quota, please check your plan and
// billing details") - Grounding braucht fuer dieses Google-Projekt einen
// bezahlten Plan, den es (noch) nicht gibt. Nutzer-Entscheidung 2026-09-23:
// dauerhaft OHNE Websuche, ganz normaler Gemini-Call wie bei den uebrigen
// KI-Produkten dieser App (kein Billing-Zwang). Der Prompt (lagePrompt.ts)
// ist entsprechend angepasst: kein Verweis mehr auf "deine Suche", keine
// Erwartung an aktuelle/brandneue Ereignisse, nur stabiles Allgemeinwissen.
//
// Bewusst weiterhin OHNE Workers-AI-Fallback: dieser Aufruf behauptet reale
// Fakten (Wirtschaftsstruktur, Grossprojekte), nicht nur eine Einordnung
// bereits berechneter Zahlen wie beim Chat/Briefing - ein zweites, noch
// schwaecheres Modell wuerde das Erfindungsrisiko nur erhoehen, nicht
// absichern.
export const LAGE_MAX_TOKENS = 600;
const LAGE_TEMPERATURE = 0.2; // niedrig: Fakten statt Kreativitaet

export async function callLageModel(
  env: Env,
  systemPrompt: string,
  userPayload: string,
  // Standard sind die knappen Werte der Lage-Analyse; laengere Fliesstexte
  // (Alternativ-Investment) setzen eigene Grenzen.
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPayload }] }],
          generationConfig: {
            maxOutputTokens: opts.maxTokens ?? LAGE_MAX_TOKENS,
            temperature: opts.temperature ?? LAGE_TEMPERATURE,
          },
        }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(abortTimer);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`gemini_lage_request_failed_${res.status}:${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text.trim()) {
    throw new Error("gemini_lage_unexpected_response");
  }
  return text;
}

// ═══ Sonde (siehe betrieb.ts, fuehreSondeAus) ═══
// Kleinste moegliche Anfrage je Modell. Es zaehlt nur, ob Google antwortet - nicht der Text.

/** Alle Gemini-Modelle, auf die sich die App verlaesst (Chat, Vision Haupt- und Zweitmodell), ohne Dopplungen. */
export function sondenModelle(env: Env): string[] {
  const alle = [
    env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    env.EXPOSE_GEMINI_MODEL || DEFAULT_VISION_MODEL,
    env.EXPOSE_GEMINI_MODEL_2 || DEFAULT_VISION_MODEL_2,
  ];
  return alle.filter((m, i) => alle.indexOf(m) === i);
}

export async function pruefeGeminiModell(env: Env, model: string): Promise<SondenPunkt> {
  const name = `gemini:${model}`;
  if (!env.GEMINI_API_KEY) return { name, ok: false, detail: "gemini_api_key_missing" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Antworte nur mit OK." }] }],
        generationConfig: { maxOutputTokens: 16, temperature: 0 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 120).replace(/\s+/g, " ");
      return { name, ok: false, detail: `http_${res.status} ${detail}` };
    }
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

export async function pruefeWorkersAi(env: Env): Promise<SondenPunkt> {
  try {
    await withTimeout(callWorkersAI(env, "Antworte nur mit OK.", "Test", 8), MODEL_TIMEOUT_MS);
    return { name: "workers_ai", ok: true };
  } catch (err) {
    return { name: "workers_ai", ok: false, detail: err instanceof Error ? err.message : "unknown" };
  }
}
