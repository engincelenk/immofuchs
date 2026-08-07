import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { MyAccount } from "./MyAccount.jsx";
import { LoginSuccessToast } from "./LoginSuccessToast.jsx";

// Einstiegspunkt in der Logo-Kopfzeile (Spec 4.3, korrigiert gegenueber v1:
// NICHT in Statusleiste.jsx). Label "Pro" mit Kroenchen-Icon, Fuchs-Orange.
// Jeder eingeloggte Nutzer (Free UND Pro) landet in "Mein Konto" (Wireframe
// 14.2: zentrale Anlaufstelle fuer E-Mail-Aenderung, Datenexport,
// Kontoloeschung - keine Pro-exklusiven Aktionen). Nur nicht eingeloggte
// Nutzer sehen den Login-/Vergleichs-Flow. Vorher faelschlich an isPro
// geknuepft (Bugreport 06.08.): Free-Nutzer hatten dadurch ueberhaupt keinen
// Zugang zu "Mein Konto" und landeten stattdessen zwangsweise in der
// Plan-Auswahl.
//
// Diese Komponente ist zusaetzlich der Ort, an dem Rueckkehrer aus einem
// Redirect abgefangen werden: sie haengt fest in der Kopfzeile (App.jsx) und
// ist damit unabhaengig davon montiert, von welchem Einstiegspunkt aus der
// Nutzer den Wizard urspruenglich geoeffnet hatte.
export function ProHeaderButton() {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  // Was geoeffnet ist, wird beim Oeffnen einmal festgelegt und NICHT bei jedem
  // Render neu aus isLoggedIn abgeleitet (Befund 06.08.): vorher entschied ein
  // Ternaer im Render darueber, wodurch die Anmeldung mitten im Kauf die
  // Flaeche unter dem Nutzer austauschte - aus dem Checkout-Wizard wurde
  // schlagartig "Mein Konto", der begonnene Kauf war weg. Ein Ablauf darf
  // nicht dadurch enden, dass sein Zwischenziel (Login) erreicht wurde.
  const [openMode, setOpenMode] = useState(null); // null | "checkout" | "account"

  // Passwort-Reset-Link (?reset_token=..., Ergaenzung 04.08.) muss die Maske
  // von selbst oeffnen - anders als bei OAuth gibt es hier keinen Weg, den
  // Screen ohne Nutzereingabe (neues Passwort) abzuschliessen.
  useEffect(() => {
    if (account?.resetToken) setOpenMode("checkout");
  }, [account?.resetToken]);

  // Wiederaufnahme nach Google-/Apple-Login (Bugreport 06.08.): der Nutzer
  // hatte den Kauf begonnen, wurde zum Anbieter geschickt und landete
  // anschliessend wieder auf dem Ausgangsbildschirm - ohne Bestaetigung und
  // ohne seine Planauswahl. Jetzt oeffnet sich der Wizard direkt beim
  // Zahlungsschritt weiter, dessen Kopf bereits "✓ Angemeldet als ..." zeigt.
  // Bewusst nur fuer Free-Nutzer: wer bereits Pro ist, hat nichts zu kaufen
  // und bekommt nur die Bestaetigungs-Einblendung.
  const resumesCheckout = Boolean(account?.pendingCheckout) && account?.isLoggedIn && !account?.isPro;
  const { dismissLoginSuccess } = account || {};
  useEffect(() => {
    if (!resumesCheckout) return;
    setOpenMode("checkout");
    // Der Zahlungsschritt bestaetigt die Anmeldung selbst - eine zusaetzliche
    // Einblendung darueber waere doppelt.
    dismissLoginSuccess?.();
  }, [resumesCheckout, dismissLoginSuccess]);

  const handleClose = useCallback(() => {
    setOpenMode(null);
    account?.clearPendingCheckout?.();
  }, [account]);

  if (!account || account.loading) return null;

  return (
    <>
      <button
        onClick={() => setOpenMode(account.isLoggedIn ? "account" : "checkout")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 11px",
          border: "1px solid var(--ca-bd)",
          borderRadius: 8,
          // Weiss statt --ca-bg (S2-5): --ca-dk auf --ca-bg landet bei ~4.28:1
          // Kontrast, knapp unter der WCAG-AA-Grenze (4.5:1) fuer diese
          // Schriftgroesse. Auf Weiss liegt --ca-dk bei ~4.76:1 - Branding
          // bleibt ueber Rahmenfarbe + Kroenchen-Icon erhalten.
          background: "var(--cc)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--ca-dk)",
          minHeight: 38,
        }}
      >
        <span aria-hidden="true">👑</span>
        <span>{t.proButton}</span>
      </button>
      {account.loginSuccess && (
        <LoginSuccessToast
          t={t}
          email={account.me?.email}
          onDone={account.dismissLoginSuccess}
        />
      )}
      {account.accountDeleted && (
        <LoginSuccessToast
          t={t}
          message={t.accountDeletedToast}
          onDone={account.dismissAccountDeleted}
        />
      )}
      {openMode === "account" && <MyAccount onClose={handleClose} />}
      {openMode === "checkout" &&
        (resumesCheckout ? (
          <CheckoutWizard
            onClose={handleClose}
            entryPoint="payment"
            initialPlan={account.pendingCheckout?.plan}
          />
        ) : (
          <CheckoutWizard onClose={handleClose} />
        ))}
    </>
  );
}
