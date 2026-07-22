export function SuggestedQuestionChip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="if-asst-sugg-chip"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ca)",
        background: "var(--ca-bg)",
        border: "1px solid var(--ca-bd)",
        borderRadius: 12,
        padding: "10px 14px",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
