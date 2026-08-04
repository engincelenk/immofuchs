import { useMemo, useState } from "react";
import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";

// Objekte-Liste (Spec 4.17, Dashboard-IA 01.08): Suchfeld, Filter-Chips,
// Sortierung, Objekt-Card mit Score-Badge.
export function ObjektListe({ objects, onOpen }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("alle"); // alle | gut | archiviert
  const [sort, setSort] = useState("score"); // score | aktualisiert

  const filtered = useMemo(() => {
    let list = objects;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) => (o.title || "").toLowerCase().includes(q) || (o.ort || "").toLowerCase().includes(q),
      );
    }
    if (filter === "gut") list = list.filter((o) => o.scoreLabel === "gut");
    if (filter === "archiviert") list = list.filter((o) => o.status === "archiviert");
    else list = list.filter((o) => o.status !== "archiviert");

    list = [...list].sort((a, b) =>
      sort === "score" ? (b.score ?? -1) - (a.score ?? -1) : b.updatedAt - a.updatedAt,
    );
    return list;
  }, [objects, query, filter, sort]);

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suche nach Adresse oder Ort…"
        style={{
          width: "100%",
          height: 42,
          padding: "0 14px",
          fontSize: 16,
          border: "1px solid var(--cb)",
          borderRadius: 10,
          background: "var(--ci)",
          color: "var(--ct)",
          fontFamily: "inherit",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <Chip active={filter === "alle"} onClick={() => setFilter("alle")}>
          Alle
        </Chip>
        <Chip active={filter === "gut"} onClick={() => setFilter("gut")}>
          Score „Gut"
        </Chip>
        <Chip active={filter === "archiviert"} onClick={() => setFilter("archiviert")}>
          Archiviert
        </Chip>
        <button
          onClick={() => setSort(sort === "score" ? "aktualisiert" : "score")}
          style={{ ...chipStyle, marginLeft: "auto", color: "var(--ch)" }}
        >
          Sortierung: {sort === "score" ? "Score" : "Zuletzt geprüft"}
        </button>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--ch)" }}>
          Keine Objekte gefunden.
        </div>
      )}

      {filtered.map((o) => (
        <button key={o.id} onClick={() => onOpen(o)} style={cardStyle}>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {o.title || "Objekt"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 2 }}>{o.ort}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "var(--cl)" }}>
              {o.kaufpreis != null && <span>{Number(o.kaufpreis).toLocaleString("de-DE")} €</span>}
              {o.wohnflaeche != null && <span>{o.wohnflaeche} m²</span>}
            </div>
          </div>
          {o.score != null && (
            <span
              style={{
                background: scoreBadgeColor(o.scoreLabel),
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 20,
                whiteSpace: "nowrap",
              }}
            >
              {scoreBadgeText(o.scoreLabel)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ ...chipStyle, ...(active ? chipActiveStyle : {}) }}>
      {children}
    </button>
  );
}

const chipStyle = {
  padding: "6px 12px",
  borderRadius: 20,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
  color: "var(--ct)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const chipActiveStyle = { background: "var(--ca)", color: "#fff", borderColor: "var(--ca)" };

const cardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  background: "var(--cc)",
  borderRadius: 12,
  padding: 14,
  marginTop: 10,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};
