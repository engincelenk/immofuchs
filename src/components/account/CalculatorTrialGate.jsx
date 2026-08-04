import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useCalculatorTrial } from "../../hooks/useCalculatorTrial.js";
import { ACCOUNT_T } from "../../i18n/account.js";
import { LoginModal } from "./LoginModal.jsx";

// Wrapper auf Tab-Ebene (App.jsx) statt Aenderungen in den sechs Rechner-
// Komponenten selbst (Spec 4.0a/S5-1, Stabilitaetsregel) - kein einziger
// bestehender Rechner wird angefasst. Der Trial gilt als "verbraucht", sobald
// der Nutzer den Rechner-Tab wieder verlaesst (Unmount): die Rechner sind
// live/reaktiv (kein Submit-Button), das nach dem Verlassen gezeigte Ergebnis
// war damit das eine vollstaendige Ergebnis, auf das Free Anspruch hat.
export function CalculatorTrialGate({ rechnerKey, children }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const { isLocked, markTrialUsed, isPro } = useCalculatorTrial(rechnerKey);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    return () => {
      if (!isPro) markTrialUsed();
    };
    // Nur beim Unmount ausloesen - absichtlich kein Dependency-Array-Eintrag
    // fuer markTrialUsed/isPro, die Cleanup-Closure liest den zum Zeitpunkt
    // des Mounts aktuellen isPro-Wert, was fuer diesen Anwendungsfall reicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t.trialLockedTitle}</div>
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>
          {t.trialLockedBody}
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
          👑 {t.trialLockedCta}
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    );
  }

  return children;
}
