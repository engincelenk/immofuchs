// Reine Logik rund um Konto-/Entitlement-Anzeige (Spec 5.3: "Reine Logik ...
// analog zu assistantContext.js in eine testbare Utility-Datei auslagern,
// nicht nur implizit im Hook"). Kein fetch(), kein React - nur Ableitungen
// aus der /api/v1/me-Antwort, damit useAccount.js schlank bleibt und diese
// Datei ohne Mock-Server testbar ist.

export function isProFromMeResponse(me) {
  return Boolean(me?.isPro);
}

const PLAN_LABELS = { monthly: "Monatlich", yearly: "Jährlich" };

export function formatPlanLabel(subscription) {
  if (!subscription) return null;
  return PLAN_LABELS[subscription.plan] || subscription.plan;
}

export function formatPeriodEndDate(subscription, locale = "de-DE") {
  if (!subscription?.currentPeriodEnd) return null;
  return new Date(subscription.currentPeriodEnd).toLocaleDateString(locale);
}

// Innerhalb der freiwilligen 14-Tage-Geld-zurueck-Frist (4.12)?
export function isWithinRefundWindow(subscription, now = Date.now()) {
  if (!subscription?.firstPurchaseAt) return false;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  return now - subscription.firstPurchaseAt <= FOURTEEN_DAYS_MS;
}

// "password" ist der einzige Provider-Wert, der kein Eigenname ist und daher
// eine Uebersetzung braucht (t.providerPasswordLabel) - ohne t faellt die
// Funktion auf den rohen Wert zurueck (Kontext-Doku 8-Umsetzung: verhindert,
// dass Aufrufstellen ohne t brechen).
export function linkedProviderLabel(provider, t) {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "passkey":
      return "Passkey";
    case "password":
      return t?.providerPasswordLabel || provider;
    default:
      return provider;
  }
}
