import { cardStyle } from "./checkoutStyles.js";

// Persistente Bestelluebersicht fuer die Desktop-Zweispalten-Ansicht des
// Checkout-Wizards (Nutzerwunsch 07.08.: Browser und Mobile sollen dieselbe
// Kaufstrecke zeigen statt zwei unterschiedliche "Staende" - auf Mobile steckt
// dieselbe Information stattdessen inline in PricingStep/PaymentStep, hier
// bleibt sie waehrend Konto/Zahlung zusaetzlich sichtbar, Vorbild die
// Dribbble-Checkout-Referenzen vom 07.08. mit Bestellkarte neben dem Formular).
const FEATURES = [
  ["compareRowRechner", "compareRowRechnerPro"],
  ["compareRowExpose", "compareRowExposePro"],
  ["compareRowFinn", "compareRowFinnPro"],
  ["compareRowMerkliste", "compareRowMerklistePro"],
];

export function OrderSummary({ t, plan, account, showTrialNotice, onEditPlan }) {
  const planLabel = plan === "yearly" ? t.planYearly : t.planMonthly;
  const planPrice = plan === "yearly" ? t.planYearlyPrice : t.planMonthlyPrice;
  const hasUsedTrial = Boolean(account?.me?.hasUsedTrial);

  return (
    <div style={{ ...cardStyle, position: "sticky", top: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--ch)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {t.paymentReviewTitle}
        </span>
        {onEditPlan && (
          <button
            onClick={onEditPlan}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 11.5,
              color: "var(--ca-dk)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.accountChange}
          </button>
        )}
      </div>

      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>ImmoFuchs Pro</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: 12,
          marginBottom: 12,
          borderBottom: "1px solid var(--cb)",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--ch)" }}>{planLabel}</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{planPrice}</span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ch)", marginBottom: 8 }}>
        {t.pricingFeaturesTitle}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        {FEATURES.map(([labelKey, descKey]) => (
          <li key={labelKey} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--ct)" }}>
            <span style={{ color: "var(--ca)" }}>✓</span>
            <span>
              <strong>{t[labelKey]}:</strong> {t[descKey]}
            </span>
          </li>
        ))}
      </ul>

      {showTrialNotice && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ch)",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--cb)",
          }}
        >
          {hasUsedTrial
            ? t.paymentNoTrialNotice.replace("{price}", planPrice)
            : t.paymentTrialNotice.replace("{price}", planPrice)}
        </div>
      )}
    </div>
  );
}
