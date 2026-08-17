import { describe, it, expect } from "vitest";
import {
  PLAN_AMOUNTS,
  YEARLY_LIST_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  YEARLY_PER_MONTH_AMOUNT,
  normalizePaddleCheckoutAmount,
  formatMoney,
} from "./planPricing.js";

// Die Preisanzeige ist die einzige Stelle im Checkout, an der ein stiller
// Rechenfehler den Nutzer direkt Geld kostet bzw. uns eine falsche Zusage
// aufdrueckt - deshalb hier festgenagelt statt "sieht richtig aus".

describe("abgeleitete Plan-Preise", () => {
  it("nimmt als Jahres-Listenpreis zwoelf Monatspreise", () => {
    expect(YEARLY_LIST_AMOUNT).toBeCloseTo(59.88, 2);
  });

  it("weist dieselbe Ersparnis aus wie das Jahres-Badge (17 %)", () => {
    expect(YEARLY_SAVINGS_PERCENT).toBe(17);
  });

  it("rechnet den Jahresplan auf einen Monatspreis herunter", () => {
    expect(YEARLY_PER_MONTH_AMOUNT).toBeCloseTo(4.1658, 3);
    expect(formatMoney(YEARLY_PER_MONTH_AMOUNT, "de-DE")).toBe("4,17 €");
  });

  it("haelt den Jahrespreis unter dem Listenpreis", () => {
    expect(PLAN_AMOUNTS.yearly).toBeLessThan(YEARLY_LIST_AMOUNT);
  });
});

describe("Betraege aus Paddles Checkout-Events", () => {
  const jahr = PLAN_AMOUNTS.yearly;

  it("nimmt Dezimalwerte unveraendert", () => {
    expect(normalizePaddleCheckoutAmount("49.99", jahr)).toBeCloseTo(49.99, 2);
  });

  it("erkennt Cent-Werte an der Groessenordnung und rechnet sie um", () => {
    expect(normalizePaddleCheckoutAmount("4999", jahr)).toBeCloseTo(49.99, 2);
  });

  it("laesst Steueraufschlaege bis 50 Prozent durch", () => {
    expect(normalizePaddleCheckoutAmount("59.49", jahr)).toBeCloseTo(59.49, 2);
  });

  it("akzeptiert rabattierte Betraege bis hinunter zu null", () => {
    expect(normalizePaddleCheckoutAmount("0", jahr)).toBe(0);
    expect(normalizePaddleCheckoutAmount("9.99", jahr)).toBeCloseTo(9.99, 2);
  });

  it("verwirft Betraege, die in keine der beiden Konventionen passen", () => {
    // Weder plausibler Dezimalwert noch plausibler Cent-Wert - hier zeigt die
    // Uebersicht lieber den selbst berechneten Preis als eine falsche Zahl.
    expect(normalizePaddleCheckoutAmount("999999", jahr)).toBeNull();
  });

  it("verwirft Unsinn statt ihn anzuzeigen", () => {
    expect(normalizePaddleCheckoutAmount(undefined, jahr)).toBeNull();
    expect(normalizePaddleCheckoutAmount("abc", jahr)).toBeNull();
    expect(normalizePaddleCheckoutAmount("-5", jahr)).toBeNull();
    expect(normalizePaddleCheckoutAmount("49.99", 0)).toBeNull();
  });
});
