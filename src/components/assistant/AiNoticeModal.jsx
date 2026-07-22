import { createPortal } from "react-dom";

export function AiNoticeModal({ t, onClose }) {
  return createPortal(
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 1150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="if-asst-ai-notice-title"
        className="if-asst-ai-notice-card"
        style={{
          width: "100%",
          maxWidth: 340,
          background: "var(--cc)",
          borderRadius: 16,
          padding: "24px 22px 20px",
          textAlign: "center",
        }}
      >
        <h2 id="if-asst-ai-notice-title" style={{ fontSize: 16, fontWeight: 800, color: "var(--ct)", margin: "0 0 10px" }}>
          {t.aiNoticeTitle}
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--cl)", margin: "0 0 18px" }}>{t.aiNoticeBody}</p>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 21,
            border: "none",
            background: "var(--ca)",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {t.aiNoticeOk}
        </button>
      </div>
      <style>{`
        .if-asst-ai-notice-card{animation:ifAsstNoticeIn .18s ease}
        @keyframes ifAsstNoticeIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}
        @media (prefers-reduced-motion: reduce){.if-asst-ai-notice-card{animation:none}}
      `}</style>
    </div>,
    document.body
  );
}
