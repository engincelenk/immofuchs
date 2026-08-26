import { useState } from "react";
import { LANGS } from "../../../i18n/translations.js";
import { useTheme } from "../../../context/ThemeContext.jsx";
import { IconDownload } from "../accountIcons.jsx";
import { SectionTitle } from "./SectionTitle.jsx";
import { actionBtnStyle, blockCardStyle, blockHintStyle, blockTitleStyle, sectionIntroStyle } from "../accountStyles.js";

// Etappe 1 Light/Dark/System (2026-08-26): dieselben drei Werte wie
// ThemeContext.setTheme akzeptiert, hier nur mit Beschriftung.
const THEME_OPTIONS = [
  { v: "light", labelKey: "profilThemeLight" },
  { v: "dark", labelKey: "profilThemeDark" },
  { v: "system", labelKey: "profilThemeSystem" },
];

// Spec-v3.0 Kap. 4.1/4.7: "Einstellungen" buendelt Sprache (vorher in
// Profil), Benachrichtigungen und Datenschutz/Analyse - vorher hiess dieser
// Bereich "Datenschutz" und enthielt zusaetzlich die Konto-Loeschung, die
// jetzt nach "Konto" gehoert (Kap. 4.5, siehe KontoSection.jsx). Export
// (Art. 20 DSGVO) bleibt hier, da inhaltlich am naechsten zu
// "Datenschutz/Analyse erlauben".
export function EinstellungenSection({ t, account, lang, setLang, onBack }) {
  const { theme, setTheme } = useTheme();
  const [notifBusy, setNotifBusy] = useState(false);
  const marketingEmailsEnabled = Boolean(account.me.marketingEmailsEnabled);

  // Kap. 4.7: Toggle greift sofort, kein "Speichern"-Button noetig.
  async function handleToggleMarketing(e) {
    const next = e.target.checked;
    setNotifBusy(true);
    await account.setMarketingEmailsEnabled(next);
    setNotifBusy(false);
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionTitle title={t.navDatenschutz} onBack={onBack} backLabel={t.wizardBack} />
      <p style={sectionIntroStyle}>{t.einstellungenIntro}</p>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.profilLanguageTitle}</div>
        <p style={blockHintStyle}>{t.profilLanguageHint}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LANGS.map((l) => (
            <button
              key={l.v}
              onClick={() => setLang(l.v)}
              aria-current={l.v === lang ? "true" : undefined}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${l.v === lang ? "var(--ca)" : "var(--cb)"}`,
                background: l.v === lang ? "var(--ca-bg)" : "var(--ci)",
                color: l.v === lang ? "var(--ca-dk)" : "var(--ct)",
                fontSize: 13,
                fontWeight: l.v === lang ? 700 : 600,
                cursor: "pointer",
                fontFamily: "inherit",
                minHeight: 40,
              }}
            >
              {l.full}
            </button>
          ))}
        </div>
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.profilThemeTitle}</div>
        <p style={blockHintStyle}>{t.profilThemeHint}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.v}
              onClick={() => setTheme(o.v)}
              aria-current={o.v === theme ? "true" : undefined}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${o.v === theme ? "var(--ca)" : "var(--cb)"}`,
                background: o.v === theme ? "var(--ca-bg)" : "var(--ci)",
                color: o.v === theme ? "var(--ca-dk)" : "var(--ct)",
                fontSize: 13,
                fontWeight: o.v === theme ? 700 : 600,
                cursor: "pointer",
                fontFamily: "inherit",
                minHeight: 40,
              }}
            >
              {t[o.labelKey]}
            </button>
          ))}
        </div>
      </div>

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
        <button
          onClick={account.exportData}
          style={{ ...actionBtnStyle, display: "flex", alignItems: "center", gap: 10 }}
        >
          <IconDownload size={18} />
          {t.accountExport}
        </button>
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.einstellungenLegalTitle}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href="/impressum.html" target="_blank" rel="noreferrer" style={{ color: "var(--ca-dk)", fontSize: 13, fontWeight: 600 }}>
            {t.einstellungenLegalImpressum}
          </a>
          <a href="/datenschutz.html" target="_blank" rel="noreferrer" style={{ color: "var(--ca-dk)", fontSize: 13, fontWeight: 600 }}>
            {t.registerTermsPrivacy}
          </a>
          <a href="/agb.html" target="_blank" rel="noreferrer" style={{ color: "var(--ca-dk)", fontSize: 13, fontWeight: 600 }}>
            {t.registerTermsAgb}
          </a>
        </div>
      </div>
    </div>
  );
}
