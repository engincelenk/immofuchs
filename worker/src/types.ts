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

// Strukturierter Widerspruch fuer die Finn-Konsistenz-Engine
// (Finn_Expose_Analyse_Spec_v2.md, Abschnitt 1.1).
//
// Warum zusaetzlich zu `warnungen`: dort steht der Widerspruch nur als
// Freitext-Hinweis an einem Feld. Der zweite, *beworbene* Wert geht dabei
// verloren - genau der wird aber gebraucht, um die Preistabelle
// "Beworben | Real" zu bauen und den Euro-Schaden zu beziffern
// ("50 m2 beworben, 47,88 m2 belegt" -> 2,12 m2 x 3.980 EUR = 8.437,60 EUR).
// `warnungen` bleibt unveraendert bestehen: die Feldzeilen-Anzeige im Client
// (exposeMapping.js) liest sie weiterhin.
export interface ExposeAbweichung {
  feld: string;
  wert_a: number | string;
  quelle_a: string;
  wert_b: number | string;
  quelle_b: string;
  hinweis: string;
}

// Expose-Roentgen (Spec neue-phase2, KI-Tool #4): inhaltliche Risikobewertung
// des Exposetexts - anders als `warnungen` (fehlende/unsichere FELDER) und
// `abweichungen` (WIDERSPRUeCHE zwischen Quellen) geht es hier um Signalwoerter
// und Auffaelligkeiten im Fliesstext selbst (Sanierungsstau, schlechte
// Energieklasse, Erbpacht, Denkmalschutz, lange Standzeit etc.), die der
// Nutzer sonst leicht ueberliest.
export type ExposeRisikoSchwere = "hoch" | "mittel" | "niedrig";

export interface ExposeRisiko {
  code: string;
  schwere: ExposeRisikoSchwere;
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
  // Keller-/Abstellflaeche. Bewusst getrennt von der Wohnflaeche: ohne eigenes
  // Feld hat das Modell beide addiert, was Preis je m² und Rendite verfaelscht.
  nutzflaeche: number | null;
  plz: string | null;
  ort: string | null;
  strasse: string | null;
  hausnummer: string | null;
  stockwerk: string | null;
  baujahr: number | null;
  // Zustandsangabe im Klartext ("gepflegt", "renovierungsbeduerftig") - der
  // Client leitet daraus eine grobe Renovierungskostenschaetzung ab.
  zustand: string | null;
  // Anzahl Wohneinheiten im Haus: Basis fuer den eigenen Anteil an einer
  // Sonderumlage.
  wohneinheiten: number | null;
  vermietet: boolean | null;
  // Mietbeginn bzw. Datum, ab dem die aktuelle Miete gilt. Speist zusammen mit
  // der Kaltmiete den Mieterhoehungsrechner (§ 558 BGB).
  vermietet_seit: string | null;
}

export interface ExposeAusstattung {
  balkon_terrasse: boolean | null;
  einbaukueche: boolean | null;
  stellplatz: string | null;
  // Mehr Stellplaetze als Wohnungen heisst: einer laesst sich separat vermieten.
  stellplatz_anzahl: number | null;
  keller: boolean | null;
  barrierefrei: boolean | null;
  heizungsart: string | null;
  // Baujahr des Waermeerzeugers, nicht des Gebaeudes. Entscheidet ueber die
  // Altersstufe im Sanierungsrechner und damit ueber den 20-%-Klimabonus.
  baujahr_waermeerzeuger: number | null;
}

export interface ExposeEnergie {
  energieausweistyp: string | null;
  energietraeger: string | null;
  endenergiebedarf: number | null;
  energieeffizienzklasse: string | null;
}

export interface ExposeKosten {
  hausgeld: number | null;
  // Nicht umlagefaehiger Anteil des Hausgelds. Reine Anzeige im Client: die
  // nicht umlagefaehigen Kosten werden dort aus der Wohnflaeche gerechnet,
  // damit der Wert ueber Objekte hinweg vergleichbar bleibt.
  hausgeld_nicht_umlagefaehig: number | null;
  // Monatliche Zufuehrung zur Instandhaltungsruecklage.
  ruecklage_monatlich: number | null;
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
  abweichungen: ExposeAbweichung[];
  risiken: ExposeRisiko[];
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
  // Erlaubt, das Text-Chat-Modell ohne Redeploy zu wechseln (siehe modelRouter.ts,
  // analog zu EXPOSE_GEMINI_MODEL fuer Vision) - wichtig, weil Google Gemini-Modelle
  // in kurzen Zyklen abkuendigt (z.B. gemini-2.0-flash-lite zum 01.06.2026).
  GEMINI_MODEL?: string;
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

