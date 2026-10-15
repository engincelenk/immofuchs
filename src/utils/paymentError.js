// Uebersetzt einen Fehler aus stripe.confirmPayment() in einen eigenen Text.
// Stripe liefert code/decline_code; nur die haeufigen Faelle bekommen einen
// eigenen Wortlaut, alles andere (z.B. unvollstaendige Eingabe) behaelt Stripes
// eigene, lokalisierte Meldung.
export function paymentErrorText(err, t) {
  if (!err) return t.planCheckoutUnavailable;
  const code = err.code;
  const decline = err.decline_code;
  let text = null;
  if (code === "card_declined") {
    if (decline === "insufficient_funds") text = t.payErrInsufficientFunds;
    else if (decline === "expired_card") text = t.payErrExpiredCard;
    else if (decline === "incorrect_cvc") text = t.payErrIncorrectCvc;
    else text = t.payErrCardDeclined;
  } else if (code === "expired_card") text = t.payErrExpiredCard;
  else if (code === "incorrect_cvc" || code === "invalid_cvc") text = t.payErrIncorrectCvc;
  else if (code === "incorrect_number" || code === "invalid_number") text = t.payErrIncorrectNumber;
  else if (code === "payment_intent_authentication_failure") text = t.payErrAuthFailed;
  else if (code === "processing_error") text = t.payErrProcessing;
  return text || err.message || t.planCheckoutUnavailable;
}
