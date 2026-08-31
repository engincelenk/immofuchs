import { useCallback, useEffect, useRef, useState } from "react";
import { errorBannerStyle, primaryBtnStyle, linkBtnStyle } from "./checkoutStyles.js";
import { LockGlyph } from "./CheckoutShared.jsx";
import { configurePurchases, purchasePlan, restorePurchases } from "../../utils/nativePurchases.js";

// Ersetzt PaymentStep innerhalb der App (Capacitor/iOS/Android) - Apple und
// Google verlangen fuer In-App-Abos ihre eigene Kauf-API (StoreKit/Play
// Billing) statt eines Web-Checkouts (siehe docs/app-store-google-play-setup.md
// Abschnitt "Zahlungsmethoden"). Keine Rechnungsadresse/Karteneingabe hier -
// beide Stores erledigen Zahlungsmittel und Rechnung selbst, das
// vorgelagerte AddressStep wird fuer native Kaeufe uebersprungen
// (CheckoutWizard.jsx).
//
// UNGETESTET (siehe nativePurchases.js) - kann erst gegen ein echtes
// RevenueCat-Projekt mit App-Store-Connect-/Play-Console-Produkten
// verifiziert werden.
export function NativePurchaseStep({ t, account, plan, onCompleted }) {
  const [stage, setStage] = useState("configuring"); // configuring | ready | processing | error
  const [error, setError] = useState(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const userId = account?.me?.id;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await configurePurchases(userId);
        if (!cancelled) setStage("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("revenuecat_configure_failed", err);
          setError(t.nativePurchaseErrorGeneric);
          setStage("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, t.nativePurchaseErrorGeneric]);

  const handlePurchase = useCallback(async () => {
    setStage("processing");
    setError(null);
    try {
      const isPro = await purchasePlan(plan);
      if (isPro) {
        onCompletedRef.current();
      } else {
        // Kauf lief technisch durch, RevenueCat meldet das Entitlement aber
        // (noch) nicht als aktiv - z.B. weil der Server-Webhook noch nicht
        // durchgelaufen ist. onCompleted() trotzdem aufrufen: der Wizard
        // stoesst dort bereits mehrere verzoegerte account.refresh()-Versuche
        // an (gleiches Verhalten wie beim Stripe-Zahlungsschritt).
        onCompletedRef.current();
      }
    } catch (err) {
      // RevenueCat markiert eine Nutzer-Abbrechung ueber userCancelled - kein
      // Fehler, einfach zurueck in den ruhenden Zustand.
      if (err?.userCancelled) {
        setStage("ready");
        return;
      }
      console.error("revenuecat_purchase_failed", err);
      setError(t.nativePurchaseErrorGeneric);
      setStage("ready");
    }
  }, [plan, t.nativePurchaseErrorGeneric]);

  const handleRestore = useCallback(async () => {
    setStage("processing");
    setError(null);
    try {
      const isPro = await restorePurchases();
      if (isPro) {
        onCompletedRef.current();
      } else {
        setError(t.nativePurchaseErrorNoActiveSubscription);
        setStage("ready");
      }
    } catch (err) {
      console.error("revenuecat_restore_failed", err);
      setError(t.nativePurchaseErrorGeneric);
      setStage("ready");
    }
  }, [t.nativePurchaseErrorGeneric, t.nativePurchaseErrorNoActiveSubscription]);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>{t.nativePurchaseTitle}</h2>
      <p style={{ fontSize: 13, color: "var(--ch)", margin: "0 0 16px", lineHeight: 1.5 }}>
        {t.nativePurchaseSub}
      </p>

      {error && <div style={errorBannerStyle}>{error}</div>}

      <button
        onClick={handlePurchase}
        disabled={stage !== "ready"}
        style={{ ...primaryBtnStyle, opacity: stage === "ready" ? 1 : 0.6 }}
      >
        <LockGlyph /> {stage === "processing" ? t.nativePurchaseBusy : t.nativePurchaseCta}
      </button>

      <button
        onClick={handleRestore}
        disabled={stage !== "ready"}
        style={{ ...linkBtnStyle, display: "block", margin: "14px auto 0", opacity: stage === "ready" ? 1 : 0.6 }}
      >
        {t.nativePurchaseRestore}
      </button>
    </div>
  );
}
