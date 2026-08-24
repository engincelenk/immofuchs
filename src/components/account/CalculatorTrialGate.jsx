import { useState, Suspense } from "react";
import { lazyWithReload } from "../../utils/lazyRetry.js";
import { useApp } from "../../context/AppContext.jsx";
import { useCalculatorTrial } from "../../hooks/useCalculatorTrial.js";
import { ACCOUNT_T } from "../../i18n/account.js";
import { BrandIcon } from "../ui/BrandIcon.jsx";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";
import { IconFunkeln, IconSchloss } from "./accountIcons.jsx";

// Lazy statt statischem Import (Befund 2026-08-18, siehe release-notes.txt) -
// CalculatorTrialGate haengt auf jeder Rechner-Seite, CheckoutWizard aber
// nur bei showLogin/showUpgrade tatsaechlich sichtbar.
const CheckoutWizard = lazyWithReload(
  () => import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
  "CheckoutWizard",
);

// Wrapper auf Tab-Ebene (App.jsx) statt Aenderungen in den sechs Rechner-
// Komponenten selbst - kein einziger bestehender Rechner wird angefasst.
// `rechner` ist der Worker-Rechnerwert (siehe utils/assistantContext.js
// tabZuRechner) des jeweils umschlossenen Rechners.
// Zwei Sperr-Zustaende (Stufe A/B/C, Nutzer-Konzept 2026-08-11):
//  - isLocked: nicht eingeloggt - wie bisher, Login-/Registrierungs-CTA.
//  - trialVorbei: eingeloggt, Testphase abgelaufen - gespeicherte Objekte
//    bleiben lesbar, gerechnet wird nicht mehr (Nutzer-Entscheidung
//    2026-08-20). Eigener Text, sonst wie isPaywalled.
//  - isPaywalled: eingeloggt, Kontingent DIESES Rechners (seit
//    2026-08-18: 3x je Rechner statt 1x kombiniert) bereits verbraucht,
//    kein Pro-Abo - neue Verkaufs-/Upgrade-Maske statt einer technischen
//    Fehlermeldung.
export function CalculatorTrialGate({ rechner, children, onDismiss }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const { isLocked, isPaywalled, isTrialRun, trialVorbei, remaining, limit, loading } =
    useCalculatorTrial(rechner);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading) {
    return null;
  }

  if (isLocked) {
    return (
      <GatePanel
        icon={<IconSchloss size={40} />}
        title={t.loginRequiredTitle}
        body={t.loginRequiredBody}
      >
        {/* Ohne Marken-Bild (2026-08-20): der Schriftzug im Knopf laese sich
            als "immofuchs.info Kostenlos anmelden" - doppelt und bei dieser
            Groesse ohnehin unlesbar. */}
        <button onClick={() => setShowLogin(true)} style={primaryBtnStyle}>
          {t.loginRequiredCta}
        </button>
        {showLogin && (
          <Suspense fallback={<LazyPanelFallback />}>
            <CheckoutWizard onClose={() => setShowLogin(false)} entryPoint="login" />
          </Suspense>
        )}
      </GatePanel>
    );
  }

  if (isPaywalled) {
    return (
      <GatePanel
        icon={<BrandIcon size={48} />}
        title={trialVorbei ? t.trialOverTitle : t.trialLockedTitle}
        body={trialVorbei ? t.trialOverBody : t.trialLockedBody}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowUpgrade(true)} style={primaryBtnStyle}>
            {t.trialLockedCta}
          </button>
          {onDismiss && (
            <button onClick={onDismiss} style={dismissBtnStyle}>
              {t.trialLockedDismiss}
            </button>
          )}
        </div>
        {/* entryPoint bewusst "pricing" (Standard): eingeloggte Nutzer landen
            dort dank Stufe E direkt auf der Plan-Auswahl, nicht auf "Konto". */}
        {showUpgrade && (
          <Suspense fallback={<LazyPanelFallback />}>
            <CheckoutWizard onClose={() => setShowUpgrade(false)} />
          </Suspense>
        )}
      </GatePanel>
    );
  }

  // Hinweis WAEHREND des Testlaufs (Stufe 3 des UX-Audits 2026-08-11): sagt
  // dem Nutzer, dass er gerade seinen einzigen Gratis-Durchlauf verwendet -
  // vorher erfuhr er das erst durch die Sperrwand beim naechsten Besuch.
  // Bewusst ein ruhiger Hinweisstreifen ueber dem Rechner statt eines
  // Dialogs: der Rechner bleibt sofort benutzbar, der Hinweis draengt sich
  // nicht in den Weg.
  return (
    <>
      {isTrialRun && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            marginBottom: 12,
            background: "var(--ca-bg)",
            border: "1px solid var(--ca-bd)",
            borderRadius: 10,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--ct)",
          }}
        >
          <span aria-hidden="true" style={{ display: "flex", flexShrink: 0, color: "var(--ca-dk)" }}>
            <IconFunkeln size={16} />
          </span>
          <span>{t.trialRunNotice.replace("{n}", String(remaining)).replace("{limit}", String(limit))}</span>
        </div>
      )}
      {children}
    </>
  );
}

function GatePanel({ icon, title, body, children }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 20px",
        background: "var(--cc)",
        borderRadius: 12,
        border: "1px solid var(--cb)",
      }}
    >
      {/* Gezeichnete Icons statt Emoji (2026-08-17) - deshalb hier zentriert
          und in der Akzentfarbe statt nur als grosse Schrift. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 14,
          color: "var(--ca-dk)",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>
        {body}
      </p>
      {children}
    </div>
  );
}

const primaryBtnStyle = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 700,
  background: "var(--ca)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};

const dismissBtnStyle = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  background: "none",
  color: "var(--ch)",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};
