import type {
  AssistantRequest,
  ExposeExtractRequest,
  InlineDatei,
  Lang,
  Rechner,
  VerlaufEintrag,
  VergleichsObjekt,
} from "./types";

export const RECHNER_VALUES: ReadonlySet<Rechner> = new Set([
  "renditerechner",
  "finanzierung",
  "miete",
  "sanierung",
  "steuertrick",
  "vorfaelligkeit",
]);

const LANG_VALUES: ReadonlySet<Lang> = new Set(["de", "en", "tr", "zh", "hi"]);

const MAX_FRAGE_LEN = 400;
const MAX_VERLAUF_EINTRAEGE = 6; // letzte 3 Frage/Antwort-Paare, siehe Konzept 2.6
// 2026-08-03: von 1000 auf 2500 angehoben - war zu knapp bemessen fuer
// modelRouter.ts MAX_TOKENS=350 (seit 2026-07-3x erhoeht fuer "laengere
// Antworten"). Eine ausfuehrliche Finn-Antwort auf Frage 1 konnte >1000
// Zeichen haben; sobald sie bei Frage 2 im verlauf mitgeschickt wurde, hat
// validateVerlauf() sie abgelehnt (400 invalid_verlauf) - der Client zeigt
// das als generischen "Kurzer Aussetzer"-Fehler, obwohl der Server sauber
// geantwortet hatte. 2500 laesst auch bei ungewoehnlich langen Antworten
// Luft (Reserve zur reinen Token->Zeichen-Hochrechnung von ~350*6).
export const MAX_VERLAUF_TEXT_LEN = 2500;
const MAX_VERGLEICHSOBJEKTE = 5;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

type ValidationResult = { ok: true; data: AssistantRequest } | { ok: false; error: string };

export function validateRequest(body: unknown, maxVerlaufTextLen: number = MAX_VERLAUF_TEXT_LEN): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_body" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.rechner !== "string" || !RECHNER_VALUES.has(b.rechner as Rechner)) {
    return { ok: false, error: "invalid_rechner" };
  }

  if (
    typeof b.frage !== "string" ||
    b.frage.trim().length === 0 ||
    b.frage.length > MAX_FRAGE_LEN
  ) {
    return { ok: false, error: "invalid_frage" };
  }

  if (typeof b.kontext !== "object" || b.kontext === null || Array.isArray(b.kontext)) {
    return { ok: false, error: "invalid_kontext" };
  }

  if (typeof b.lang !== "string" || !LANG_VALUES.has(b.lang as Lang)) {
    return { ok: false, error: "invalid_lang" };
  }

  if (typeof b.sessionId !== "string" || !SESSION_ID_PATTERN.test(b.sessionId)) {
    return { ok: false, error: "invalid_session_id" };
  }

  const verlaufResult = validateVerlauf(b.verlauf, maxVerlaufTextLen);
  if (!verlaufResult.ok) return verlaufResult;

  let vergleichsObjekte: VergleichsObjekt[] | undefined;
  if (b.vergleichsObjekte !== undefined) {
    const vergleichResult = validateVergleichsObjekte(b.vergleichsObjekte);
    if (!vergleichResult.ok) return vergleichResult;
    vergleichsObjekte = vergleichResult.data;
  }

  return {
    ok: true,
    data: {
      rechner: b.rechner as Rechner,
      frage: b.frage,
      kontext: b.kontext as Record<string, unknown>,
      vergleichsObjekte,
      verlauf: verlaufResult.data,
      lang: b.lang as Lang,
      sessionId: b.sessionId,
    },
  };
}

function validateVerlauf(
  value: unknown,
  maxVerlaufTextLen: number,
): { ok: true; data: VerlaufEintrag[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, data: [] };
  if (!Array.isArray(value) || value.length > MAX_VERLAUF_EINTRAEGE) {
    return { ok: false, error: "invalid_verlauf" };
  }
  const out: VerlaufEintrag[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return { ok: false, error: "invalid_verlauf" };
    const e = entry as Record<string, unknown>;
    if (e.rolle !== "user" && e.rolle !== "assistant")
      return { ok: false, error: "invalid_verlauf" };
    if (typeof e.text !== "string" || e.text.length === 0 || e.text.length > maxVerlaufTextLen) {
      return { ok: false, error: "invalid_verlauf" };
    }
    out.push({ rolle: e.rolle, text: e.text });
  }
  return { ok: true, data: out };
}

