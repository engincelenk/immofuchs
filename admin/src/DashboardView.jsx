// admin/src/DashboardView.jsx
import { useEffect, useState } from "react";
import { fetchDashboard } from "./api";

const TILES = [
  { key: "totalUsers", label: "Nutzer gesamt", format: (v) => v.toLocaleString("de-DE") },
  { key: "activeSubscriptions", label: "Aktive Abos", format: (v) => v.toLocaleString("de-DE") },
  { key: "trialUsers", label: "Trial-Nutzer", format: (v) => v.toLocaleString("de-DE") },
  { key: "mrr", label: "MRR", format: (v) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` },
  { key: "cancellationsThisMonth", label: "Kündigungen (Monat)", format: (v) => v.toLocaleString("de-DE") },
];

export default function DashboardView() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginTop: 0, marginBottom: 20 }}>Dashboard</h1>
      {error && <div style={{ color: "#c0392b" }}>{error}</div>}
      {!stats && !error && <div style={{ color: "var(--ch)" }}>Lade...</div>}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          {TILES.map((tile) => (
            <div
              key={tile.key}
              style={{
                background: "var(--cc)",
                border: "1px solid var(--cb)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--ch)", marginBottom: 8 }}>{tile.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{tile.format(stats[tile.key])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
