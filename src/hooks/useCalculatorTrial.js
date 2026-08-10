import { useAccountCtx } from "../context/AccountContext.jsx";

// Kap. 0.2/3.0 (Spec-v3.0): ein Konto ist fuer JEDE Rechner-Nutzung Pflicht,
// kein anonymer Gast-Zugang mehr - jeder Erstkontakt mit einer
// Rechner-Funktion fuehrt zwingend zuerst durch die Auth-Auswahl. Ersetzt die
// fruehere "1x pro Geraet voll nutzbar, danach gesperrt"-Logik
// (localStorage-Flag), die es nur gab, solange ueberhaupt eine anonyme
// Nutzung erlaubt war.
export function useCalculatorTrial() {
  const account = useAccountCtx();
  return { isLocked: account?.loading === false && !account?.isLoggedIn, loading: account?.loading };
}
