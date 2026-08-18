import { useCallback, useEffect, useRef, useState } from "react";
import { errorBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";
import { LockGlyph, RedirectOverlay } from "./CheckoutShared.jsx";

// Klassenname (nicht ID) des Containers, in den Paddle sein Formular einbettet -
// Paddle.js erwartet an dieser Stelle einen Klassen-Selektor.
const FRAME_CLASS = "paddle-checkout-frame";

// Laedt der eingebettete Rahmen nach dieser Zeit kein einziges Event, gilt er
// als blockiert (haeufigster Grund bei dieser Zielgruppe: Tracking-Blocker,
// die den iframe verschlucken, ohne dass ein Fehler-Event kommt) - dann
// oeffnet sich stattdessen Paddles eigenes Overlay. Lieber ein Bruch in der
// Optik als ein Nutzer, der nicht bezahlen kann.
const INLINE_LOAD_TIMEOUT_MS = 9000;

// Schritt 3: Zahlung (Neugestaltung 2026-08-17 nach den Referenz-Screenshots).
//
// Frueher loeste dieser Schritt Paddles bildschirmfuellendes Overlay aus - der
// Nutzer verlor im letzten, wichtigsten Moment die Bestelluebersicht und die
// vertraute Optik. Jetzt rendert Paddle sein Formular in einen Container
// innerhalb der Kaufstrecke, die Bestelluebersicht bleibt daneben stehen
// (CheckoutWizard) bzw. darunter (Handy).
//
// Reihenfolge der Zustimmung (§ 312j BGB, Buttonloesung): Paddles Bezahl-Button
// sitzt INNERHALB des eingebetteten Rahmens und laesst sich von aussen nicht
// sperren. Die Widerrufs-Zustimmung muss deshalb VOR dem Einbetten eingeholt
// werden - der Rahmen entsteht erst, nachdem der Nutzer zugestimmt hat. Vorher
// war die Checkbox nur eine Freischaltung unseres eigenen Buttons.
export function PaymentStep({
  t,
  account,
  plan,
  onCompleted,
  discountCode,
  onDiscountError,
  onTotals,
}) {
  // consent  - Zustimmung steht aus, kein Paddle-Kontakt
  // starting - Transaktion wird erzeugt, Container ist schon im DOM
  // inline    - Paddle-Formular ist eingebettet
  // fallback  - Einbetten misslungen, Paddles Overlay uebernimmt
  const [stage, setStage] = useState("consent");
  const [error, setError] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false);

  // onCompleted ueber eine Ref statt als Effect-Dependency (Bugreport 06.08.,
  // "Weiter zur Zahlung friert die App ein"): das account-Objekt aus
  // useAccount() ist nicht memoisiert und wechselt bei JEDEM Render die
  // Identitaet. Dadurch wechselte auch onCompleted staendig, der Effekt lief
  // neu - und sein Cleanup rief mitten im Oeffnen Paddle.Checkout.close()
  // auf. Uebrig blieb Paddles Overlay-Hintergrund ohne Inhalt, der die ganze
  // Seite blockierte. Mit leerer Dependency-Liste laeuft der Cleanup nur noch
  // beim echten Unmount, die Ref haelt den Callback trotzdem aktuell.
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const onDiscountErrorRef = useRef(onDiscountError);
  onDiscountErrorRef.current = onDiscountError;
  const onTotalsRef = useRef(onTotals);
  onTotalsRef.current = onTotals;
  const frameLoadedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    import("../../utils/paddleLoader.js").then(({ onPaddleCheckoutEvent }) => {
      if (cancelled) return;
      unsubscribe = onPaddleCheckoutEvent((event) => {
        if (event?.name === "checkout.loaded" || event?.name === "checkout.updated") {
          frameLoadedRef.current = true;
          // Ab jetzt kennt Paddle den tatsaechlich faelligen Betrag (inklusive
          // eingeloestem Gutschein und laenderabhaengiger Steuer) - die
          // Bestelluebersicht daneben soll dieselbe Zahl zeigen wie das
          // Formular, nicht unsere Vorab-Berechnung.
          const totals = event.data?.totals;
          if (totals) {
            onTotalsRef.current?.({
              total: totals.total,
              currencyCode: event.data?.currency_code,
            });
          }
        }
        if (event?.name === "checkout.completed") {
          window.Paddle?.Checkout?.close?.();
          onCompletedRef.current();
        }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
      // Nur beim echten Verlassen des Zahlungsschritts: sonst bliebe Paddles
      // Fenster offen, waehrend darunter schon der Willkommens-Screen oder die
      // geschlossene App steht.
      window.Paddle?.Checkout?.close?.();
    };
  }, []);

  const fail = useCallback(
    (err) => {
      const code = err instanceof Error ? err.message : "";
      if (code === "email_not_verified") {
        setError("email_not_verified");
      } else if (code === "invalid_discount_code") {
        // Der Code wurde einen Schritt frueher eingegeben - die Meldung gehoert
        // dorthin zurueck, nicht an diese Stelle, wo kein Eingabefeld steht.
        onDiscountErrorRef.current?.(t.discountCodeInvalid);
        setError(t.discountCodeInvalid);
      } else {
        setError(code.startsWith("paddle_script") ? t.planCheckoutBlocked : t.planCheckoutUnavailable);
      }
      setStage("consent");
      startedRef.current = false;
    },
    [t],
  );

  // Kasse oeffnen, sobald der Container im DOM steht. Bewusst in einem Effekt
  // und nicht direkt im Klick-Handler: Paddle sucht seinen Ziel-Container zum
  // Zeitpunkt des open()-Aufrufs im Dokument - im Klick-Handler existiert er
  // noch nicht, weil React erst danach neu rendert.
  useEffect(() => {
    if (stage !== "starting" || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await account.startCheckout(plan, discountCode?.trim() || undefined, FRAME_CLASS);
        if (cancelled) return;
        setStage("inline");
      } catch (err) {
        if (!cancelled) fail(err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // discountCode/plan bewusst nicht als Dependency: waehrend die Kasse
    // geoeffnet wird, darf ein Renderwechsel den Vorgang nicht neu anstossen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Rueckfall auf das Overlay, wenn der eingebettete Rahmen stumm bleibt.
  useEffect(() => {
    if (stage !== "inline") return;
    const timer = setTimeout(async () => {
      if (frameLoadedRef.current) return;
      setStage("fallback");
      try {
        await account.startCheckout(plan, discountCode?.trim() || undefined);
      } catch (err) {
        fail(err);
      }
    }, INLINE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>{t.paymentMethodTitle}</div>

      {/* Kein "✓ Angemeldet als ..."-Banner mehr hier (Nutzer-Korrektur
          2026-08-18): dieser Schritt ist nur eingeloggt erreichbar, der
          Hinweis bestaetigte also immer nur einen bereits offensichtlichen
          Zustand. Der Login-Schritt selbst wird fuer bereits eingeloggte
          Nutzer schon an anderer Stelle uebersprungen (CheckoutWizard.jsx,
          Auto-Advance-Effekt). */}
      {error === "email_not_verified" ? (
        <div style={errorBannerStyle}>
          {t.loginErrorEmailNotVerified}
          <div style={{ marginTop: 8 }}>
            {resendDone ? (
              t.verifySentBody.replace("{email}", account?.me?.email || "")
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setResendBusy(true);
                  await account.resendVerification(account?.me?.email || "");
                  setResendBusy(false);
                  setResendDone(true);
                }}
                disabled={resendBusy}
                style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "inherit", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
              >
                {t.loginResendVerification}
              </button>
            )}
          </div>
        </div>
      ) : (
        error && <div style={errorBannerStyle}>{error}</div>
      )}

      {stage === "consent" && (
        <>
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--ct)",
              background: "var(--ci)",
              border: "1px solid var(--cb)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 14,
            }}
          >
            <input
              type="checkbox"
              required
              checked={withdrawalAccepted}
              onChange={(e) => setWithdrawalAccepted(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>{t.paymentWithdrawalConsent}</span>
          </label>

          <button
            onClick={() => {
              setError(null);
              setStage("starting");
            }}
            disabled={!withdrawalAccepted || error === "email_not_verified"}
            style={{
              ...primaryBtnStyle,
              opacity: withdrawalAccepted && error !== "email_not_verified" ? 1 : 0.5,
              cursor: withdrawalAccepted && error !== "email_not_verified" ? "pointer" : "not-allowed",
            }}
          >
            {t.paymentConsentCta} →
          </button>
        </>
      )}

      {/* Zielcontainer fuer Paddle. Er muss im DOM stehen, BEVOR
          Paddle.Checkout.open() laeuft - deshalb schon in der Phase
          "starting" gerendert und nicht erst bei "inline". */}
      {(stage === "starting" || stage === "inline") && (
        <div
          className={FRAME_CLASS}
          style={{ minHeight: stage === "inline" ? 460 : 240, width: "100%" }}
        />
      )}

      {stage === "fallback" && (
        <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.55, padding: "20px 0" }}>
          {t.paymentInlineFallback}
        </div>
      )}

      {stage !== "consent" && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 11.5,
            color: "var(--ch)",
            marginTop: 12,
          }}
        >
          <LockGlyph /> {t.paymentEncrypted}
        </p>
      )}

      {stage === "starting" && <RedirectOverlay label={t.redirectingToCheckout} />}
    </div>
  );
}
