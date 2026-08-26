import { describe, it, expect } from "vitest";
import {
  PLAN_AMOUNTS,
  YEARLY_LIST_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  YEARLY_PER_MONTH_AMOUNT,
  formatMoney,
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
