import { useState } from "react";

// Nach Login (Spec 4.3): Plan waehlen -> Weiterleitung zum gehosteten
// Paddle-Checkout (Overlay, kein Tab-Wechsel, siehe useAccount.startCheckout).
export function PlanSelect({ t, account, onClose }) {
  const [plan, setPlan] = useState("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Fehlerursachen auseinanderhalten (Wireframe-Karte 14, Bugreport 05.08.):
  // vorher zeigte JEDER Fehlschlag den Adblocker-Hinweis - auch wenn der
  // Server mit 502 antwortete und Paddle.js gar nicht erst geladen wurde.
  // Das schickte den Nutzer auf die falsche Faehrte ("liegt an meinem
  // Browser"), obwohl die Zahlung schlicht noch nicht freigeschaltet ist.
  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      await account.startCheckout(plan);
      onClose();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      // Nur wenn das Paddle-Skript wirklich clientseitig scheiterte, ist der
      // Adblocker-Hinweis die richtige Erklaerung (paddleLoader.js).
      setError(code.startsWith("paddle_script") ? t.planCheckoutBlocked : t.planCheckoutUnavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Login-Bestaetigung (Bugreport 05.08.): nach OAuth-Rueckkehr landete
          man wortlos in der Plan-Auswahl - ohne Hinweis, ob und als wer man
          angemeldet ist. Bewusst die E-Mail statt eines Namens: der Worker
          fordert bei Google nur `openid email` an, ein Name wird gar nicht
          erhoben (Datensparsamkeit, Spec 4.5/Datenschutzerklaerung). */}
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
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 11.5,
              color: "#1E6B34",
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {t.logout}
          </button>
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{t.planTitle}</div>
      {error && (
        <div
          style={{
            background: "#fff1e8",
            border: "1px solid #f5cba9",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--ca-dk)",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
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
      <button
        onClick={handleContinue}
        disabled={busy}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 15,
          fontWeight: 700,
          background: "var(--ca)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {t.planContinue} →
      </button>
    </div>
  );
}

function PlanOption({ selected, onClick, label, price, badge }) {
  return (
    <button
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
