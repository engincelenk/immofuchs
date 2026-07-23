import type { AssistantRequest, Lang, Rechner, VerlaufEintrag, VergleichsObjekt } from "./types";

const RECHNER_VALUES: ReadonlySet<Rechner> = new Set([
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
const MAX_VERLAUF_TEXT_LEN = 1000; // grosszuegiger als frage, deckt Assistant-Antworten ab
const MAX_VERGLEICHSOBJEKTE = 5;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

type ValidationResult = { ok: true; data: AssistantRequest } | { ok: false; error: string };

export function validateRequest(body: unknown): ValidationResult {
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

  const verlaufResult = validateVerlauf(b.verlauf);
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
    if (typeof e.text !== "string" || e.text.length === 0 || e.text.length > MAX_VERLAUF_TEXT_LEN) {
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
