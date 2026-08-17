import { useId, useState } from "react";
import {
  AuthFooterLink,
  AuthHeading,
  ErrorBanner,
  MailGlyph,
  PasswordField,
  TextField,
} from "./CheckoutShared.jsx";
import { infoBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";
import { BrandIcon } from "../ui/BrandIcon.jsx";

// Eigenstaendiger Ablauf ausserhalb der Kern-Fortschrittsleiste (Spec 5.1) -
// kein Kauf-Schritt, deshalb kein Eintrag in wizardSteps.js. Aufrufbar aus
// AccountStep ("Passwort vergessen?") oder direkt bei ?reset_token=
// (initialStep-Prop).
export function PasswordResetFlow({ t, account, initialStep = "request", onBack }) {
  const uid = useId();
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
        <AuthHeading title={t.newPasswordTitle} />
        {inlineError && <ErrorBanner t={t} code={inlineError} />}
        <form onSubmit={handleNewPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PasswordField
            id={`${uid}-new`}
            label={t.newPasswordPlaceholder}
            value={newPassword}
            onChange={setNewPassword}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((s) => !s)}
            t={t}
            autoComplete="new-password"
            minLength={10}
          />
          <PasswordField
            id={`${uid}-new-repeat`}
            label={t.newPasswordRepeatPlaceholder}
            value={newPasswordRepeat}
            onChange={setNewPasswordRepeat}
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
        <BrandIcon size={40} style={{ marginBottom: 12 }} />
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
        {/* Gezeichneter Briefumschlag statt des Emoji ✉️ - dieselbe
            Begruendung wie bei den uebrigen Icons (Neugestaltung 2026-08-17). */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: "var(--ca-dk)" }}>
          <MailGlyph />
        </div>
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.55 }}>{t.forgotPasswordSentInfo}</p>
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
      <AuthHeading title={t.forgotPasswordTitle} subtitle={t.forgotPasswordBody} />
      <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          id={`${uid}-forgot-email`}
          label={t.loginEmailPlaceholder}
          type="email"
          required
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          autoComplete="username"
        />
        <button type="submit" disabled={busy} style={primaryBtnStyle}>
          {t.forgotPasswordSubmit}
        </button>
      </form>
      <AuthFooterLink onClick={onBack}>{t.backToLogin}</AuthFooterLink>
    </div>
  );
}
