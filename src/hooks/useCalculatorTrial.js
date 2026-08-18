import { useEffect, useRef } from "react";
import { useAccountCtx } from "../context/AccountContext.jsx";

// Verzoegerung, bevor ein Testlauf als "genutzt" gilt (Stufe B,
// Nutzer-Konzept 2026-08-11): alle 6 Rechner zeigen dank sinnvoller
// Standardwerte sofort ein Ergebnis an - ein blosses versehentliches Oeffnen
// soll den Testlauf noch nicht verbrauchen.
const CONSUME_DEBOUNCE_MS = 1500;

// Muss mit dem serverseitigen Limit uebereinstimmen (worker/wrangler.toml
// CALCULATOR_TRIAL_LIMIT bzw. der Default in routes/account.ts) - hier nur
// fuer die Anzeige ("noch X von 3"), die eigentliche Durchsetzung passiert
// serverseitig (getCalculatorTrialUsage/incrementCalculatorTrialUsage).
export const CALCULATOR_TRIAL_LIMIT = 3;

// Ersetzt die vorherige reine "eingeloggt oder nicht"-Sperre um einen
// zweiten Zustand: eingeloggt, aber das Gratis-Kontingent DIESES Rechners
// (seit 2026-08-18: 3x je Rechner statt 1x kombiniert ueber alle 6, siehe
// Migration 0022) ist bereits verbraucht und kein Pro-Abo aktiv -
// "paywalled" statt "locked".
//
// capturedRef friert den Verbrauchsstand DIESES Rechners EINMAL ein, sobald
// er sicher bekannt ist (loading===false) - die laufende Sitzung wird
// dadurch nie mitten in der Nutzung unterbrochen, selbst wenn der
// Debounce-Call weiter unten den Status kurz danach im Hintergrund
// umschaltet. Erst der naechste Tab-Wechsel (= neuer Mount dieses Hooks mit
// neuem `rechner`) sieht die Sperre.
export function useCalculatorTrial(rechner) {
  const account = useAccountCtx();
  const capturedRef = useRef(null);
  const firedRef = useRef(false);

  const loading = account?.loading;
  const isLoggedIn = Boolean(account?.isLoggedIn);
  const isPro = Boolean(account?.isPro);
  const consumeCalculatorTrial = account?.consumeCalculatorTrial;

  if (loading === false && capturedRef.current === null) {
    capturedRef.current = Number(account?.calculatorTrialUsage?.[rechner] || 0);
  }

  useEffect(() => {
    // Rechnerwechsel (neuer `rechner`-Wert) muss den eingefrorenen Stand
    // dieses Hooks neu einfrieren lassen - ohne Reset wuerde bei
    // React-Wiederverwendung derselben Hook-Instanz (z.B. gleicher
    // Komponenten-Slot) der Verbrauchsstand des VORHERIGEN Rechners
    // weiterbestehen.
    capturedRef.current = null;
    firedRef.current = false;
  }, [rechner]);

  useEffect(() => {
    if (loading !== false || !isLoggedIn || isPro) return;
    if (capturedRef.current === null) return;
    if (capturedRef.current >= CALCULATOR_TRIAL_LIMIT || firedRef.current) return;
    const timer = setTimeout(() => {
      firedRef.current = true;
      consumeCalculatorTrial?.(rechner);
    }, CONSUME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [loading, isLoggedIn, isPro, consumeCalculatorTrial, rechner]);

  const used = capturedRef.current;
  const remaining = used === null ? null : Math.max(0, CALCULATOR_TRIAL_LIMIT - used);

  return {
    loading,
    isLocked: loading === false && !isLoggedIn,
    isPaywalled: loading === false && isLoggedIn && !isPro && used >= CALCULATOR_TRIAL_LIMIT,
    // UX-Audit 2026-08-11 (Punkt 3): Der Testlauf war bisher unsichtbar, bis
    // er weg war - "kostenlos" stand ausschliesslich in der
    // Preis-Vergleichstabelle, der Verbrauch passierte still und die
    // erste Rueckmeldung war die Sperrwand beim NAECHSTEN Besuch. Dieses
    // Flag speist einen Hinweis, der schon waehrend des Testlaufs sagt,
    // worum es sich handelt. Bewusst an capturedRef gebunden (nicht am
    // Live-Status): der eingefrorene Wert gilt fuer die gesamte Sitzung, der
    // Hinweis flackert also nicht weg, sobald der Verbrauch gemeldet wurde.
    isTrialRun: loading === false && isLoggedIn && !isPro && used !== null && used < CALCULATOR_TRIAL_LIMIT,
    remaining,
  };
}
