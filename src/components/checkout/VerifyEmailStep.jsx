import { useEffect, useState } from "react";
import { ErrorBanner } from "./CheckoutShared.jsx";
import { secondaryBtnStyle } from "./checkoutStyles.js";

// 60-Sek.-Cooldown fuer "Bestaetigung erneut senden" - startet bei jedem
// Eintritt in diesen Schritt (frische Registrierung UND jeder manuelle
// Resend-Klick).
export function VerifyEmailStep({ t, account, email }) {
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    setResendCooldown(60);
    const interval = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [email]);

  async function handleResend() {
    setBusy(true);
    const result = await account.resendVerification(email);
    setBusy(false);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setResendCooldown(60);
  }

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{t.verifySentTitle}</div>
      <p style={{ fontSize: 12, color: "var(--ch)", marginTop: 8 }}>{t.verifySentBody.replace("{email}", email || "")}</p>
      {inlineError && <ErrorBanner t={t} code={inlineError} />}
      <button
        onClick={handleResend}
        disabled={resendCooldown > 0 || busy}
        style={{ ...secondaryBtnStyle, marginTop: 16, width: "auto", display: "inline-flex", padding: "10px 16px" }}
      >
        {resendCooldown > 0 ? t.verifyResendCooldown.replace("{sec}", String(resendCooldown)) : t.verifyResend}
      </button>
      <p style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 10 }}>{t.verifyResendHint}</p>
    </div>
  );
}
