import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  // Per Portal direkt an document.body haengen (Bugreport 2026-08-05): ohne
  // Portal ist dieses Element ein DOM-Kind von ProHeaderButton -> .hdr, das
  // per backdrop-filter einen eigenen Containing Block fuer position:fixed
  // erzeugt (CSS-Spec: filter/backdrop-filter/transform verhalten sich wie
  // transform in dieser Hinsicht). "position:fixed;inset:0" bezog sich damit
  // auf die 78px hohe Header-Leiste statt auf den Viewport - das Modal wirkte
  // "zu hoch" und nicht mittig. Der Portal umgeht das komplett.
  return createPortal(
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
                    <GoogleIcon /> {t.loginGoogle}
                  </button>
                  <button onClick={account.startAppleLogin} style={{ ...appleBtnStyle, flex: 1 }}>
                    <AppleIcon /> {t.loginApple}
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
                        <GoogleIcon /> {t.loginGoogle}
                      </button>
                    )}
                    {emailTakenProviders.includes("apple") && (
                      <button type="button" onClick={account.startAppleLogin} style={appleBtnStyle}>
                        <AppleIcon /> {t.loginApple}
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
    </div>,
    document.body,
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

// Offizielle Marken-Logos (Spec 4.3/4.5: "folgen den jeweiligen offiziellen
// Branding-Vorgaben") statt Platzhalter-Buchstabe/-Emoji, wie von den
// jeweiligen OAuth-Nutzungsrichtlinien vorgeschrieben.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5818-2.5818C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 170 170" aria-hidden="true" fill="#fff" style={{ flexShrink: 0 }}>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 2.13-9.501 3.24-12.742 3.35-4.929.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.378 0-10.857 2.346-20.221 7.045-28.068 3.693-6.303 8.606-11.275 14.755-14.925s12.793-5.51 19.948-5.629c3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 3.599 12.238 3.599 1.339 0 5.877-1.416 13.57-4.239 7.275-2.618 13.415-3.702 18.437-3.275 13.63 1.1 23.87 6.473 30.68 16.153-12.19 7.386-18.22 17.731-18.1 31.002.11 10.337 3.86 18.939 11.234 25.769 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.102-2.96 15.667-8.86 22.669-7.12 8.324-15.732 13.134-25.071 12.375a25.222 25.222 0 0 1-.188-3.07c0-7.778 3.386-16.102 9.399-22.908 3.002-3.446 6.82-6.311 11.45-8.597 4.62-2.253 8.99-3.5 13.1-3.71.12 1.083.17 2.166.17 3.24z" />
    </svg>
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

// Apple-Branding-Vorgabe: schwarzer Button mit weissem Logo+Text ist die
// von Apple vorgegebene, immer zulaessige Variante (kein separates Regel-
// werk fuer Light/Dark-Kontext noetig).
const appleBtnStyle = {
  ...secondaryBtnStyle,
  background: "#000",
  color: "#fff",
  border: "1px solid #000",
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
