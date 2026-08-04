import { Ctx } from "./AppContext.jsx";
import { AccountProvider } from "./AccountContext.jsx";

// Schlanker Wrapper (Spec 5.3): buendelt den bestehenden Ctx.Provider und den
// neuen AccountProvider, statt App.jsx mit einem zweiten, unabhaengigen
// Provider weiter wachsen zu lassen. Rein additiv - bestehende Komponenten
// importieren weiterhin denselben Ctx aus AppContext.jsx unveraendert.
export function AppProviders({ ctxValue, children }) {
  return (
    <Ctx.Provider value={ctxValue}>
      <AccountProvider>{children}</AccountProvider>
    </Ctx.Provider>
  );
}
