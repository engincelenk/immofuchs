import { primaryBtnStyle } from "./checkoutStyles.js";

export function PricingStep({ t, plan, setPlan, onContinue, account, hideFeatures }) {
  const features = [t.compareRowRechnerPro, t.compareRowExposePro, t.compareRowFinnPro, t.compareRowMerklistePro];
  const labels = [t.compareRowRechner, t.compareRowExpose, t.compareRowFinn, t.compareRowMerkliste];
  // T1 (Spec-v3.0 Kap. 3.0/3.1a): wer das Trial schon einmal hatte, sieht
  // keinen Trial-Hinweis mehr, sondern direkt den regulaeren Preis.
  const hasUsedTrial = Boolean(account?.me?.hasUsedTrial);

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.planTitle}</div>
      {!hasUsedTrial && (
        <div
          style={{
            display: "inline-block",
            background: "#FCE9DC",
            border: "1px solid var(--ca)",
            color: "var(--ca-dk)",
            borderRadius: 20,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          🦊 {t.pricingTrialBadge}
        </div>
      )}

      <div role="radiogroup" aria-label={t.planTitle} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        <PlanOption
          selected={plan === "monthly"}
          onClick={() => setPlan("monthly")}
          label={t.planMonthly}
          price={t.planMonthlyPrice}
        />
        <PlanOption
          selected={plan === "yearly"}
          onClick={() => setPlan("yearly")}
          label={t.planYearly}
          price={t.planYearlyPrice}
          badge={t.planYearlyBadge}
        />
      </div>

      {/* Bei aktiver Desktop-Sidebar (CheckoutWizard) zeigt OrderSummary
          dieselbe Liste bereits an - hier waere sie doppelt zu sehen. */}
      {!hideFeatures && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ch)", marginBottom: 8 }}>
            {t.pricingFeaturesTitle}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 6 }}>
            {features.map((feature, i) => (
              <li key={labels[i]} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--ct)" }}>
                <span style={{ color: "var(--ca)" }}>✓</span>
                <span>
                  <strong>{labels[i]}:</strong> {feature}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <button onClick={onContinue} style={primaryBtnStyle}>
        {t.pricingContinue} →
      </button>
    </div>
  );
}

function PlanOption({ selected, onClick, label, price, badge }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        border: `2px solid ${selected ? "var(--ca)" : "var(--cb)"}`,
        borderRadius: 10,
        background: selected ? "var(--ca-bg)" : "var(--ci)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${selected ? "var(--ca)" : "var(--cb)"}`,
            background: selected ? "var(--ca)" : "transparent",
            display: "inline-block",
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              background: "var(--ca)",
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{price}</span>
    </button>
  );
}
