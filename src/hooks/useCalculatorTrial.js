import { useAccountCtx } from "../context/AccountContext.jsx";

// Rechnernutzung ist in der Testphase unbegrenzt (Nutzer-Vorgabe 2026-08-25).
// Vorher galten 3 Berechnungen je Rechner ueber die ganze Phase; der Zaehler
// dahinter (`rechner` in trial_usage) ist damit entfallen, ebenso der
// Debounce, der einen "Testlauf" nach 1,5 Sekunden als verbraucht meldete, und
// die Sperrwand bei erschoepftem Kontingent.
//
// Was bleibt: die Unterscheidung zwischen "nicht angemeldet" (isLocked) und
// "angemeldet, aber weder Testphase noch Abo" (isPaywalled) - also der Fall,
// dass die sieben Tage abgelaufen sind. Genau dann, und nur dann, soll zum
// Kauf gefuehrt werden.
export function useCalculatorTrial() {
  const account = useAccountCtx();

  // initialLoading statt loading (wie ProHeaderButton.jsx, Bugreport
  // 2026-08-27): `loading` wird bei JEDEM account.refresh() kurz true - nach
  // einem Kauf laufen drei Refreshes (CheckoutWizard.jsx/handlePaymentCompleted),
  // die den Rechner sonst dreimal ausblenden und neu aufbauen wuerden.
  const loading = account?.initialLoading;
  const isLoggedIn = Boolean(account?.isLoggedIn);
  // Nur ein Abo rechnet dauerhaft. Die Testphase darf beim Rechnen ebenfalls
  // alles - nach ihrem Ende ist `zugang` "keiner" und die Wand greift.
  const zugang = account?.zugang || "keiner";
  const istUnbegrenzt = zugang === "pro";
  const istTestphase = zugang === "trial";

  return {
    loading,
    isLocked: loading === false && !isLoggedIn,
    // Nur noch ein Weg in die Wand: die Testphase ist vorbei und es gibt kein
    // Abo. Ein "Kontingent dieses Rechners aufgebraucht" gibt es nicht mehr.
    isPaywalled: loading === false && isLoggedIn && !istUnbegrenzt && !istTestphase,
    // Nach dem Ende der Testphase bleiben gespeicherte Objekte lesbar
    // (Nutzer-Entscheidung 2026-08-20).
    trialVorbei: loading === false && isLoggedIn && zugang === "keiner",
    // Speist den Hinweis, dass gerade die kostenlose Testphase laeuft. Frueher
    // zusaetzlich an ein Restkontingent gebunden ("noch X von 3") - das gibt
    // es beim Rechnen nicht mehr, der Hinweis gilt jetzt fuer die gesamte
    // Dauer der Testphase.
    isTrialRun: loading === false && isLoggedIn && istTestphase,
  };
}
