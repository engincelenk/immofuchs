import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { getWizardSteps, STEP_LABEL_KEYS } from "./wizardSteps.js";
import { StepHeader } from "./StepHeader.jsx";
import { PricingStep } from "./PricingStep.jsx";
import { AccountStep } from "./AccountStep.jsx";
import { VerifyEmailStep } from "./VerifyEmailStep.jsx";
import { PasswordResetFlow } from "./PasswordResetFlow.jsx";
import { PaymentStep } from "./PaymentStep.jsx";
import { WelcomeStep } from "./WelcomeStep.jsx";

// Vollflaechiger Checkout-Assistent (Spec-Abschnitt 5) - ersetzt das
// bisherige kleine LoginModal/PlanSelect-Paar. `entryPoint="payment"`
// (Upgrade eines bereits eingeloggten Free-Nutzers) startet direkt bei der
// Zahlung, alles andere durchlaeuft die volle Neukunden-Sequenz.
export function CheckoutWizard({ onClose, entryPoint = "pricing" }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const dialogRef = useRef(null);
  const supportsPasskey = typeof window !== "undefined" && Boolean(window.PublicKeyCredential);

  const [variant, setVariant] = useState(entryPoint === "payment" ? "upgrade" : "new-customer");
  const [stepIndex, setStepIndex] = useState(0);
  const [plan, setPlan] = useState("yearly");
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
  const handlePricingContinue = useCallback(() => goToStep("account"), [goToStep]);
  const handleVerificationSent = useCallback(
    (email) => {
      setVerifyEmail(email);
      goToStep("verify");
    },
    [goToStep],
  );
  const handleForgotPassword = useCallback(() => setPasswordReset({ initialStep: "request" }), []);
  const handleEditPlan = useCallback(() => goToStep("pricing"), [goToStep]);
  const handlePaymentCompleted = useCallback(() => goToStep("welcome"), [goToStep]);

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
    content = <PricingStep t={t} plan={plan} setPlan={setPlan} onContinue={handlePricingContinue} />;
  } else if (currentKey === "account") {
    content = (
      <AccountStep
        t={t}
        account={account}
        supportsPasskey={supportsPasskey}
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
        onEditPlan={variant === "upgrade" ? null : handleEditPlan}
        onCompleted={handlePaymentCompleted}
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
        style={{ maxWidth: 460, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            🦊 ImmoFuchs <span style={{ color: "var(--ca-dk)" }}>Pro</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ch)", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        {!passwordReset && <StepHeader steps={steps} currentIndex={stepIndex} ariaLabel={steps[stepIndex]?.label} />}
        <div style={{ padding: "20px", flex: 1 }}>{content}</div>
      </div>
    </div>,
    document.body,
  );
}
