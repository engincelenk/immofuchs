export type Rechner =
  "renditerechner" | "finanzierung" | "miete" | "sanierung" | "steuertrick" | "vorfaelligkeit";

export type Lang = "de" | "en" | "tr" | "zh" | "hi";

export type Tier = "green" | "yellow" | "red" | null;

export interface VerlaufEintrag {
  rolle: "user" | "assistant";
  text: string;
}

export interface VergleichsObjekt {
  name: string;
  tab: Rechner;
  felder: Record<string, unknown>;
}

export interface AssistantRequest {
  rechner: Rechner;
  frage: string;
  kontext: Record<string, unknown>;
  vergleichsObjekte?: VergleichsObjekt[];
  verlauf: VerlaufEintrag[];
  lang: Lang;
  sessionId: string;
}

export interface AssistantResponse {
  antwort: string;
  tier: Tier;
}

export interface Env {
  AI: Ai;
  RATE_LIMITER_DO: DurableObjectNamespace<import("./sessionRateLimiter").SessionRateLimiter>;
  ASSISTANT_ENABLED: string;
  ALLOWED_ORIGIN: string;
  DAILY_REQUEST_LIMIT: string;
  IP_DAILY_LIMIT?: string;
  GLOBAL_DAILY_LIMIT?: string;
  GEMINI_API_KEY?: string;
}
