import type { Lang } from "./types";

// Zusaetzliches Sicherheitsnetz neben dem System-Prompt (Konzept 2.9) - LLMs
// halten sich nicht zuverlaessig zu 100% an Anweisungen. Grobe Heuristik,
// kein Ersatz fuer manuelle Prompt-Iteration.
//
// Kaufempfehlung/Marktprognose als Tendenz-Aussage sind seit 2026-07-21
// bewusst erlaubt (siehe release-notes.txt) - die frueheren Muster dafuer
// ("ich empfehle den kauf", "du solltest kaufen/verkaufen", "kaufen sie
// dies") wurden deshalb entfernt. Absolute Garantien/Zusagen bleiben
// verboten (siehe /garantiert/ unten). Rechtsberatung/Steuerberatung bleiben
// unveraendert hart blockiert - dafuer keine Lockerung, siehe systemPrompt.ts.
const FORBIDDEN_PATTERNS: RegExp[] = [
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

// ── Herkunft und Aktualisierung der Daten (Nutzer-Vorgabe 2026-10-03) ──────
// Finn darf weder nennen, woher Zahlen stammen (Institute, Portale, Aemter),
// noch wie oft oder wann Daten aktualisiert werden. Der System-Prompt sagt
// das (Regel 13); dieses Netz streicht verbliebene Saetze, statt die ganze
// Antwort zu verwerfen. Bewusst nur ATTRIBUTIONS-Formulierungen
// ("laut ...", "Quelle: ...", "stammt von ...") und Rhythmus-Angaben, NICHT
// die blossen Namen: ueber KfW- und BAFA-Programme, ETF-Produktnamen oder
// den Basiszins darf Finn weiter fachlich sprechen.
const QUELLEN = String.raw`justetf|destatis|statistische[sn]? bundesamt|bundesbank|immoscout\w*|immowelt|zensus|interhyp|genesis|goldavenue|gold\.de|onvista|zinsen\.net|fidelity|bestbrokers|morningstar|bloomberg|statista|iw[- ]institut|bdew|umweltbundesamt|msci[- ]factsheet|msci-index|finanztip|check24|verivox|capitalo|baufi24`;

const HERKUNFT_PATTERNS: RegExp[] = [
  new RegExp(
    String.raw`(laut|nach|gem(ä|ae)(ß|ss)|quelle:?|stammt|stammen|entnommen|ver(ö|oe)ffentlicht|ermittelt|berechnet|erhoben)[^.!?]{0,80}\b(${QUELLEN})\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(${QUELLEN})\b[^.!?]{0,40}(zufolge|gem(ä|ae)(ß|ss)|angaben|daten|statistik|ver(ö|oe)ffentlich)`,
    "i",
  ),
  new RegExp(String.raw`(according to|source:?|data from|published by)[^.!?]{0,60}\b(${QUELLEN})\b`, "i"),
  /\b(monatlich|quartalsweise|halbj(ä|ae)hrlich|j(ä|ae)hrlich|t(ä|ae)glich|w(ö|oe)chentlich|regelm(ä|ae)(ß|ss)ig)\w*\s+(aktualisiert|gepflegt|angepasst|nachgezogen|erneuert|fortgeschrieben|abgerufen)/i,
  /\b(aktualisiert|gepflegt|erneuert|fortgeschrieben)\s+(monatlich|quartalsweise|halbj(ä|ae)hrlich|j(ä|ae)hrlich|t(ä|ae)glich|w(ö|oe)chentlich|regelm(ä|ae)(ß|ss)ig)/i,
  /\bdatenstand\b/i,
  /\b(updated|refreshed)\s+(monthly|quarterly|daily|weekly|annually|regularly)/i,
  /\b(data|figures?)\s+as of\b/i,
  /\bStand\s*:?\s*(vom |am )?\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}/i,
];

const HERKUNFT_FALLBACK: Record<Lang, string> = {
  de: "Die genaue Herkunft und Aktualisierung kann ich dir hier nicht nennen — die Zahlen sind Teil der ImmoFuchs-Datenbasis.",
  en: "I can't tell you where the figures come from or how often they are updated — they are part of the ImmoFuchs data base.",
  tr: "Rakamların kaynağını ve ne sıklıkla güncellendiğini burada paylaşamam — bunlar ImmoFuchs veri tabanının bir parçasıdır.",
  zh: "我无法在这里说明数据的来源及更新频率——这些数字属于 ImmoFuchs 数据库。",
  hi: "मैं यहाँ यह नहीं बता सकता कि आँकड़े कहाँ से आते हैं या कितनी बार अपडेट होते हैं — वे ImmoFuchs डेटाबेस का हिस्सा हैं।",
};

// Streicht Saetze, die eine Quelle oder einen Aktualisierungsrhythmus nennen.
// Bleibt nichts uebrig, kommt ein neutraler Satz statt eines leeren Textes.
export function entferneHerkunftUndRhythmus(text: string, lang: Lang): string {
  const saetze = text.trim().split(/(?<=[.!?。！？])\s+/);
  const behalten = saetze.filter((s) => !HERKUNFT_PATTERNS.some((p) => p.test(s)));
  if (behalten.length === saetze.length) return text.trim();
  const rest = behalten.join(" ").trim();
  return rest.length > 0 ? rest : HERKUNFT_FALLBACK[lang];
}
