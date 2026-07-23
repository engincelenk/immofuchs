import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";

export function Tip({ text, label }) {
  const [s, setS] = useState(false);
  const ref = useRef();
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const { t } = useApp();
  const isMobile =
    typeof window !== "undefined" && window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  useLayoutEffect(() => {
    if (s && ref.current && !isMobile) {
      const r = ref.current.getBoundingClientRect();
      const tipW = 220,
        btnW = 13,
        pad = 8;
      const ideal = r.left + btnW / 2 - tipW / 2;
      const left = Math.max(pad, Math.min(window.innerWidth - tipW - pad, ideal));
      setTipPos({ top: r.top + window.scrollY - 6, left });
    }
  }, [s]);
  useEffect(() => {
    if (!s) return;
    const h = (e) => {
      if (e.key === "Escape") setS(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [s]);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block", marginLeft: 4 }}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setS(!s);
        }}
        onMouseEnter={!isMobile ? () => setS(true) : undefined}
        onMouseLeave={!isMobile ? () => setS(false) : undefined}
        style={{
          cursor: "help",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 13,
          height: 13,
          borderRadius: "50%",
          border: "1px solid var(--ch)",
          color: "var(--ch)",
          fontSize: 9,
          fontWeight: 600,
          background: "var(--cc)",
        }}
      >
        ?
      </span>
      {!isMobile &&
        s &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: tipPos.top,
              left: tipPos.left,
              transform: "translateY(-100%)",
              width: 220,
              padding: "8px 10px",
              background: "#1a1a1a",
              color: "#fff",
              fontSize: 11,
              lineHeight: 1.4,
              borderRadius: 6,
              zIndex: 9999,
              pointerEvents: "none",
              whiteSpace: "normal",
              fontWeight: 400,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
      {isMobile &&
        s &&
        createPortal(
          <div
            onClick={() => setS(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 9999,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                background: "var(--cc)",
                borderRadius: "16px 16px 0 0",
                padding: "1rem 1.25rem 2rem",
                borderTop: "1px solid var(--cb)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  background: "var(--cb)",
                  borderRadius: 2,
                  margin: "0 auto 1rem",
                }}
              ></div>
              {label && (
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ct)", margin: "0 0 8px" }}>
                  {label}
                </p>
              )}
              <p style={{ fontSize: 14, color: "var(--cl)", lineHeight: 1.6, margin: "0 0 1rem" }}>
                {text}
              </p>
              <button
                onClick={() => setS(false)}
                style={{
                  width: "100%",
                  padding: 12,
                  background: "#1E3A5F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t?.close || "Schließen"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
