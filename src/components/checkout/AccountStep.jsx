import { useEffect, useState } from "react";
import { ErrorBanner, GoogleIcon, AppleIcon, PasswordField } from "./CheckoutShared.jsx";
import { linkBtnStyle, primaryBtnStyle, secondaryBtnStyle, appleBtnStyle, textInputStyle, warnBannerStyle } from "./checkoutStyles.js";

// Login/Registrierung als eigener Wizard-Schritt. `onVerificationSent` wird
// nur beim Passwort-Registrierungspfad aufgerufen (einziger Weg mit
// Double-Opt-In) - Google/Apple loggen den Nutzer direkt ein, das beobachtet
// CheckoutWizard selbst ueber account.isLoggedIn. `onForgotPassword` oeffnet
// den separaten PasswordResetFlow (kein eigener Wizard-Schritt, siehe Spec 5.1).
//
// Reduktion auf drei Wege (06.08.2026, Nutzerentscheidung): Passkey und
// E-Mail-Magic-Link sind aus der Oberflaeche entfernt. Passkey war redundant -
// das Passwortfeld traegt autoComplete="current-password", worauf iOS/Android/
// Windows von sich aus Face ID/Touch ID/Hello ueber den Passwort-Manager
// anbieten; der separate Knopf verkaufte dieselbe Funktion ein zweites Mal.
// Der Magic-Link war ein zweiter Mail-Kanal mit eigener Zustellbarkeits- und
// Spam-Fehlerquelle, ohne eigenen Job neben "Passwort vergessen". Die
// Worker-Routen (/auth/passkey/*, /auth/magic-link/*) bleiben bewusst
// bestehen - ein reines UI-Aufraeumen, jederzeit reversibel.
//
// `plan` wird nur durchgereicht, um ihn vor dem OAuth-Redirect zu merken:
// Google/Apple verlassen die Seite komplett, wodurch der Wizard-State
// verloren geht (siehe useAccount.js/startGoogleLogin).
export function AccountStep({ t, account, plan, onVerificationSent, onForgotPassword }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null);
  const [inlineError, setInlineError] = useState(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginWarn, setLoginWarn] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTakenProviders, setEmailTakenProviders] = useState(null);

  useEffect(() => {
    if (account?.error?.startsWith("login_error_")) {
      setInlineError(account.error.replace("login_error_", ""));
    }
  }, [account?.error]);

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
    }
    // Erfolg: CheckoutWizard beobachtet account.isLoggedIn selbst.
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
    onVerificationSent(regEmail);
  }

  async function handleLinkPassword() {
    setBusy("link-password");
    setInlineError(null);
    const result = await account.requestLinkPassword(regEmail, regPassword);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setEmailTakenProviders(null);
    onVerificationSent(regEmail);
  }

  if (mode === "register") {
    return (
      <div>
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
                <button type="button" onClick={() => account.startGoogleLogin(plan)} style={secondaryBtnStyle}>
                  <GoogleIcon /> {t.loginGoogle}
                </button>
              )}
              {emailTakenProviders.includes("apple") && (
                <button type="button" onClick={() => account.startAppleLogin(plan)} style={appleBtnStyle}>
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
                    setMode("login");
                  }}
                  style={secondaryBtnStyle}
                >
                  {t.loginSubmit}
                </button>
              )}
              {/* Auch der Weg zurueck fuer reine Passkey-Konten (Provider-Liste
                  kann "passkey" enthalten): ohne Passkey-Knopf im UI ist das
                  Setzen eines Passworts deren Anmeldeweg. */}
              {!emailTakenProviders.includes("password") && (
                <button type="button" onClick={handleLinkPassword} disabled={busy === "link-password"} style={secondaryBtnStyle}>
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
              setMode("login");
            }}
            style={linkBtnStyle}
          >
            {t.registerHasAccount}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
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
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => account.startGoogleLogin(plan)} style={{ ...secondaryBtnStyle, flex: 1 }}>
          <GoogleIcon /> {t.loginGoogle}
        </button>
        <button onClick={() => account.startAppleLogin(plan)} style={{ ...appleBtnStyle, flex: 1 }}>
          <AppleIcon /> {t.loginApple}
        </button>
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
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={onForgotPassword} style={linkBtnStyle}>
          {t.loginForgotPassword}
        </button>
      </div>
      <div style={{ textAlign: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cb)" }}>
        <button
          type="button"
          onClick={() => {
            setRegEmail(email);
            setInlineError(null);
            setEmailTakenProviders(null);
            setMode("register");
          }}
          style={linkBtnStyle}
        >
          {t.loginNoAccount}
        </button>
      </div>
    </div>
  );
}

const PROVIDER_LABELS = { google: "Google", apple: "Apple", passkey: "Passkey" };
function providerLabel(t, provider) {
  return provider === "password" ? t.providerPasswordLabel : PROVIDER_LABELS[provider] || provider;
}
