import { useEffect, useId, useState } from "react";
import {
  AuthFooterLink,
  AuthHeading,
  ErrorBanner,
  GoogleIcon,
  AppleIcon,
  OrDivider,
  PasswordField,
  TextField,
} from "./CheckoutShared.jsx";
import { linkBtnStyle, primaryBtnStyle, secondaryBtnStyle, appleBtnStyle, warnBannerStyle } from "./checkoutStyles.js";

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
export function AccountStep({ t, account, plan, onVerificationSent, onForgotPassword, freeEntry }) {
  // Eindeutige Feld-IDs fuer die label/htmlFor-Verknuepfung. useId statt fester
  // Zeichenketten, weil der Wizard zusammen mit "Mein Konto" auf derselben
  // Seite stehen kann - doppelte IDs wuerden die Beschriftung dem falschen
  // Feld zuordnen.
  const uid = useId();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null);
  const [inlineError, setInlineError] = useState(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginWarn, setLoginWarn] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTakenProviders, setEmailTakenProviders] = useState(null);
  const [oauthOnlyProviders, setOauthOnlyProviders] = useState(null);

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
    setOauthOnlyProviders(null);
    const result = await account.loginWithPassword(email, loginPassword);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      setLoginWarn(Boolean(result.warn));
      if (result.error === "oauth_only") setOauthOnlyProviders(result.providers);
    }
    // Erfolg: CheckoutWizard beobachtet account.isLoggedIn selbst.
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setBusy("register");
    setInlineError(null);
    setEmailTakenProviders(null);
    const result = await account.registerWithPassword(regEmail, regPassword, acceptedTerms, regName);
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

  if (mode === "register") {
    return (
      <div>
        <AuthHeading title={t.registerTitle} />
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
            </div>
          </div>
        )}
        <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Konzept-Dok 1.6/3.3/8.8: Name wird ab jetzt bei der Registrierung
              abgefragt (wichtig fuer die Rechnungserstellung). Nur hier, nicht
              bei Google/Apple - die legen das Konto ohne eigenes Formular an,
              der Name laesst sich dort spaeter im Profil ergaenzen. */}
          <TextField
            id={`${uid}-reg-name`}
            label={t.registerNamePlaceholder}
            type="text"
            required
            maxLength={100}
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            autoComplete="name"
          />
          <TextField
            id={`${uid}-reg-email`}
            label={t.loginEmailPlaceholder}
            type="email"
            required
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            autoComplete="username"
          />
          <PasswordField
            id={`${uid}-reg-password`}
            label={t.loginPasswordPlaceholder}
            hint={t.registerPasswordHint}
            value={regPassword}
            onChange={setRegPassword}
            show={showRegPassword}
            onToggleShow={() => setShowRegPassword((s) => !s)}
            t={t}
            autoComplete="new-password"
            minLength={10}
          />
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

        {/* Anbieter-Anmeldung UNTER dem Formular (Nutzer-Entscheidung
            2026-08-17, mobiles Vorbild): stuenden die beiden Knoepfe oben,
            rutschte das eigentliche Formular auf dem Handy unter die
            Bildschirmkante. */}
        <OrDivider label={t.loginOr} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" onClick={() => account.startGoogleLogin(plan)} style={secondaryBtnStyle}>
            <GoogleIcon /> {t.loginGoogle}
          </button>
          <button type="button" onClick={() => account.startAppleLogin(plan)} style={appleBtnStyle}>
            <AppleIcon /> {t.loginApple}
          </button>
        </div>

        <AuthFooterLink
          onClick={() => {
            setEmail(regEmail);
            setInlineError(null);
            setEmailTakenProviders(null);
            setMode("login");
          }}
        >
          {t.registerHasAccount}
        </AuthFooterLink>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title={t.loginSubmit} subtitle={freeEntry ? t.loginSubtitleFree : t.loginSubtitle} />
      {(inlineError === "oauth_email_taken" || inlineError === "oauth_only") ? (
        <OAuthOnlyBanner
          t={t}
          plan={plan}
          account={account}
          providers={inlineError === "oauth_email_taken" ? account.oauthEmailTakenProviders : oauthOnlyProviders}
        />
      ) : (
        <>
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
        </>
      )}
      {/* Formular zuerst, Anbieter darunter (Nutzer-Entscheidung 2026-08-17).
          Der Rechtstext, der vorher zwischen den Anbieter-Knoepfen und dem
          Formular stand, ist hier ersatzlos entfallen: bei der ANMELDUNG
          stimmt niemand etwas zu, das Konto besteht bereits. Bei der
          Registrierung steht die Zustimmung weiterhin als Pflicht-Haekchen. */}
      <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          id={`${uid}-email`}
          label={t.loginEmailPlaceholder}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <PasswordField
          id={`${uid}-password`}
          label={t.loginPasswordPlaceholder}
          value={loginPassword}
          onChange={setLoginPassword}
          show={showLoginPassword}
          onToggleShow={() => setShowLoginPassword((s) => !s)}
          t={t}
          autoComplete="current-password"
          // "Passwort vergessen?" sitzt auf Hoehe der Beschriftung (mobiles
          // Vorbild) statt unter dem Absende-Knopf: dort stand es hinter dem
          // Ziel, das man gerade nicht erreichen konnte.
          trailing={
            <button type="button" onClick={onForgotPassword} style={{ ...linkBtnStyle, fontSize: 12.5 }}>
              {t.loginForgotPassword}
            </button>
          }
        />
        <button type="submit" disabled={busy === "login-password"} style={primaryBtnStyle}>
          {t.loginSubmit}
        </button>
      </form>

      <OrDivider label={t.loginOr} />

      {/* Untereinander statt nebeneinander (Nutzer-Vorgabe 2026-08-11,
          Referenz-Screenshot): volle Breite pro Anbieter-Knopf statt
          halbierter Breite - besser lesbar/antippbar auf Mobile, gaengiges
          Muster bei Mehrfach-OAuth (ElevenLabs, Notion, Linear etc.). */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="button" onClick={() => account.startGoogleLogin(plan)} style={secondaryBtnStyle}>
          <GoogleIcon /> {t.loginGoogle}
        </button>
        <button type="button" onClick={() => account.startAppleLogin(plan)} style={appleBtnStyle}>
          <AppleIcon /> {t.loginApple}
        </button>
      </div>

      <AuthFooterLink
        onClick={() => {
          setRegEmail(email);
          setInlineError(null);
          setEmailTakenProviders(null);
          setMode("register");
        }}
      >
        {t.loginNoAccount}
      </AuthFooterLink>
    </div>
  );
}

