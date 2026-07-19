import type { Env, Lang } from "./types";

const MAX_TOKENS = 220; // haelt Kosten und Bubble-Groesse vorhersehbar, siehe Konzept 2.8
const TEMPERATURE = 0.3; // niedrig fuer konsistentere Antworten, siehe Konzept 2.9

const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const GEMINI_MODEL = "gemini-2.5-flash-lite";

// Sprach-Routing: DE/EN -> Workers AI (kostenlos, gut geprueft),
// TR/ZH/HI -> Gemini Flash-Lite (bessere Mehrsprachigkeit). Siehe Konzept 2.8.
const WORKERS_AI_LANGS: ReadonlySet<Lang> = new Set(["de", "en"]);

export async function callModel(
  env: Env,
  lang: Lang,
  systemPrompt: string,
  userPayload: string
): Promise<string> {
  if (WORKERS_AI_LANGS.has(lang)) {
    return callWorkersAI(env, systemPrompt, userPayload);
  }
  return callGemini(env, systemPrompt, userPayload);
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPayload }] }],
        generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE },
      }),
    }
  );

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
