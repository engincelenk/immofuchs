import { useCallback, useEffect, useState } from "react";
import { AccordionSection } from "../../ui/AccordionSection.jsx";
import { LANG_LOCALE } from "../../../utils/helpers.js";
import { linkedProviderLabel } from "../../../utils/accountEntitlement.js";
import { errorBannerStyle, textInputStyle, warnBannerStyle } from "../../checkout/checkoutStyles.js";
import { SectionTitle } from "./SectionTitle.jsx";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  dangerBtnStyle,
  emptyStateStyle,
  inlineLinkBtnStyle,
  sectionIntroStyle,
} from "../accountStyles.js";

// Spec-v3.0 Kap. 4.1: "Konto": aktive Sitzungen (aufklappbar), Alle Geraete
// abmelden und Konto loeschen. Abmelden und Merkliste stehen im Burger-Menue.
export function KontoSection({ t, account, lang, onClose, onBack }) {
  const locale = LANG_LOCALE[lang] || "de-DE";
  const [sessions, setSessions] = useState(null); // null = laedt noch
  const [sessionsError, setSessionsError] = useState(false);
  const [logoutAllConfirming, setLogoutAllConfirming] = useState(false);

  // Bewusst die einzelne Methode als Abhaengigkeit statt des ganzen
  // account-Objekts: dessen Identitaet wechselt bei jedem /me-Refresh, was
  // die Liste ohne Anlass neu laden wuerde.
  const { listDevices } = account;
  const loadSessions = useCallback(async () => {
    try {
      setSessions(await listDevices());
    } catch {
      setSessionsError(true);
    }
  }, [listDevices]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Nach dem Rundumschlag ist auch diese Sitzung tot - der Kontobereich wird
  // deshalb sofort geschlossen, statt den Nutzer vor einer Maske sitzen zu
  // lassen, die keine Daten mehr laden kann.
  async function handleLogoutAll() {
    await account.logoutAllDevices();
    onClose();
  }

  function formatMoment(value) {
    if (!value) return null;
    return new Date(value).toLocaleString(locale);
  }

  // D2 (Spec-v3.0 Kap. 4.5): Loeschung ist unwiderruflich, daher
  // Sicherheitsnachweis Pflicht - Passwort-Konten bestaetigen direkt hier,
  // reine OAuth-Konten muessen einen frischen Google/Apple-Login durchlaufen
  // (siehe useAccount.js/startDeleteReauth, routes/auth.ts).
  const linkedProviders = account.me.linkedProviders || [];
  const hasPassword = linkedProviders.includes("password");
  const oauthProviders = linkedProviders.filter((p) => p === "google" || p === "apple");

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const reauthFailed = account.error === "login_error_delete_reauth_failed";

  const DELETE_ERROR_TEXTS = {
    current_password_required: t.datenschutzDeleteErrorPasswordRequired,
    invalid_credentials: t.datenschutzDeleteErrorInvalidPassword,
    cancel_failed_try_again: t.datenschutzDeleteError,
  };

  async function handleDeleteWithPassword(e) {
    e.preventDefault();
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await account.deleteAccount(deletePassword);
    setDeleteBusy(false);
    if (result.ok) {
      onClose();
      return;
    }
    setDeleteError(result.error);
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionTitle title={t.navSicherheit} onBack={onBack} backLabel={t.wizardBack} />
      <p style={sectionIntroStyle}>{t.kontoIntro}</p>

      {sessionsError && <div style={errorBannerStyle}>{t.sicherheitSessionsError}</div>}

      <AccordionSection question={t.sicherheitSessionsTitle}>
        <p style={blockHintStyle}>{t.sicherheitSessionsHint}</p>
        {sessions === null && !sessionsError && <div style={emptyStateStyle}>{t.commonLoading}</div>}
        {sessions !== null && sessions.length === 0 && (
          <div style={emptyStateStyle}>{t.sicherheitSessionsEmpty}</div>
        )}
        {(sessions || []).map((session, i) => (
          <div
            key={session.id}
            style={{
              padding: "10px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--cb)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>
                {session.userAgent || t.sicherheitSessionUnknownDevice}
              </span>
              {session.current && (
                <span
                  style={{
                    background: "var(--ca-bg)",
                    color: "var(--ca-dk)",
                    border: "1px solid var(--ca-bd)",
                    borderRadius: 20,
                    padding: "2px 8px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.sicherheitSessionCurrent}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 2 }}>
              {t.sicherheitSessionSince.replace("{date}", formatMoment(session.createdAt) || "—")}
              {session.lastSeenAt
                ? ` · ${t.sicherheitSessionLastSeen.replace("{date}", formatMoment(session.lastSeenAt))}`
                : ""}
            </div>
          </div>
        ))}
      </AccordionSection>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountLogoutAll}</div>
        <p style={blockHintStyle}>{t.sicherheitLogoutAllHint}</p>
        {!logoutAllConfirming ? (
          <button onClick={() => setLogoutAllConfirming(true)} style={actionBtnStyle}>
            {t.accountLogoutAll}
          </button>
        ) : (
          // Konzept-Dok 3.11: destruktive Wirkung (alle Sitzungen inkl. der
          // eigenen enden sofort) verdient dieselbe Bestaetigung wie
          // "Konto loeschen" weiter unten, statt einer 1-Klick-Aktion.
          <div>
            <div style={{ ...warnBannerStyle, marginBottom: 12 }}>{t.sicherheitLogoutAllHint}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleLogoutAll} style={dangerBtnStyle}>
                {t.accountLogoutAll}
              </button>
              <button
                type="button"
                onClick={() => setLogoutAllConfirming(false)}
                style={inlineLinkBtnStyle}
              >
                {t.commonCancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountDelete}</div>
        <p style={blockHintStyle}>{t.datenschutzDeleteHint}</p>

        {reauthFailed && <div style={errorBannerStyle}>{t.datenschutzDeleteReauthFailed}</div>}

        {!deleteConfirming ? (
          <button onClick={() => setDeleteConfirming(true)} style={dangerBtnStyle}>
            {t.accountDelete}
          </button>
        ) : (
          <div>
            <div style={{ ...warnBannerStyle, marginBottom: 12 }}>{t.accountDeleteConfirm}</div>
            {deleteError && (
              <div style={errorBannerStyle}>{DELETE_ERROR_TEXTS[deleteError] || t.datenschutzDeleteError}</div>
            )}

            {hasPassword ? (
              <form onSubmit={handleDeleteWithPassword} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={t.datenschutzDeletePasswordPlaceholder}
                  style={textInputStyle}
                />
                <button type="submit" disabled={deleteBusy} style={dangerBtnStyle}>
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
                    {t.datenschutzDeleteReauthCta.replace("{provider}", linkedProviderLabel(provider, t))}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setDeleteConfirming(false);
                setDeleteError(null);
                setDeletePassword("");
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
