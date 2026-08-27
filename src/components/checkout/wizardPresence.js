import { useEffect, useSyncExternalStore } from "react";

// Ist gerade irgendwo ein Checkout-Wizard offen?
//
// Gebraucht fuer genau eine Entscheidung: die eigenstaendige Kauf-Bestaetigung
// (PurchaseConfirmModal.jsx) darf NICHT erscheinen, solange ein Wizard laeuft -
// der zeigt seinen eigenen letzten Schritt, sonst staenden zwei Bestaetigungen
// uebereinander.
//
// Warum ein Modul-Zaehler und kein Context: der Wizard wird an zwei
// unabhaengigen Stellen gemountet (ProHeaderButton.jsx fuer den normalen
// Kauf-Flow, MyAccount.jsx fuer das Upgrade aus "Abonnement" heraus), und
// keine davon ist ein Vorfahre der anderen. Ein Context muesste dafuer bis in
// die App-Wurzel gezogen werden - fuer ein einzelnes Ja/Nein zu viel Apparat.
let openCount = 0;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return openCount > 0;
}

// Vom Wizard selbst aufgerufen (Effekt beim Mounten), meldet sich beim
// Aufraeumen wieder ab.
export function useRegisterWizardOpen() {
  useEffect(() => {
    openCount += 1;
    emit();
    return () => {
      openCount -= 1;
      emit();
    };
  }, []);
}

export function useAnyWizardOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
