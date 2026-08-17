// Fortschrittsanzeige des Checkout-Wizards.
//
// Neugestaltung 2026-08-17: vorher fuenf nummerierte Kreise mit
// Verbindungslinien - viel Flaeche und Aufmerksamkeit fuer eine Information,
// die nebensaechlich ist. Die Referenz-Kaufstrecke verzichtet ganz darauf; hier
// bleibt sie dennoch, weil ImmoFuchs im Gegensatz zum Vorbild noch
// Registrierung und E-Mail-Bestaetigung im Weg hat und der Nutzer sonst nicht
// abschaetzen kann, wie viel noch kommt. Nur eben schlank: eine duenne Leiste
// und eine Zeile Text.
//
// `steps` ist bereits die uebersetzte Liste aus CheckoutWizard ({key, label}),
// diese Komponente kennt kein i18n selbst.
export function StepHeader({ steps, currentIndex, counterLabel }) {
  const total = steps.length;
  const current = Math.min(currentIndex + 1, total);
  const percent = total > 1 ? (current / total) * 100 : 100;

  return (
    <div style={{ padding: "0 20px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 7,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)" }}>
          {steps[currentIndex]?.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--ch)", flexShrink: 0 }}>{counterLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={counterLabel}
        style={{ height: 4, borderRadius: 4, background: "var(--cb)", overflow: "hidden" }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "var(--ca)",
            borderRadius: 4,
            transition: "width .25s ease",
          }}
        />
      </div>
    </div>
  );
}
