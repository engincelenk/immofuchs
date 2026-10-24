// Linien-Icons fuer Rechner-Ueberschriften und Hinweise (Gestaltung "Ruhig", 2026-10-24, Nutzerwunsch: die App
// wirkte kitschig, Emoji sehen je nach Betriebssystem anders aus und passen nicht zu den Linien-Icons der
// Navigation). Gleicher Stil wie accountIcons.jsx: 24er-Raster, stroke=currentColor, 1.6 Strichstaerke.
// EMOJI_ICON ordnet die bisherigen Emoji den Icons zu, damit InsRuhig und Sec bestehende Aufrufe weiter
// verstehen.
const PFADE = {
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  bank: (
    <>
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17" />
    </>
  ),
  liste: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  bau: (
    <>
      <path d="M3.5 20h17M6 20V9l6-4 6 4v11" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  anstieg: (
    <>
      <path d="M4 18 10 12l4 4 6-8" />
      <path d="M15 8h5v5" />
    </>
  ),
  abstieg: (
    <>
      <path d="M4 7l6 6 4-4 6 8" />
      <path d="M15 17h5v-5" />
    </>
  ),
  haus: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  balken: (
    <>
      <path d="M5 20V11M12 20V5M19 20v-7" />
    </>
  ),
  preis: (
    <>
      <path d="M3.5 12.5V5.5a2 2 0 0 1 2-2h7l8 8a2 2 0 0 1 0 2.8l-5.2 5.2a2 2 0 0 1-2.8 0z" />
      <circle cx="8" cy="8" r="1.2" />
    </>
  ),
  koffer: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5v-2h6v2M3.5 13h17" />
    </>
  ),
  ziel: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  verbot: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
    </>
  ),
  warnung: (
    <>
      <path d="M12 4 3.5 19h17z" />
      <path d="M12 10v4M12 16.8v.2" />
    </>
  ),
  muenze: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.8 9.4a3.2 3.2 0 1 0 0 5.2M8.6 11h5M8.6 13h5" />
    </>
  ),
  kalender: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  buch: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v15H6.5A1.5 1.5 0 0 0 5 20.5z" />
      <path d="M5 5.5v15M9 8h6" />
    </>
  ),
  schloss: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  werkzeug: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4.5 16.3a1.8 1.8 0 0 0 2.5 2.5l4.8-4.8a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1z" />
    </>
  ),
  dokument: (
    <>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6" />
    </>
  ),
  gluehbirne: (
    <>
      <path d="M9.5 18h5M10.5 21h3" />
      <path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2h4c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5z" />
    </>
  ),
  glocke: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5h4" />
    </>
  ),
  rechner: (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="2" />
      <path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01" />
    </>
  ),
  waage: (
    <>
      <path d="M12 4v16M7 20h10M5 7.5h14" />
      <path d="M5 7.5 2.8 13a2.6 2.6 0 0 0 4.4 0zM19 7.5 16.8 13a2.6 2.6 0 0 0 4.4 0z" />
    </>
  ),
  aktualisieren: (
    <>
      <path d="M19 8.5A7.5 7.5 0 0 0 5.5 10M5 15.5A7.5 7.5 0 0 0 18.5 14" />
      <path d="M19.5 4v4.5H15M4.5 20v-4.5H9" />
    </>
  ),
  blitz: (
    <>
      <path d="M13 3.5 6 13.5h5l-1 7 7-10h-5z" />
    </>
  ),
  sonne: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12.5" rx="2" />
      <path d="m4 7.5 8 6 8-6" />
    </>
  ),
  haken: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.3 2.4 2.4 4.6-5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 7.8v.2" />
    </>
  ),
};

export const EMOJI_ICON = {
  "📍": "pin",
  "🏦": "bank",
  "📋": "liste",
  "🏗️": "bau",
  "🏗": "bau",
  "📈": "anstieg",
  "📉": "abstieg",
  "🏠": "haus",
  "📊": "balken",
  "🏷️": "preis",
  "🏷": "preis",
  "💼": "koffer",
  "🎯": "ziel",
  "🚫": "verbot",
  "⚠️": "warnung",
  "⚠": "warnung",
  "✅": "haken",
  "ℹ️": "info",
  "💰": "muenze",
  "💸": "muenze",
  "💶": "muenze",
  "📅": "kalender",
  "📚": "buch",
  "🔒": "schloss",
  "🔧": "werkzeug",
  "📄": "dokument",
  "📝": "dokument",
  "📎": "dokument",
  "💡": "gluehbirne",
  "🔔": "glocke",
  "🧮": "rechner",
  "📐": "rechner",
  "⚖️": "waage",
  "⚖": "waage",
  "🔄": "aktualisieren",
  "⚡": "blitz",
  "🔋": "blitz",
  "☀️": "sonne",
  "📧": "mail",
  "🏛️": "bank",
  "🏛": "bank",
  "🏬": "haus",
};

/** Icon-Name zu einem Namen oder einem bisherigen Emoji; null, wenn es dazu kein Icon gibt. */
export function iconName(wert) {
  if (wert && PFADE[wert]) return wert;
  return EMOJI_ICON[wert] ?? null;
}

const BILD = /[\u{1F300}-\u{1FAFF}☀-➿⭐⬆]/u;
const TEXTZEICHEN = /^[✓✔✕✗✦★☰➤✎➕]/u;

/**
 * Ein bisheriges Emoji als Linien-Icon, wenn es dazu eines gibt. Ohne Icon: Bild-Emoji entfallen (nichts
 * Buntes mehr), schlichte Textzeichen wie "☰" oder "✓" bleiben stehen.
 */
export function Emo({ e, size = 16, style }) {
  if (iconName(e)) return <Icon name={e} size={size} style={style} />;
  const s = String(e ?? "");
  if (s && BILD.test(s) && !TEXTZEICHEN.test(s)) return null;
  return s || null;
}

export function Icon({ name, size = 18, style }) {
  const n = iconName(name);
  if (!n) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      {PFADE[n]}
    </svg>
  );
}
