import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { PlanSelect } from "./PlanSelect.jsx";

// Vollflaechiges Modal (Spec 4.3) - Login ist selten und wichtig genug,
// anders als Finns Bottom-Sheet. Ablauf: "compare" (Free-vs-Pro-Vergleich,
// PFLICHT-Zwischenschritt vor jedem OAuth-Redirect) -> "login" -> ggf.
// "magic-sent" -> nach erfolgreichem Login automatisch "plan", falls noch
// nicht Pro.
export function LoginModal({ onClose }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const [step, setStep] = useState("compare");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const [busy, setBusy] = useState(null); // welcher Button gerade laedt
  const [inlineError, setInlineError] = useState(null);
  const dialogRef = useRef(null);
  const supportsPasskey = typeof window !== "undefined" && Boolean(window.PublicKeyCredential);

  // Nach Login (isLoggedIn true) direkt zur Plan-Auswahl springen - ausser
  // der Nutzer ist bereits Pro (dann macht dieses Modal keinen Sinn mehr,
  // Aufrufer schliesst es typischerweise selbst ueber isPro-Aenderung).
  useEffect(() => {
    if (account?.isLoggedIn && !account.isPro && step !== "plan") {
      setStep("plan");
    }
  }, [account?.isLoggedIn, account?.isPro, step]);

  useEffect(() => {
    if (account?.error?.startsWith("login_error_")) {
      setInlineError(account.error.replace("login_error_", ""));
    }
  }, [account?.error]);

  // Fokus-Trap + Escape (Spec 4.3 Accessibility-Nachschärfung, S2-5) - neu
  // berechnet bei jedem Schritt-Wechsel (compare -> login -> ...), da sich
  // die fokussierbaren Elemente pro Schritt aendern.
  useFocusTrap(dialogRef, onClose, [step]);

  async function handleMagicLink(e) {
    e.preventDefault();
    setBusy("email");
    setInlineError(null);
    const result = await account.requestMagicLink(email);
    setBusy(null);
    if (!result.ok) {
      setInlineError(result.error);
      return;
    }
    setSentTo(email);
    setStep("magic-sent");
  }

  async function handlePasskeyLogin() {
    setBusy("passkey");
    setInlineError(null);
    try {
      await account.passkeyLogin();
    } catch {
      setInlineError("passkey");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cc)",
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--cb)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            {/* --ca-dk statt --ca: --ca (#E8600A) auf Weiss liegt bei ~3.4:1
                Kontrast, unter der WCAG-AA-Grenze von 4.5:1 fuer Normaltext
                (S2-5-Befund, siehe docs/accessibility-audit-s2-5.md). --ca-dk
                (#C44D00) liegt bei ~4.76:1 und besteht die Pruefung. */}
            🦊 ImmoFuchs <span style={{ color: "var(--ca-dk)" }}>Pro</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--ch)",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {step === "compare" && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.compareTitle}</div>
              <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, marginBottom: 16 }}>
                {t.compareIntro}
              </p>
              <CompareTable t={t} />
              <button
                onClick={() => setStep("login")}
                style={primaryBtnStyle}
              >
                {t.compareContinue} →
              </button>
            </>
          )}

          {step === "login" && (
            <>
              <p style={{ fontSize: 13, color: "var(--ch)", marginBottom: 16 }}>{t.loginSubtitle}</p>
              {inlineError && <ErrorBanner t={t} code={inlineError} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {supportsPasskey && (
                  <button
                    onClick={handlePasskeyLogin}
                    disabled={busy === "passkey"}
                    style={secondaryBtnStyle}
                  >
                    🔑 {t.loginPasskey}
                  </button>
                )}
                <button onClick={account.startGoogleLogin} style={secondaryBtnStyle}>
                  <span style={{ fontWeight: 800 }}>G</span> {t.loginGoogle}
                </button>
                <button onClick={account.startAppleLogin} style={secondaryBtnStyle}>
                  {t.loginApple}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
                <span style={{ fontSize: 11, color: "var(--ch)" }}>{t.loginOr}</span>
                <div style={{ flex: 1, height: 1, background: "var(--cb)" }} />
              </div>
              <form onSubmit={handleMagicLink} style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.loginEmailPlaceholder}
                  style={{
                    flex: 1,
                    height: 42,
                    fontSize: 16,
                    padding: "0 12px",
                    border: "1px solid var(--cb)",
                    borderRadius: 8,
                    background: "var(--ci)",
                    color: "var(--ct)",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  disabled={busy === "email"}
                  aria-label={t.loginEmailPlaceholder}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 8,
                    border: "none",
                    background: "var(--ca)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  →
                </button>
              </form>
              <p style={{ fontSize: 11, color: "var(--ch)", marginTop: 8 }}>{t.loginEmailHint}</p>
            </>
          )}

          {step === "magic-sent" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📩</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {t.loginEmailSent} {sentTo}
              </div>
              <p style={{ fontSize: 12, color: "var(--ch)", marginTop: 8 }}>{t.loginEmailSentHint}</p>
              <button
                onClick={() => setStep("login")}
                style={{ ...secondaryBtnStyle, marginTop: 16 }}
              >
                {t.loginEmailOther}
              </button>
            </div>
          )}

          {step === "plan" && <PlanSelect t={t} account={account} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function CompareTable({ t }) {
  const rows = [
    [t.compareRowRechner, t.compareRowRechnerFree, t.compareRowRechnerPro],
    [t.compareRowExpose, t.compareRowExposeFree, t.compareRowExposePro],
    [t.compareRowFinn, t.compareRowFinnFree, t.compareRowFinnPro],
    [t.compareRowMerkliste, t.compareRowMerklisteFree, t.compareRowMerklistePro],
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 18 }}>
      <thead>
        <tr>
          <th style={thStyle}></th>
          <th style={thStyle}>Free</th>
          <th style={{ ...thStyle, color: "var(--ca-dk)" }}>Pro</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, free, pro]) => (
          <tr key={label}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>{label}</td>
            <td style={tdStyle}>{free}</td>
            <td style={{ ...tdStyle, color: "var(--ca-dk)", fontWeight: 600 }}>{pro}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ErrorBanner({ t, code }) {
  const map = {
    oauth_state_mismatch: t.loginErrorOauth,
    oauth_failed: t.loginErrorOauth,
    magic_link_invalid: t.loginErrorMagicLink,
    rate_limited: t.loginErrorRateLimited,
    passkey: t.loginErrorPasskey,
    invalid_email: t.loginErrorInvalidEmail,
  };
  return (
    <div
      style={{
        background: "#fff1e8",
        border: "1px solid #f5cba9",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--ca-dk)",
        marginBottom: 12,
      }}
    >
      {map[code] || t.loginErrorOauth}
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--cb)", color: "var(--ch)" };
const tdStyle = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--cb)" };

const primaryBtnStyle = {
  width: "100%",
  padding: "14px",
  fontSize: 15,
  fontWeight: 700,
  background: "var(--ca)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "12px",
  fontSize: 14,
  fontWeight: 600,
  background: "var(--ci)",
  color: "var(--ct)",
  border: "1px solid var(--cb)",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};
