import { useApp } from "../../context/AppContext.jsx";

export const Statusleiste = () => {
  const { t } = useApp();
  const now = new Date();
  const monat = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--ci)",
        border: "1px solid var(--cb)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--ch)",
        marginBottom: 14,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#22c55e",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>
        {t.datastand}: {monat}
      </span>
    </div>
  );
};
