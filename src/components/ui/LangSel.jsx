import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { LANGS } from "../../i18n/translations.js";

export function LangSel({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const cur = LANGS.find((l) => l.v === lang) || LANGS[0];
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 11px",
          border: "1px solid var(--cb)",
          borderRadius: 8,
          background: "var(--ci)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ct)",
          minHeight: 38,
        }}
      >
        {/* Kein Flaggen-Icon mehr (Konzept-Dok 3.6/7.2/7.5, 2026-08-10):
            Flaggen stehen fuer Laender, nicht fuer Sprachen (Englisch hat
            keine eindeutige Flagge, Tuerkisch/Chinesisch/Hindi werden auch
            ausserhalb "ihres" Landes gesprochen) - bekannter UX-/
            Internationalisierungs-Fehler. Neutrales Globus-Symbol statt
            Landesflagge. */}
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          🌐
        </span>
        <span className="lang-label" style={{ fontSize: 12, color: "var(--ch)" }}>
          {cur.label}
        </span>
        <span style={{ fontSize: 9, color: "var(--ch)", marginLeft: 1 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.1)",
            zIndex: 200,
            overflow: "hidden",
            minWidth: 140,
          }}
        >
          {LANGS.map((l) => (
            <button
              key={l.v}
              onClick={() => {
                setLang(l.v);
                setOpen(false);
              }}
              style={{
                display: "block",
                padding: "9px 14px",
                width: "100%",
                border: "none",
                borderBottom: "1px solid var(--cb)",
                background: l.v === lang ? "var(--ca-bg)" : "var(--cc)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: l.v === lang ? 700 : 500,
                color: l.v === lang ? "var(--ca)" : "var(--ct)",
                textAlign: "left",
              }}
            >
              {l.full}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legal({ items }) {
  const { t } = useApp();
  const [o, setO] = useState(false);
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--cb)", paddingTop: 12 }}>
      <button
        onClick={() => setO(!o)}
        style={{
          background: "none",
          border: "none",
          fontSize: 11,
          color: "var(--ch)",
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>📚 {t.rechtlGrundlagen}</span>
        <span>{o ? "▲" : "▼"}</span>
      </button>
      {o && (
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--ch)", lineHeight: 1.7 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                marginBottom: 6,
                padding: "8px 10px",
                background: "var(--ci)",
                borderRadius: 6,
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--cl)", marginBottom: 2 }}>{it.law}</div>
              <div>{it.desc}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 10, fontStyle: "italic" }}>{t.rechtsHinweis}</div>
        </div>
      )}
    </div>
  );
}
