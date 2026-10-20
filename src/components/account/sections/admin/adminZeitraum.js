// Zeitraum-Vorgaben fuer die Kennzahlen im Admin-Dashboard. Gerechnet wird in UTC-Tagen
// ("YYYY-MM-DD"), genau wie im Worker (worker/src/adminStats.ts, trialTag): so meint
// "heute" im Browser und in der Datenbank denselben Tag.

export const ZEITRAUM_OPTIONEN = [
  { key: "heute", label: "Heute" },
  { key: "7tage", label: "Letzte 7 Tage" },
  { key: "30tage", label: "Letzte 30 Tage" },
  { key: "monat", label: "Dieser Monat" },
  { key: "vormonat", label: "Letzter Monat" },
  { key: "jahr", label: "Dieses Jahr" },
  { key: "alles", label: "Seit Zählbeginn" },
  { key: "eigen", label: "Eigener Zeitraum" },
];

const TAG_MS = 24 * 60 * 60 * 1000;
const tag = (ms) => new Date(ms).toISOString().slice(0, 10);

// Liefert { von, bis } (beide inklusive). "eigen" gibt die uebergebenen Werte zurueck.
// "alles" beginnt beim Zaehlbeginn, ohne Zaehlbeginn beim Projektstart 2026-01-01.
export function zeitraumFuer(key, jetztMs = Date.now(), { zaehlbeginn = null, eigenVon = "", eigenBis = "" } = {}) {
  const heute = tag(jetztMs);
  const [j, m] = [Number(heute.slice(0, 4)), Number(heute.slice(5, 7))];
  switch (key) {
    case "heute":
      return { von: heute, bis: heute };
    case "7tage":
      return { von: tag(jetztMs - 6 * TAG_MS), bis: heute };
    case "30tage":
      return { von: tag(jetztMs - 29 * TAG_MS), bis: heute };
    case "vormonat":
      return { von: tag(Date.UTC(j, m - 2, 1)), bis: tag(Date.UTC(j, m - 1, 0)) };
    case "jahr":
      return { von: `${j}-01-01`, bis: heute };
    case "alles":
      return { von: zaehlbeginn || "2026-01-01", bis: heute };
    case "eigen":
      return { von: eigenVon, bis: eigenBis };
    case "monat":
    default:
      return { von: `${heute.slice(0, 7)}-01`, bis: heute };
  }
}

// "2026-10-05" -> "05.10.2026"
export function tagDeutsch(t) {
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return "";
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}`;
}
