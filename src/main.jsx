import ReactDOM from "react-dom/client";
import App from "./App";
import InstallPrompt from "./InstallPrompt";
import { AccountProvider } from "./context/AccountContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

// AccountProvider liegt hier statt in AppProviders.jsx (Konzept-Dok 2/8.4.4,
// Login-Standard-Flow, 2026-08-10): der Login-Status muss bereits auf der
// Landingpage bekannt sein (dort existiert der Rechner-Ctx aus
// AppProviders.jsx noch nicht, siehe App.jsx `landed`-Zweig). Als Ebene ueber
// App() gemountet, bleibt AccountProvider ausserdem beim Wechsel
// Landing → Hauptbereich stabil (kein Re-Mount, kein doppelter /me-Request).
// ThemeProvider aussenrum (Etappe 1 Light/Dark/System, 2026-08-26): betrifft
// beide Zweige gleichermassen und braucht keinen der beiden Contexte.
ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AccountProvider>
      <App />
      <InstallPrompt />
    </AccountProvider>
  </ThemeProvider>,
);
