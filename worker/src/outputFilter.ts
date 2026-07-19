import type { Lang } from "./types";

// Zusaetzliches Sicherheitsnetz neben dem System-Prompt (Konzept 2.9) - LLMs
// halten sich nicht zuverlaessig zu 100% an Anweisungen. Grobe Heuristik,
// kein Ersatz fuer manuelle Prompt-Iteration.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /ich empfehle( dir)?( den)? kauf/i,
  /du solltest( das)? (kaufen|verkaufen)/i,
  /kaufen sie (das|dies)/i,
  /sie d(ü|u)rfen (das|die erh(ö|o)hung)/i,
  /rechtlich (ist das|ist dies|zul(ä|a)ssig|erlaubt)/i,
  /garantiert/i,
  /die preise (werden|steigen|fallen) (sicher|bestimmt|garantiert)/i,
];

const FALLBACK_TEXT: Record<Lang, string> = {
  de: "Das kann ich dir nicht verbindlich beantworten — bei rechtlichen, steuerlichen oder Kaufentscheidungen bitte eine Fachperson hinzuziehen.",
  en: "I can't answer that conclusively — for legal, tax, or purchase decisions please consult a professional.",
  tr: "Bunu kesin olarak yanıtlayamam — hukuki, vergisel veya satın alma kararları için lütfen bir uzmana danışın.",
  zh: "这个问题我无法给出确定答案——涉及法律、税务或购买决策时，请咨询专业人士。",
  hi: "मैं इसका निश्चित उत्तर नहीं दे सकता — कानूनी, कर या खरीद संबंधी निर्णयों के लिए कृपया किसी विशेषज्ञ से सलाह लें।",
};

export function filterOutput(text: string, lang: Lang): string {
  const trimmed = text.trim();
  const hit = FORBIDDEN_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (hit || trimmed.length === 0) {
    return FALLBACK_TEXT[lang];
  }
  return trimmed;
}
