// Ersetzt PaymentStep innerhalb der App (Capacitor/iOS/Android) - siehe
// docs/app-store-google-play-setup.md Abschnitt "Zahlungsmethoden".
//
// Nutzer-Entscheidung 2026-09-04: KEIN Kauf innerhalb der App (weder
// eingebettetes Stripe-Formular noch native In-App-Kaeufe/RevenueCat -
// ersetzt den urspruenglichen RevenueCat-Ansatz vollstaendig, siehe
// release-notes.txt). Grund: Apple/Google verlangen fuer In-App-Abos ihre
// eigene Kauf-API (StoreKit/Play Billing); ein Kauf-Button, der zu einem
// externen Zahlungsweg fuehrt, faellt fuer ein Business-Tool wie ImmoFuchs
// weiterhin unter Guideline 3.1.1 (kein Reader-App-Sonderfall). Bewusst
// akzeptiertes Restrisiko (Nutzer-Entscheidung): dieser Schritt zeigt einen
// neutralen Link zur Website OHNE Preis-/Kauf-Sprache - kein "Jetzt kaufen"-
// Button, keine Preisanzeige. Vergleichbarer Praezedenzfall: Basecamps
// HEY-App wurde 2020 zunaechst wegen genau dieser Konstellation abgelehnt,
// bis jeglicher Kauf-Hinweis aus der App entfernt wurde - dieser Schritt
// geht das Risiko bewusst trotzdem ein (siehe Chat-Entscheidung), sollte bei
// einer Ablehnung durch Apple aber als erstes ersatzlos entfernt werden.
//
// Kein onCompleted/Wizard-Fortschritt hier - es gibt nichts "abzuschliessen",
// der Nutzer schliesst den Dialog ueber die vorhandene X/Zurueck-Steuerung,
// nachdem er (optional) die Website geoeffnet hat.
export function NativeWebRedirectStep({ t }) {
  const openWebsite = () => {
    // window.open(..., "_blank") statt eines eingebetteten iframes/WebViews -
    // Capacitor leitet Navigation zu einer fremden Origin automatisch an den
    // System-Browser (Safari/Chrome) weiter, nicht an ein In-App-Fenster.
    window.open("https://immofuchs.info/", "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{t.nativeWebRedirectTitle}</h2>
      <p style={{ fontSize: 13, color: "var(--ch)", margin: "0 0 20px", lineHeight: 1.5 }}>
        {t.nativeWebRedirectSub}
      </p>

      <button
        onClick={openWebsite}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: 15,
          fontWeight: 700,
          background: "var(--ca)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {t.nativeWebRedirectCta}
      </button>
    </div>
  );
}
