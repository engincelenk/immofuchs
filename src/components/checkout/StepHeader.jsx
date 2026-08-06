// Nummerierte Fortschrittsleiste (Vorbild: Screenshot-Referenz vom
// 2026-08-06, "CheckoutX" Case Study) - in ImmoFuchs-Tokens statt
// Navy/Weiss: aktiver/erledigter Schritt in --ca, kuenftige Schritte als
// --cb-Outline. `steps` ist bereits die uebersetzte Liste aus
// CheckoutWizard ({key, label}), diese Komponente kennt kein i18n selbst.
export function StepHeader({ steps, currentIndex }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      style={{ display: "flex", alignItems: "flex-start", padding: "16px 20px 8px", gap: 0 }}
    >
      {steps.map((step, i) => (
        <div
          key={step.key}
          style={{ display: "flex", alignItems: "flex-start", flex: i < steps.length - 1 ? 1 : "0 0 auto" }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: i <= currentIndex ? "var(--ca)" : "var(--cc)",
                color: i <= currentIndex ? "#fff" : "var(--ch)",
                border: `1px solid ${i <= currentIndex ? "var(--ca)" : "var(--cb)"}`,
                flexShrink: 0,
              }}
            >
              {i < currentIndex ? "✓" : i + 1}
            </div>
            <span
              style={{
                fontSize: 9.5,
                color: i <= currentIndex ? "var(--ct)" : "var(--ch)",
                fontWeight: i === currentIndex ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: i < currentIndex ? "var(--ca)" : "var(--cb)",
                margin: "12px 4px 0",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
