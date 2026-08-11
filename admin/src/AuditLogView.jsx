// admin/src/AuditLogView.jsx
import { useEffect, useState } from "react";
import { fetchAuditLog } from "./api";

const ACTION_LABELS = {
  "user.suspend": "Nutzer gesperrt",
  "user.unsuspend": "Nutzer entsperrt",
};

export default function AuditLogView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchAuditLog(page)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <h1 style={{ fontSize: 20, marginTop: 0, marginBottom: 8 }}>Audit Log</h1>
      <p style={{ fontSize: 13, color: "var(--ch)", marginTop: 0, marginBottom: 20 }}>
        Protokolliert jede schreibende Admin-Aktion. Aktuell nur Sperren/Entsperren - wächst mit,
        sobald weitere Aktionen dazukommen.
      </p>
      {error && <div style={{ color: "#c0392b" }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--ch)" }}>Lade...</div>}
      {data && data.entries.length === 0 && (
        <div style={{ color: "var(--ch)" }}>Noch keine Einträge.</div>
      )}
      {data && data.entries.length > 0 && (
        <>
          <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, overflow: "hidden" }}>
            {data.entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: "12px 16px",
                  borderTop: i === 0 ? "none" : "1px solid var(--cb)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ch)" }}>
                    {entry.adminEmail} · {entry.targetType} {entry.details?.targetEmail || entry.targetId}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--ch)", whiteSpace: "nowrap" }}>
                  {new Date(entry.createdAt).toLocaleString("de-DE")}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pagerBtnStyle}>
                ← Zurück
              </button>
              <span style={{ fontSize: 13, color: "var(--ch)" }}>
                Seite {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pagerBtnStyle}>
                Weiter →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const pagerBtnStyle = {
  padding: "6px 12px",
  fontSize: 13,
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--cc)",
  cursor: "pointer",
};
