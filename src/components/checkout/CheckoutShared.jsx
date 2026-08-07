import { errorBannerStyle, secondaryBtnStyle, textInputStyle } from "./checkoutStyles.js";

// Fehlertext-Mapping (Extrakt aus LoginModal.jsx) - eine Stelle fuer alle
// Fehlercodes, die AccountStep/PasswordResetFlow zurueckbekommen koennen.
export function ErrorBanner({ t, code }) {
  const map = {
    oauth_state_mismatch: t.loginErrorOauth,
    oauth_failed: t.loginErrorOauth,
    rate_limited: t.loginErrorRateLimited,
    // Kommt nur noch aus der Registrierung (ungueltige Adresse oder fehlende
    // Zustimmung). Zeigte vorher den Magic-Link-Text "Login-Link konnte nicht
    // gesendet werden ...", der dort nie gepasst hat.
    invalid_email: t.registerErrorInvalidEmail,
    invalid_credentials: t.loginErrorInvalidCredentials,
    locked: t.loginErrorLocked,
    email_not_verified: t.loginErrorEmailNotVerified,
    email_taken: t.registerErrorEmailTaken,
    invalid_password: t.registerErrorInvalidPassword,
    password_mismatch: t.newPasswordMismatch,
    invalid_or_expired: t.newPasswordErrorInvalidToken,
    verify_invalid: t.verifyErrorInvalid,
    oauth_email_taken: t.loginErrorOauthOnly.replace("{provider}", ""),
    oauth_only: t.loginErrorOauthOnly.replace("{provider}", ""),
  };
  return <div style={errorBannerStyle}>{map[code] || t.loginErrorOauth}</div>;
}

export function PasswordField({ value, onChange, placeholder, show, onToggleShow, t, autoComplete, minLength }) {
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

// Offizielle Marken-Logos statt Platzhalter-Buchstabe/-Emoji (OAuth-
// Nutzungsrichtlinien).
export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5818-2.5818C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 170 170" aria-hidden="true" fill="#fff" style={{ flexShrink: 0 }}>
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 2.13-9.501 3.24-12.742 3.35-4.929.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.378 0-10.857 2.346-20.221 7.045-28.068 3.693-6.303 8.606-11.275 14.755-14.925s12.793-5.51 19.948-5.629c3.915 0 9.049 1.211 15.429 3.591 6.362 2.388 10.447 3.599 12.238 3.599 1.339 0 5.877-1.416 13.57-4.239 7.275-2.618 13.415-3.702 18.437-3.275 13.63 1.1 23.87 6.473 30.68 16.153-12.19 7.386-18.22 17.731-18.1 31.002.11 10.337 3.86 18.939 11.234 25.769 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.102-2.96 15.667-8.86 22.669-7.12 8.324-15.732 13.134-25.071 12.375a25.222 25.222 0 0 1-.188-3.07c0-7.778 3.386-16.102 9.399-22.908 3.002-3.446 6.82-6.311 11.45-8.597 4.62-2.253 8.99-3.5 13.1-3.71.12 1.083.17 2.166.17 3.24z" />
    </svg>
  );
}
