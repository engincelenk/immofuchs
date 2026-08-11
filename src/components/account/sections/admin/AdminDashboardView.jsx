import { useEffect, useState } from "react";
import { fetchDashboard } from "./adminApi.js";

const TILES = [
  { key: "totalUsers", label: "Nutzer gesamt", format: (v) => v.toLocaleString("de-DE") },
  { key: "activeSubscriptions", label: "Aktive Abos", format: (v) => v.toLocaleString("de-DE") },
  { key: "trialUsers", label: "Trial-Nutzer", format: (v) => v.toLocaleString("de-DE") },
  { key: "mrr", label: "MRR", format: (v) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` },
  { key: "cancellationsThisMonth", label: "Kündigungen (Monat)", format: (v) => v.toLocaleString("de-DE") },
];

export function AdminDashboardView() {
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
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!stats && !error && <div style={{ color: "var(--ch)", fontSize: 13 }}>Wird geladen …</div>}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {TILES.map((tile) => (
            <div
              key={tile.key}
              style={{
                background: "var(--cc)",
                border: "1px solid var(--cb)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 6 }}>{tile.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{tile.format(stats[tile.key])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
