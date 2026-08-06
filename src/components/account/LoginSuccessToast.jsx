import { useEffect } from "react";
import { createPortal } from "react-dom";

// Kurze Bestaetigung nach einem Login, der ueber einen Seiten-Redirect
// zurueckkommt (Google/Apple, Bestaetigungslink aus der Registrierungsmail).
// Vorher gab es dafuer ueberhaupt keine Rueckmeldung: der Worker leitete mit
// login_success=1 zurueck, useAccount entfernte den Parameter und verwarf ihn -
// der Nutzer sah wieder denselben Bildschirm wie vor dem Redirect und konnte
// nicht erkennen, ob die Anmeldung geklappt hatte (Bugreport 06.08.).
//
// Bewusst eine selbstschliessende Einblendung statt eines eigenen
// Bestaetigungs-Schritts: ein Screen mit "Weiter"-Knopf waere eine Sackgasse,
// die dem Nutzer nur einen zusaetzlichen Klick abverlangt. Wer mitten im Kauf
// war, sieht diese Einblendung ohnehin nicht - dort uebernimmt der
// Zahlungsschritt die Bestaetigung (siehe ProHeaderButton).
const AUTO_DISMISS_MS = 4000;

export function LoginSuccessToast({ t, email, onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => onDone?.(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return createPortal(
    <div
      // role="status" statt "alert": eine Erfolgsmeldung soll Screenreader
      // nicht unterbrechen, sondern nach der laufenden Ausgabe kommen.
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(20px + env(safe-area-inset-bottom))",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        gap: 8,
        // width:max-content + Deckel statt reinem maxWidth: ein fixed
        // positioniertes Element schrumpft sonst auf die schmalste
        // Umbruchbreite, wodurch eine lange E-Mail-Adresse auf dem Handy in
        // einen dreizeiligen, 190px schmalen Klotz gefaltet wurde, obwohl
        // die doppelte Breite zur Verfuegung stand.
        width: "max-content",
        maxWidth: "calc(100vw - 32px)",
        padding: "10px 16px",
        borderRadius: 10,
        // Gleiche Gruen-Werte wie der "Angemeldet als"-Balken im
        // Zahlungsschritt (PaymentStep.jsx) - dieselbe Aussage, dieselbe Farbe.
        background: "#E3F1E6",
        border: "1px solid #2F9E52",
        color: "#1E6B34",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 6px 20px rgba(0,0,0,.12)",
      }}
    >
      <span aria-hidden="true">✓</span>
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
        {email ? `${t.loggedInAs} ${email}` : t.loginSuccessGeneric}
      </span>
    </div>,
    document.body,
  );
}
