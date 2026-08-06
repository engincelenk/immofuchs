import { useState } from "react";
import { ErrorBanner } from "./CheckoutShared.jsx";
import { PasswordField } from "./CheckoutShared.jsx";
import { infoBannerStyle, linkBtnStyle, primaryBtnStyle, textInputStyle } from "./checkoutStyles.js";

// Eigenstaendiger Ablauf ausserhalb der Kern-Fortschrittsleiste (Spec 5.1) -
// kein Kauf-Schritt, deshalb kein Eintrag in wizardSteps.js. Aufrufbar aus
// AccountStep ("Passwort vergessen?") oder direkt bei ?reset_token=
// (initialStep-Prop).
export function PasswordResetFlow({ t, account, initialStep = "request", onBack }) {
  const [step, setStep] = useState(initialStep); // "request" | "sent" | "reset" | "success"
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  async function handleRequestSubmit(e) {
    e.preventDefault();
    setBusy(true);
    await account.requestPasswordReset(forgotEmail);
    setBusy(false);
    setStep("sent");
  }

  async function handleNewPasswordSubmit(e) {
    e.preventDefault();
    setInlineError(null);
    if (newPassword !== newPasswordRepeat) {
      setInlineError("password_mismatch");
      return;
    }
    setBusy(true);
    const result = await account.confirmPasswordReset(account.resetToken, newPassword);
    setBusy(false);
    if (!result.ok) {
      setInlineError(result.error === "invalid_password" ? "invalid_password" : "invalid_or_expired");
      return;
    }
    setStep("success");
  }

  if (step === "reset") {
    return (
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.newPasswordTitle}</div>
        {inlineError && <ErrorBanner t={t} code={inlineError} />}
        <form onSubmit={handleNewPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PasswordField
            value={newPassword}
            onChange={setNewPassword}
            placeholder={t.newPasswordPlaceholder}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((s) => !s)}
            t={t}
            autoComplete="new-password"
            minLength={10}
          />
          <PasswordField
            value={newPasswordRepeat}
            onChange={setNewPasswordRepeat}
            placeholder={t.newPasswordRepeatPlaceholder}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((s) => !s)}
            t={t}
            autoComplete="new-password"
            minLength={10}
          />
          <button type="submit" disabled={busy} style={primaryBtnStyle}>
            {t.newPasswordSubmit}
          </button>
        </form>
        <div style={{ ...infoBannerStyle, marginTop: 12 }}>{t.newPasswordSessionsNotice}</div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🦊</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{t.newPasswordSuccessTitle}</div>
        <button onClick={onBack} style={{ ...primaryBtnStyle, marginTop: 16 }}>
          {t.newPasswordSuccessCta}
        </button>
      </div>
    );
  }

  if (step === "sent") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
        <p style={{ fontSize: 13, color: "var(--ch)" }}>{t.forgotPasswordSentInfo}</p>
        <button
          onClick={onBack}
          style={{ marginTop: 16, background: "none", border: "1px solid var(--cb)", borderRadius: 10, padding: "10px 16px", fontFamily: "inherit", cursor: "pointer" }}
        >
          {t.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.forgotPasswordTitle}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", marginBottom: 16 }}>{t.forgotPasswordBody}</p>
      <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="email"
          required
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          placeholder={t.loginEmailPlaceholder}
          autoComplete="username"
          style={textInputStyle}
        />
        <button type="submit" disabled={busy} style={primaryBtnStyle}>
          {t.forgotPasswordSubmit}
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button type="button" onClick={onBack} style={linkBtnStyle}>
          {t.backToLogin}
        </button>
      </div>
    </div>
  );
}
