// Laenderliste fuer die Rechnungsdaten (AddressStep.jsx, Nutzer-Vorgabe
// 2026-08-27: volle Auswahl statt der bisherigen stillen Annahme "DE").
//
// Bewusst nur die ISO-3166-1-alpha-2-Codes als Wahrheit: die ANZEIGENAMEN
// kommen zur Laufzeit aus Intl.DisplayNames in der jeweils aktiven Sprache.
// Die Alternative waere gewesen, ~190 Laendernamen fuenfmal (de/en/tr/zh/hi)
// in i18n/account.js zu pflegen - eine Uebersetzungsflaeche, die niemand
// aktuell haelt und die der Browser ohnehin schon mitbringt.
const CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ " +
  "CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO " +
  "FR GA GB GD GE GG GH GI GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE " +
  "JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH " +
  "MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PR " +
  "PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ " +
  "TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW";

export const COUNTRY_CODES = CODES.split(" ");

// Die drei deutschsprachigen Laender stehen oben in der Liste - sie decken
// praktisch die gesamte Kundschaft ab, und niemand soll bis "Deutschland"
// durch 190 Eintraege scrollen muessen.
export const PINNED_COUNTRY_CODES = ["DE", "AT", "CH"];

export const DEFAULT_COUNTRY = "DE";

// Flagge als Emoji: die beiden Buchstaben des Laendercodes werden auf die
// "Regional Indicator Symbols" (U+1F1E6 = A) abgebildet, das Paar rendert die
// Schrift als Flagge.
//
// Auf Windows gibt es KEINE Flaggen-Schrift - Chrome/Edge zeigen dort
// stattdessen die beiden Buchstaben ("DE"). Das ist bekannt und akzeptiert
// (Nutzer-Entscheidung 2026-08-27): in einem nativen <select> laesst sich
// kein Bild unterbringen, und der Buchstaben-Rueckfall bleibt lesbar.
export function flagEmoji(code) {
  if (typeof code !== "string" || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

function displayNames(lang) {
  try {
    return new Intl.DisplayNames([lang || "de"], { type: "region" });
  } catch {
    return null;
  }
}

export function countryName(code, lang) {
  const dn = displayNames(lang);
  try {
    return dn?.of(code) || code;
  } catch {
    return code;
  }
}

// Fertige Optionsliste: angepinnte Laender zuerst, danach der Rest
// alphabetisch nach dem ANZEIGENAMEN der aktiven Sprache sortiert (Intl
// .Collator, damit Umlaute dort einsortiert werden, wo sie hingehoeren -
// "Österreich" zwischen O und P, nicht hinter Z).
export function countryOptions(lang) {
  const collator = new Intl.Collator(lang || "de");
  // Sortiert wird ueber `name`, NICHT ueber `label`: label beginnt mit der
  // Flagge, deren Codepunkte sich aus dem Laendercode ableiten - eine
  // Sortierung darueber waere eine Sortierung nach Kuerzel (AD, AE, AF ...)
  // und haette mit der alphabetischen Reihenfolge der Namen nichts zu tun.
  const entry = (code) => {
    const name = countryName(code, lang);
    return { code, name, label: `${flagEmoji(code)} ${name}`.trim() };
  };
  const pinned = PINNED_COUNTRY_CODES.map(entry);
  const rest = COUNTRY_CODES.filter((code) => !PINNED_COUNTRY_CODES.includes(code))
    .map(entry)
    .sort((a, b) => collator.compare(a.name, b.name));
  return [...pinned, ...rest];
}
