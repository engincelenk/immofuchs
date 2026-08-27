import { useCallback, useEffect, useRef, useState } from "react";
import { errorBannerStyle, primaryBtnStyle } from "./checkoutStyles.js";
import { LockGlyph, RedirectOverlay } from "./CheckoutShared.jsx";
import { DEFAULT_COUNTRY } from "../../utils/countries.js";

// Stripe verlangt bei fields.billingDetails.name:"never" ZWINGEND einen
// nicht-leeren Wert (IntegrationError sonst, Live-Befund 2026-08-27). Firma
// hat Vorrang, wenn sie gesetzt ist - dann soll die Rechnung an das
// Unternehmen gehen, nicht an die Privatperson. Die Kette dahinter faengt
// Altfaelle ab, in denen der Wizard-Zustand keinen Namen traegt.
function billingName(address, account) {
  const person = [address?.firstName, address?.lastName]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(" ");
  return (
    address?.company?.trim() ||
    person ||
    account?.me?.name?.trim() ||
    account?.me?.email ||
    "Kunde"
  );
}

// Schritt 3: Zahlung (Neugestaltung 2026-08-17, seit 2026-08-26 auf Stripe
// Payment Element umgestellt statt Paddles eingebettetem iframe-Formular).
//
// Anders als Paddle sitzt der Bezahl-Button hier NICHT in einem fremden
// iframe, sondern ist unser eigenes <button>-Element - Stripes Payment
// Element enthaelt nur die Eingabefelder, den Absende-Klick loesen wir selbst
// per stripe.confirmPayment() aus. Die Widerrufs-Zustimmung (§ 312j BGB,
// Buttonloesung) laesst sich dadurch mit einem normalen `disabled` auf
// unserem Submit-Button durchsetzen - der fruehere `inert`-Workaround (siehe
// Git-Historie) war nur noetig, weil Paddles Bezahl-Button von aussen nicht
// sperrbar war.
export function PaymentStep({
  t,
  account,
  plan,
  lang,
  billingAddress,
  onCompleted,
  discountCode,
  onDiscountError,
}) {
  // starting   - Subscription wird serverseitig erzeugt, Stripe.js laedt
  // ready      - Payment Element ist eingebettet und bedienbar
  // processing - stripe.confirmPayment() laeuft
  // consent    - Ruhe-/Fehlerzustand, kein Formular eingebettet (nur nach
  //              einem Fehlschlag erreichbar, siehe fail())
  const [stage, setStage] = useState("starting");
  const [error, setError] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false);
  // Zweite Pflicht-Zustimmung (Nutzer-Vorgabe 2026-08-27): AGB, Datenschutz
  // und Widerrufsbelehrung. Bewusst getrennt von der Widerrufs-Zustimmung
  // darueber - die eine ist die Kenntnisnahme der Vertragsgrundlagen, die
  // andere der ausdrueckliche Verzicht nach § 356 Abs. 5 BGB. In EINEN Haken
  // gepackt waere der Verzicht in den AGB-Text versteckt und damit
  // angreifbar.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // onCompleted ueber eine Ref statt als Effect-Dependency (Bugreport 06.08.,
  // "Weiter zur Zahlung friert die App ein"): das account-Objekt aus
  // useAccount() ist nicht memoisiert und wechselt bei JEDEM Render die
  // Identitaet. Mit leerer Dependency-Liste laeuft der Setup-Effekt nur
  // einmal, die Ref haelt den Callback trotzdem aktuell.
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const onDiscountErrorRef = useRef(onDiscountError);
  onDiscountErrorRef.current = onDiscountError;
  const containerRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const startedRef = useRef(false);

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
      } else if (code === "stripe_not_configured" || code === "stripe_script_blocked_or_failed") {
        setError(t.planCheckoutBlocked);
      } else {
        setError(t.planCheckoutUnavailable);
      }
      setStage("consent");
      startedRef.current = false;
    },
    [t],
  );

  // Subscription serverseitig erzeugen, Stripe.js laden und das Payment
  // Element in den bereits im DOM stehenden Container einbetten. Bewusst in
  // einem Effekt statt im Klick-Handler: der Container muss existieren, BEVOR
  // Stripe ihn mounten kann.
  useEffect(() => {
    if (stage !== "starting" || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const { clientSecret } = await account.startCheckout(
          plan,
          discountCode?.trim() || undefined,
          billingAddress,
        );
        if (cancelled) return;

        const { loadStripeClient } = await import("../../utils/stripeLoader.js");
        const stripe = await loadStripeClient();
        if (cancelled) return;
        stripeRef.current = stripe;

        const elements = stripe.elements({ clientSecret, locale: lang });
        elementsRef.current = elements;
        // Billing-Adresse kommt bereits aus AddressStep und landet
        // serverseitig auf dem Stripe-Kunden (siehe useAccount.js/
        // startCheckout, worker/src/stripe/checkout.ts) - die eigenen Felder
        // im Payment Element blieben sonst eine redundante Zweiteingabe.
        const paymentElement = elements.create("payment", {
          fields: { billingDetails: { address: "never", name: "never", email: "never" } },
        });
        paymentElement.on("ready", () => {
          if (!cancelled) setStage("ready");
        });
        paymentElement.mount(containerRef.current);
      } catch (err) {
        if (!cancelled) fail(err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // discountCode/plan/billingAddress bewusst nicht als Dependency: waehrend
    // die Kasse erzeugt wird, darf ein Renderwechsel den Vorgang nicht neu
    // anstossen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    return () => {
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const stripe = stripeRef.current;
      const elements = elementsRef.current;
      if (!stripe || !elements || !withdrawalAccepted || !termsAccepted) return;
      setStage("processing");
      setError(null);
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          // Fuer Zahlungsarten, die redirect:"if_required" NICHT inline
          // abschliessen kann (Live-Befund 2026-08-27: Google Pay macht das
          // im Testmodus konsequent, vermutlich betrifft es auch 3D Secure
          // in bestimmten Faellen) - useAccount.js erkennt die Rueckkehr an
          // "redirect_status" in der URL und behandelt sie wie eine
          // abgeschlossene Kauf-Bestaetigung. Kein eigener Rueckkehr-Screen
          // noetig: die Wizard-Route ist immer dieselbe Seiten-URL wie
          // jetzt, kein separates return_url-Ziel.
          return_url: window.location.href,
          payment_method_data: {
            billing_details: {
              // Stripe verlangt bei fields.billingDetails.name:"never" ZWINGEND
              // einen nicht-leeren Wert hier (IntegrationError sonst, Live-
              // Befund 2026-08-27) - Firma ist in AddressStep.jsx bewusst
              // optional, bei Privatkaeufern also meist leer. Kontoname ist
              // bei der Registrierung Pflichtfeld, kann aber bei Google-/
              // Apple-Konten fehlen, deshalb E-Mail als letzte Stufe.
              email: account?.me?.email || undefined,
              name: billingName(billingAddress, account),
              // Stripe verlangt bei fields.billingDetails.address:"never" im
              // Payment Element (siehe elements.create() oben) ALLE
              // Adress-Teilfelder hier, nicht nur die, die wir tatsaechlich
              // haben - sonst IntegrationError "did not pass ...address.state".
              // line2/state gibt es in AddressStep.jsx nicht (Deutschland
              // kennt kein Bundesland-Pflichtfeld auf der Rechnung), deshalb
              // leer statt weggelassen.
              address: {
                // Strasse und Hausnummer werden im Formular getrennt erfasst
                // (AddressStep.jsx), Stripe kennt nur line1 - hier wieder
                // zusammengesetzt, in derselben Reihenfolge wie serverseitig
                // (worker/src/stripe/checkout.ts), damit Rechnungsanschrift
                // und Zahlungsmittel-Anschrift nicht auseinanderlaufen.
                line1: [billingAddress?.street, billingAddress?.houseNumber]
                  .map((v) => (v || "").trim())
                  .filter(Boolean)
                  .join(" "),
                line2: "",
                postal_code: billingAddress?.zip || "",
                city: billingAddress?.city || "",
                state: "",
                country: billingAddress?.country || DEFAULT_COUNTRY,
              },
            },
          },
        },
      });
      if (confirmError) {
        setError(confirmError.message || t.planCheckoutUnavailable);
        setStage("ready");
        return;
      }
      onCompletedRef.current();
    },
    [withdrawalAccepted, termsAccepted, account, billingAddress, t],
  );

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>{t.paymentMethodTitle}</div>

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

      <form onSubmit={handleSubmit}>
        {/* Die Zustimmungen stehen direkt ueber dem Formular (Nutzer-Meldung
            2026-08-20). Sie bleiben jederzeit bedienbar: wer einen Haken
            wieder abwaehlt, sperrt den Submit-Button erneut. */}
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <ConsentRow
            checked={termsAccepted}
            disabled={error === "email_not_verified"}
            onChange={setTermsAccepted}
          >
            {/* Satzbau bewusst aus Bausteinen statt einem Text mit
                Platzhaltern: die drei Links muessen anklickbar bleiben, und
                Trennzeichen (paymentTermsSep) sowie Satzende
                (paymentTermsSuffix) unterscheiden sich je Sprache - im
                Chinesischen etwa "、" statt ", ". Der Suffix bringt seinen
                fuehrenden Abstand selbst mit, wo die Sprache einen braucht. */}
            {t.paymentTermsPrefix}{" "}
            <LegalLink href="/agb.html">{t.paymentTermsAgb}</LegalLink>
            {t.paymentTermsSep}
            <LegalLink href="/datenschutz.html">{t.paymentTermsPrivacy}</LegalLink>{" "}
            {t.paymentTermsAnd}{" "}
            <LegalLink href="/agb.html#widerruf">{t.paymentTermsWithdrawal}</LegalLink>
            {t.paymentTermsSuffix}
          </ConsentRow>
          <ConsentRow
            checked={withdrawalAccepted}
            disabled={error === "email_not_verified"}
            onChange={setWithdrawalAccepted}
            divider
          >
            {t.paymentWithdrawalConsent}
          </ConsentRow>
        </div>

        {/* Erneut-Versuchen nur nach einem Fehlschlag beim Erzeugen der
            Kasse: fail() setzt stage zurueck auf "consent", das Formular ist
            dann nicht mehr im DOM - ohne diesen Knopf gaebe es keinen Weg,
            den Vorgang neu anzustossen. */}
        {stage === "consent" && error && error !== "email_not_verified" && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStage("starting");
            }}
            style={primaryBtnStyle}
          >
            {t.paymentRetryCta}
          </button>
        )}

        {/* Zielcontainer fuer das Payment Element. Er muss im DOM stehen,
            BEVOR elements.create(...).mount() laeuft - deshalb schon in der
            Phase "starting" gerendert und nicht erst bei "ready". */}
        {stage !== "consent" && (
          <div
            ref={containerRef}
            style={{ minHeight: stage === "ready" || stage === "processing" ? 220 : 60, width: "100%" }}
          />
        )}

        {stage === "ready" && (
          <button
            type="submit"
            disabled={!withdrawalAccepted || !termsAccepted}
            style={{ ...primaryBtnStyle, marginTop: 16, width: "100%" }}
          >
            {t.paymentPayCta}
          </button>
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
      </form>

      {(stage === "starting" || stage === "processing") && <RedirectOverlay label={t.redirectingToCheckout} />}
    </div>
  );
}

// Eine Zustimmungszeile. `divider` zieht die Trennlinie zur Zeile darueber -
// beide Haken sitzen in EINER Box, damit sie als ein zusammengehoeriger
// Block vor dem Bezahlen gelesen werden und nicht als zwei Hinweise, von
// denen man einen ueberblaettert.
function ConsentRow({ checked, disabled, onChange, divider, children }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        fontSize: 12,
        lineHeight: 1.5,
        color: "var(--ct)",
        padding: "12px 14px",
        borderTop: divider ? "1px solid var(--cb)" : "none",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <input
        type="checkbox"
        required
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <span>{children}</span>
    </label>
  );
}

// stopPropagation, damit der Klick auf den Link nicht als Klick auf das
// umschliessende <label> gilt - sonst wuerde jeder Blick in die AGB
// gleichzeitig den Haken umschalten.
function LegalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color: "var(--ca-dk)" }}
    >
      {children}
    </a>
  );
}
