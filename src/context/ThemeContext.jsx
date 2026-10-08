import { createContext, useContext, useEffect, useState } from "react";

// Light/Dark/System (Etappe 1, 2026-08-26). "dark" ist der Default (Nutzer-
// Vorgabe 2026-08-28, vorher "system") und wird NICHT in localStorage
// geschrieben - erst eine explizite Wahl von "Hell" oder "System" wird
// persistiert (sonst liesse sich der Default nach einer expliziten Wahl nie
// wieder erreichen, ausser durch Loeschen der Browserdaten).
// Das Blocking-Script in index.html setzt data-theme bereits vor dem ersten
// Paint synchron aus demselben localStorage-Key - dieser Context uebernimmt
// danach nur noch die Reaktivitaet (Umschalten zur Laufzeit, Live-Update bei
// Systemwechsel waehrend "System" aktiv ist).
const STORAGE_KEY = "if_theme";
const ThemeCtx = createContext(null);

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
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
      if (theme === "dark") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage kann in Private-Mode/blockiertem Storage fehlschlagen -
      // die Wahl gilt dann nur fuer die laufende Sitzung, kein Absturz noetig.
    }
  }, [theme]);

  // resolvedTheme (2026-08-26, Logo-Umschaltung): "light"/"dark" - das
  // tatsaechlich sichtbare Theme, mit aufgeloestem "System"-Wert. Consumer
  // wie das Logo (siehe BrandIcon.jsx) brauchen genau das, nicht die rohe
  // 3-Wert-Einstellung. Waehrend "System" aktiv ist, folgt sowohl das hier
  // als auch die Statusleisten-Farbe (theme-color) live einem Wechsel des
  // OS-Farbschemas - ohne Listener wuerden beide erst beim naechsten Reload
  // nachziehen.
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const effectiveDark = theme === "dark" || (theme === "system" && mq.matches);
      setResolvedTheme(effectiveDark ? "dark" : "light");
      const meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute("content", effectiveDark ? "#181818" : "#f5f5f0");
    };
    sync();
    if (theme !== "system") return undefined;
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  const setTheme = (next) => setThemeState(next === "light" || next === "dark" ? next : "system");

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, resolvedTheme }}>{children}</ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme muss innerhalb von <ThemeProvider> verwendet werden.");
  return ctx;
}
