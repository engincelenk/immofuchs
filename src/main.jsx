import ReactDOM from "react-dom/client";
import App from "./App";
import InstallPrompt from "./InstallPrompt";
import { AccountProvider } from "./context/AccountContext.jsx";

// AccountProvider liegt hier statt in AppProviders.jsx (Konzept-Dok 2/8.4.4,
// Login-Standard-Flow, 2026-08-10): der Login-Status muss bereits auf der
// Landingpage bekannt sein (dort existiert der Rechner-Ctx aus
// AppProviders.jsx noch nicht, siehe App.jsx `landed`-Zweig). Als Ebene ueber
// App() gemountet, bleibt AccountProvider ausserdem beim Wechsel
// Landing → Hauptbereich stabil (kein Re-Mount, kein doppelter /me-Request).
ReactDOM.createRoot(document.getElementById("root")).render(
  <AccountProvider>
    <App />
    <InstallPrompt />
  </AccountProvider>,
);
