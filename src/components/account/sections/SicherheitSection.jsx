import { useCallback, useEffect, useState } from "react";
import { LANG_LOCALE } from "../../../utils/helpers.js";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  emptyStateStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Bereich 6: Sitzungen. Die Liste ist bewusst reine Anzeige - der Server
// kennt kein gezieltes Abmelden einzelner Geraete, nur den Rundumschlag
// ueber /auth/logout-all. Ein Knopf pro Zeile wuerde also etwas versprechen,
// was dahinter nicht existiert.
export function SicherheitSection({ t, account, lang, onClose }) {
  const locale = LANG_LOCALE[lang] || "de-DE";
  const [sessions, setSessions] = useState(null); // null = laedt noch
  const [error, setError] = useState(false);

  // Bewusst die einzelne Methode als Abhaengigkeit statt des ganzen
  // account-Objekts: dessen Identitaet wechselt bei jedem /me-Refresh, was
  // die Liste ohne Anlass neu laden wuerde.
  const { listDevices } = account;
  const load = useCallback(async () => {
    try {
      setSessions(await listDevices());
    } catch {
      setError(true);
    }
  }, [listDevices]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navSicherheit}</h2>
      <p style={sectionIntroStyle}>{t.sicherheitIntro}</p>

      {error && <div style={errorBannerStyle}>{t.sicherheitSessionsError}</div>}

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.sicherheitSessionsTitle}</div>
        <p style={blockHintStyle}>{t.sicherheitSessionsHint}</p>
        {sessions === null && !error && <div style={emptyStateStyle}>{t.commonLoading}</div>}
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
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountLogoutAll}</div>
        <p style={blockHintStyle}>{t.sicherheitLogoutAllHint}</p>
        <button onClick={handleLogoutAll} style={actionBtnStyle}>
          {t.accountLogoutAll}
        </button>
      </div>
    </div>
  );
}
