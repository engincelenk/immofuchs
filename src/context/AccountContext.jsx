import { createContext, useContext, useEffect } from "react";
import { useAccount } from "../hooks/useAccount.js";
import { registerNativePush } from "../utils/nativePush.js";

// Zweiter, kleiner Context (Spec 5.3) - bewusst getrennt vom bestehenden
// Ctx (App.jsx/AppContext.jsx), statt Rechner-State und Konto-State zu
// vermischen. Ein einziger useAccount()-Aufruf hier, damit nicht jede
// Komponente ihren eigenen /api/v1/me-Request ausloest.
export const AccountCtx = createContext(null);

export function AccountProvider({ children }) {
  const account = useAccount();

  // Push-Registrierung (Phase D, S7-1) erst nach Login - der Endpunkt
  // verlangt requireAuth, ausserhalb einer nativen Huelle ohnehin folgenlos.
  useEffect(() => {
    if (account.isLoggedIn) registerNativePush();
  }, [account.isLoggedIn]);

  return <AccountCtx.Provider value={account}>{children}</AccountCtx.Provider>;
}

export const useAccountCtx = () => useContext(AccountCtx);
