export function PrivacyIntro({ t, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 1100,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="if-asst-privacy-title"
        className="if-asst-privacy-card"
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          background: "var(--cc)",
          borderRadius: "16px 16px 0 0",
          padding: "26px 22px 22px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32 }} aria-hidden="true">
          🦊
        </div>
        <h2 id="if-asst-privacy-title" style={{ fontSize: 17, fontWeight: 800, color: "var(--ct)", margin: "8px 0 10px" }}>
          {t.privacyTitle}
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--cl)", margin: "0 0 20px" }}>{t.privacyBody}</p>
        <button
          onClick={onConfirm}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 22,
            border: "none",
            background: "var(--ca)",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          {t.privacyConfirm}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: "100%",
            height: 40,
            borderRadius: 22,
            border: "none",
            background: "transparent",
            color: "var(--ch)",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t.privacyCancel}
        </button>
      </div>
      <style>{`
        .if-asst-privacy-card{animation:ifAsstSheetUp .22s ease}
        @keyframes ifAsstSheetUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        @media (prefers-reduced-motion: reduce){.if-asst-privacy-card{animation:none}}
      `}</style>
    </div>
  );
}
