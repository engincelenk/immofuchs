const TIER_HEX = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" };

function MascotAvatar() {
  return (
    <img
      src="/fuchs-mascot.webp"
      alt=""
      aria-hidden="true"
      style={{ width: 30, height: 32, objectFit: "contain", flexShrink: 0, alignSelf: "flex-end" }}
    />
  );
}

export function ChatBubble({ role, text, tier, onRetry, retryLabel }) {
  if (role === "loading") {
    return (
      <div style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", alignItems: "flex-end", gap: 6 }}>
        <MascotAvatar />
        <div
          className="if-asst-bubble-in"
          style={{
            padding: "10px 13px",
            borderRadius: 14,
            borderBottomLeftRadius: 4,
            background: "var(--cc)",
            color: "var(--ch)",
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{text}</span>
          <span className="if-asst-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    );
  }

  const isUser = role === "user";
  const isSystem = role === "system" || role === "limit" || role === "offline";
  const isError = role === "error";
  const accent = tier ? TIER_HEX[tier] : null;
  const showAvatar = !isUser && !isSystem;

  const bubble = (
    <div
      className="if-asst-bubble-in"
      style={{
        alignSelf: isUser ? "flex-end" : isSystem ? "center" : "flex-start",
        maxWidth: isSystem ? "100%" : isUser ? "82%" : "88%",
        padding: "10px 13px",
        borderRadius: 14,
        borderBottomRightRadius: isUser ? 4 : 14,
        borderBottomLeftRadius: !isUser && !isSystem ? 4 : 14,
        background: isUser ? "var(--ca)" : isError ? "#FDEDED" : isSystem ? "var(--ci)" : "var(--cc)",
        color: isUser ? "#fff" : isError ? "#8a2020" : isSystem ? "var(--ch)" : "var(--ct)",
        fontSize: isSystem ? 12 : 13.5,
        textAlign: isSystem ? "center" : "left",
        lineHeight: 1.48,
        borderLeft: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      {text}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: "block",
            marginTop: 8,
            background: "none",
            border: "1px solid #8a2020",
            color: "#8a2020",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 14,
            cursor: "pointer",
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );

  if (!showAvatar) return bubble;

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", alignItems: "flex-end", gap: 6 }}>
      <MascotAvatar />
      {bubble}
    </div>
  );
}
