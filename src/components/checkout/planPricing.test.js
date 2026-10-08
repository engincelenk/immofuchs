import { describe, it, expect } from "vitest";
import {
  PLAN_AMOUNTS,
  YEARLY_LIST_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  YEARLY_PER_MONTH_AMOUNT,
  formatMoney,
  purchasePlanLabelKey,
} from "./planPricing.js";

// Die Preisanzeige ist die einzige Stelle im Checkout, an der ein stiller
// Rechenfehler den Nutzer direkt Geld kostet bzw. uns eine falsche Zusage
// aufdrueckt - deshalb hier festgenagelt statt "sieht richtig aus".

describe("abgeleitete Plan-Preise", () => {
  it("nimmt als Jahres-Listenpreis zwoelf Monatspreise", () => {
    expect(YEARLY_LIST_AMOUNT).toBeCloseTo(83.88, 2);
  });

  it("weist dieselbe Ersparnis aus wie das Jahres-Badge (28 %)", () => {
    expect(YEARLY_SAVINGS_PERCENT).toBe(28);
  });

  it("rechnet den Jahresplan auf einen Monatspreis herunter", () => {
    expect(YEARLY_PER_MONTH_AMOUNT).toBeCloseTo(4.9992, 3);
    expect(formatMoney(YEARLY_PER_MONTH_AMOUNT, "de-DE")).toBe("5,00 €");
  });

  it("haelt den Jahrespreis unter dem Listenpreis", () => {
    expect(PLAN_AMOUNTS.yearly).toBeLessThan(YEARLY_LIST_AMOUNT);
  });
});

describe("purchasePlanLabelKey", () => {
  it("nimmt die Laufzeit aus der Subscription, wenn sie da ist", () => {
    expect(purchasePlanLabelKey({ plan: "monthly" }, "yearly")).toBe("planMonthly");
    expect(purchasePlanLabelKey({ plan: "yearly" }, "monthly")).toBe("planYearly");
  });

  it("faellt auf die Wizard-Wahl zurueck, solange der Webhook noch laeuft", () => {
    // Genau der Zustand direkt nach dem Bezahlen: /me kennt das Abo noch nicht.
    expect(purchasePlanLabelKey(null, "monthly")).toBe("planMonthly");
    expect(purchasePlanLabelKey({ plan: undefined }, "yearly")).toBe("planYearly");
  });

  it("liefert null, wenn keine Quelle etwas weiss", () => {
    // Rueckkehr aus einem Zahlungs-Redirect, bevor der Webhook durch ist: der
    // Wizard-Zustand ist weg, die Subscription noch nicht da. Dann darf keine
    // geratene Laufzeit auf der Bestaetigung stehen.
    expect(purchasePlanLabelKey(null, null)).toBe(null);
    expect(purchasePlanLabelKey(undefined, undefined)).toBe(null);
  });

  it("erfindet fuer einen unbekannten Plan keine Beschriftung", () => {
    expect(purchasePlanLabelKey({ plan: "lifetime" }, null)).toBe(null);
  });
});
