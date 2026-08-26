import { createContext, useContext, useEffect, useState } from "react";

// Light/Dark/System (Etappe 1, 2026-08-26). "system" ist der Default und
// wird NICHT in localStorage geschrieben - erst eine explizite Wahl des
// Nutzers wird persistiert (sonst liesse sich "System" nach einer expliziten
// Wahl nie wieder erreichen, ausser durch Loeschen der Browserdaten).
// Das Blocking-Script in index.html setzt data-theme bereits vor dem ersten
// Paint synchron aus demselben localStorage-Key - dieser Context uebernimmt
// danach nur noch die Reaktivitaet (Umschalten zur Laufzeit, Live-Update bei
// Systemwechsel waehrend "System" aktiv ist).
const STORAGE_KEY = "if_theme";
const ThemeCtx = createContext(null);

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      if (theme === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage kann in Private-Mode/blockiertem Storage fehlschlagen -
      // die Wahl gilt dann nur fuer die laufende Sitzung, kein Absturz noetig.
    }
  }, [theme]);

  // Waehrend "System" aktiv ist, folgt die Statusleisten-Farbe (theme-color)
  // live einem Wechsel des OS-Farbschemas - ohne Listener wuerde sie erst
  // beim naechsten Reload nachziehen.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const syncMetaThemeColor = () => {
      const effectiveDark = theme === "dark" || (theme === "system" && mq.matches);
      const meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute("content", effectiveDark ? "#181818" : "#f5f5f0");
    };
    syncMetaThemeColor();
    if (theme !== "system") return undefined;
    mq.addEventListener("change", syncMetaThemeColor);
    return () => mq.removeEventListener("change", syncMetaThemeColor);
  }, [theme]);

  const setTheme = (next) => setThemeState(next === "light" || next === "dark" ? next : "system");

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme muss innerhalb von <ThemeProvider> verwendet werden.");
  return ctx;
}
