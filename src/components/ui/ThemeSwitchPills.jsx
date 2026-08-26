import { useTheme } from "../../context/ThemeContext.jsx";

// Geteilte Pillen-Reihe fuer die Hell/Dunkel/System-Wahl (Etappe 1,
// 2026-08-26) - urspruenglich nur in EinstellungenSection.jsx, jetzt auch im
// mobilen Seiten-Menue der Landingpage (HeaderMenu.jsx, Nutzer-Vorgabe
// 2026-08-26). Eine Stelle statt zweier Kopien, damit Optionsliste und Optik
// nicht auseinanderlaufen. `t` erwartet dieselben profilTheme*-Schluessel
// wie ACCOUNT_T (i18n/account.js) - beide Aufrufer reichen dort ihr `t`
// durch.
const THEME_OPTIONS = [
  { v: "light", labelKey: "profilThemeLight" },
  { v: "dark", labelKey: "profilThemeDark" },
  { v: "system", labelKey: "profilThemeSystem" },
];

export function ThemeSwitchPills({ t }) {
  const { theme, setTheme } = useTheme();
  return (
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
  );
}
