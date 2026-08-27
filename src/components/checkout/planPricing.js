// Numerische Preis-Wahrheit fuer alle Kauf-Flaechen (Preis-Sektion der
// Landingpage, Laufzeit-Schritt, Bestelluebersicht).
//
// Warum nicht einfach die i18n-Strings parsen: planMonthlyPrice heisst je nach
// Sprache "6,99 €/Mon." oder "€6.99/mo" - daraus wieder eine Zahl zu machen,
// um Streichpreis und Ersparnis zu berechnen, waere fuenf Formate raten. Die
// Zahlen stehen deshalb hier einmal, die Sprachdateien tragen nur noch die
// Beschriftung drumherum.
//
// Diese Werte muessen zu den in Stripe hinterlegten Preisen passen
// (STRIPE_PRICE_ID_MONTHLY / _YEARLY, siehe worker/src/stripe/checkout.ts).
// Stripe bleibt die verbindliche Quelle fuer den tatsaechlich abgerechneten
// Betrag - was hier steht, ist die Anzeige VOR UND WAEHREND des Checkouts:
// anders als bei Paddle liefert Stripe Payment Element keinen Client-Event
// mit dem finalen Betrag (der steht serverseitig schon beim Erzeugen der
// Subscription fest, keine laenderabhaengige Steuer-Unsicherheit mehr, da
// pauschal 19 % DE) - die Normalisierungsfunktionen fuer unsichere
// Client-Betraege (normalizePaddleCheckoutAmount/formatPaddleAmount) sind
// deshalb ersatzlos entfallen.
export const PLAN_AMOUNTS = {
  monthly: 6.99,
  yearly: 59.99,
};

export const PLAN_CURRENCY = "EUR";

// Listenpreis des Jahresplans = 12 Monatspreise. Das ist der durchgestrichene
// Betrag neben dem Jahrespreis ("83,88 €" statt "59,99 €").
export const YEARLY_LIST_AMOUNT = PLAN_AMOUNTS.monthly * 12;

// Ersparnis in Prozent, gerundet - deckungsgleich mit planYearlyBadge
// ("spare 28 %"), damit Badge und Karte nicht auseinanderlaufen, falls die
// Preise einmal angepasst werden.
export const YEARLY_SAVINGS_PERCENT = Math.round(
  (1 - PLAN_AMOUNTS.yearly / YEARLY_LIST_AMOUNT) * 100,
);

// Was der Jahresplan rechnerisch pro Monat kostet - die Zahl, die auf der
// Preis-Karte gross steht, wenn "Jährlich" gewaehlt ist (Vorbild: Referenz
// zeigt ebenfalls den Monatspreis gross und den Gesamtbetrag klein darunter).
export const YEARLY_PER_MONTH_AMOUNT = PLAN_AMOUNTS.yearly / 12;

export function formatMoney(amount, locale) {
  return new Intl.NumberFormat(locale || "de-DE", {
    style: "currency",
    currency: PLAN_CURRENCY,
  }).format(amount);
}

// Welche Laufzeit steht in der Kauf-Bestaetigung (PurchaseConfirmation.jsx)?
// Zwei Quellen, weil beide luecken koennen: `subscription` kommt aus /me und
// steht erst, wenn der Stripe-Webhook durch ist (beobachtet 2-4 s) - direkt
// nach dem Bezahlen ist das Feld also oft noch leer. `gewaehlterPlan` ist die
// Wahl aus dem Wizard, die es dafuer nur IM Wizard gibt, nicht nach einer
// Rueckkehr aus einem Zahlungs-Redirect. Die Subscription hat Vorrang: sie ist
// das, was tatsaechlich abgerechnet wird.
//
// Rueckgabe ist der i18n-Schluessel, nicht der fertige Text - diese Datei
// kennt bewusst keine Sprachen (siehe Kommentar oben).
export function purchasePlanLabelKey(subscription, gewaehlterPlan) {
  const plan = subscription?.plan || gewaehlterPlan || null;
  if (plan === "monthly") return "planMonthly";
  if (plan === "yearly") return "planYearly";
  return null;
}
