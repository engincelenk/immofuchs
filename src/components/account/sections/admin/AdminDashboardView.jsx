import { useEffect, useState } from "react";
import { fetchActivity, fetchDashboard } from "./adminApi.js";
import { PLAN_LABELS, errorText, mutedTextStyle } from "./adminUiStyles.js";

const TILES = [
  { key: "totalUsers", label: "Nutzer gesamt", format: (v) => v.toLocaleString("de-DE") },
  { key: "newUsersThisMonth", label: "Neue Nutzer (Monat)", format: (v) => v.toLocaleString("de-DE") },
  { key: "activeSubscriptions", label: "Aktive Abos", format: (v) => v.toLocaleString("de-DE") },
  { key: "trialUsers", label: "Trial-Nutzer", format: (v) => v.toLocaleString("de-DE") },
  {
    key: "mrr",
    label: "MRR",
    format: (v) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  },
  { key: "cancellationsThisMonth", label: "Kündigungen (Monat)", format: (v) => v.toLocaleString("de-DE") },
];

// Beschriftung und Farbe je Ereignisart. Die Schluessel kommen 1:1 aus
// listAdminActivity (worker/src/db.ts).
const ACTIVITY_KINDS = {
  "user.registered": { label: "Neuer Nutzer registriert", color: "#1E3A5F" },
  "subscription.started": { label: "Subscription abgeschlossen", color: "#22c55e" },
  "subscription.canceled": { label: "Subscription gekündigt", color: "#c0392b" },
  "admin.action": { label: "Admin-Aktion", color: "var(--ca-dk)" },
};

export function AdminDashboardView() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Beide Abfragen unabhaengig: faellt der Aktivitaets-Feed aus, sollen die
    // Kennzahlen trotzdem stehen - und umgekehrt.
    fetchDashboard()
      .then((data) => !cancelled && setStats(data))
      .catch((err) => !cancelled && setError(errorText(err)));
    fetchActivity()
      .then((data) => !cancelled && setActivity(data.entries))
      .catch(() => !cancelled && setActivity([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!stats && !error && <div style={mutedTextStyle}>Wird geladen …</div>}

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
              <div style={{ fontSize: 22, fontWeight: 700 }}>{tile.format(stats[tile.key] ?? 0)}</div>
            </div>
          ))}
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>Letzte Aktivitäten</h3>
        <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
          Registrierungen, Abo-Abschlüsse, Kündigungen und Admin-Aktionen. Gutschein-Einlösungen erscheinen hier
          nicht – die finden bei Paddle statt und werden in ImmoFuchs nicht gespeichert.
        </p>

        {activity === null && <div style={mutedTextStyle}>Wird geladen …</div>}
        {activity?.length === 0 && <div style={mutedTextStyle}>Noch keine Aktivitäten.</div>}

        {activity && activity.length > 0 && (
          <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, overflow: "hidden" }}>
            {activity.map((entry, i) => {
              const kind = ACTIVITY_KINDS[entry.kind] || { label: entry.kind, color: "var(--ch)" };
              return (
                <div
                  key={`${entry.kind}-${entry.at}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: "10px 16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--cb)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: kind.color }}>{kind.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ch)", wordBreak: "break-word" }}>
                      {entry.subject}
                      {entry.detail && ` · ${PLAN_LABELS[entry.detail] || entry.detail}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ch)", whiteSpace: "nowrap" }}>
                    {new Date(entry.at).toLocaleString("de-DE")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
