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