  // ═══ Kommerzialisierung (2026-08, Sprints 0-5b) ═══
  DB: D1Database;

  // Auth/Session (4.5, 10.0 Bearer-Token-Vorbereitung fuer Capacitor)
  SESSION_SIGNING_SECRET?: string; // HMAC-Key fuer den Entitlement-TTL-Cache im Cookie (4.9)
  // Turnstile-Secret der Registrierung (Schritt A der Preispolitik 2026-08-20).
  // Liegt im Wrangler-Secret-Store, nie in wrangler.toml. Fehlt es, laesst
  // pruefeTurnstile() durch und warnt im Log - siehe src/turnstile.ts.
  TURNSTILE_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string; // Services-ID, z.B. "info.immofuchs.web"
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string; // PKCS8, ES256 - fuer den JWT-Client-Secret-Flow (4.5)
  RESEND_API_KEY?: string;
  MAGIC_LINK_FROM_EMAIL?: string; // z.B. "ImmoFuchs <login@immofuchs.info>"
  // Cloudflare Email Sending (Ergaenzung 05.08.): Binding statt API-Key.
  // Optional, damit der Worker auch ohne konfiguriertes Binding laeuft (dann
  // greift Resend bzw. der Log-Fallback, siehe email.ts). Struktureller Typ
  // statt Import aus @cloudflare/workers-types: das Binding ist noch Beta, die
  // Typdefinition dort wechselt schneller als der hier genutzte Ausschnitt.
  EMAIL?: {
    send(message: {
      to: string | string[];
      from: { email: string; name?: string };
      subject: string;
      html?: string;
      text?: string;
    }): Promise<unknown>;
  };
  APP_BASE_URL?: string; // fuer Magic-Link-/OAuth-Redirect-Ziele, z.B. "https://immofuchs.info"

  // Stripe (Wechsel weg von Paddle als Merchant of Record, siehe
  // docs/plans/2026-08-26-paddle-zu-stripe-migration-spec.md - Paddle-Code
  // und -ENV-Variablen wurden komplett entfernt, kein Parallelbetrieb).
  // Secret Key verlaesst den Worker nie in Richtung Client.
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID_MONTHLY?: string;
  STRIPE_PRICE_ID_YEARLY?: string;
  // QA-Hilfsmittel (2026-08-18): Mails an is_test_user-Konten (siehe
  // db.ts, setUserFlags) landen bei gesetztem Wert hier statt an die
  // Test-Adresse - so lassen sich echte Test-E-Mail-Adressen (test.free@...)
  // fuer Login/Entitlement verwenden, ohne dass echte Mails an nicht
  // existierende Postfaecher gehen. Nur in [env.dev.vars] gesetzt, siehe
  // notifications.ts.
  TEST_EMAIL_REDIRECT_TO?: string;

  // Feature-Gating (4.0a, 4.18, 4.9)
  OBJECTS_SOFT_CAP?: string;
  FINN_PRO_DAILY_LIMIT?: string;
  // Free-Kontingent seit 2026-08-18 kein Tageslimit mehr, sondern insgesamt
  // N Anfragen je Rechnertyp (dauerhaft, siehe SessionRateLimiter).
  FINN_FREE_MAX_TOKENS?: string;
  FINN_PRO_MAX_TOKENS?: string;
  FINN_FREE_GLOBAL_CUTOFF_RATIO?: string;
  // Kostenloser Exposé-Scan pro Gerät (2026-08-18: 1x -> Nx, siehe
  // getExposeTrialCount in db.ts).

  // ═══ Native Push (Phase D, S7-1) — zweiter Notification-Kanal neben E-Mail ═══
  // Ohne diese Werte bleibt Push ein No-Op (kein Crash) - siehe push.ts.
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string; // komplettes Service-Account-JSON als String
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_PRIVATE_KEY?: string; // PKCS8, ES256
  APNS_BUNDLE_ID?: string;
  APNS_ENV?: string; // "sandbox" | "production"
}
