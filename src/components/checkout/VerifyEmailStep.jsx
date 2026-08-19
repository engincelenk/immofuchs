import { useEffect, useState } from "react";
import { ErrorBanner, MailGlyph } from "./CheckoutShared.jsx";
import { secondaryBtnStyle } from "./checkoutStyles.js";

// Poll-Intervall als Fallback zu visibilitychange, siehe Kommentar unten.
const VERIFY_POLL_MS = 4000;

// 60-Sek.-Cooldown fuer "Bestaetigung erneut senden" - startet bei jedem
// Eintritt in diesen Schritt (frische Registrierung UND jeder manuelle
// Resend-Klick).
export function VerifyEmailStep({ t, account, email }) {
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    setResendCooldown(60);
    const interval = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [email]);

  // Bugreport 19.08.: der Bestaetigungslink aus der Mail oeffnet auf dem
  // Handy fast immer einen NEUEN Tab (Mail-App -> Standardbrowser) statt des
  // Tabs, in dem dieser Schritt offen ist. Der Worker setzt das
  // Session-Cookie dort erfolgreich (siehe routes/auth.ts, /verify-email),
  // dieser Tab bekommt davon aber nichts mit - useAccount.js laedt den
  // Kontostatus nur einmal beim Mount neu, nicht automatisch bei Ereignissen
  // in einem anderen Tab. Cookie ist same-origin und damit browserweit
  // gueltig, sobald der Nutzer hierher zurueckkommt muss also nur erneut
  // GET /me laufen. visibilitychange deckt den Rueckweg aus der Mail-App ab;
  // der Poll daneben faengt In-App-Browser (z.B. Gmail) ab, die dieses Event
  // nicht zuverlaessig feuern.
  useEffect(() => {
    const checkVerified = () => {
      if (document.visibilityState === "visible") account.refresh();
    };
    document.addEventListener("visibilitychange", checkVerified);
    window.addEventListener("focus", checkVerified);
    const poll = setInterval(checkVerified, VERIFY_POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", checkVerified);
      window.removeEventListener("focus", checkVerified);
      clearInterval(poll);
    };
  }, [account.refresh]);

  async function handleResend() {
    setBusy(true);
    const result = await account.resendVerification(email);
    setBusy(false);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setResendCooldown(60);
  }

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: "var(--ca-dk)" }}>
        <MailGlyph />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{t.verifySentTitle}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", marginTop: 8, lineHeight: 1.55 }}>
        {t.verifySentBody.replace("{email}", email || "")}
      </p>
      {inlineError && <ErrorBanner t={t} code={inlineError} />}
      <button
        onClick={handleResend}
        disabled={resendCooldown > 0 || busy}
        style={{ ...secondaryBtnStyle, marginTop: 16, width: "auto", display: "inline-flex", padding: "10px 16px" }}
      >
        {resendCooldown > 0 ? t.verifyResendCooldown.replace("{sec}", String(resendCooldown)) : t.verifyResend}
      </button>
      <p style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 10 }}>{t.verifyResendHint}</p>
    </div>
  );
}
