import { useEffect, useState } from "react";
import { fetchAuditLog } from "./adminApi.js";

const ACTION_LABELS = {
  "user.suspend": "Nutzer gesperrt",
  "user.unsuspend": "Nutzer entsperrt",
  "discount.create": "Gutschein erstellt",
  "discount.activate": "Gutschein aktiviert",
  "discount.deactivate": "Gutschein deaktiviert",
};

export function AdminAuditLogView() {
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
      <p style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 0, marginBottom: 16 }}>
        Protokolliert jede schreibende Admin-Aktion. Aktuell nur Sperren/Entsperren - wächst mit, sobald weitere
        Aktionen dazukommen.
      </p>
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--ch)", fontSize: 13 }}>Wird geladen …</div>}
      {data && data.entries.length === 0 && (
        <div style={{ color: "var(--ch)", fontSize: 13 }}>Noch keine Einträge.</div>
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
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ch)" }}>
                    {entry.adminEmail} · {entry.targetType} {entry.details?.targetEmail || entry.targetId}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ch)", whiteSpace: "nowrap" }}>
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
  color: "var(--ct)",
  cursor: "pointer",
};
