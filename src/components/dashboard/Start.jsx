import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";

// Start-Screen (Spec 4.17, Dashboard-IA 01.08): Begrüßung, "X Objekte in
// Prüfung", Karussell "Zuletzt analysiert". Der eigentliche Exposé-Import
// laeuft weiterhin ueber den bestehenden Finn-Einstieg (📎/FAB) - hier nur
// ein Hinweis-Link dorthin, keine zweite Upload-Implementierung.
export function Start({ objects, onOpen, onGoToRechner }) {
  const inPruefung = objects.filter((o) => o.status === "in_pruefung");
  const recent = [...objects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Willkommen zurück 👋</div>
      <div style={{ fontSize: 14, color: "var(--ch)", marginBottom: 20 }}>
        {inPruefung.length} {inPruefung.length === 1 ? "Objekt" : "Objekte"} in Prüfung
      </div>

      <button
        onClick={onGoToRechner}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: 18,
          borderRadius: 12,
          border: "1.5px dashed var(--ca)",
          background: "var(--ca-bg)",
          color: "var(--ca-dk)",
          cursor: "pointer",
          fontFamily: "inherit",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>📎 Neues Exposé importieren</div>
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
          Foto aufnehmen oder Datei hochladen — über den Finn-Assistenten in jedem Rechner
        </div>
      </button>

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ch)", marginBottom: 10 }}>
        Zuletzt analysiert
      </div>
      {recent.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--ch)" }}>Noch keine Objekte vorhanden.</div>
      )}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
        {recent.map((o) => (
          <button
            key={o.id}
            onClick={() => onOpen(o)}
            style={{
              flex: "0 0 auto",
              width: 180,
              textAlign: "left",
              background: "var(--cc)",
              borderRadius: 12,
              border: "none",
              padding: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {o.title || "Objekt"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 2 }}>{o.ort}</div>
            {o.score != null && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  background: scoreBadgeColor(o.scoreLabel),
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {scoreBadgeText(o.scoreLabel)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
