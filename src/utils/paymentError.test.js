import { describe, it, expect } from "vitest";
import { paymentErrorText } from "./paymentError.js";

const t = {
  planCheckoutUnavailable: "UNAVAILABLE",
  payErrCardDeclined: "DECLINED",
  payErrInsufficientFunds: "FUNDS",
  payErrExpiredCard: "EXPIRED",
  payErrIncorrectCvc: "CVC",
  payErrIncorrectNumber: "NUMBER",
  payErrAuthFailed: "AUTH",
  payErrProcessing: "PROCESSING",
};

describe("paymentErrorText", () => {
  it("unterscheidet Ablehnungsgruende ueber decline_code", () => {
    expect(paymentErrorText({ code: "card_declined", decline_code: "insufficient_funds" }, t)).toBe("FUNDS");
    expect(paymentErrorText({ code: "card_declined", decline_code: "expired_card" }, t)).toBe("EXPIRED");
    expect(paymentErrorText({ code: "card_declined", decline_code: "generic_decline" }, t)).toBe("DECLINED");
  });
  it("kennt die haeufigen Codes", () => {
    expect(paymentErrorText({ code: "expired_card" }, t)).toBe("EXPIRED");
    expect(paymentErrorText({ code: "incorrect_cvc" }, t)).toBe("CVC");
    expect(paymentErrorText({ code: "incorrect_number" }, t)).toBe("NUMBER");
    expect(paymentErrorText({ code: "payment_intent_authentication_failure" }, t)).toBe("AUTH");
    expect(paymentErrorText({ code: "processing_error" }, t)).toBe("PROCESSING");
  });
  it("behaelt bei unbekanntem Code Stripes Meldung, sonst den Standardtext", () => {
    expect(paymentErrorText({ code: "x", message: "Deine Eingabe ist unvollstaendig." }, t)).toBe(
      "Deine Eingabe ist unvollstaendig.",
    );
    expect(paymentErrorText({ code: "x" }, t)).toBe("UNAVAILABLE");
    expect(paymentErrorText(null, t)).toBe("UNAVAILABLE");
  });
});
