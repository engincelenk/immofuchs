import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { getWizardSteps, STEP_LABEL_KEYS } from "./wizardSteps.js";
import { StepHeader } from "./StepHeader.jsx";
import { OrderSummary } from "./OrderSummary.jsx";
import { PricingStep } from "./PricingStep.jsx";
import { AccountStep } from "./AccountStep.jsx";
import { VerifyEmailStep } from "./VerifyEmailStep.jsx";
import { PasswordResetFlow } from "./PasswordResetFlow.jsx";
import { PaymentStep } from "./PaymentStep.jsx";
import { WelcomeStep } from "./WelcomeStep.jsx";

// Ab dieser Breite bekommt der Wizard eine zweite Spalte mit der
// Bestelluebersicht (siehe showSummary unten) - derselbe Breakpoint wie
// useIsDesktop, damit Assistent und Checkout an derselben Kante umschalten.
const WIDE_DIALOG_WIDTH = 900;
const NARROW_DIALOG_WIDTH = 460;

// Vollflaechiger Checkout-Assistent (Spec-Abschnitt 5) - ersetzt das
// bisherige kleine LoginModal/PlanSelect-Paar. `entryPoint="payment"`
// (Upgrade eines bereits eingeloggten Free-Nutzers) startet direkt bei der
// Zahlung, alles andere durchlaeuft die volle Neukunden-Sequenz.
// `initialPlan` kommt aus der nach einem OAuth-Redirect wiederhergestellten
// Kaufabsicht (useAccount.js): Google/Apple verlassen die Seite komplett,
// wodurch die im Preise-Schritt getroffene Wahl sonst verloren waere und der
// Nutzer sie nach der Rueckkehr erneut treffen muesste.
export function CheckoutWizard({ onClose, entryPoint = "pricing", initialPlan = null }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const isDesktop = useIsDesktop();
  const dialogRef = useRef(null);

  // Anfangs-Variante beruecksichtigt bereits den aktuellen Login-Status
  // (Code-Review Task 9): sonst wuerde ein bereits eingeloggter Free-Nutzer
  // (z.B. via entryPoint="pricing" ohne expliziten Upgrade-Kontext) fuer
  // einen Frame PricingStep sehen, bevor der Auto-Advance-Effekt unten
  // greift.
  const initialVariant =
    entryPoint === "payment"
      ? "upgrade"
      : account?.isLoggedIn && !account?.isPro
        ? "new-customer-no-verify"
        : "new-customer";
  const [variant, setVariant] = useState(initialVariant);
  const [stepIndex, setStepIndex] = useState(() =>
    initialVariant === "new-customer" ? 0 : getWizardSteps(initialVariant).indexOf("payment"),
  );
  const [plan, setPlan] = useState(initialPlan || "yearly");
  const [verifyEmail, setVerifyEmail] = useState(null);
  const [passwordReset, setPasswordReset] = useState(
    account?.resetToken ? { initialStep: "reset" } : null,
  );

  // steps ueber useMemo stabil halten (Code-Review Task 8): sonst wuerde
  // jeder Render eine neue Steps-Array-Referenz erzeugen und die davon
  // abgeleiteten useCallback-Handler (goToStep etc.) koennten nie stabil
  // bleiben, was PaymentStep's onCompleted-Subscription unnoetig oft neu
  // aufbauen wuerde.
  const steps = useMemo(
    () => getWizardSteps(variant).map((key) => ({ key, label: t[STEP_LABEL_KEYS[key]] })),
    [variant, t],
  );
  const currentKey = steps[stepIndex]?.key;
  // Zweispalten-Ansicht nur dort, wo eine Bestelluebersicht sinnvollen
  // Zusatzkontext liefert (Nutzerwunsch 07.08.: Browser/Mobile sollen
  // dieselbe Kaufstrecke zeigen statt zwei unterschiedliche "Staende").
  // "verify"/"welcome"/Passwort-Reset bleiben bewusst schmal und zentriert -
  // dort gibt es nichts, das eine zweite Spalte fuellen wuerde.
  const showSummary =
    isDesktop && !passwordReset && (currentKey === "pricing" || currentKey === "account" || currentKey === "payment");

  // Sobald ein eingeloggter Free-Nutzer erkannt wird (egal ueber welchen der
  // fuenf Login-/Registrierungswege), direkt zur Zahlung springen - "verify"
  // war dann entweder nie noetig (OAuth/Passkey/Passwort-Login) oder bereits
  // erledigt (Klick auf den Bestaetigungslink oeffnet diesen Wizard ohnehin
  // als frische Instanz neu).
  useEffect(() => {
    if (variant === "upgrade") return;
    if (!account?.isLoggedIn || account.isPro) return;
    setVariant("new-customer-no-verify");
    setStepIndex(getWizardSteps("new-customer-no-verify").indexOf("payment"));
  }, [account?.isLoggedIn, account?.isPro, variant]);

  useFocusTrap(dialogRef, onClose, [stepIndex, passwordReset]);

  const goToStep = useCallback(
    (key) => {
      setStepIndex(steps.findIndex((s) => s.key === key));
    },
    [steps],
  );
  // Login-Status pruefen statt hart auf "account" zu springen (Bugreport
  // 06.08.): wer ueber "ändern" aus der Zahlung zurueck in die Planauswahl
  // geht, ist bereits angemeldet - der Auto-Advance-Effekt oben greift dann
  // nicht nach, weil sich weder isLoggedIn noch variant geaendert haben. Ohne
  // diese Pruefung landete ein eingeloggter Nutzer wieder auf der
  // Login-Maske, obwohl die Fortschrittsleiste "Konto ✓" anzeigt.
  const handlePricingContinue = useCallback(
    () => goToStep(account?.isLoggedIn ? "payment" : "account"),
    [goToStep, account?.isLoggedIn],
  );
  const handleVerificationSent = useCallback(
    (email) => {
      setVerifyEmail(email);
      goToStep("verify");
    },
    [goToStep],
  );
  const handleForgotPassword = useCallback(() => setPasswordReset({ initialStep: "request" }), []);
  const handleEditPlan = useCallback(() => goToStep("pricing"), [goToStep]);

  // Zurueck-Navigation (Bugreport 06.08.: "Kein Button zurueck"). Bewusst
  // nicht ueberall: aus "verify" heraus waere die Registrierung bereits
  // passiert, und nach "welcome" ist der Kauf abgeschlossen - ein Zurueck
  // wuerde dort einen Zustand vorspiegeln, den es nicht mehr gibt. Fuer die
  // upgrade-Variante entfaellt es ganz, da sie direkt bei der Zahlung startet.
  // Ziel explizit statt stepIndex-1: sonst landete man aus der Zahlung heraus
  // auf dem Bestaetigungs-Schritt, der zu dem Zeitpunkt laengst erledigt ist.
  const backTarget = currentKey === "account" ? "pricing" : currentKey === "payment" ? "account" : null;
  const canGoBack = !passwordReset && backTarget !== null && steps.some((s) => s.key === backTarget);
  const goBack = useCallback(() => {
    if (backTarget) goToStep(backTarget);
  }, [backTarget, goToStep]);
  // Account-Refresh nach Zahlung (Code-Review Task 9): ohne das bliebe
  // account.isPro faelschlich false, bis zum naechsten manuellen Reload.
  // Zweiter, verzoegerter Refresh im Hintergrund faengt den Fall ab, dass
  // der Paddle-Webhook bei checkout.completed noch nicht durchgelaufen ist -
  // blockiert den Wechsel zu WelcomeStep aber nicht.
  const handlePaymentCompleted = useCallback(async () => {
    await account.refresh();
    setTimeout(() => account.refresh(), 1500);
    goToStep("welcome");
  }, [account, goToStep]);

  const editPlanHandler = variant === "upgrade" ? null : handleEditPlan;

  let content;
  if (passwordReset) {
    content = (
      <PasswordResetFlow
        t={t}
        account={account}
        initialStep={passwordReset.initialStep}
        onBack={() => setPasswordReset(null)}
      />
    );
  } else if (currentKey === "pricing") {
    content = (
      <PricingStep
        t={t}
        plan={plan}
        setPlan={setPlan}
        onContinue={handlePricingContinue}
        account={account}
        hideFeatures={showSummary}
      />
    );
  } else if (currentKey === "account") {
    content = (
      <AccountStep
        t={t}
        account={account}
        plan={plan}
        onVerificationSent={handleVerificationSent}
        onForgotPassword={handleForgotPassword}
      />
    );
  } else if (currentKey === "verify") {
    content = <VerifyEmailStep t={t} account={account} email={verifyEmail} />;
  } else if (currentKey === "payment") {
    content = (
      <PaymentStep
        t={t}
        account={account}
        plan={plan}
        onEditPlan={editPlanHandler}
        onCompleted={handlePaymentCompleted}
        hideSummary={showSummary}
      />
    );
  } else if (currentKey === "welcome") {
    content = <WelcomeStep t={t} account={account} onDone={onClose} />;
  }

  return createPortal(
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 1000, overflowY: "auto" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        ref={dialogRef}
        style={{
          maxWidth: showSummary ? WIDE_DIALOG_WIDTH : NARROW_DIALOG_WIDTH,
          margin: "0 auto",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* paddingTop mit safe-area-inset (Bugreport 06.08.): ohne das liegt
            die Kopfzeile auf iOS unter der Statusleiste, Uhrzeit und Logo
            ueberlappten sich. Gleiche Behandlung wie .hdr in App.jsx. */}
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
          {canGoBack ? (
            <button
              onClick={goBack}
              aria-label={t.wizardBack}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ca-dk)",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              ← {t.wizardBack}
            </button>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              🦊 ImmoFuchs <span style={{ color: "var(--ca-dk)" }}>Pro</span>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ch)", lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
        {!passwordReset && <StepHeader steps={steps} currentIndex={stepIndex} ariaLabel={steps[stepIndex]?.label} />}
        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "flex-start",
            justifyContent: showSummary ? "center" : "stretch",
            padding: "20px",
            flex: 1,
          }}
        >
          {showSummary && (
            <div style={{ flex: "0 0 280px" }}>
              <OrderSummary
                t={t}
                plan={plan}
                account={account}
                showTrialNotice={currentKey === "payment"}
                onEditPlan={currentKey === "payment" ? editPlanHandler : null}
              />
            </div>
          )}
          <div style={{ flex: showSummary ? "1 1 460px" : 1, maxWidth: showSummary ? 460 : "none", minWidth: 0 }}>
            {content}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
