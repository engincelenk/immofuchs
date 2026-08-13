import { useCallback, useEffect, useState } from "react";
import { fetchSubscriptions } from "./adminApi.js";
import { AdminSubscriptionDrawer } from "./AdminSubscriptionDrawer.jsx";
import {
  PLAN_LABELS,
  SUB_STATUS_LABELS,
  errorText,
  formatDate,
  labelStyle,
  mutedTextStyle,
  secondaryBtnStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "./adminUiStyles.js";

// Abos & Zahlungen (Admin-MVP Abschnitt 8). Reine Uebersicht - hier wird
// nichts geaendert. Betrag, Zahlungsstatus, Refund und Abrechnungszyklus
// gehoeren zu Paddle; dafuer gibt es den "In Paddle oeffnen"-Link im Detail.

// Genau die vier Filter aus dem Auftrag. "Gekuendigt" umfasst serverseitig
// sowohl 'canceled' als auch 'cancel_scheduled' - operativ dieselbe Frage.
const STATUS_FILTERS = [
  { value: "active", label: "Aktiv" },
  { value: "trialing", label: "Trial" },
  { value: "canceled", label: "Gekündigt" },
  { value: "past_due", label: "Zahlung fehlgeschlagen" },
];

const PAYMENT_STATE = {
  ok: { text: "OK", color: "#22c55e" },
  failed: { text: "Fehlgeschlagen", color: "#c0392b" },
  none: { text: "Noch keine", color: "#8A8A80" },
};

export function AdminSubscriptionsView() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ subscriptions: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchSubscriptions(status, page));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(result.total / (result.pageSize || 20)));

  return (
    <div>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 16 }}>
        Übersicht der Abos aus der ImmoFuchs-Datenbank. Zahlungen, Erstattungen und Abrechnungszyklus werden
        ausschließlich in Paddle verwaltet – im Detail führt ein Link direkt dorthin.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="admin-sub-status">
            Status
          </label>
          <select
            id="admin-sub-status"
            value={status}
            onChange={(e) => {
              setPage(1); // sonst stuende man auf einer Seite, die es im gefilterten Ergebnis nicht gibt
              setStatus(e.target.value);
            }}
            style={selectStyle}
          >
            <option value="">Alle</option>
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--ci)" }}>
              <th style={thStyle}>Nutzer</th>
              <th style={thStyle}>Produkt</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Start</th>
              <th style={thStyle}>Nächste Zahlung</th>
              <th style={thStyle}>Letzte Zahlung</th>
            </tr>
          </thead>
          <tbody>
            {result.subscriptions.map((s) => {
              const payment = PAYMENT_STATE[s.paymentState] || PAYMENT_STATE.none;
              return (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    borderTop: "1px solid var(--cb)",
                    cursor: "pointer",
                    background: s.id === selectedId ? "var(--ca-bg)" : "transparent",
                  }}
                >
                  <td style={tdStyle}>{s.email}</td>
                  <td style={tdStyle}>{s.product}</td>
                  <td style={tdStyle}>{PLAN_LABELS[s.plan] || s.plan}</td>
                  <td style={tdStyle}>
                    <span style={{ whiteSpace: "nowrap" }}>{SUB_STATUS_LABELS[s.status] || s.status}</span>
                  </td>
                  <td style={tdStyle}>{formatDate(s.startedAt)}</td>
                  <td style={tdStyle}>
                    {/* Waehrend der Testphase ist das Datum kein
                        Abbuchungstermin, sondern das Ende der Gratisphase. */}
                    {s.status === "trialing" ? (
                      <span style={{ color: "var(--ch)" }}>Trial bis {formatDate(s.currentPeriodEnd)}</span>
                    ) : (
                      formatDate(s.currentPeriodEnd)
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: payment.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {payment.text}
                    </span>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", ...mutedTextStyle }}>
                  Wird geladen …
                </td>
              </tr>
            )}
            {!loading && !error && result.subscriptions.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", ...mutedTextStyle }}>
                  Keine Abos gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={secondaryBtnStyle}>
          Zurück
        </button>
        <span style={{ color: "var(--ch)" }}>
          Seite {page} von {totalPages} · {result.total} Abos
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={secondaryBtnStyle}>
          Weiter
        </button>
      </div>

      {/* Immer gemountet statt `{selectedId && ...}` - siehe
          AdminSubscriptionDrawer fuer die Begruendung (Ausstiegs-Animation). */}
      <AdminSubscriptionDrawer subscriptionId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
