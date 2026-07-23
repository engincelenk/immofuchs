import type { Env, Lang } from "./types";

const MAX_TOKENS = 350; // erhoeht von 220 fuer laengere Antworten (~160 statt 80 Woerter)
// mit aktiven Stellschrauben-Vorschlaegen, bewusste Produktentscheidung (siehe release-notes.txt)
const TEMPERATURE = 0.3; // niedrig fuer konsistentere Antworten, siehe Konzept 2.9
const MODEL_TIMEOUT_MS = 20000; // Schutz gegen haengende/degradierte Model-Calls (siehe release-notes.txt)

const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Verifiziert per /v1beta/models-Abfrage gegen den echten Key (2026-07-19) -
// "gemini-2.5-flash-lite" existierte fuer dieses Konto nicht (404), dieser
// Name ist bestaetigt vorhanden. Siehe release-notes.txt fuer die Diagnose.
const GEMINI_MODEL = "gemini-2.0-flash-lite";

// Alle Sprachen primaer ueber Gemini (bessere Antwortqualitaet als das kostenlose
// Llama 3.3 auch fuer DE/EN, siehe release-notes.txt) - Workers AI nur noch als
// Fallback, falls Gemini scheitert (z.B. Kontingent/429), nicht mehr sprachbasiert
// geroutet. `lang` bleibt Parameter, weil callGemini/callWorkersAI ihn nicht
// brauchen, aber die Funktionssignatur von index.ts unveraendert bleiben soll.

export async function callModel(
  env: Env,
  _lang: Lang,
  systemPrompt: string,
  userPayload: string
): Promise<string> {
  try {
    // callGemini bricht via eigenem AbortController nach MODEL_TIMEOUT_MS ab
    // und cancelt dabei den fetch - deshalb hier kein zusaetzliches withTimeout.
    return await callGemini(env, systemPrompt, userPayload);
  } catch (err) {
    // Fallback auf Workers AI (Llama), z.B. wenn Gemini-Kontingent erschoepft ist
    // (429) - schwaechere Antwortqualitaet, aber besser als ein harter Fehler.
    // env.AI.run kennt keinen Cancel, daher hier der withTimeout-Wrapper.
    console.error("gemini_call_failed_fallback_workers_ai", err instanceof Error ? err.message : "unknown_error");
    return withTimeout(callWorkersAI(env, systemPrompt, userPayload), MODEL_TIMEOUT_MS);
  }
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
      }
    );
  });
}

async function callWorkersAI(env: Env, systemPrompt: string, userPayload: string): Promise<string> {
  const result = await env.AI.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "response" in result) {
    const response = (result as { response?: unknown }).response;
    if (typeof response === "string") return response;
  }
  throw new Error("workers_ai_unexpected_response");
}

async function callGemini(env: Env, systemPrompt: string, userPayload: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
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
        generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(abortTimer);
  }

  if (!res.ok) {
    throw new Error(`gemini_request_failed_${res.status}`);
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
