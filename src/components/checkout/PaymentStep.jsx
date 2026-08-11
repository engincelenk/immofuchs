import { useEffect, useRef, useState } from "react";
import { cardStyle, errorBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";

// Bestellübersicht + Zahlungsauslöser (Vorbild: Screenshot Review-/Payment-
// Screens). Reagiert auf Paddles checkout.completed-Event (siehe
// paddleLoader.js/onPaddleCheckoutEvent) statt sich nach dem Oeffnen des
// Overlays sofort zu schliessen - erst so wird WelcomeStep erreichbar.
export function PaymentStep({ t, account, plan, onEditPlan, onCompleted, hideSummary }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  // Pflicht-Checkbox (Spec-v3.0 Kap. 3.2/6, § 312j BGB Buttonloesung +
  // Widerrufsrecht bei digitalen Leistungen): ohne diese Zustimmung darf die
  // Ausfuehrung nicht vor Ablauf der Widerrufsfrist beginnen.
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false);
  // Stufe F (Gutscheine ueber Paddle Discounts, Nutzer-Konzept 2026-08-11):
  // rein optionales Feld, Validierung passiert ausschliesslich server-seitig
  // gegen Paddle (routes/billing.ts) - hier kein Eigenbau einer
  // Rabattberechnung.
  const [discountCode, setDiscountCode] = useState("");

  // onCompleted ueber eine Ref statt als Effect-Dependency (Bugreport 06.08.,
  // "Weiter zur Zahlung friert die App ein"): das account-Objekt aus
  // useAccount() ist nicht memoisiert und wechselt bei JEDEM Render die
  // Identitaet. Dadurch wechselte auch onCompleted staendig, der Effekt lief
  // neu - und sein Cleanup rief mitten im Oeffnen Paddle.Checkout.close()
  // auf. Uebrig blieb Paddles Overlay-Hintergrund ohne Inhalt, der die
  // ganze Seite blockierte. Mit leerer Dependency-Liste laeuft der Cleanup
  // nur noch beim echten Unmount, die Ref haelt den Callback trotzdem aktuell.
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    import("../../utils/paddleLoader.js").then(({ onPaddleCheckoutEvent }) => {
      if (cancelled) return;
      unsubscribe = onPaddleCheckoutEvent((data) => {
        if (data?.name === "checkout.completed") {
          window.Paddle?.Checkout?.close?.();
          onCompletedRef.current();
        }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
      // Nur beim echten Verlassen des Zahlungsschritts: sonst bliebe Paddles
      // Overlay offen, waehrend darunter schon der Willkommens-Screen oder
      // die geschlossene App steht.
      window.Paddle?.Checkout?.close?.();
    };
  }, []);

  async function handleContinue() {
    if (!withdrawalAccepted) return;
    setBusy(true);
    setError(null);
    try {
      await account.startCheckout(plan, discountCode.trim() || undefined);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "email_not_verified") {
        setError("email_not_verified");
      } else if (code === "invalid_discount_code") {
        setError(t.discountCodeInvalid);
      } else {
        setError(code.startsWith("paddle_script") ? t.planCheckoutBlocked : t.planCheckoutUnavailable);
      }
    } finally {
      setBusy(false);
    }
  }

  const planLabel = plan === "yearly" ? t.planYearly : t.planMonthly;
  const planPrice = plan === "yearly" ? t.planYearlyPrice : t.planMonthlyPrice;

  return (
    <div>
      {/* Bei aktiver Desktop-Sidebar (CheckoutWizard) zeigt OrderSummary
          Titel+Karte bereits an - hier waeren sie doppelt zu sehen. */}
      {!hideSummary && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{t.paymentReviewTitle}</div>}

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

      {!hideSummary && (
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
          <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 6 }}>
            {account?.me?.hasUsedTrial ? t.paymentNoTrialNotice.replace("{price}", planPrice) : t.paymentTrialNotice.replace("{price}", planPrice)}
          </div>
        </div>
      )}

      {error === "email_not_verified" ? (
        <div style={errorBannerStyle}>
          {t.loginErrorEmailNotVerified}
          <div style={{ marginTop: 8 }}>
            {resendDone ? (
              t.verifySentBody.replace("{email}", account?.me?.email || "")
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setResendBusy(true);
                  await account.resendVerification(account?.me?.email || "");
                  setResendBusy(false);
                  setResendDone(true);
                }}
                disabled={resendBusy}
                style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "inherit", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
              >
                {t.loginResendVerification}
              </button>
            )}
          </div>
        </div>
      ) : (
        error && <div style={errorBannerStyle}>{error}</div>
      )}

      <label style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginBottom: 14 }}>
        {t.discountCodeLabel}
        <input
          type="text"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
          placeholder={t.discountCodePlaceholder}
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid var(--cb)",
            borderRadius: 8,
            background: "var(--ci)",
            color: "var(--ct)",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, color: "var(--ct)", marginBottom: 12 }}>
        <input
          type="checkbox"
          required
          checked={withdrawalAccepted}
          onChange={(e) => setWithdrawalAccepted(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>{t.paymentWithdrawalConsent}</span>
      </label>

      <button
        onClick={handleContinue}
        disabled={busy || error === "email_not_verified" || !withdrawalAccepted}
        style={primaryBtnStyle}
      >
        {t.planContinue} →
      </button>
      <p style={{ fontSize: 10.5, color: "var(--ch)", textAlign: "center", marginTop: 10 }}>{t.paymentSecureNotice}</p>
    </div>
  );
}
