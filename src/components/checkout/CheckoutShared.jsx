import {
  errorBannerStyle,
  linkBtnStyle,
  selectInputStyle,
  textInputStyle,
} from "./checkoutStyles.js";

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
    invalid_name: t.registerErrorInvalidName,
    bot_check_failed: t.registerErrorBotCheck,
    password_mismatch: t.newPasswordMismatch,
    invalid_or_expired: t.newPasswordErrorInvalidToken,
    verify_invalid: t.verifyErrorInvalid,
    oauth_email_taken: t.loginErrorOauthOnly.replace("{provider}", ""),
    oauth_only: t.loginErrorOauthOnly.replace("{provider}", ""),
  };
  return <div style={errorBannerStyle}>{map[code] || t.loginErrorOauth}</div>;
}

// Zwischenzustand beim Erzeugen der Kasse (Referenz-Screenshot "Weiterleitung
// zur Kasse ..."). Vorher passierte zwischen Klick und Zahlungsformular
// sichtbar nichts - bei langsamer Verbindung wirkte der Kauf-Button dadurch
// kaputt und wurde erneut gedrueckt.
export function RedirectOverlay({ label }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        // Voll deckend statt 92 % Weiss (Nutzer-Meldung 2026-08-27: "wenn
        // etwas geladen wird sieht man im hintergrund bereits die maske vom
        // naechsten dialog"). Durchscheinende Formularfelder hinter einem
        // Ladehinweis sehen nach halbfertig aus, nicht nach "einen Moment".
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        borderRadius: 12,
      }}
    >
      <span
        aria-hidden="true"
        className="if-checkout-spinner"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "3px solid var(--cb)",
          borderTopColor: "var(--ca)",
        }}
      />
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <style>{`
        .if-checkout-spinner{animation:ifCheckoutSpin .8s linear infinite}
        @keyframes ifCheckoutSpin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){.if-checkout-spinner{animation:none}}
      `}</style>
    </div>
  );
}

// ═══ Formular-Bausteine der Anmeldemasken (Neugestaltung 2026-08-17) ═══
//
// Vorher trugen alle Felder ihre Beschriftung nur als Platzhalter. Der
// verschwindet beim ersten Zeichen - wer beim Ausfuellen unterbrochen wird,
// sieht danach unbeschriftete Kaesten und muss raten, was wohin gehoert.
// Beide Referenz-Masken setzen die Beschriftung deshalb ueber das Feld, wo sie
// stehen bleibt. Nebeneffekt: Screenreader bekommen ueber `htmlFor` endlich
// eine echte Verknuepfung statt nur eines Platzhalters.

// Ueberschrift einer Maske. Die Masken hatten bisher entweder eine kleine
// fette Zeile (Registrierung, Passwort-Reset) oder gar keine (Login) - im
// Login stand nur ein grauer Untertitel, der nicht sagte, wo man ist.
export function AuthHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: subtitle ? 14 : 18 }}>
      <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4, margin: 0, color: "var(--ct)" }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.5, margin: "6px 0 0" }}>{subtitle}</p>
      )}
    </div>
  );
}

const fieldLabelStyle = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--cl)",
  marginBottom: 5,
};

// Beschriftungszeile eines Feldes. `trailing` nimmt den "Passwort
// vergessen?"-Link auf, der im mobilen Vorbild rechts auf Hoehe der
// Beschriftung sitzt statt eine eigene Zeile unter dem Knopf zu belegen.
function FieldLabel({ htmlFor, label, trailing }) {
  if (!trailing) {
    return (
      <label htmlFor={htmlFor} style={fieldLabelStyle}>
        {label}
      </label>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
      <label htmlFor={htmlFor} style={fieldLabelStyle}>
        {label}
      </label>
      {trailing}
    </div>
  );
}

export function TextField({ id, label, hint, trailing, style, ...inputProps }) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} trailing={trailing} />
      <input id={id} {...inputProps} style={{ ...textInputStyle, ...style }} />
      {hint && <p style={{ fontSize: 11, color: "var(--ch)", margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

// Native <select> statt eines eigenen Listen-Aufklappers (Rechnungsdaten,
// Land/Region). Auf dem Handy oeffnet das den systemeigenen Auswahl-Rad-Dialog,
// den jeder kennt und der bei ~190 Eintraegen deutlich schneller zu bedienen
// ist als eine selbstgebaute Liste im Modal.
export function SelectField({ id, label, hint, options, style, ...selectProps }) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} />
      <select id={id} {...selectProps} style={{ ...selectInputStyle, ...style }}>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p style={{ fontSize: 11, color: "var(--ch)", margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  hint,
  trailing,
  value,
  onChange,
  show,
  onToggleShow,
  t,
  autoComplete,
  minLength,
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} trailing={trailing} />
      {/* Auge IM Feld statt als eigener Knopf daneben (Vorbild): der separate
          42px-Knopf nahm dem Eingabefeld Breite und sah auf den ersten Blick
          aus wie ein zweites, kleines Feld. */}
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          style={{ ...textInputStyle, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? t.loginPasswordHideAria : t.loginPasswordShowAria}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--ch)",
          }}
        >
          <EyeIcon off={show} />
        </button>
      </div>
      {hint && <p style={{ fontSize: 11, color: "var(--ch)", margin: "5px 0 0" }}>{hint}</p>}
    </div>
  );
}

// Gezeichnetes Auge statt der Emoji 👁/🙈 - dieselbe Begruendung wie bei den
// Kontomenue-Icons: Emoji sehen je nach Betriebssystem anders aus und lassen
// sich nicht auf die Textfarbe einstellen.
function EyeIcon({ off }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 20L20 4" />}
    </svg>
  );
}

// Grosser Briefumschlag fuer die beiden "Wir haben dir eine E-Mail
// geschickt"-Bildschirme (Passwort-Reset und E-Mail-Bestaetigung). Ersetzt das
// Emoji ✉️, das dort in zwei verschiedenen Groessen stand.
export function MailGlyph({ size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}

// Schloss fuer den Sicherheitshinweis am Zahlungsformular - ersetzt das
// letzte verbliebene Emoji in der Kaufstrecke.
export function LockGlyph({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}

// Trennlinie mit Beschriftung ("oder") zwischen den beiden Anmeldewegen.
export function OrDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
      <span style={{ fontSize: 12, color: "var(--ch)" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
    </div>
  );
}

// Fusszeile "Noch kein Konto? Registrieren" - im Vorbild ohne Trennlinie
// darueber, nur ruhig zentriert.
export function AuthFooterLink({ onClick, children }) {
  return (
    <div style={{ textAlign: "center", marginTop: 18 }}>
      <button type="button" onClick={onClick} style={{ ...linkBtnStyle, fontSize: 13 }}>
        {children}
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
