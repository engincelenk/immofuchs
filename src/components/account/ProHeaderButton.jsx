import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { AccountPanel } from "./AccountPanel.jsx";

// Einstiegspunkt in der Logo-Kopfzeile (Spec 4.3, korrigiert gegenueber v1:
// NICHT in Statusleiste.jsx). Label "Pro" mit Kroenchen-Icon, Fuchs-Orange.
// Jeder eingeloggte Nutzer (Free UND Pro) landet in "Mein Konto" (Wireframe
// 14.2: zentrale Anlaufstelle fuer E-Mail-Aenderung, Datenexport,
// Kontoloeschung - keine Pro-exklusiven Aktionen). Nur nicht eingeloggte
// Nutzer sehen den Login-/Vergleichs-Flow. Vorher faelschlich an isPro
// geknuepft (Bugreport 06.08.): Free-Nutzer hatten dadurch ueberhaupt keinen
// Zugang zu "Mein Konto" und landeten stattdessen zwangsweise in der
// Plan-Auswahl.
export function ProHeaderButton() {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const [open, setOpen] = useState(false);

  // Passwort-Reset-Link (?reset_token=..., Ergaenzung 04.08.) muss die Maske
  // von selbst oeffnen - anders als bei OAuth/Magic-Link gibt es hier keinen
  // Weg, den Screen ohne Nutzereingabe (neues Passwort) abzuschliessen.
  useEffect(() => {
    if (account?.resetToken) setOpen(true);
  }, [account?.resetToken]);

  if (!account || account.loading) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
      {open &&
        (account.isLoggedIn ? (
          <AccountPanel onClose={() => setOpen(false)} />
        ) : (
          <CheckoutWizard onClose={() => setOpen(false)} />
        ))}
    </>
  );
}