const PROVIDER_LABELS = { google: "Google", apple: "Apple", passkey: "Passkey" };
function providerLabel(t, provider) {
  return provider === "password" ? t.providerPasswordLabel : PROVIDER_LABELS[provider] || provider;
}

// E1/L3 (Spec-v3.0 Kap. 0.1): Konto existiert bereits ueber Google/Apple/
// Passkey - statt einer Verknuepfung gibt es nur den Hinweis auf die
// richtige Methode plus die passenden Login-Knoepfe.
function OAuthOnlyBanner({ t, plan, account, providers }) {
  const list = providers || [];
  const label = list.map((p) => providerLabel(t, p)).join(" bzw. ") || t.loginErrorOauth;
  return (
    <div style={{ ...warnBannerStyle, marginBottom: 12 }}>
      {t.loginErrorOauthOnly.replace("{provider}", label)}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
        {list.includes("google") && (
          <button type="button" onClick={() => account.startGoogleLogin(plan)} style={secondaryBtnStyle}>
            <GoogleIcon /> {t.loginGoogle}
          </button>
        )}
        {list.includes("apple") && (
          <button type="button" onClick={() => account.startAppleLogin(plan)} style={appleBtnStyle}>
            <AppleIcon /> {t.loginApple}
          </button>
        )}
      </div>
    </div>
  );
}
