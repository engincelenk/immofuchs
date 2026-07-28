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

// ═══ Expose-/Screenshot-Extraktion (/api/expose-extract) ═══
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 5 und 11.
// Bewusst getrennt von AssistantRequest/AssistantResponse: eigener Endpunkt,
// eigener Prompt, eigenes Kostenprofil, eigener Kill-Switch.

// Ein hochgeladenes Bild/PDF in der Form, die Gemini als `inline_data` erwartet.
// Auf der Leitung kommen die Dateien als Data-URL an ("data:image/jpeg;base64,..."),
// der Validator zerlegt sie in mimeType + reines Base64 (siehe validator.ts).
export interface InlineDatei {
  mimeType: string;
  data: string;
}

export interface ExposeExtractRequest {
  images: InlineDatei[];
  pdf?: InlineDatei;
  lang: Lang;
  sessionId: string;
}

// Werte laut Spec 4.7: sagt nur, wie sicher das Modell beim *Lesen* war -
// nicht, ob die Angabe des Anbieters selbst stimmt.
export type ConfidenceWert = "sicher" | "unsicher" | "nicht_gefunden";

// Widerspruch ZWISCHEN mehreren Screenshots derselben Anzeige (Spec 5) -
// bewusst getrennt von confidence: hier widersprechen sich zwei valide Quellen.
export interface ExposeWarnung {
  feld: string;
  hinweis: string;
}

export interface ExposeObjekt {
  titel: string | null;
  objektart: string | null;
  kaufpreis: number | null;
  // Separat ausgewiesener Kaufpreis fuer Stellplatz/Garage (Nutzertest
  // 2026-07-28). Ohne eigenes Feld hat das Modell den Stellplatzpreis in
  // `kaufpreis` mit aufaddiert - der Renditerechner hat dafuer aber ein
  // eigenes Feld (`garage`) und rechnet die Summe selbst.
  stellplatz_kaufpreis: number | null;
  kaufpreis_pro_qm: number | null;
  zimmer: number | null;
  wohnflaeche: number | null;
  plz: string | null;
  ort: string | null;
  stockwerk: string | null;
  baujahr: number | null;
}

export interface ExposeAusstattung {
  balkon_terrasse: boolean | null;
  einbaukueche: boolean | null;
  stellplatz: string | null;
  keller: boolean | null;
  barrierefrei: boolean | null;
  heizungsart: string | null;
}

export interface ExposeEnergie {
  energieausweistyp: string | null;
  energietraeger: string | null;
  endenergiebedarf: number | null;
  energieeffizienzklasse: string | null;
}

export interface ExposeKosten {
  hausgeld: number | null;
  provision_kaeufer_prozent: number | null;
  kaufnebenkosten: number | null;
  gesamtkosten: number | null;
  kaltmiete: number | null;
  nebenkosten_miete: number | null;
}

export interface ExposeKontext {
  objektbeschreibung: string | null;
  lagebeschreibung: string | null;
}

export interface ExposeBild {
  titelbild_index: number | null;
  bildbeschreibung: string | null;
}

export interface ExposeExtractResponse {
  objekt: ExposeObjekt;
  ausstattung: ExposeAusstattung;
  energie: ExposeEnergie;
  kosten: ExposeKosten;
  kontext: ExposeKontext;
  bild: ExposeBild;
  confidence: Record<string, ConfidenceWert>;
  warnungen: ExposeWarnung[];
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
  // Eigener Kill-Switch fuer die Bild-Extraktion (Spec 11.4): teurer und
  // riskanter als Text-Chat, muss isoliert abschaltbar sein, ohne Finn
  // insgesamt lahmzulegen.
  EXPOSE_EXTRACT_ENABLED?: string;
  EXPOSE_DAILY_LIMIT?: string;
  EXPOSE_IP_DAILY_LIMIT?: string;
  EXPOSE_GLOBAL_DAILY_LIMIT?: string;
  // Erlaubt, das Vision-Modell ohne Redeploy zu wechseln (siehe modelRouter.ts).
  EXPOSE_GEMINI_MODEL?: string;
  // Workers-AI-Modell, das einspringt, wenn Gemini scheitert.
  EXPOSE_VISION_FALLBACK_MODEL?: string;
}
