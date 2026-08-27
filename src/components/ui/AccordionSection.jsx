import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";

export function AccordionSection({ question, hint, color, children, defaultOpen = false, sync }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (sync) setOpen(sync.open);
  }, [sync?.key]);
  const borderCol = color || "var(--cb)";
  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 14,
        border: `1.5px solid ${open ? borderCol : "var(--cb)"}`,
        overflow: "hidden",
        transition: "border-color .2s",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: open ? "var(--cc)" : "var(--cc)",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          gap: 8,
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ct)", lineHeight: 1.3 }}>
            {question}
          </div>
          {hint && !open && (
            <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 2 }}>{hint}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {color && (
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
          )}
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transition: "transform .25s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="var(--ch)"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>
      {open && (
        <div style={{ padding: "14px 12px", borderTop: "1px solid var(--cb)" }}>{children}</div>
      )}
    </div>
  );
}

// ═══ SECTION EXPLAINER — Bullets + Erklärtext gemeinsam im Toggle ═══
export function SectionExplain({ intro, bullets, text }) {
  const [open, setOpen] = useState(false);
  const { t } = useApp();
  const hasBullets = bullets && bullets.length > 0;
  if (!intro && !hasBullets && !text) return null;
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      <button
        data-pdf-detail="true"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          padding: "4px 0",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          color: "var(--ca)",
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 13 }}>{open ? "▲" : "▼"}</span>
        <span>
          {open
            ? t && t.secClose
              ? t.secClose
              : "Weniger anzeigen"
            : t && t.secOpen
              ? t.secOpen
              : "Wie kommt das Ergebnis zustande?"}
        </span>
      </button>
      {open && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px dashed var(--cb)",
          }}
        >
          {intro && (
            <div
              style={{
                fontSize: 11,
                color: "var(--ch)",
                lineHeight: 1.65,
                marginBottom: 8,
              }}
            >
              {intro}
            </div>
          )}
          {hasBullets && (
            <ul style={{ margin: "0 0 8px", padding: 0, listStyle: "none" }}>
              {bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 11,
                    color: "var(--ch)",
                    lineHeight: 1.65,
                    marginBottom: 4,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "var(--ca)", flexShrink: 0, fontWeight: 700 }}>→</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {text && (
            <div
              style={{
                fontSize: 11,
                color: "var(--ch)",
                lineHeight: 1.75,
                whiteSpace: "pre-line",
              }}
            >
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
