import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useCalculatorTrial } from "../../hooks/useCalculatorTrial.js";
import { ACCOUNT_T } from "../../i18n/account.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";

// Wrapper auf Tab-Ebene (App.jsx) statt Aenderungen in den sechs Rechner-
// Komponenten selbst - kein einziger bestehender Rechner wird angefasst.
// Kap. 0.2/3.0 (Spec-v3.0): kein anonymer Gast-Zugang mehr - jeder
// Erstkontakt mit einer Rechner-Funktion fuehrt zwingend zuerst durch die
// Auth-Auswahl, unabhaengig davon, ob der Rechner vorher schon genutzt wurde.
export function CalculatorTrialGate({ children }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const { isLocked, loading } = useCalculatorTrial();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return null;
  }

  if (isLocked) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 20px",
          background: "var(--cc)",
          borderRadius: 12,
          border: "1px solid var(--cb)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t.loginRequiredTitle}</div>
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>
          {t.loginRequiredBody}
        </p>
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: "12px 24px",
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
          🦊 {t.loginRequiredCta}
        </button>
        {showLogin && <CheckoutWizard onClose={() => setShowLogin(false)} />}
      </div>
    );
  }

  return children;
}
