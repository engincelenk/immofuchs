import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { DEFAULT_COUNTRY } from "../../utils/countries.js";
import { getWizardSteps, STEP_LABEL_KEYS } from "./wizardSteps.js";
import { useRegisterWizardOpen } from "./wizardPresence.js";
import { StepHeader } from "./StepHeader.jsx";
import { OrderSummary } from "./OrderSummary.jsx";
import { PricingStep } from "./PricingStep.jsx";
import { AccountStep } from "./AccountStep.jsx";
import { VerifyEmailStep } from "./VerifyEmailStep.jsx";
import { PasswordResetFlow } from "./PasswordResetFlow.jsx";
import { AddressStep } from "./AddressStep.jsx";
import { PaymentStep } from "./PaymentStep.jsx";
import { NativeWebRedirectStep } from "./NativeWebRedirectStep.jsx";
import { PurchaseConfirmation } from "./PurchaseConfirmation.jsx";
import { BrandIcon } from "../ui/BrandIcon.jsx";
import { RedirectOverlay } from "./CheckoutShared.jsx";

// Dialogbreite je Schritt (Neugestaltung 2026-08-17). Der Zahlungsschritt
// bettet das Stripe Payment Element ein und braucht daneben noch Platz fuer
// die Bestelluebersicht - die uebrigen Schritte wuerden auf dieser Breite
// auseinanderfallen. Formularschritte bleiben deshalb schmal.
const PAYMENT_DIALOG_WIDTH = 1040;
const WIDE_DIALOG_WIDTH = 900;
const TERM_DIALOG_WIDTH = 560;
const NARROW_DIALOG_WIDTH = 460;

