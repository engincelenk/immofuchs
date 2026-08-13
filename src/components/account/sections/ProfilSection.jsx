import { useState } from "react";
import { linkedProviderLabel } from "../../../utils/accountEntitlement.js";
import { errorBannerStyle, primaryBtnStyle, textInputStyle } from "../../checkout/checkoutStyles.js";
import { PasswordField } from "../../checkout/CheckoutShared.jsx";
import {
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  inlineLinkBtnStyle,
  labelStyle,
  labelValueRowStyle,
  sectionIntroStyle,
  sectionTitleStyle,
  successBannerStyle,
  valueStyle,
} from "../accountStyles.js";

// Bereich 1: Identitaet des Kontos - E-Mail, Sprache, Passwort. Der
// E-Mail-Wechsel ist unveraendert aus dem alten AccountPanel uebernommen
// (Double-Opt-In: der Server verschickt nur einen Bestaetigungslink, die
// Adresse wechselt erst nach dem Klick).
export function ProfilSection({ t, account }) {
  const { email, name, linkedProviders } = account.me;
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  // Konzept-Dok 1.6/3.3/8.8: Name ist bei Google-/Apple-/Passkey-Konten
  // anfangs leer (kein eigenes Registrierungsformular dort) - hier
  // nachtraeglich ergaenz-/aenderbar, direkt ohne Double-Opt-In (anders als
  // E-Mail), da kein sicherheitskritisches Feld.
  const [changingName, setChangingName] = useState(false);
  const [newName, setNewName] = useState(name || "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState(null);

  async function handleNameSubmit(e) {
    e.preventDefault();
    setNameBusy(true);
    setNameError(null);
    const result = await account.changeName(newName);
    setNameBusy(false);
    if (result.ok) {
      setChangingName(false);
      setNameSaved(true);
    } else {
      setNameError(result.error);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setEmailBusy(true);
    await account.changeEmail(newEmail);
    setEmailBusy(false);
    setChangingEmail(false);
    setNewEmail("");
    // Immer als "gesendet" quittieren: der Server antwortet aus
    // Enumerations-Gruenden auch dann mit ok, wenn die Zieladresse belegt ist.
    setEmailSent(true);
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={sectionTitleStyle}>{t.navProfil}</h2>
      <p style={sectionIntroStyle}>{t.profilIntro}</p>

      <div style={blockCardStyle}>
        {emailSent && <div style={successBannerStyle}>{t.profilEmailChangeSent}</div>}
        {changingEmail ? (
          <form onSubmit={handleEmailSubmit}>
            <div style={blockTitleStyle}>{t.accountEmail}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="email"
                required
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t.loginEmailPlaceholder}
                style={{ ...textInputStyle, flex: "1 1 200px", width: "auto" }}
              />
              <button
                type="submit"
                disabled={emailBusy}
                style={{ ...primaryBtnStyle, width: "auto", padding: "11px 18px", fontSize: 13.5 }}
              >
                {t.profilEmailSubmit}
              </button>
              <button
                type="button"
                onClick={() => setChangingEmail(false)}
                style={inlineLinkBtnStyle}
              >
                {t.commonCancel}
              </button>
            </div>
          </form>
        ) : (
          <div style={labelValueRowStyle}>
            <span style={labelStyle}>{t.accountEmail}</span>
            <span style={{ ...valueStyle, display: "flex", alignItems: "center", gap: 10 }}>
              {email}
              <button onClick={() => setChangingEmail(true)} style={inlineLinkBtnStyle}>
                {t.accountChange}
              </button>
            </span>
          </div>
        )}
        <div style={labelValueRowStyle}>
          <span style={labelStyle}>{t.accountLinkedProviders}</span>
          <span style={valueStyle}>{linkedProviders.map((p) => linkedProviderLabel(p, t)).join(", ")}</span>
        </div>
      </div>

      <div style={blockCardStyle}>
        {nameSaved && <div style={successBannerStyle}>{t.profilNameSuccess}</div>}
        {changingName ? (
          <form onSubmit={handleNameSubmit}>
            <div style={blockTitleStyle}>{t.accountName}</div>
            {nameError && <div style={errorBannerStyle}>{t.registerErrorInvalidName}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.registerNamePlaceholder}
                style={{ ...textInputStyle, flex: "1 1 200px", width: "auto" }}
              />
              <button
                type="submit"
                disabled={nameBusy}
                style={{ ...primaryBtnStyle, width: "auto", padding: "11px 18px", fontSize: 13.5 }}
              >
                {t.accountChange}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingName(false);
                  setNewName(name || "");
                }}
                style={inlineLinkBtnStyle}
              >
                {t.commonCancel}
              </button>
            </div>
          </form>
        ) : (
          <div style={labelValueRowStyle}>
            <span style={labelStyle}>{t.accountName}</span>
            <span style={{ ...valueStyle, display: "flex", alignItems: "center", gap: 10 }}>
              {name || "—"}
              <button onClick={() => setChangingName(true)} style={inlineLinkBtnStyle}>
                {t.accountChange}
              </button>
            </span>
          </div>
        )}
      </div>

      {linkedProviders.includes("password") ? (
        <PasswordBlock t={t} account={account} />
      ) : (
        // PR3 (Spec-v3.0 Kap. 4.3): kein Passwort-Formular fuer Konten, die
        // nur ueber Google/Apple/Passkey angelegt wurden - Kap. 0.1 schliesst
        // ein nachtraegliches Verknuepfen aus.
        <div style={blockCardStyle}>
          <div style={blockTitleStyle}>{t.profilPasswordSocialOnlyTitle}</div>
          <p style={blockHintStyle}>
            {t.profilPasswordSocialOnlyHint.replace(
              "{provider}",
              linkedProviders.map((p) => linkedProviderLabel(p, t)).join(" / "),
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Passwort setzen/aendern. Ob das Konto ueberhaupt schon ein Passwort hat,
// liefert /me nicht mit - deshalb startet das Formular ohne das Feld fuer das
// aktuelle Passwort und blendet es erst ein, wenn der Server es einfordert
// ("current_password_required"). Reine OAuth-/Passkey-Konten sehen es damit
// nie, Passwort-Konten genau einmal.
function PasswordBlock({ t, account }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const ERROR_TEXTS = {
    current_password_required: t.profilPasswordErrorCurrentRequired,
    invalid_credentials: t.profilPasswordErrorInvalidCurrent,
    invalid_password: t.registerErrorInvalidPassword,
    password_mismatch: t.newPasswordMismatch,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setDone(false);
    if (newPassword !== repeatPassword) {
      setError("password_mismatch");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await account.changePassword(newPassword, currentPassword || null);
    setBusy(false);
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setDone(true);
      return;
    }
    if (result.error === "current_password_required") setShowCurrent(true);
    setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} style={blockCardStyle}>
      <div style={blockTitleStyle}>{t.profilPasswordTitle}</div>
      <p style={blockHintStyle}>{t.profilPasswordHint}</p>
      {done && <div style={successBannerStyle}>{t.profilPasswordSuccess}</div>}
      {error && <div style={errorBannerStyle}>{ERROR_TEXTS[error] || t.profilPasswordErrorGeneric}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {showCurrent && (
          <PasswordField
            t={t}
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder={t.profilPasswordCurrent}
            show={reveal}
            onToggleShow={() => setReveal((v) => !v)}
            autoComplete="current-password"
          />
        )}
        <PasswordField
          t={t}
          value={newPassword}
          onChange={setNewPassword}
          placeholder={t.profilPasswordNew}
          show={reveal}
          onToggleShow={() => setReveal((v) => !v)}
          autoComplete="new-password"
          minLength={10}
        />
        <input
          type={reveal ? "text" : "password"}
          required
          minLength={10}
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          placeholder={t.newPasswordRepeatPlaceholder}
          autoComplete="new-password"
          style={textInputStyle}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={busy} style={{ ...primaryBtnStyle, width: "auto", padding: "11px 28px" }}>
            {t.profilPasswordSubmit}
          </button>
        </div>
      </div>
    </form>
  );
}
