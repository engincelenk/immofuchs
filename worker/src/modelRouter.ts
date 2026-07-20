import type { Env, Lang } from "./types";

const MAX_TOKENS = 220; // haelt Kosten und Bubble-Groesse vorhersehbar, siehe Konzept 2.8
const TEMPERATURE = 0.3; // niedrig fuer konsistentere Antworten, siehe Konzept 2.9
const MODEL_TIMEOUT_MS = 20000; // Schutz gegen haengende/degradierte Model-Calls (siehe release-notes.txt)

const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
// Verifiziert per /v1beta/models-Abfrage gegen den echten Key (2026-07-19) -
// "gemini-2.5-flash-lite" existierte fuer dieses Konto nicht (404), dieser
// Name ist bestaetigt vorhanden. Siehe release-notes.txt fuer die Diagnose.
const GEMINI_MODEL = "gemini-2.0-flash-lite";

// Sprach-Routing: DE/EN -> Workers AI (kostenlos, gut geprueft),
// TR/ZH/HI -> Gemini Flash-Lite (bessere Mehrsprachigkeit). Siehe Konzept 2.8.
const WORKERS_AI_LANGS: ReadonlySet<Lang> = new Set(["de", "en"]);

export async function callModel(
  env: Env,
  lang: Lang,
  systemPrompt: string,
  userPayload: string
): Promise<string> {
  const call = WORKERS_AI_LANGS.has(lang)
    ? callWorkersAI(env, systemPrompt, userPayload)
    : callGemini(env, systemPrompt, userPayload);
  return withTimeout(call, MODEL_TIMEOUT_MS);
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
