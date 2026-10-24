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
};

/** Icon-Name zu einem Namen oder einem bisherigen Emoji; null, wenn es dazu kein Icon gibt. */
export function iconName(wert) {
  if (wert && PFADE[wert]) return wert;
  return EMOJI_ICON[wert] ?? null;
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
