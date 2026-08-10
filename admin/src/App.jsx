// admin/src/App.jsx
import { useEffect, useState, useCallback } from "react";
import { fetchMe } from "./api";
import LoginScreen from "./LoginScreen.jsx";
import AdminShell from "./AdminShell.jsx";

// Gleiche Tokens wie das Kunden-Frontend (src/App.jsx, ROOT_TOKENS_CSS) -
// per Kopie uebernommen fuer visuelle Konsistenz, kein geteiltes Modul
// (siehe Spec, Abschnitt 2: bewusst kein gemeinsamer Code zwischen den
// beiden Frontend-Projekten ausser dieser CSS-Token-Kopie).
const ROOT_TOKENS_CSS =
  ":root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}";
const GLOBAL_CSS = `${ROOT_TOKENS_CSS}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
button{font-family:inherit}
`;

// Zustandsautomat, analog zum Standard-Login-Flow-Konzept (Neue-Phase-
// Konsolidiert.md Abschnitt 2): beim Laden wird die Session einmal geprueft,
// KEIN erzwungener Login-Screen ohne vorherige Pruefung.
export default function App() {
  const [status, setStatus] = useState("loading"); // loading | login | denied | admin
  const [me, setMe] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      const data = await fetchMe();
      setMe(data);
      setStatus(data.role === "admin" ? "admin" : "denied");
    } catch {
      // Jeder Fehler (401 = keine Session, aber auch Netzwerkfehler) landet
      // hier auf dem Login-Screen - es gibt keinen sinnvolleren Zustand ohne
      // gueltige Session.
      setStatus("login");
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {status === "loading" && <CenteredMessage text="Lade..." />}
      {status === "login" && <LoginScreen onLoggedIn={checkSession} />}
      {status === "denied" && (
        <CenteredMessage text={`Kein Zugriff. Das Konto ${me?.email ?? ""} hat keine Admin-Berechtigung.`} />
      )}
      {status === "admin" && <AdminShell me={me} />}
    </>
  );
}

function CenteredMessage({ text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        textAlign: "center",
        color: "var(--ch)",
      }}
    >
      {text}
    </div>
  );
}
