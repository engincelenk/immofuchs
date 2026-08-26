import { describe, it, expect } from "vitest";
import { getWizardSteps, STEP_LABEL_KEYS, WIZARD_VARIANTS } from "./wizardSteps.js";

describe("getWizardSteps", () => {
  it("liefert die volle Neukunden-Schrittfolge inkl. E-Mail-Bestaetigung", () => {
    expect(getWizardSteps("new-customer")).toEqual([
      "pricing",
      "account",
      "verify",
      "address",
      "payment",
      "welcome",
    ]);
  });

  it("ueberspringt 'verify' bei OAuth/Passkey/Passwort-Login (kein separater Bestaetigungs-Schritt noetig)", () => {
    expect(getWizardSteps("new-customer-no-verify")).toEqual([
      "pricing",
      "account",
      "address",
      "payment",
      "welcome",
    ]);
  });

  it("startet Upgrade-Nutzer direkt bei der Rechnungsadresse, ohne Preise/Konto erneut abzufragen", () => {
    expect(getWizardSteps("upgrade")).toEqual(["address", "payment", "welcome"]);
  });

  it("wirft bei unbekannter Variante einen Fehler statt still ein leeres Array zu liefern", () => {
    expect(() => getWizardSteps("does-not-exist")).toThrow("unknown_wizard_variant_does-not-exist");
  });

  it("jede Variante besteht ausschliesslich aus bekannten Schritt-Keys mit definiertem Label", () => {
    for (const steps of Object.values(WIZARD_VARIANTS)) {
      for (const key of steps) expect(STEP_LABEL_KEYS[key], key).toBeTruthy();
    }
  });
});
