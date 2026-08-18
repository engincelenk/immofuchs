export const fmt = (v, d = 0) =>
  v == null || isNaN(v) || !isFinite(v)
    ? "—"
    : v.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtE = (v) => fmt(v) + " €";
export const fmtP = (v, d = 1) => fmt(v, d) + " %";
export const LANG_LOCALE = { de: "de-DE", en: "en-GB", tr: "tr-TR", zh: "zh-CN", hi: "hi-IN" };
export const fmtDat = (d, lang = "de") =>
  d instanceof Date
    ? d.toLocaleDateString(LANG_LOCALE[lang] || "de-DE", { year: "numeric", month: "2-digit" })
    : "—";
export const addM = (d, m) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + m);
  return r;
};
export const addY = (d, y) => {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + y);
  return r;
};
export function tpl(s, v) {
  return s ? s.replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : "{" + k + "}")) : "";
}

// Logo+Schriftzug fuehren ueberall in der App zur Landingpage (Nutzer-
// Vorgabe 2026-08-18). Fuer Stellen mit direktem Zugriff auf den "landed"-
// State (App.jsx) reicht goHome() dort weiterhin aus - dieser Helper ist fuer
// Komponenten wie MyAccount.jsx, die als Portal von MEHREREN Stellen aus
// geoeffnet werden (Landing.jsx UND ueber ProHeaderButton.jsx aus dem
// eingeloggten Rechner-Bereich) und deshalb keinen einzelnen "zurueck zur
// Landingpage"-Callback von einem festen Elternteil bekommen koennen. Harte
// Navigation statt SPA-State, garantiert deshalb von JEDER Stelle aus
// zuverlaessig auf der Landingpage zu landen. sessionStorage-Flag zuerst
// loeschen (wie in App.jsx goHome()) - sonst zeigt der Neuladevorgang wegen
// des gesetzten "if_landed"-Flags sofort wieder den Rechner-Bereich statt
// der Landingpage.
export function goToLandingPage() {
  try {
    sessionStorage.removeItem("if_landed");
  } catch {
    /* sessionStorage kann in seltenen Kontexten (privater Modus) fehlen */
  }
  window.location.href = "/";
}
