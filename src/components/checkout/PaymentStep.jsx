import { useEffect, useState } from "react";
import { cardStyle, errorBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";

// Bestellübersicht + Zahlungsauslöser (Vorbild: Screenshot Review-/Payment-
// Screens). Reagiert auf Paddles checkout.completed-Event (siehe
// paddleLoader.js/onPaddleCheckoutEvent) statt sich nach dem Oeffnen des
// Overlays sofort zu schliessen - erst so wird WelcomeStep erreichbar.
export function PaymentStep({ t, account, plan, onEditPlan, onCompleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    import("../../utils/paddleLoader.js").then(({ onPaddleCheckoutEvent }) => {
      if (cancelled) return;
      unsubscribe = onPaddleCheckoutEvent((data) => {
        if (data?.name === "checkout.completed") {
          window.Paddle?.Checkout?.close?.();
          onCompleted();
        }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
      // Falls der Wizard geschlossen wird, waehrend Paddles Overlay noch
      // offen ist (Klick auf X kurz nach "Zahlung starten", bevor das
      // Overlay tatsaechlich erschienen ist) - sonst liefe eine dort
      // trotzdem abgeschlossene Zahlung ins Leere, ohne dass die App
      // reagiert (Befund finaler Review, 2026-08-06).
      window.Paddle?.Checkout?.close?.();
    };
  }, [onCompleted]);

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      await account.startCheckout(plan);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(code.startsWith("paddle_script") ? t.planCheckoutBlocked : t.planCheckoutUnavailable);
    } finally {
      setBusy(false);
    }
  }

  const planLabel = plan === "yearly" ? t.planYearly : t.planMonthly;
  const planPrice = plan === "yearly" ? t.planYearlyPrice : t.planMonthlyPrice;

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{t.paymentReviewTitle}</div>

      {account?.me?.email && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "#E3F1E6",
            border: "1px solid #2F9E52",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "#1E6B34",
            marginBottom: 14,
          }}
        >
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            ✓ {t.loggedInAs} <strong>{account.me.email}</strong>
          </span>
          <button
            onClick={account.logout}
            style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, color: "#1E6B34", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            {t.logout}
          </button>
        </div>
      )}

      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--ch)" }}>{t.accountPlan}</span>
          {onEditPlan && (
            <button onClick={onEditPlan} style={{ background: "none", border: "none", padding: 0, fontSize: 11.5, color: "var(--ca-dk)", cursor: "pointer", fontFamily: "inherit" }}>
              {t.accountChange}
            </button>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          ImmoFuchs Pro – {planLabel} ({planPrice})
        </div>
        <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 6 }}>{t.paymentTrialNotice.replace("{price}", planPrice)}</div>
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      <button onClick={handleContinue} disabled={busy} style={primaryBtnStyle}>
        {t.planContinue} →
      </button>
      <p style={{ fontSize: 10.5, color: "var(--ch)", textAlign: "center", marginTop: 10 }}>{t.paymentSecureNotice}</p>
    </div>
  );
}
