import { useAccountCtx } from "../context/AccountContext.jsx";

// Ein generischer Hook statt sechs Einzelloesungen (Spec 4.0a, S5-1): jede der
// 6 Rechner-Funktionen darf pro Geraet/Session einmal vollstaendig genutzt
// werden (inkl. vollem Ergebnis), danach ist sie komplett gesperrt (Teaser +
// Upgrade-Button statt erneuter Eingabemoeglichkeit), bis der Nutzer Pro hat.
//
// Bewusst rein clientseitig, kein D1/Worker-Aufruf: die 6 Rechner laufen
// komplett ohne Worker-Call, es entstehen keine Grenzkosten (anders als bei
// Finn/Exposé, wo 4.9 serverseitige Pruefung zwingend verlangt, weil dort
// echte AI-Kosten entstehen). Ein technisch versierter Nutzer koennte den
// localStorage-Eintrag loeschen oder ein anderes Geraet/einen Inkognito-Tab
// nutzen, um den Trial erneut auszuloesen - das verursacht ImmoFuchs aber
// keinen finanziellen Schaden (kein API-Call, keine Kosten). Dieser
// Trade-off ist bewusst in Kauf genommen (Spec 4.0a).
export const RECHNER_KEYS = [
  "renditerechner",
  "finanzierung",
  "miete",
  "sanierung",
  "steuertrick",
  "vorfaelligkeit",
];

export function useCalculatorTrial(key) {
  const account = useAccountCtx();
  const isPro = Boolean(account?.isPro);
  const storageKey = `if_trial_used_${key}`;

  function hasUsedTrial() {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }

  // Nach dem ersten vollstaendig angezeigten Ergebnis aufrufen (4.0a) - Pro-
  // Nutzer setzen nie ein Flag, da fuer sie ohnehin nie gesperrt wird.
  function markTrialUsed() {
    if (isPro) return;
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* Storage evtl. blockiert/voll - kein Blocker fuer die Anzeige selbst */
    }
  }

  return { isLocked: !isPro && hasUsedTrial(), markTrialUsed, isPro };
}
