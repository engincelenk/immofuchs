import { useEffect, useRef, useState } from "react";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { apiFetch } from "../../utils/apiBase.js";
import { ACCOUNT_T } from "../../i18n/account.js";
import { errorBannerStyle, infoBannerStyle, primaryBtnStyle, linkBtnStyle, textInputStyle } from "../checkout/checkoutStyles.js";

// Zweiter Faktor fuer Admin-Konten (worker/src/auth/adminMfa.ts): Meldet /me `mfaRequired`, liegt dieser Dialog
// ueber der App, bis der per E-Mail zugeschickte 6-stellige Code bestaetigt ist. Normale Nutzer sehen ihn nie.
function currentLang() {
  try {
    const stored = localStorage.getItem("if_lang");
    return stored && ACCOUNT_T[stored] ? stored : "de";
  } catch {
    return "de";
  }
}

async function postJson(path, body) {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, error: json.error };
}

export function AdminMfaGate() {
  const account = useAccountCtx();
  const t = ACCOUNT_T[currentLang()] || ACCOUNT_T.de;
  const required = Boolean(account?.mfaRequired);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const requestedRef = useRef(false);

  async function sendCode() {
    setError(null);
    setBusy(true);
    const res = await postJson("/account/mfa/request");
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error === "rate_limited" ? "mfaErrorRateLimited" : "mfaErrorSend");
  }

  // Beim ersten Erscheinen automatisch einen Code schicken (einmal je Seitenaufruf).
  useEffect(() => {
    if (required && !requestedRef.current) {
      requestedRef.current = true;
      sendCode();
    }
  }, [required]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await postJson("/account/mfa/verify", { code });
    setBusy(false);
    if (res.ok) {
      setCode("");
      await account.refresh();
      return;
    }
    setError(
      res.error === "expired"
        ? "mfaErrorExpired"
        : res.error === "too_many_attempts"
          ? "mfaErrorTooMany"
          : "mfaErrorInvalid",
    );
  }

  if (!required) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-mfa-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{ background: "var(--cc)", color: "var(--ct)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 380 }}
      >
        <h2 id="admin-mfa-title" style={{ margin: "0 0 8px", fontSize: 18 }}>
          {t.mfaTitle}
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ch)" }}>{t.mfaIntro}</p>
        {sent && !error && <div style={{ ...infoBannerStyle, marginBottom: 12 }}>{t.mfaSent}</div>}
        {error && <div style={errorBannerStyle}>{t[error]}</div>}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label={t.mfaCodeLabel}
          placeholder="123456"
          style={{ ...textInputStyle, marginBottom: 12, letterSpacing: 4, textAlign: "center", fontSize: 20 }}
        />
        <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} style={primaryBtnStyle}>
          {t.mfaSubmit}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button type="button" style={linkBtnStyle} disabled={busy} onClick={sendCode}>
            {t.mfaResend}
          </button>
          <button type="button" style={linkBtnStyle} onClick={() => account.logout?.()}>
            {t.mfaLogout}
          </button>
        </div>
      </form>
    </div>
  );
}