function validateVergleichsObjekte(
  value: unknown,
): { ok: true; data: VergleichsObjekt[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > MAX_VERGLEICHSOBJEKTE) {
    return { ok: false, error: "invalid_vergleichsobjekte" };
  }
  const out: VergleichsObjekt[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null)
      return { ok: false, error: "invalid_vergleichsobjekte" };
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== "string" || e.name.length === 0 || e.name.length > 120) {
      return { ok: false, error: "invalid_vergleichsobjekte" };
    }
    if (typeof e.tab !== "string" || !RECHNER_VALUES.has(e.tab as Rechner)) {
      return { ok: false, error: "invalid_vergleichsobjekte" };
    }
    if (typeof e.felder !== "object" || e.felder === null || Array.isArray(e.felder)) {
      return { ok: false, error: "invalid_vergleichsobjekte" };
    }
    out.push({ name: e.name, tab: e.tab as Rechner, felder: e.felder as Record<string, unknown> });
  }
  return { ok: true, data: out };
}

// ═══ Expose-/Screenshot-Extraktion ═══
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 6 (Limits) und 11.2.
// Eigene Validierung analog zu validateRequest, aber mit Payload-Schutz statt
// Textlaengen - der Endpunkt nimmt Bilder/PDF entgegen, nicht Freitext.

const MAX_IMAGES = 15; // Spec 6, "Pro einzelner Anfrage"
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
// 2026-07-28 von 15 auf 25 MB angehoben, spiegelt MAX_PDF_BYTES im Client
// (src/utils/exposeUpload.js). Bildlastige Makler-Exposes liegen regelmaessig
// ueber 15 MB.
const MAX_PDF_BYTES = 25 * 1024 * 1024;
// Zusaetzliche Gesamtschranke: 15 Bilder x 15 MB waeren 225 MB und wuerden den
// Worker beim JSON-Parsen sprengen. Bilder werden client-seitig auf ~1500px
// verkleinert (Spec 11.1), damit bleibt eine reale Anfrage deutlich darunter.
// Muss ueber MAX_PDF_BYTES liegen, sonst scheitert ein gerade noch erlaubtes
// PDF an dieser Schranke statt an der eigenen.
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

const ALLOWED_IMAGE_MIME: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const PDF_MIME = "application/pdf";

// "data:image/jpeg;base64,AAAA..." - Gruppe 1 = MIME, Gruppe 2 = Base64-Nutzlast.
const DATA_URL_PATTERN = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/;

type ExposeValidationResult =
  | { ok: true; data: ExposeExtractRequest }
  | { ok: false; error: string };

export function validateExposeExtractRequest(body: unknown): ExposeValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_body" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.lang !== "string" || !LANG_VALUES.has(b.lang as Lang)) {
    return { ok: false, error: "invalid_lang" };
  }

  if (typeof b.sessionId !== "string" || !SESSION_ID_PATTERN.test(b.sessionId)) {
    return { ok: false, error: "invalid_session_id" };
  }

  if (b.images !== undefined && !Array.isArray(b.images)) {
    return { ok: false, error: "invalid_images" };
  }
  const rawImages = (b.images as unknown[]) ?? [];
  if (rawImages.length > MAX_IMAGES) {
    return { ok: false, error: "too_many_images" };
  }

  let totalBytes = 0;
  const images: InlineDatei[] = [];
  for (const entry of rawImages) {
    const parsed = parseDataUrl(entry);
    if (!parsed) return { ok: false, error: "invalid_images" };
    if (!ALLOWED_IMAGE_MIME.has(parsed.mimeType)) {
      return { ok: false, error: "invalid_image_mime" };
    }
    const bytes = base64ByteLength(parsed.data);
    if (bytes > MAX_IMAGE_BYTES) return { ok: false, error: "image_too_large" };
    totalBytes += bytes;
    images.push(parsed);
  }

  let pdf: InlineDatei | undefined;
  if (b.pdf !== undefined && b.pdf !== null) {
    const parsed = parseDataUrl(b.pdf);
    if (!parsed || parsed.mimeType !== PDF_MIME) {
      return { ok: false, error: "invalid_pdf" };
    }
    // Seitenlimit (Spec 6: max. 20 Seiten) wird hier bewusst NICHT geprueft -
    // dafuer muesste der Worker das PDF parsen. Serverseitig greift die
    // Groessenschranke, die Seitenzahl prueft der Client vor dem Upload.
    const bytes = base64ByteLength(parsed.data);
    if (bytes > MAX_PDF_BYTES) return { ok: false, error: "pdf_too_large" };
    totalBytes += bytes;
    pdf = parsed;
  }

  if (images.length === 0 && !pdf) {
    return { ok: false, error: "no_input" };
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return { ok: false, error: "payload_too_large" };
  }

  return {
    ok: true,
    data: { images, pdf, lang: b.lang as Lang, sessionId: b.sessionId },
  };
}

function parseDataUrl(value: unknown): InlineDatei | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) return null;
  // Base64 ohne Rest-Bytes: eine gueltige Kodierung ist immer durch 4 teilbar.
  if (match[2].length % 4 !== 0) return null;
  return { mimeType: match[1], data: match[2] };
}

function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}
