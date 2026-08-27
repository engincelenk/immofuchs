import { useId, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { countryOptions } from "../../utils/countries.js";
import { AuthHeading, SelectField, TextField } from "./CheckoutShared.jsx";
import { errorBannerStyle, primaryBtnStyle, textInputStyle } from "./checkoutStyles.js";

// Rechnungsdaten als eigener Schritt vor der Zahlung (Bugreport 26.08.: die
// Rechnung zeigte bisher nur die E-Mail-Adresse, weil wir serverseitig nie
// mehr als `customer.email` mitgegeben haben). Die Werte landen beim Erzeugen
// der Stripe-Subscription auf dem Stripe-Kundendatensatz (siehe
// useAccount.js/startCheckout, worker/src/stripe/checkout.ts) und damit auf
// der von Stripe Invoicing ausgestellten Rechnung.
//
// Feldumfang seit 2026-08-27 (Nutzer-Vorgabe, Vorbild-Screenshots): Vor- und
// Nachname, Strasse UND Hausnummer getrennt, PLZ, Ort, Land aus voller Liste,
// dazu optional Firmenname und USt-IdNr.
//
// Warum Strasse und Hausnummer getrennt: Stripe kennt nur `address.line1`, wir
// setzen die beiden dort wieder zusammen (checkout.ts). Getrennte Eingabe
// erzwingt aber, dass die Hausnummer ueberhaupt dasteht - im frueheren
// kombinierten Feld fehlte sie regelmaessig, und eine Rechnung ohne
// Hausnummer ist keine vollstaendige Rechnungsanschrift (§ 14 UStG).
//
// Die E-Mail steht bewusst NUR zur Ansicht da: sie ist der Schluessel, ueber
// den Stripe den Kunden findet (findOrCreateCustomer sucht nach ihr). Ein hier
// abweichend eingetragener Wert wuerde einen zweiten Stripe-Kunden anlegen und
// das Abo vom Konto abkoppeln. Geaendert wird die Adresse in "Mein Konto".
export function AddressStep({ t, account, value, onChange, onContinue }) {
  const uid = useId();
  const { lang } = useApp();
  const [touched, setTouched] = useState(false);
  const countries = countryOptions(lang);
  const email = account?.me?.email || "";

  const REQUIRED = ["firstName", "lastName", "street", "houseNumber", "zip", "city", "country"];
  const valid = REQUIRED.every((k) => String(value[k] || "").trim().length > 0);

  function set(key) {
    return (e) => onChange({ ...value, [key]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (valid) onContinue();
  }

  return (
    <div>
      <AuthHeading title={t.addressTitle} subtitle={t.addressSubtitle} />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField
              id={`${uid}-first`}
              label={t.addressFirstNameLabel}
              type="text"
              required
              maxLength={60}
              value={value.firstName}
              onChange={set("firstName")}
              autoComplete="given-name"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField
              id={`${uid}-last`}
              label={t.addressLastNameLabel}
              type="text"
              required
              maxLength={60}
              value={value.lastName}
              onChange={set("lastName")}
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Strasse breit, Hausnummer schmal - dieselbe Aufteilung wie auf
            jedem deutschen Adressformular. */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField
              id={`${uid}-street`}
              label={t.addressStreetLabel}
              type="text"
              required
              maxLength={120}
              value={value.street}
              onChange={set("street")}
              autoComplete="address-line1"
            />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <TextField
              id={`${uid}-house`}
              label={t.addressHouseNumberLabel}
              type="text"
              required
              maxLength={12}
              value={value.houseNumber}
              onChange={set("houseNumber")}
              // Kein autoComplete: "address-line2" waere der naechstliegende
              // Wert, meint aber Adresszusatz ("Apt 4") - der Browser wuerde
              // hier also die Wohnungsnummer statt der Hausnummer eintragen.
              // Einen eigenen Token fuer die Hausnummer kennt die Spezifikation
              // nicht, das Feld bleibt deshalb ohne.
              autoComplete="off"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "0 0 120px" }}>
            <TextField
              id={`${uid}-zip`}
              label={t.addressZipLabel}
              type="text"
              required
              maxLength={12}
              value={value.zip}
              onChange={set("zip")}
              autoComplete="postal-code"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextField
              id={`${uid}-city`}
              label={t.addressCityLabel}
              type="text"
              required
              maxLength={80}
              value={value.city}
              onChange={set("city")}
              autoComplete="address-level2"
            />
          </div>
        </div>

        <SelectField
          id={`${uid}-country`}
          label={t.addressCountryLabel}
          required
          options={countries}
          value={value.country}
          onChange={set("country")}
          autoComplete="country"
        />

        {/* Nur zur Ansicht, siehe Kommentar oben. Kein disabled-<input>,
            sondern eine gelesene Zeile: ein ausgegrautes Eingabefeld sieht
            aus wie ein Fehler ("warum kann ich da nicht tippen?"), der
            Hinweis darunter beantwortet die Frage stattdessen direkt. */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--cl)", marginBottom: 5 }}>
            {t.addressEmailLabel}
          </label>
          <div
            style={{
              ...textInputStyle,
              display: "flex",
              alignItems: "center",
              color: "var(--ch)",
              background: "var(--cc)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </div>
          <p style={{ fontSize: 11, color: "var(--ch)", margin: "5px 0 0" }}>{t.addressEmailHint}</p>
        </div>

        <TextField
          id={`${uid}-company`}
          label={t.addressCompanyLabel}
          hint={t.addressCompanyHint}
          type="text"
          maxLength={120}
          value={value.company}
          onChange={set("company")}
          autoComplete="organization"
        />

        <TextField
          id={`${uid}-vat`}
          label={t.addressVatIdLabel}
          hint={t.addressVatIdHint}
          type="text"
          maxLength={20}
          value={value.vatId}
          onChange={set("vatId")}
          autoComplete="off"
          spellCheck={false}
        />

        {touched && !valid && <div style={errorBannerStyle}>{t.addressRequiredError}</div>}
        <button type="submit" style={primaryBtnStyle}>
          {t.addressContinue}
        </button>
      </form>
    </div>
  );
}
