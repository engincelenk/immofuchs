// admin/src/UserDetailView.jsx
import { useEffect, useState } from "react";
import { fetchUserDetail } from "./api";

export default function UserDetailView({ userId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUserDetail(userId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div>
      <button
        onClick={onBack}
        style={{ marginBottom: 16, background: "none", border: "none", color: "var(--ca)", cursor: "pointer", fontSize: 14, padding: 0 }}
      >
        ← Zurück zur Nutzerliste
      </button>
      {loading && <div style={{ color: "var(--ch)" }}>Lade...</div>}
      {error && <div style={{ color: "#c0392b" }}>{error}</div>}
      {detail && (
        <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 18, marginTop: 0 }}>{detail.email}</h1>
          <dl style={{ fontSize: 14 }}>
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
        </div>
      )}
    </div>
  );
}
