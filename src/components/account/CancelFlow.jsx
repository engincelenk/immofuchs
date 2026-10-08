import { useState } from "react";
import { formatPeriodEndDate } from "../../utils/accountEntitlement.js";

// Eigene Bestaetigungsseite statt reinem Portal-Link (Spec 4.11, §312k BGB) -
// zeigt sofort das konkrete Enddatum, kein Redirect auf ein externes Portal.
export function CancelFlow({ t, account, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const sub = account.me?.subscription;

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await account.cancelSubscription();
      onDone();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{t.cancelTitle}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, marginBottom: 18 }}>
        {t.cancelBody.replace("{date}", formatPeriodEndDate(sub) || "—")}
      </p>
      {error && (
        <div style={{ fontSize: 12, color: "var(--ca-dk)", marginBottom: 10 }}>
          {t.planCheckoutBlocked}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onDone}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 14,
            fontWeight: 600,
            background: "var(--ci)",
            color: "var(--ct)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {t.cancelCancel}
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          style={{
            flex: 1,
            padding: 12,
            fontSize: 14,
            fontWeight: 700,
            background: "var(--ca)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {t.cancelConfirm}
        </button>
      </div>
    </div>
  );
}
