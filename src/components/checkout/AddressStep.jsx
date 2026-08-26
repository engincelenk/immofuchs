import { useId, useState } from "react";
import { AuthHeading, TextField } from "./CheckoutShared.jsx";
import { errorBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";

// Rechnungsadresse als eigener Schritt vor der Zahlung (Bugreport 26.08.: die
// Rechnung zeigte bisher nur die E-Mail-Adresse, weil wir serverseitig nie
// mehr als `customer.email` mitgegeben haben). Straße/PLZ/Ort landen beim
// Erzeugen der Stripe-Subscription auf dem Stripe-Kundendatensatz (siehe
// useAccount.js/startCheckout, worker/src/stripe/checkout.ts) und damit auf
// der von Stripe Invoicing ausgestellten Rechnung. Firma ist bewusst
// optional, wie vom Nutzer vorgegeben - fuer Privatkaeufer bleibt das Feld
// leer.
export function AddressStep({ t, value, onChange, onContinue }) {
  const uid = useId();
  const [touched, setTouched] = useState(false);
  const street = value.street.trim();
  const zip = value.zip.trim();
  const city = value.city.trim();
  const valid = street.length > 0 && zip.length > 0 && city.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (valid) onContinue();
  }

  return (
    <div>
      <AuthHeading title={t.addressTitle} subtitle={t.addressSubtitle} />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <TextField
          id={`${uid}-street`}
          label={t.addressStreetLabel}
          type="text"
          required
          maxLength={120}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          autoComplete="street-address"
        />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "0 0 120px" }}>
            <TextField
              id={`${uid}-zip`}
              label={t.addressZipLabel}
              type="text"
              required
              maxLength={12}
              value={value.zip}
              onChange={(e) => onChange({ ...value, zip: e.target.value })}
              autoComplete="postal-code"
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextField
              id={`${uid}-city`}
              label={t.addressCityLabel}
              type="text"
              required
              maxLength={80}
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              autoComplete="address-level2"
            />
          </div>
        </div>
        <TextField
          id={`${uid}-company`}
          label={t.addressCompanyLabel}
          hint={t.addressCompanyHint}
          type="text"
          maxLength={120}
          value={value.company}
          onChange={(e) => onChange({ ...value, company: e.target.value })}
          autoComplete="organization"
        />
        {touched && !valid && <div style={errorBannerStyle}>{t.addressRequiredError}</div>}
        <button type="submit" style={primaryBtnStyle}>
          {t.addressContinue}
        </button>
      </form>
    </div>
  );
}
