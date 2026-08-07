import { useState } from "react";
import { linkedProviderLabel } from "../../../utils/accountEntitlement.js";
import { errorBannerStyle, textInputStyle, warnBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  dangerBtnStyle,
  inlineLinkBtnStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Bereich 7: DSGVO-Rechte. Export (Art. 20) unveraendert aus dem alten
// AccountPanel uebernommen. Die Loeschung (Art. 17) verlangt seit D2
// (Spec-v3.0 Kap. 4.5) einen echten Sicherheitsnachweis statt eines nackten
// window.confirm(): Passwort-Konten bestaetigen direkt hier, reine
// OAuth-Konten muessen einen frischen Google/Apple-Login durchlaufen
// (siehe useAccount.js/startDeleteReauth, routes/auth.ts).
export function DatenschutzSection({ t, account, onClose }) {
  const linkedProviders = account.me.linkedProviders || [];
  const hasPassword = linkedProviders.includes("password");
  const oauthProviders = linkedProviders.filter((p) => p === "google" || p === "apple");

  const [notifBusy, setNotifBusy] = useState(false);
  const marketingEmailsEnabled = Boolean(account.me.marketingEmailsEnabled);

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reauthFailed = account.error === "login_error_delete_reauth_failed";

  const DELETE_ERROR_TEXTS = {
    current_password_required: t.datenschutzDeleteErrorPasswordRequired,
    invalid_credentials: t.datenschutzDeleteErrorInvalidPassword,
    cancel_failed_try_again: t.datenschutzDeleteError,
  };

  // Kap. 4.7: Toggle greift sofort, kein "Speichern"-Button noetig.
  async function handleToggleMarketing(e) {
    const next = e.target.checked;
    setNotifBusy(true);
    await account.setMarketingEmailsEnabled(next);
    setNotifBusy(false);
  }

  async function handleDeleteWithPassword(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await account.deleteAccount(password);
    setBusy(false);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.error);
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navDatenschutz}</h2>
      <p style={sectionIntroStyle}>{t.datenschutzIntro}</p>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.datenschutzNotificationsTitle}</div>
        <p style={blockHintStyle}>{t.datenschutzNotificationsHint}</p>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--ct)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={marketingEmailsEnabled}
            onChange={handleToggleMarketing}
            disabled={notifBusy}
          />
          <span>{t.datenschutzNotificationsMarketingLabel}</span>
        </label>
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountExport}</div>
        <p style={blockHintStyle}>{t.datenschutzExportHint}</p>
        <button onClick={account.exportData} style={actionBtnStyle}>
          {t.accountExport} ↓
        </button>
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountDelete}</div>
        <p style={blockHintStyle}>{t.datenschutzDeleteHint}</p>

        {reauthFailed && <div style={errorBannerStyle}>{t.datenschutzDeleteReauthFailed}</div>}

        {!confirming ? (
          <button onClick={() => setConfirming(true)} style={dangerBtnStyle}>
            {t.accountDelete}
          </button>
        ) : (
          <div>
            <div style={{ ...warnBannerStyle, marginBottom: 12 }}>{t.accountDeleteConfirm}</div>
            {error && <div style={errorBannerStyle}>{DELETE_ERROR_TEXTS[error] || t.datenschutzDeleteError}</div>}

            {hasPassword ? (
              <form onSubmit={handleDeleteWithPassword} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.datenschutzDeletePasswordPlaceholder}
                  style={textInputStyle}
                />
                <button type="submit" disabled={busy} style={dangerBtnStyle}>
                  {t.datenschutzDeleteConfirmCta}
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={blockHintStyle}>{t.datenschutzDeleteReauthHint}</p>
                {oauthProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => account.startDeleteReauth(provider)}
                    style={dangerBtnStyle}
                  >
                    {t.datenschutzDeleteReauthCta.replace("{provider}", linkedProviderLabel(provider))}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
                setPassword("");
              }}
              style={{ ...inlineLinkBtnStyle, marginTop: 10 }}
            >
              {t.commonCancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
