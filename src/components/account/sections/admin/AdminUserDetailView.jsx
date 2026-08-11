import { useEffect, useState, useCallback } from "react";
import { fetchUserDetail, setUserStatus } from "./adminApi.js";

export function AdminUserDetailView({ userId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserDetail(userId);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus(nextStatus) {
    setStatusBusy(true);
    setStatusError(null);
    try {
      await setUserStatus(userId, nextStatus);
      await load();
      setConfirming(false);
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ marginBottom: 16, background: "none", border: "none", color: "var(--ca-dk)", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0 }}
      >
        ← Zurück zur Nutzerliste
      </button>
      {loading && <div style={{ color: "var(--ch)", fontSize: 13 }}>Wird geladen …</div>}
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {detail && (
        <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 0 }}>{detail.email}</h3>
          <dl style={{ fontSize: 13 }}>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>Status</dt>
            <dd style={{ margin: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  color: "#fff",
                  background: detail.accountStatus === "SUSPENDED" ? "#c0392b" : "#22c55e",
                }}
              >
                {detail.accountStatus === "SUSPENDED" ? "Gesperrt" : "Aktiv"}
              </span>
            </dd>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>Rolle</dt>
            <dd style={{ margin: 0 }}>{detail.role}</dd>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>Registriert</dt>
            <dd style={{ margin: 0 }}>{new Date(detail.createdAt).toLocaleString("de-DE")}</dd>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>Letzter Login</dt>
            <dd style={{ margin: 0 }}>
              {detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString("de-DE") : "–"}
            </dd>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>E-Mail bestätigt</dt>
            <dd style={{ margin: 0 }}>{detail.emailVerified ? "Ja" : "Nein"}</dd>
            <dt style={{ color: "var(--ch)", marginTop: 12 }}>Abonnement</dt>
            <dd style={{ margin: 0 }}>
              {detail.subscription
                ? `${detail.subscription.plan} · ${detail.subscription.status} · nächste Zahlung ${new Date(
                    detail.subscription.currentPeriodEnd,
                  ).toLocaleDateString("de-DE")}`
                : "Kein aktives Abo"}
            </dd>
          </dl>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--cb)" }}>
            {statusError && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{statusError}</div>}
            {!confirming ? (
              detail.accountStatus === "SUSPENDED" ? (
                <button onClick={() => handleToggleStatus("ACTIVE")} disabled={statusBusy} style={actionBtnStyle}>
                  Entsperren
                </button>
              ) : (
                <button onClick={() => setConfirming(true)} style={{ ...actionBtnStyle, background: "#c0392b" }}>
                  Sperren
                </button>
              )
            ) : (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 0 }}>
                  Konto wirklich sperren? Alle aktiven Sitzungen dieses Nutzers werden sofort beendet.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleToggleStatus("SUSPENDED")}
                    disabled={statusBusy}
                    style={{ ...actionBtnStyle, background: "#c0392b" }}
                  >
                    Ja, sperren
                  </button>
                  <button onClick={() => setConfirming(false)} disabled={statusBusy} style={cancelBtnStyle}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  background: "var(--ca)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const cancelBtnStyle = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ct)",
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  cursor: "pointer",
};
