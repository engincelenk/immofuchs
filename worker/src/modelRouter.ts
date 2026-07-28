import type { Env, InlineDatei, Lang } from "./types";

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
  userPayload: string,
): Promise<string> {
  try {
    // callGemini bricht via eigenem AbortController nach MODEL_TIMEOUT_MS ab
    // und cancelt dabei den fetch - deshalb hier kein zusaetzliches withTimeout.
    return await callGemini(env, systemPrompt, userPayload);
  } catch (err) {
    // Fallback auf Workers AI (Llama), z.B. wenn Gemini-Kontingent erschoepft ist
    // (429) - schwaechere Antwortqualitaet, aber besser als ein harter Fehler.
    // env.AI.run kennt keinen Cancel, daher hier der withTimeout-Wrapper.
    console.error(
      "gemini_call_failed_fallback_workers_ai",
      err instanceof Error ? err.message : "unknown_error",
    );
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
      },
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

// ═══ Vision-Call fuer /api/expose-extract ═══
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 11.5/11.6.
// Bewusst OHNE Workers-AI-Fallback: Llama 3.3 kann keine Bilder verarbeiten.
// Schlaegt Gemini fehl, gibt es keinen Ausweichpfad, nur einen Fehlerzustand.
const VISION_MAX_TOKENS = 4096; // ein voller Datensatz nach Schema, nicht ein Chat-Absatz
const VISION_TEMPERATURE = 0; // Extraktion, nicht Formulierung - so wenig Streuung wie moeglich
const VISION_TIMEOUT_MS = 60000; // 15 Bilder brauchen deutlich laenger als ein Text-Call

// Dasselbe Modell wie der Text-Chat (Nutzerentscheidung 2026-07-27). Der
// urspruenglich gewaehlte staerkere "gemini-2.0-flash" lief in denselben
// 429 wie alles andere auf diesem Key - die Modellwahl war nicht die Ursache,
// siehe release-notes.txt. Ueber EXPOSE_GEMINI_MODEL ohne Redeploy wechselbar,
// falls sich die Extraktionsqualitaet als zu schwach erweist.
const DEFAULT_VISION_MODEL = "gemini-2.0-flash-lite";

// Fallback-Modell auf Workers AI. Die urspruengliche Spec-Annahme "kein
// Vision-Fallback moeglich" galt fuer Llama 3.3 (Text-Chat) - inzwischen liegen
// bildfaehige Modelle auf dem Konto. Mistral Small 3.1 nimmt Bilder als
// Data-URL entgegen (genau das Format, das der Client liefert) und kann per
// `guided_json` auf das Schema gezwungen werden.
const DEFAULT_VISION_FALLBACK = "@cf/mistralai/mistral-small-3.1-24b-instruct";

// Erst Gemini, bei jedem Fehler Workers AI. Analog zu callModel beim Chat -
// ein 429 oder Timeout beim einen Anbieter darf das Feature nicht killen.
export async function callVisionModel(
  env: Env,
  systemPrompt: string,
  schema: object,
  dateien: InlineDatei[],
): Promise<string> {
  try {
    return await callGeminiVision(env, systemPrompt, dateien);
  } catch (err) {
    console.error(
      "gemini_vision_failed_fallback_workers_ai",
      err instanceof Error ? err.message : "unknown_error",
    );
    return withTimeout(
      callWorkersAiVision(env, systemPrompt, schema, dateien),
      VISION_TIMEOUT_MS,
    );
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
  } as any)) as { response?: unknown };

  if (typeof result?.response === "string") return result.response;
  // Manche Bildmodelle antworten mit "description" statt "response".
  const beschreibung = (result as { description?: unknown }).description;
  if (typeof beschreibung === "string") return beschreibung;
  throw new Error("workers_ai_vision_unexpected_response");
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
): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }
  const model = env.EXPOSE_GEMINI_MODEL || DEFAULT_VISION_MODEL;

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
    throw new Error(`gemini_vision_request_failed_${res.status}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("gemini_vision_unexpected_response");
  }
  return text;
}

async function callGemini(env: Env, systemPrompt: string, userPayload: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("gemini_api_key_missing");
  }

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
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
          generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: TEMPERATURE },
        }),
        signal: controller.signal,
      },
    );
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
