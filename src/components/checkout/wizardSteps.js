// Reine Schritt-Sequenz-Logik des Checkout-Wizards (Spec-Abschnitt 5.1/5.2).
// Bewusst von der Praesentation getrennt: das ist die einzige Stelle mit
// echter Verzweigungslogik in einer sonst rein praesentationalen Flaeche,
// deshalb isoliert testbar statt in CheckoutWizard.jsx verwoben.
export const WIZARD_VARIANTS = {
  "new-customer": ["pricing", "account", "verify", "payment", "welcome"],
  "new-customer-no-verify": ["pricing", "account", "payment", "welcome"],
  upgrade: ["payment", "welcome"],
  // "Anmelden" auf der Landingpage / im Rechner-Sperrbildschirm (Stufe
  // Nutzer-Konzept 2026-08-11): reine Anmeldung fuer den kostenlosen
  // Ersttest, OHNE Plan-/Zahlungsschritte. Der Nutzer trifft die
  // Kaufentscheidung erst spaeter an der Paywall (zweite Nutzung).
  "login-only": ["account", "verify"],
};

export const STEP_LABEL_KEYS = {
  pricing: "stepLabelPricing",
  account: "stepLabelAccount",
  verify: "stepLabelVerify",
  payment: "stepLabelPayment",
  welcome: "stepLabelWelcome",
};

export function getWizardSteps(variant) {
  const steps = WIZARD_VARIANTS[variant];
  if (!steps) throw new Error(`unknown_wizard_variant_${variant}`);
  return steps;
}
