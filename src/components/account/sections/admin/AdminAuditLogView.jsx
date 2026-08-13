import { useCallback, useEffect, useState } from "react";
import { fetchAuditLog } from "./adminApi.js";
import { errorText, labelStyle, mutedTextStyle, secondaryBtnStyle, selectStyle } from "./adminUiStyles.js";

// Alle Aktionen, die logAdminAction() heute schreibt (worker/src/routes/admin.ts).
// Doppelt gefuehrt - hier die Beschriftung, dort der Schluessel: kommt eine
// Aktion dazu, faellt sie in der Liste als roher Schluessel auf statt still
// unbeschriftet zu bleiben (siehe Fallback unten).
const ACTION_LABELS = {
  "user.suspend": "Nutzer gesperrt",
  "user.unsuspend": "Nutzer entsperrt",
  "user.role_change": "Rolle geändert",
  "user.test_user_change": "Testuser geändert",
  "user.beta_change": "Beta-Zugriff geändert",
  "user.note_add": "Support-Notiz hinzugefügt",
  "user.password_reset": "Passwort-Reset ausgelöst",
  "user.sessions_revoke": "Sitzungen beendet",
  "user.delete": "Nutzer gelöscht",
  "discount.create": "Gutschein erstellt",
  "discount.bulk_create": "Gutscheine generiert",
  "discount.update": "Gutschein geändert",
  "discount.activate": "Gutschein aktiviert",
  "discount.deactivate": "Gutschein deaktiviert",
};

const EMPTY_FILTERS = { admin: "", action: "", target: "", from: "", to: "" };

export function AdminAuditLogView() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(
        await fetchAuditLog(page, {
          admin: filters.admin,
          action: filters.action,
          target: filters.target.trim(),
          // input[type=date] liefert "YYYY-MM-DD", der Worker will
          // ms-Zeitstempel. "bis" auf das Tagesende, sonst fiele der
          // gewaehlte Tag selbst aus dem Zeitraum heraus.
          from: filters.from ? Date.parse(`${filters.from}T00:00:00`) : undefined,
          to: filters.to ? Date.parse(`${filters.to}T23:59:59`) : undefined,
        }),
      );
    } catch (err) {
      setError(errorText(err));
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(key, value) {
    setPage(1); // sonst stuende man auf einer Seite, die es im gefilterten Ergebnis nicht gibt
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 16 }}>
        Protokolliert jede schreibende Admin-Aktion. Der Verlauf ist unveränderlich – Einträge lassen sich weder
        bearbeiten noch löschen, auch nicht von Owner/Admin.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="audit-admin">
            Admin
          </label>
          <select
            id="audit-admin"
            value={filters.admin}
            onChange={(e) => updateFilter("admin", e.target.value)}
            style={selectStyle}
          >
            <option value="">Alle</option>
            {/* Der Worker liefert nur Konten, die wirklich schon eine Aktion
                protokolliert haben - eine Liste aller Admins enthielte
                Eintraege ohne jede Log-Zeile. */}
            {(data?.admins || []).map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="audit-action">
            Aktion
          </label>
          <select
            id="audit-action"
            value={filters.action}
            onChange={(e) => updateFilter("action", e.target.value)}
            style={selectStyle}
          >
            <option value="">Alle</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="audit-from">
            Von
          </label>
          <input
            id="audit-from"
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            style={selectStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="audit-to">
            Bis
          </label>
          <input
            id="audit-to"
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            style={selectStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="audit-target">
            Betroffenes Objekt (ID)
          </label>
          <input
            id="audit-target"
            type="search"
            value={filters.target}
            onChange={(e) => updateFilter("target", e.target.value)}
            placeholder="Nutzer- oder Gutschein-ID"
            style={selectStyle}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setFilters(EMPTY_FILTERS);
            }}
            style={secondaryBtnStyle}
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!data && !error && <div style={mutedTextStyle}>Wird geladen …</div>}
      {data && data.entries.length === 0 && (
        <div style={mutedTextStyle}>
          {hasFilters ? "Keine Einträge für diese Filter." : "Noch keine Einträge."}
        </div>
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ch)", wordBreak: "break-word" }}>
                    {entry.adminEmail} · {entry.targetType} {entry.details?.targetEmail || entry.details?.code || entry.targetId}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ch)", whiteSpace: "nowrap" }}>
                  {new Date(entry.createdAt).toLocaleString("de-DE")}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={secondaryBtnStyle}>
              ← Zurück
            </button>
            <span style={{ fontSize: 13, color: "var(--ch)" }}>
              Seite {page} / {totalPages} · {data.total} Einträge
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={secondaryBtnStyle}>
              Weiter →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
