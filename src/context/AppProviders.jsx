import { Ctx } from "./AppContext.jsx";

// Schlanker Wrapper (Spec 5.3): buendelt den Rechner-State-Context, statt
// App.jsx mit einem weiteren Provider weiter wachsen zu lassen.
// AccountProvider ist NICHT mehr hier eingebunden (Konzept-Dok 2/8.4.4 -
// Login-Standard-Flow, 2026-08-10): der Rechner-Ctx existiert nur im
// "landed"-Zustand (braucht `data`/`set` aus App.jsx), Login-Status soll aber
// bereits auf der Landingpage bekannt sein. AccountProvider sitzt deshalb
// jetzt in main.jsx, eine Ebene ueber App() - umschliesst damit BEIDE Zweige
// (Landing + Hauptbereich) und bleibt beim Wechsel zwischen ihnen gemountet
// (kein Re-Mount, kein doppelter /me-Request beim "landen").
export function AppProviders({ ctxValue, children }) {
  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
}
