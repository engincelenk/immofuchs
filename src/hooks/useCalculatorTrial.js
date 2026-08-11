import { useEffect, useRef } from "react";
import { useAccountCtx } from "../context/AccountContext.jsx";

// Verzoegerung, bevor der kombinierte Ersttest als "genutzt" gilt (Stufe B,
// Nutzer-Konzept 2026-08-11): alle 6 Rechner zeigen dank sinnvoller
// Standardwerte sofort ein Ergebnis an - ein blosses versehentliches Oeffnen
// soll den Test noch nicht verbrauchen.
const CONSUME_DEBOUNCE_MS = 1500;

// Ersetzt die vorherige reine "eingeloggt oder nicht"-Sperre um einen
// zweiten Zustand: eingeloggt, aber der kombinierte Ersttest (ueber alle 6
// Rechner hinweg, nicht pro Rechner) ist bereits verbraucht und kein
// Pro-Abo aktiv - "paywalled" statt "locked".
//
// capturedRef friert den Verbraucht-Status EINMAL ein, sobald er sicher
// bekannt ist (loading===false) - die laufende Sitzung wird dadurch nie
// mitten in der Nutzung unterbrochen, selbst wenn der Debounce-Call weiter
// unten den Status kurz danach im Hintergrund umschaltet. Erst der naechste
// Tab-Wechsel (= neuer Mount dieses Hooks) sieht die Sperre.
export function useCalculatorTrial() {
  const account = useAccountCtx();
  const capturedRef = useRef(null);
  const firedRef = useRef(false);

  const loading = account?.loading;
  const isLoggedIn = Boolean(account?.isLoggedIn);
  const isPro = Boolean(account?.isPro);
  const consumeCalculatorTrial = account?.consumeCalculatorTrial;

  if (loading === false && capturedRef.current === null) {
    capturedRef.current = Boolean(account?.calculatorTrialUsed);
  }

  useEffect(() => {
    if (loading !== false || !isLoggedIn || isPro) return;
    if (capturedRef.current !== false || firedRef.current) return;
    const timer = setTimeout(() => {
      firedRef.current = true;
      consumeCalculatorTrial?.();
    }, CONSUME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [loading, isLoggedIn, isPro, consumeCalculatorTrial]);

  return {
    loading,
    isLocked: loading === false && !isLoggedIn,
    isPaywalled: loading === false && isLoggedIn && !isPro && capturedRef.current === true,
  };
}
