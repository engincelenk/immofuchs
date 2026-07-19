export function SuggestedQuestionChip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="if-asst-sugg-chip"
      style={{
        flex: "none",
        fontFamily: "inherit",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ca)",
        background: "var(--ca-bg)",
        border: "1px solid var(--ca-bd)",
        borderRadius: 16,
        padding: "7px 12px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