// Vollflaechiger Checkout-Assistent (Spec-Abschnitt 5) - ersetzt das
// bisherige kleine LoginModal/PlanSelect-Paar.
// entryPoint:
//   "pricing" (Standard) - voller Kauf-Flow, startet bei der Plan-Auswahl.
//   "payment" - Upgrade eines bereits eingeloggten Free-Nutzers, startet
//     direkt bei der Zahlung (Plan wurde bereits gewaehlt).
//   "login" (Stufe Nutzer-Konzept 2026-08-11) - reine Anmeldung fuer den
//     kostenlosen Ersttest ("Anmelden" auf der Landingpage / Rechner-Sperre),
//     OHNE Plan-/Zahlungsschritte. Schliesst sich selbst, sobald der Login
//     klappt - die Kaufentscheidung faellt hier bewusst noch nicht.
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
  // Native In-App-Kauf (RevenueCat) statt Stripe-Checkout, siehe
  // docs/app-store-google-play-setup.md. isNativePlatform() aendert sich zur
  // Laufzeit nie, useMemo mit leerer Dependency-Liste reicht.
  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  // Solange dieser Wizard laeuft, unterdrueckt er die eigenstaendige
  // Kauf-Bestaetigung (PurchaseConfirmModal.jsx) - er zeigt seine eigene.
  useRegisterWizardOpen();

  // Anfangs-Variante beruecksichtigt bereits den aktuellen Login-Status
  // (Code-Review Task 9): sonst wuerde ein bereits eingeloggter Free-Nutzer
  // (z.B. via entryPoint="pricing" ohne expliziten Upgrade-Kontext) fuer
  // einen Frame PricingStep sehen, bevor der Auto-Advance-Effekt unten
  // greift.
  const initialVariant =
    entryPoint === "payment"
      ? "upgrade"
      : entryPoint === "login"
        ? "login-only"
        : // Gleiche Begruendung wie beim Schliessen-Zweig unten: `isPro` ist
          // auch waehrend der Testphase true. Ein angemeldeter Testphasen-
          // Nutzer hat seine E-Mail laengst bestaetigt und braucht den
          // Verify-Schritt nicht.
          account?.isLoggedIn && account?.zugang !== "pro"
          ? "new-customer-no-verify"
          : "new-customer";
  const [variant, setVariant] = useState(initialVariant);
  // Stufe E (Nutzer-Konzept 2026-08-11): frischer Wizard-Start landet jetzt
  // immer auf "pricing" (Plan waehlen), auch fuer bereits eingeloggte
  // Nutzer - vorher sprang ein eingeloggter Free-Nutzer stillschweigend mit
  // vorausgewaehltem Jahresplan direkt zur Zahlung. "Konto" bleibt fuer sie
  // trotzdem uebersprungen (siehe Auto-Advance-Effekt unten, der nur beim
  // Verlassen des Konto-Schritts greift, nicht beim initialen Mount).
  // Einzige Ausnahme: entryPoint==="payment" (echtes Upgrade eines bereits
  // gewaehlten Plans, z.B. Wiederaufnahme nach OAuth-Redirect) startet
  // weiterhin direkt bei der Zahlung.
  //
  // Ergaenzung 2026-08-27 (Nutzer-Meldung): kommt ein Plan von aussen mit -
  // der Nutzer hat auf der Landingpage bereits "Plan waehlen" geklickt -, ist
  // der Preise-Schritt eine Wiederholung derselben Frage. Der Wizard startet
  // dann direkt beim naechsten offenen Punkt: "Konto" fuer Gaeste,
  // "Rechnungsdaten" fuer Angemeldete. Aendern laesst sich der Plan weiterhin
  // ueber "aendern" in der Bestelluebersicht, das zurueck auf "pricing" fuehrt.
  const [stepIndex, setStepIndex] = useState(() => {
    const steps = getWizardSteps(initialVariant);
    if (initialVariant === "upgrade") return steps.indexOf("address");
    if (initialVariant === "login-only" || !initialPlan) return 0;
    const ziel = steps.indexOf(account?.isLoggedIn ? "address" : "account");
    return ziel === -1 ? 0 : ziel;
  });
  const [plan, setPlan] = useState(initialPlan || "yearly");
  // Rechnungsadresse (Bugreport 26.08.): nur im Wizard-State, keine
  // Persistierung in unserer DB - die Werte werden einmalig beim Erzeugen der
  // Stripe-Subscription gebraucht (siehe useAccount.js/startCheckout) und
  // landen von dort direkt auf dem Stripe-Kundendatensatz.
  const [billingAddress, setBillingAddress] = useState({
    firstName: "",
    lastName: "",
    street: "",
    houseNumber: "",
    zip: "",
    city: "",
    country: DEFAULT_COUNTRY,
    company: "",
    vatId: "",
  });
  // Vor-/Nachname aus dem Kontonamen vorbelegen, sobald er bekannt ist. Nicht
  // als useState-Initialwert: im Kauf-Flow eines NEUEN Kunden ist zum
  // Montage-Zeitpunkt noch niemand angemeldet, der Name kommt erst mit dem
  // Login zwei Schritte spaeter. Fuellt nur, solange beide Felder leer sind -
  // eine bereits getippte Eingabe darf ein spaeterer /me-Refresh nicht
  // ueberschreiben.
  const accountName = account?.me?.name;
  useEffect(() => {
    const full = (accountName || "").trim();
    if (!full) return;
    setBillingAddress((prev) => {
      if (prev.firstName || prev.lastName) return prev;
      const parts = full.split(/\s+/);
      return {
        ...prev,
        firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0],
        lastName: parts.length > 1 ? parts[parts.length - 1] : "",
      };
    });
  }, [accountName]);

  // Gutscheincode liegt seit der Neugestaltung 2026-08-17 im Wizard statt im
  // Zahlungsschritt: eingegeben wird er in der Kostenbox beim Waehlen der
  // Laufzeit, gebraucht wird er erst beim Erzeugen der Stripe-Subscription -
  // zwei Schritte weiter. Der Fehler wandert denselben Weg zurueck, damit er
  // dort erscheint, wo das Eingabefeld steht.
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState(null);
  // Ladehinweis des Zahlungsschritts (Nutzer-Meldung 2026-08-27): er liegt
  // bewusst HIER statt in PaymentStep, damit er den gesamten Dialogkoerper
  // abdeckt - inklusive Bestelluebersicht. In PaymentStep deckte er nur die
  // Formularspalte ab, daneben blieb alles sichtbar.
  const [paymentBusyLabel, setPaymentBusyLabel] = useState(null);
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
  // Bewusst hier oben, direkt hinter steps/currentKey, und nicht weiter
  // unten bei den uebrigen Handlern: mehrere useEffect-Bloecke darunter
  // fuehren goToStep in ihrer Dependency-Liste. Die wird bei JEDEM Render
  // ausgewertet - stuende die Deklaration danach, waere goToStep zu diesem
  // Zeitpunkt noch in der temporalen Todeszone und der Wizard stuerbe beim
  // Oeffnen mit "Cannot access before initialization" ab (Bugreport
  // 2026-09-03, eingeschleppt mit dem native-Kauf-Effekt aus 673f400).
  const goToStep = useCallback(
    (key) => {
      setStepIndex(steps.findIndex((s) => s.key === key));
    },
    [steps],
  );
  // Wo eine Bestelluebersicht sinnvollen Zusatzkontext liefert.
  // "verify"/"welcome"/Passwort-Reset bleiben bewusst ohne - dort gibt es
  // nichts zu bestaetigen. Der Laufzeit-Schritt ebenfalls nicht: dort steht die
  // Kostenbox bereits direkt unter der Auswahl (PricingStep), eine zweite
  // waere doppelt. login-only zeigt nie eine - es gibt an dieser Stelle weder
  // Plan noch Preis, das waere nur verwirrend.
  //
  // Korrektur 2026-08-17: haengt nicht mehr an isDesktop. Vorher blendete das
  // die Uebersicht auf dem Handy KOMPLETT aus - dort sah der Nutzer bis zum
  // Bezahlen nie, was ihn erwartet. Jetzt entscheidet isDesktop nur noch
  // ueber die Platzierung: daneben oder darunter.
  const showSummary =
    !passwordReset &&
    variant !== "login-only" &&
    (currentKey === "account" || currentKey === "address" || currentKey === "payment");
  const summaryBeside = showSummary && isDesktop;

  const dialogWidth = passwordReset
    ? NARROW_DIALOG_WIDTH
    : currentKey === "payment"
      ? PAYMENT_DIALOG_WIDTH
      : summaryBeside
        ? WIDE_DIALOG_WIDTH
        : currentKey === "pricing"
          ? TERM_DIALOG_WIDTH
          : NARROW_DIALOG_WIDTH;

  // Sobald ein eingeloggter Free-Nutzer WAEHREND des Konto-Schritts erkannt
  // wird (egal ueber welchen der fuenf Login-/Registrierungswege), direkt zur
  // Zahlung springen - "verify" war dann entweder nie noetig (OAuth/Passkey/
  // Passwort-Login) oder bereits erledigt (Klick auf den Bestaetigungslink
  // oeffnet diesen Wizard ohnehin als frische Instanz neu). Bewusst an
  // currentKey==="account" gebunden (Stufe E, Nutzer-Konzept 2026-08-11):
  // sonst wuerde dieser Effekt auch beim initialen Mount eines bereits
  // eingeloggten Nutzers feuern und die neue Plan-Auswahl (siehe stepIndex-
  // Default oben) sofort wieder ueberspringen.
  //
  // Greift seit Bugreport 19.08. auch auf "verify": der Bestaetigungslink
  // wird auf dem Handy meist in einem ANDEREN Tab geoeffnet, dieser Wizard
  // bleibt also auf "verify" stehen. VerifyEmailStep erkennt die
  // Verifizierung dort per visibilitychange/Poll und ruft account.refresh()
  // auf - sobald isLoggedIn dadurch kippt, soll der Wizard genauso zur
  // Zahlung weiterspringen wie beim direkten Login ueber "account", statt
  // dass der Nutzer auf der Warteseite haengen bleibt.
  // Stabile Ref auf onClose (statt onClose direkt in Effekt-Dependencies):
  // wird schon vom naechsten Effekt (Pro-Kurzschluss unten) gebraucht, bevor
  // der login-only-Effekt sie sonst erst weiter unten anlegen wuerde.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (variant === "upgrade" || variant === "login-only") return;
    if (currentKey !== "account" && currentKey !== "verify") return;
    if (!account?.isLoggedIn) return;
    // Bugreport 25.08.: ein Nutzer, der bereits Pro ist (z.B. Login mit
    // vorhandenem Pro-Konto mitten im Kauf-Flow), hat hier nichts mehr zu
    // kaufen - der Assistent blieb bisher einfach auf "Konto" haengen, weil
    // dieser Effekt nur den Weg zur Zahlung kannte. Schliesst sich jetzt
    // stattdessen, wie der login-only-Zweig es fuer die reine Anmeldung
    // bereits tut.
    // `zugang === "pro"` statt `isPro` (Bugreport 2026-08-27): isPro ist
    // serverseitig `zugang !== "keiner"` und damit auch waehrend der
    // kartenfreien 7-Tage-Testphase true - die beim ersten /me automatisch
    // startet. Wer sich also mitten im Kauf-Flow anmeldete, war in derselben
    // Sekunde "isPro" und bekam den Wizard kommentarlos zugeklappt, mit einer
    // Testphase, die er nie wollte, statt der Zahlung, die er angefangen
    // hatte. Zumachen ist nur richtig, wenn jemand bereits BEZAHLT hat.
    if (account.zugang === "pro") {
      onCloseRef.current();
      return;
    }
    setVariant("new-customer-no-verify");
    setStepIndex(getWizardSteps("new-customer-no-verify").indexOf("address"));
  }, [account?.isLoggedIn, account?.zugang, variant, currentKey]);

  // login-only (Stufe Nutzer-Konzept 2026-08-11): Ziel ist ausschliesslich
  // die Anmeldung fuer den kostenlosen Ersttest, keine Kaufentscheidung -
  // sobald der Login klappt, schliesst der Wizard einfach wieder, statt wie
  // beim Kauf-Flow zur Zahlung zu springen. Der Nutzer landet damit wieder
  // auf der Landingpage ("Jetzt rechnen" ist jetzt sichtbar) bzw. im
  // Rechner, aus dem heraus der Login-Bildschirm geoeffnet wurde.
  useEffect(() => {
    if (variant !== "login-only" || !account?.isLoggedIn) return;
    onCloseRef.current();
  }, [variant, account?.isLoggedIn]);

  // Der Wizard zeigt die Kauf-Bestaetigung als eigenen letzten Schritt -
  // damit ist das globale Signal verbraucht. Ohne dieses Abraeumen erschiene
  // nach "Los geht's" dieselbe Bestaetigung ein zweites Mal als eigenes
  // Fenster (ProHeaderButton.jsx/Landing.jsx), sobald der Wizard zu ist.
  //
  // Bewusst auch von purchaseSuccess abhaengig, nicht nur vom Schritt: das
  // Signal kann erst durch einen der verzoegerten Refreshes gesetzt werden
  // (der Stripe-Webhook braucht 2-4 s), also erst WAEHREND dieser Schritt
  // schon sichtbar ist.
  const dismissPurchaseSuccess = account?.dismissPurchaseSuccess;
  const purchaseSuccess = account?.purchaseSuccess;
  useEffect(() => {
    if (currentKey === "welcome" && purchaseSuccess) dismissPurchaseSuccess?.();
  }, [currentKey, purchaseSuccess, dismissPurchaseSuccess]);

  // Native Kaeufe brauchen keine Rechnungsadresse - Apple/Google verwalten
  // Zahlungsmittel und Rechnung selbst. "address" bleibt in wizardSteps.js
  // fuer den Web-Flow unveraendert bestehen, wird hier nur uebersprungen
  // (gleiches Auto-Advance-Muster wie der Effekt oben fuer "account"/"verify").
  useEffect(() => {
    if (!isNative || currentKey !== "address") return;
    goToStep("payment");
  }, [isNative, currentKey, goToStep]);

  useFocusTrap(dialogRef, onClose, [stepIndex, passwordReset]);

  // Seiten-Scroll sperren, solange der Wizard offen ist. html UND body, nicht
  // nur body: durch das globale `overflow-x:hidden` rechnet CSS die
  // Y-Achse von <html> auf `auto` hoch, wodurch <html> der eigentliche
  // Seiten-Scroller ist und die body-Angabe nicht mehr auf den Viewport
  // durchschlaegt (ausfuehrlich kommentiert in MyAccount.jsx).
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

  // Login-Status pruefen statt hart auf "account" zu springen (Bugreport
  // 06.08.): wer ueber "ändern" aus der Zahlung zurueck in die Planauswahl
  // geht, ist bereits angemeldet - der Auto-Advance-Effekt oben greift dann
  // nicht nach, weil sich weder isLoggedIn noch variant geaendert haben. Ohne
  // diese Pruefung landete ein eingeloggter Nutzer wieder auf der
  // Login-Maske, obwohl die Fortschrittsleiste "Konto ✓" anzeigt.
  const handlePricingContinue = useCallback(
    () => goToStep(account?.isLoggedIn ? "address" : "account"),
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
  // Stufe E: fuer bereits eingeloggte Nutzer ist "account" gar kein
  // erreichbarer Schritt mehr (handlePricingContinue springt direkt zu
  // "payment") - "Zurueck" muss dann ebenfalls zu "pricing" fuehren statt zu
  // einem Login-Schritt, den dieser Nutzer nie gesehen hat.
  const backTarget =
    currentKey === "account"
      ? "pricing"
      : currentKey === "address"
        ? account?.isLoggedIn
          ? "pricing"
          : "account"
        : currentKey === "payment"
          ? "address"
          : null;
  const canGoBack = !passwordReset && backTarget !== null && steps.some((s) => s.key === backTarget);
  const goBack = useCallback(() => {
    if (backTarget) goToStep(backTarget);
  }, [backTarget, goToStep]);
  // Account-Refresh nach Zahlung (Code-Review Task 9): ohne das bliebe
  // account.isPro faelschlich false, bis zum naechsten manuellen Reload.
  // Zweiter, verzoegerter Refresh im Hintergrund faengt den Fall ab, dass der
  // Stripe-Webhook noch nicht durchgelaufen ist - blockiert den Wechsel zu
  // WelcomeStep aber nicht.
  const handlePaymentCompleted = useCallback(async () => {
    await account.refresh();
    // Zwei verzoegerte Nachzuegler statt einem (Live-Befund 2026-08-27,
    // dev-Testkauf): der Stripe-Webhook braucht beobachtet ca. 2-3s ab
    // Zahlungsbestaetigung, bis customer.subscription.updated bei uns
    // ankommt und verarbeitet ist - ein einzelner Refresh nach 1,5s hat den
    // Erfolgs-Toast (ProHeaderButton.jsx, purchaseSuccess) dadurch
    // zuverlaessig verpasst, weil er noch vor dem Webhook lief. Mit zwei
    // Versuchen (1,5s und 4s) reicht mindestens einer normalerweise aus,
    // ohne bei einer schnellen Zustellung einen sichtbaren Unterschied zu
    // machen.
    setTimeout(() => account.refresh(), 1500);
    setTimeout(() => account.refresh(), 4000);
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
        onCancel={onClose}
        account={account}
        discountCode={discountCode}
        setDiscountCode={(code) => {
          setDiscountCode(code);
          setDiscountError(null);
        }}
        discountError={discountError}
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
        freeEntry={variant === "login-only"}
      />
    );
  } else if (currentKey === "verify") {
    content = <VerifyEmailStep t={t} account={account} email={verifyEmail} />;
  } else if (currentKey === "address") {
    content = (
      <AddressStep
        t={t}
        account={account}
        value={billingAddress}
        onChange={setBillingAddress}
        onContinue={() => goToStep("payment")}
      />
    );
  } else if (currentKey === "payment" && isNative) {
    content = <NativeWebRedirectStep t={t} />;
  } else if (currentKey === "payment") {
    content = (
      <PaymentStep
        t={t}
        account={account}
        plan={plan}
        lang={lang}
        billingAddress={billingAddress}
        onCompleted={handlePaymentCompleted}
        onBusyChange={setPaymentBusyLabel}
        discountCode={discountCode}
        // Ungueltiger Code: zurueck in den Laufzeit-Schritt, wo das
        // Eingabefeld steht - eine Fehlermeldung ohne zugehoeriges Feld waere
        // eine Sackgasse.
        onDiscountError={(message) => {
          setDiscountError(message);
          if (editPlanHandler) editPlanHandler();
        }}
      />
    );
  } else if (currentKey === "welcome") {
    content = <PurchaseConfirmation t={t} account={account} plan={plan} onDone={onClose} />;
  }

  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        // Klick auf den abgedunkelten Rand schliesst - nur auf dem Desktop,
        // wo dieser Rand ueberhaupt existiert. e.target===currentTarget
        // stellt sicher, dass Klicks INNERHALB der Karte nicht durchschlagen.
        if (isDesktop && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        overflowY: "auto",
        // Nutzer-Vorgabe 2026-08-12: im Browser ein Modal-Fenster statt einer
        // vollflaechigen Seite - eine reine Anmeldung ist ein Zwischenschritt,
        // kein eigener Ort, und das Vollbild liess den Nutzer glauben, er
        // haette die Anwendung verlassen. Auf dem Handy bleibt es bewusst
        // vollflaechig: ein zentriertes Kaertchen mit Rand verschenkt dort
        // Platz, den Formularfelder brauchen.
        background: isDesktop ? "rgba(20,18,14,.45)" : "var(--bg)",
        ...(isDesktop
          ? { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }
          : null),
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        ref={dialogRef}
        style={{
          width: "100%",
          maxWidth: dialogWidth,
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
              {/* "Pro" nur im Kauf-Flow (Stufe Nutzer-Konzept 2026-08-11) -
                  eine reine Anmeldung fuer den kostenlosen Test hat mit Pro
                  noch nichts zu tun. Der Markenname selbst steht seit
                  2026-08-20 im Bild (BrandIcon zeigt den Schriftzug), der
                  frueher danebenstehende Text "ImmoFuchs" entfaellt deshalb. */}
              <BrandIcon size={30} /> {variant !== "login-only" && <span style={{ color: "var(--ca-dk)" }}>Pro</span>}
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
        {!passwordReset && variant !== "login-only" && (
          <StepHeader
            steps={steps}
            currentIndex={stepIndex}
            counterLabel={t.stepCounter
              .replace("{current}", String(stepIndex + 1))
              .replace("{total}", String(steps.length))}
          />
        )}
        {/* Die Bestelluebersicht steht auf dem Desktop rechts neben dem
            Formular und auf dem Handy darunter - deshalb hier eine
            Flex-Richtung statt zweier getrennter Zweige (dieselben Daten,
            nur andere Achse). Auf dem Desktop steht das Formular zuerst im
            Markup und die Uebersicht rechts; auf dem Handy folgt sie
            darunter, was der Lesereihenfolge entspricht. */}
        <div
          style={{
            display: "flex",
            flexDirection: summaryBeside ? "row" : "column",
            gap: summaryBeside ? 28 : 18,
            alignItems: summaryBeside ? "flex-start" : "stretch",
            padding: "20px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            flex: 1,
            position: "relative",
          }}
        >
          <div style={{ flex: summaryBeside ? "1 1 auto" : undefined, minWidth: 0 }}>{content}</div>
          {showSummary && (
            <div style={{ flex: summaryBeside ? "0 0 300px" : undefined, minWidth: 0 }}>
              <OrderSummary
                t={t}
                plan={plan}
                variant={summaryBeside ? "card" : "box"}
                showRenewal
              />
              {editPlanHandler && (
                <button
                  onClick={editPlanHandler}
                  style={{
                    background: "none",
                    border: "none",
                    padding: "10px 0 0",
                    fontSize: 12,
                    color: "var(--ca-dk)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  {t.accountChange}
                </button>
              )}
            </div>
          )}
          {paymentBusyLabel && <RedirectOverlay label={paymentBusyLabel} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}
