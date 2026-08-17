// Numerische Preis-Wahrheit fuer alle Kauf-Flaechen (Preis-Sektion der
// Landingpage, Laufzeit-Schritt, Bestelluebersicht).
//
// Warum nicht einfach die i18n-Strings parsen: planMonthlyPrice heisst je nach
// Sprache "4,99 €/Mon." oder "€4.99/mo" - daraus wieder eine Zahl zu machen,
// um Streichpreis und Ersparnis zu berechnen, waere fuenf Formate raten. Die
// Zahlen stehen deshalb hier einmal, die Sprachdateien tragen nur noch die
// Beschriftung drumherum.
//
// Diese Werte muessen zu den in Paddle hinterlegten Preisen passen
// (PADDLE_PRICE_ID_MONTHLY / _YEARLY, siehe worker/src/paddle/checkout.ts).
// Paddle bleibt die verbindliche Quelle fuer den tatsaechlich abgerechneten
// Betrag - was hier steht, ist die Anzeige VOR dem Checkout.
export const PLAN_AMOUNTS = {
  monthly: 4.99,
  yearly: 49.99,
};

export const PLAN_CURRENCY = "EUR";

// Listenpreis des Jahresplans = 12 Monatspreise. Das ist der durchgestrichene
// Betrag neben dem Jahrespreis ("59,88 €" statt "49,99 €").
export const YEARLY_LIST_AMOUNT = PLAN_AMOUNTS.monthly * 12;

// Ersparnis in Prozent, gerundet - deckungsgleich mit planYearlyBadge
// ("spare 17 %"), damit Badge und Karte nicht auseinanderlaufen, falls die
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

// Betrag aus einem Paddle.js-Checkout-Event in einen anzeigbaren Betrag
// umrechnen.
//
// Warum das nicht trivial ist: Paddle nutzt zwei Konventionen. Die REST-API
// liefert Cent-Strings ("4999", siehe worker/src/paddle/checkout.ts), die
// Checkout-Events der Paddle.js dagegen Dezimalwerte ("49.99"). Welche der
// beiden im Event ankommt, ist nicht gegen die Sandbox verifiziert - und ein
// Faktor-100-Fehler an der Kasse waere der teuerste denkbare Anzeigefehler.
//
// Deshalb wird nicht geraten, sondern gegen den erwarteten Betrag geprueft:
//   - plausibel (bis 1,5x erwartet, Puffer fuer Steuer)      -> direkt nehmen
//   - rund 100x zu gross                                     -> Cent-Wert
//   - alles andere (auch Rabatt-bedingt kleinere Betraege)   -> pruefen
// Was in keines der Raster passt, wird verworfen; die Uebersicht zeigt dann
// weiter den selbst berechneten Betrag statt einer moeglicherweise falschen
// Zahl. `expectedAmount` ist der Listenpreis des gewaehlten Plans.
export function normalizePaddleCheckoutAmount(raw, expectedAmount) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  const expected = Number(expectedAmount);
  if (!Number.isFinite(expected) || expected <= 0) return null;

  // Rabatte duerfen den Betrag bis auf 0 druecken - nach unten wird deshalb
  // nicht begrenzt, nur nach oben.
  if (value <= expected * 1.5) return value;
  const asMinorUnits = value / 100;
  if (asMinorUnits <= expected * 1.5) return asMinorUnits;
  return null;
}

export function formatPaddleAmount(raw, currencyCode, locale, expectedAmount) {
  const amount = normalizePaddleCheckoutAmount(raw, expectedAmount);
  if (amount === null) return null;
  return new Intl.NumberFormat(locale || "de-DE", {
    style: "currency",
    currency: currencyCode || PLAN_CURRENCY,
  }).format(amount);
}
