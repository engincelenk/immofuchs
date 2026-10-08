import { describe, expect, it } from "vitest";
import { planStatusFromMe, trialDaysRemaining } from "./accountEntitlement.js";

const DAY = 24 * 60 * 60 * 1000;

describe("planStatusFromMe", () => {
  it("liefert null ohne Konto-Antwort", () => {
    expect(planStatusFromMe(null)).toBe(null);
    expect(planStatusFromMe(undefined)).toBe(null);
  });

  it("erkennt die Testphase auch dann, wenn isPro bereits true ist", () => {
    // Waehrend `trialing` gewaehrt der Server vollen Pro-Zugang - der Chip
    // muss trotzdem "Test" zeigen, sonst erfaehrt der Nutzer nie, dass eine
    // Abbuchung bevorsteht.
    const me = { isPro: true, subscription: { status: "trialing" } };
    expect(planStatusFromMe(me)).toBe("trial");
  });

  it("unterscheidet bezahltes Pro von Free", () => {
    expect(planStatusFromMe({ isPro: true, subscription: { status: "active" } })).toBe("pro");
    expect(planStatusFromMe({ isPro: false, subscription: null })).toBe("free");
  });

  it("zeigt Free, solange kein Abo existiert", () => {
    expect(planStatusFromMe({ isPro: false })).toBe("free");
  });
});

describe("trialDaysRemaining", () => {
  const now = Date.UTC(2026, 7, 11, 12, 0, 0);

  it("liefert null ausserhalb der Testphase", () => {
    expect(trialDaysRemaining(null, now)).toBe(null);
    expect(trialDaysRemaining({ status: "active", currentPeriodEnd: now + 5 * DAY }, now)).toBe(null);
  });

  it("liefert null ohne bekanntes Periodenende", () => {
    expect(trialDaysRemaining({ status: "trialing" }, now)).toBe(null);
  });

  it("rundet angebrochene Tage auf", () => {
    // Anderthalb Tage Restlaufzeit sind fuer den Nutzer "noch 2 Tage" - ein
    // Abrunden auf 1 wuerde die verbleibende Zeit zu knapp darstellen.
    expect(trialDaysRemaining({ status: "trialing", currentPeriodEnd: now + 1.5 * DAY }, now)).toBe(2);
    expect(trialDaysRemaining({ status: "trialing", currentPeriodEnd: now + 0.2 * DAY }, now)).toBe(1);
  });

  it("liefert null, wenn die Testphase bereits abgelaufen ist", () => {
    expect(trialDaysRemaining({ status: "trialing", currentPeriodEnd: now - DAY }, now)).toBe(null);
    expect(trialDaysRemaining({ status: "trialing", currentPeriodEnd: now }, now)).toBe(null);
  });
});
