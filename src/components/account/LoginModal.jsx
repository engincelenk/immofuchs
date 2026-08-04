import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { PlanSelect } from "./PlanSelect.jsx";

// Vollflaechiges Modal (Spec 4.3) - Login ist selten und wichtig genug,
// anders als Finns Bottom-Sheet. Ablauf: "compare" (Free-vs-Pro-Vergleich,
// PFLICHT-Zwischenschritt vor jedem OAuth-Redirect) -> "login" -> ggf.
// "magic-sent" -> nach erfolgreichem Login automatisch "plan", falls noch
// nicht Pro.
export function LoginModal({ onClose }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const [step, setStep] = useState(account?.resetToken ? "new-password" : "compare");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const [busy, setBusy] = useState(null); // welcher Button gerade laedt
  const [inlineError, setInlineError] = useState(null);
  // Passwort-Weg (Ergaenzung 04.08., fuenfter Login-/Registrierungsweg, §4.4)
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginWarn, setLoginWarn] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTakenProviders, setEmailTakenProviders] = useState(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const dialogRef = useRef(null);
  const supportsPasskey = typeof window !== "undefined" && Boolean(window.PublicKeyCredential);

  // Nach Login (isLoggedIn true) direkt zur Plan-Auswahl springen - ausser
  // der Nutzer ist bereits Pro (dann macht dieses Modal keinen Sinn mehr,
  // Aufrufer schliesst es typischerweise selbst ueber isPro-Aenderung).
  useEffect(() => {
    if (account?.isLoggedIn && !account.isPro && step !== "plan") {
      setStep("plan");
    }
  }, [account?.isLoggedIn, account?.isPro, step]);

  useEffect(() => {
    if (account?.error?.startsWith("login_error_")) {
      setInlineError(account.error.replace("login_error_", ""));
    }
  }, [account?.error]);

  // 60-Sek.-Cooldown fuer "Bestätigung erneut senden" (4.4) - startet bei
  // jedem Eintritt in verify-sent (frische Registrierung UND jeder manuelle
  // Resend-Klick, s. handleResendVerification).
  useEffect(() => {
    if (step !== "verify-sent") return;
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Fokus-Trap + Escape (Spec 4.3 Accessibility-Nachschärfung, S2-5) - neu
  // berechnet bei jedem Schritt-Wechsel (compare -> login -> ...), da sich
  // die fokussierbaren Elemente pro Schritt aendern.
  useFocusTrap(dialogRef, onClose, [step]);

  async function handleMagicLink(e) {
    e?.preventDefault();
    setBusy("email");
    setInlineError(null);
    const result = await account.requestMagicLink(email);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setSentTo(email);
    setStep("magic-sent");
  }

  async function handlePasskeyLogin() {
    setBusy("passkey");
    setInlineError(null);
    try {
      await account.passkeyLogin();
    } catch {
      setInlineError("passkey");
    } finally {
      setBusy(null);
    }
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setBusy("login-password");
    setInlineError(null);
    setLoginWarn(false);
    const result = await account.loginWithPassword(email, loginPassword);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      setLoginWarn(Boolean(result.warn));
      return;
    }
    // Erfolg: der isLoggedIn-Effekt oben springt automatisch zu "plan".
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setBusy("register");
    setInlineError(null);
    setEmailTakenProviders(null);
    const result = await account.registerWithPassword(regEmail, regPassword, acceptedTerms);
    setBusy(null);
    if (!result.ok) {
      if (result.error === "email_taken") {
        setEmailTakenProviders(result.providers);
        return;
      }
      setInlineError(result.error);
      return;
    }
    setSentTo(regEmail);
    setStep("verify-sent");
  }

  // Wireframe-Karte 16: bestehendes OAuth-/Passkey-Konto per Bestätigungs-
  // E-Mail mit dem gerade eingegebenen Passwort verknüpfen, statt ein
  // zweites Konto anzulegen.
  async function handleLinkPassword() {
    setBusy("link-password");
    setInlineError(null);
    const result = await account.requestLinkPassword(regEmail, regPassword);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setSentTo(regEmail);
    setEmailTakenProviders(null);
    setStep("verify-sent");
  }

  async function handleResendVerification() {
    setBusy("resend");
    const result = await account.resendVerification(sentTo);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setResendCooldown(60);
  }

  async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    setBusy("forgot");
    await account.requestPasswordReset(forgotEmail);
    setBusy(null);
    setStep("forgot-sent");
  }

  async function handleNewPasswordSubmit(e) {
    e.preventDefault();
    setInlineError(null);
    if (newPassword !== newPasswordRepeat) {
      setInlineError("password_mismatch");
      return;
    }
    setBusy("new-password");
    const result = await account.confirmPasswordReset(account.resetToken, newPassword);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error === "invalid_password" ? "invalid_password" : "invalid_or_expired");
      return;
    }
    setStep("new-password-success");
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cc)",
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--cb)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            {/* --ca-dk statt --ca: --ca (#E8600A) auf Weiss liegt bei ~3.4:1
                Kontrast, unter der WCAG-AA-Grenze von 4.5:1 fuer Normaltext
                (S2-5-Befund, siehe docs/accessibility-audit-s2-5.md). --ca-dk
                (#C44D00) liegt bei ~4.76:1 und besteht die Pruefung. */}
            🦊 ImmoFuchs <span style={{ color: "var(--ca-dk)" }}>Pro</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--ch)",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {step === "compare" && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.compareTitle}</div>
              <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, marginBottom: 16 }}>
                {t.compareIntro}
              </p>
              <CompareTable t={t} />
              <button
                onClick={() => setStep("login")}
                style={primaryBtnStyle}
              >
                {t.compareContinue} →
              </button>
            </>
          )}

          {step === "login" && (
            <>
              <p style={{ fontSize: 13, color: "var(--ch)", marginBottom: 16 }}>{t.loginSubtitle}</p>
              {inlineError && <ErrorBanner t={t} code={inlineError} />}
              {inlineError === "invalid_credentials" && loginWarn && (
                <div style={{ ...warnBannerStyle, marginTop: -6, marginBottom: 12 }}>{t.loginErrorWarnAttempts}</div>
              )}
              {inlineError === "email_not_verified" && (
                <button
                  type="button"
                  onClick={async () => {
                    setBusy("resend-login");
                    await account.resendVerification(email);
                    setBusy(null);
                  }}
                  disabled={busy === "resend-login"}
                  style={{ ...linkBtnStyle, display: "block", marginTop: -6, marginBottom: 12 }}
                >
                  {t.loginResendVerification}
                </button>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {supportsPasskey && (
                  <button
                    onClick={handlePasskeyLogin}
                    disabled={busy === "passkey"}
                    style={secondaryBtnStyle}
                  >
                    🔑 {t.loginPasskey}
                  </button>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={account.startGoogleLogin} style={{ ...secondaryBtnStyle, flex: 1 }}>
                    <span style={{ fontWeight: 800 }}>G</span> {t.loginGoogle}
                  </button>
                  <button onClick={account.startAppleLogin} style={{ ...secondaryBtnStyle, flex: 1 }}>
                    {t.loginApple}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
                <span style={{ fontSize: 11, color: "var(--ch)" }}>{t.loginOr}</span>
                <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
              </div>
              <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  autoComplete="username"
                  style={textInputStyle}
                />
                <PasswordField
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder={t.loginPasswordPlaceholder}
                  show={showLoginPassword}
                  onToggleShow={() => setShowLoginPassword((s) => !s)}
                  t={t}
                  autoComplete="current-password"
                />
                <button type="submit" disabled={busy === "login-password"} style={primaryBtnStyle}>
                  {t.loginSubmit}
                </button>
              </form>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setInlineError(null);
                    setStep("forgot-password");
                  }}
                  style={linkBtnStyle}
                >
                  {t.loginForgotPassword}
                </button>
                <button type="button" onClick={handleMagicLink} disabled={busy === "email"} style={linkBtnStyle}>
                  {t.loginWithoutPassword}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--ch)", marginTop: 8 }}>{t.loginEmailHint}</p>
              <div style={{ textAlign: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cb)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegEmail(email);
                    setInlineError(null);
                    setEmailTakenProviders(null);
                    setStep("register");
                  }}
                  style={linkBtnStyle}
                >
                  {t.loginNoAccount}
                </button>
              </div>
            </>
          )}

          {step === "register" && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t.registerTitle}</div>
              {inlineError && !emailTakenProviders && <ErrorBanner t={t} code={inlineError} />}
              {emailTakenProviders && (
                <div style={{ ...warnBannerStyle, marginBottom: 12 }}>
                  {t.registerErrorEmailTaken.replace(
                    "{provider}",
                    emailTakenProviders.map((p) => providerLabel(t, p)).join(", ") || "?",
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {emailTakenProviders.includes("google") && (
                      <button type="button" onClick={account.startGoogleLogin} style={secondaryBtnStyle}>
                        <span style={{ fontWeight: 800 }}>G</span> {t.loginGoogle}
                      </button>
                    )}
                    {emailTakenProviders.includes("apple") && (
                      <button type="button" onClick={account.startAppleLogin} style={secondaryBtnStyle}>
                        {t.loginApple}
                      </button>
                    )}
                    {emailTakenProviders.includes("password") && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(regEmail);
                          setEmailTakenProviders(null);
                          setInlineError(null);
                          setStep("login");
                        }}
                        style={secondaryBtnStyle}
                      >
                        {t.loginSubmit}
                      </button>
                    )}
                    {!emailTakenProviders.includes("password") && (
                      <button
                        type="button"
                        onClick={handleLinkPassword}
                        disabled={busy === "link-password"}
                        style={secondaryBtnStyle}
                      >
                        {t.registerErrorEmailTakenLinkCta}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  autoComplete="username"
                  style={textInputStyle}
                />
                <PasswordField
                  value={regPassword}
                  onChange={setRegPassword}
                  placeholder={t.registerPasswordPlaceholder}
                  show={showRegPassword}
                  onToggleShow={() => setShowRegPassword((s) => !s)}
                  t={t}
                  autoComplete="new-password"
                  minLength={10}
                />
                <p style={{ fontSize: 10.5, color: "var(--ch)", margin: "-2px 0 4px" }}>{t.registerPasswordHint}</p>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, color: "var(--ct)" }}>
                  <input
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    {t.registerTermsPrefix}{" "}
                    <a href="/agb.html" target="_blank" rel="noreferrer" style={{ color: "var(--ca-dk)" }}>
                      {t.registerTermsAgb}
                    </a>{" "}
                    {t.registerTermsAnd}{" "}
                    <a href="/datenschutz.html" target="_blank" rel="noreferrer" style={{ color: "var(--ca-dk)" }}>
                      {t.registerTermsPrivacy}
                    </a>
                    .
                  </span>
                </label>
                <button type="submit" disabled={busy === "register"} style={primaryBtnStyle}>
                  {t.registerSubmit}
                </button>
              </form>
              <div style={{ textAlign: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cb)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(regEmail);
                    setInlineError(null);
                    setEmailTakenProviders(null);
                    setStep("login");
                  }}
                  style={linkBtnStyle}
                >
                  {t.registerHasAccount}
                </button>
              </div>
            </>
          )}

          {step === "verify-sent" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t.verifySentTitle}</div>
              <p style={{ fontSize: 12, color: "var(--ch)", marginTop: 8 }}>
                {t.verifySentBody.replace("{email}", sentTo || "")}
              </p>
              {inlineError && <ErrorBanner t={t} code={inlineError} />}
              <button
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || busy === "resend"}
                style={{ ...secondaryBtnStyle, marginTop: 16, width: "auto", display: "inline-flex", padding: "10px 16px" }}
              >
                {resendCooldown > 0 ? t.verifyResendCooldown.replace("{sec}", String(resendCooldown)) : t.verifyResend}
              </button>
              <p style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 10 }}>{t.verifyResendHint}</p>
            </div>
          )}

          {step === "forgot-password" && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.forgotPasswordTitle}</div>
              <p style={{ fontSize: 13, color: "var(--ch)", marginBottom: 16 }}>{t.forgotPasswordBody}</p>
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  autoComplete="username"
                  style={textInputStyle}
                />
                <button type="submit" disabled={busy === "forgot"} style={primaryBtnStyle}>
                  {t.forgotPasswordSubmit}
                </button>
              </form>
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <button type="button" onClick={() => setStep("login")} style={linkBtnStyle}>
                  {t.backToLogin}
                </button>
              </div>
            </>
          )}

          {step === "forgot-sent" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ fontSize: 13, color: "var(--ch)" }}>{t.forgotPasswordSentInfo}</p>
              <button
                onClick={() => setStep("login")}
                style={{ ...secondaryBtnStyle, marginTop: 16, width: "auto", display: "inline-flex", padding: "10px 16px" }}
              >
                {t.backToLogin}
              </button>
            </div>
          )}

          {step === "new-password" && (
            <>
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
                <button type="submit" disabled={busy === "new-password"} style={primaryBtnStyle}>
                  {t.newPasswordSubmit}
                </button>
              </form>
              <div style={{ ...infoBannerStyle, marginTop: 12 }}>{t.newPasswordSessionsNotice}</div>
            </>
          )}

          {step === "new-password-success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🦊</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t.newPasswordSuccessTitle}</div>
              <button
                onClick={() => setStep("login")}
                style={{ ...primaryBtnStyle, marginTop: 16 }}
              >
                {t.newPasswordSuccessCta}
              </button>
            </div>
          )}

          {step === "magic-sent" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📩</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {t.loginEmailSent} {sentTo}
              </div>
              <p style={{ fontSize: 12, color: "var(--ch)", marginTop: 8 }}>{t.loginEmailSentHint}</p>
              <button
                onClick={() => setStep("login")}
                style={{ ...secondaryBtnStyle, marginTop: 16 }}
              >
                {t.loginEmailOther}
              </button>
            </div>
          )}

          {step === "plan" && <PlanSelect t={t} account={account} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function CompareTable({ t }) {
  const rows = [
    [t.compareRowRechner, t.compareRowRechnerFree, t.compareRowRechnerPro],
    [t.compareRowExpose, t.compareRowExposeFree, t.compareRowExposePro],
    [t.compareRowFinn, t.compareRowFinnFree, t.compareRowFinnPro],
    [t.compareRowMerkliste, t.compareRowMerklisteFree, t.compareRowMerklistePro],
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
      <thead>
        <tr>
          <th style={thStyle}></th>
          <th style={thStyle}>Free</th>
          <th style={{ ...thStyle, color: "var(--ca-dk)" }}>Pro</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, free, pro]) => (
          <tr key={label}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>{label}</td>
            <td style={tdStyle}>{free}</td>
            <td style={{ ...tdStyle, color: "var(--ca-dk)", fontWeight: 600 }}>{pro}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ErrorBanner({ t, code }) {
  const map = {
    oauth_state_mismatch: t.loginErrorOauth,
    oauth_failed: t.loginErrorOauth,
    magic_link_invalid: t.loginErrorMagicLink,
    rate_limited: t.loginErrorRateLimited,
    passkey: t.loginErrorPasskey,
    invalid_email: t.loginErrorInvalidEmail,
    invalid_credentials: t.loginErrorInvalidCredentials,
    locked: t.loginErrorLocked,
    email_not_verified: t.loginErrorEmailNotVerified,
    email_taken: t.registerErrorEmailTaken,
    invalid_password: t.registerErrorInvalidPassword,
    password_mismatch: t.newPasswordMismatch,
    invalid_or_expired: t.newPasswordErrorInvalidToken,
    verify_invalid: t.verifyErrorInvalid,
  };
  return (
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
      {map[code] || t.loginErrorOauth}
    </div>
  );
}

// Passwortfeld mit Sichtbarkeits-Toggle (Spec 4.3, Wireframe-Karte 13) -
// gemeinsam fuer Login, Registrierung und Passwort-Reset genutzt.
function PasswordField({ value, onChange, placeholder, show, onToggleShow, t, autoComplete, minLength }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <input
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ ...textInputStyle, flex: 1 }}
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? t.loginPasswordHideAria : t.loginPasswordShowAria}
        style={{ ...secondaryBtnStyle, width: 42, minHeight: 42, padding: 0, flex: "0 0 auto" }}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

const PROVIDER_LABELS = { google: "Google", apple: "Apple", passkey: "Passkey" };
function providerLabel(t, provider) {
  return provider === "password" ? t.providerPasswordLabel : PROVIDER_LABELS[provider] || provider;
}

const thStyle = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--cb)", color: "var(--ch)" };
const tdStyle = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--cb)" };

const primaryBtnStyle = {
  width: "100%",
  padding: "14px",
  fontSize: 15,
  fontWeight: 700,
  background: "var(--ca)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "12px",
  fontSize: 14,
  fontWeight: 600,
  background: "var(--ci)",
  color: "var(--ct)",
  border: "1px solid var(--cb)",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};

const textInputStyle = {
  width: "100%",
  height: 42,
  fontSize: 16,
  padding: "0 12px",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--ci)",
  color: "var(--ct)",
  fontFamily: "inherit",
};

const linkBtnStyle = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 11.5,
  color: "var(--ca-dk)",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};

const warnBannerStyle = {
  background: "#FDEBD3",
  border: "1px solid var(--ca)",
  color: "var(--ca-dk)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
};

const infoBannerStyle = {
  background: "#E4EAF1",
  border: "1px solid var(--primary)",
  color: "var(--primary)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 11.5,
};
