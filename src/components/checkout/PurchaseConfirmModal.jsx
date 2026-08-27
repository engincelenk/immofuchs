import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { BrandIcon } from "../ui/BrandIcon.jsx";
import { PurchaseConfirmation } from "./PurchaseConfirmation.jsx";

// Eigenstaendige Kauf-Bestaetigung (Nutzer-Meldung 2026-08-27: "keine abo
// bestaetigung gesehen, checkoutfenster geht zu und abo seite wird gezeigt").
//
// Der Erfolgsbildschirm lebte bisher ausschliesslich als letzter Schritt IM
// Checkout-Wizard. Zahlungsarten mit echtem Browser-Redirect (Google Pay,
// teils 3D Secure) reissen dessen React-Zustand aber komplett ein, bevor
// dieser Schritt je erscheinen konnte - uebrig blieb nur eine kleine
// Einblendung oben rechts, die im Vorbeigehen zu uebersehen ist.
//
// Dieses Fenster haengt stattdessen an account.purchaseSuccess, also am
// tatsaechlichen Statuswechsel zu "pro" (useAccount.js/noteProStatus) bzw.
// an der erkannten Stripe-Rueckkehr. Es erscheint damit auf JEDEM Weg:
// inline bezahlt, ueber einen Redirect zurueckgekehrt oder aus "Mein Konto"
// heraus aufgewertet. Solange der Wizard noch offen ist, zeigt der seinen
// eigenen letzten Schritt - dann bleibt dieses Fenster zu (Steuerung in
// ProHeaderButton.jsx), sonst staenden zwei Bestaetigungen uebereinander.
export function PurchaseConfirmModal({ onClose }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const isDesktop = useIsDesktop();
  const dialogRef = useRef(null);

  useFocusTrap(dialogRef, onClose, []);

  // Seiten-Scroll sperren, solange das Fenster offen ist. html UND body -
  // Begruendung ausfuehrlich in MyAccount.jsx: durch das globale
  // overflow-x:hidden ist <html> der eigentliche Seiten-Scroller.
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        if (isDesktop && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        // Ueber "Mein Konto" (MyAccount.jsx liegt auf 1000): wer gerade
        // gekauft hat, soll die Bestaetigung sehen und nicht eine Flaeche,
        // die zufaellig spaeter im DOM haengt. Bei gleichem z-index gewinnt
        // der zuletzt eingehaengte Knoten - und das war je nach Reihenfolge
        // mal die Bestaetigung, mal der Kontobereich (Bugreport 2026-08-27:
        // "kein modal sondern die abo seite").
        zIndex: 1100,
        overflowY: "auto",
        background: isDesktop ? "rgba(20,18,14,.45)" : "var(--bg)",
        ...(isDesktop
          ? { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }
          : null),
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.welcomeTitle}
        ref={dialogRef}
        style={{
          width: "100%",
          maxWidth: 460,
          margin: isDesktop ? 0 : "0 auto",
          minHeight: isDesktop ? 0 : "100%",
          display: "flex",
          flexDirection: "column",
          ...(isDesktop
            ? {
                background: "var(--bg)",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(0,0,0,.22)",
                border: "1px solid var(--cb)",
                overflow: "hidden",
              }
            : null),
        }}
      >
        {/* Kopfzeile bewusst identisch zum Checkout-Wizard: fuer den Nutzer
            ist das die Fortsetzung desselben Vorgangs, auch wenn technisch
            ein anderes Fenster dahintersteht. paddingTop mit safe-area-inset,
            sonst liegt die Zeile auf iOS unter der Statusleiste. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "14px 20px",
            paddingTop: "calc(14px + env(safe-area-inset-top))",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <BrandIcon size={30} /> <span style={{ color: "var(--ca-dk)" }}>Pro</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ch)", lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            padding: "0 20px 20px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            flex: 1,
          }}
        >
          <PurchaseConfirmation t={t} account={account} onDone={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
