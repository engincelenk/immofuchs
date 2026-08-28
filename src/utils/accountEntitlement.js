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

// UX-Audit 2026-08-11: Der Tarif-Status war bisher NUR im Bereich
// "Abonnement" sichtbar, also einen Klick tief - bei einem Freemium-Produkt
// ist das die zentrale Information. Diese Ableitung speist den dauerhaft
// sichtbaren Status-Chip in der Kopfzeile (PlanChip.jsx).
//   "trial" - Pro-Zugang laeuft, aber als Testphase (Stripe-Status trialing)
//   "pro"   - bezahlter, aktiver Zugang
//   "free"  - eingeloggt ohne Pro-Zugang
export function planStatusFromMe(me) {
  if (!me) return null;
  if (me.subscription?.status === "trialing") return "trial";
  return me.isPro ? "pro" : "free";
}

// Verbleibende volle Tage der Testphase. Waehrend `trialing` ist
// currentPeriodEnd das Testphasen-Ende (Stripe setzt die erste Periode auf
// den Trial). Aufgerundet, damit der letzte angebrochene Tag noch als "1 Tag"
// zaehlt statt als "0" - null, wenn die Frist schon vorbei oder unbekannt ist.
export function trialDaysRemaining(subscription, now = Date.now()) {
  if (subscription?.status !== "trialing" || !subscription?.currentPeriodEnd) return null;
  const days = Math.ceil((subscription.currentPeriodEnd - now) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : null;
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
    case "password":
      return t?.providerPasswordLabel || provider;
    default:
      return provider;
  }
}
