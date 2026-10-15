import { Component } from "react";
import { ACCOUNT_T } from "../../i18n/account.js";

// Letztes Netz um die ganze App: stuerzt eine Komponente beim Rendern ab,
// bliebe sonst eine weisse Seite. Haeufigste reale Ursache ist ein Deploy, bei
// dem der Browser noch alte Bundle-Namen kennt - ein Neuladen behebt das.
// Liegt AUSSERHALB von ThemeProvider/AccountProvider und nutzt deshalb weder
// Kontext noch CSS-Variablen aus App.jsx (die Tokens stehen in einem <style>,
// das mit der App verschwinden kann).
function currentLang() {
  try {
    const stored = localStorage.getItem("if_lang");
    if (stored && ACCOUNT_T[stored]) return stored;
  } catch {}
  return "de";
}

function isDark() {
  try {
    const v = localStorage.getItem("if_theme");
    if (v === "light") return false;
    if (v === "dark") return true;
  } catch {}
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("app_render_failed", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = ACCOUNT_T[currentLang()];
    const dark = isDark();
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: dark ? "#181818" : "#F5F5F0",
          color: dark ? "#F0F0EA" : "#1A1A1A",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            background: dark ? "#232323" : "#FFFFFF",
            border: `1px solid ${dark ? "#3A3A38" : "#E5E5DC"}`,
            borderRadius: 12,
            padding: "32px 24px",
          }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>{t.appCrashTitle}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", color: dark ? "#9A9A90" : "#6C6C62" }}>
            {t.appCrashBody}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 46,
              padding: "0 22px",
              fontFamily: "inherit",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              background: dark ? "#F07A2E" : "#B84800",
              color: dark ? "#1A1A1A" : "#FFFFFF",
            }}
          >
            {t.appCrashReload}
          </button>
        </div>
      </div>
    );
  }
}
