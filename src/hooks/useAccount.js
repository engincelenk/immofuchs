import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, apiV1, apiFetch } from "../utils/apiBase.js";
import { storeNativeToken, clearNativeToken } from "../utils/nativeAuth.js";

// Haelt Login-/Pro-Status, ruft /api/v1/me (Spec 5.3) - strukturell wie
// useAssistant/useFinnBubble. Ein einziger Provider (AccountContext.jsx)
// haelt genau eine Instanz, damit nicht jede Komponente ihren eigenen
// /api/v1/me-Aufruf ausloest.
export function useAccount() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // Rohantwort von /api/v1/me, oder null (nicht eingeloggt)
  const [error, setError] = useState(null);
  const didHandleRedirectRef = useRef(false);

  // Cross-cutting Pro-Signal fuer useSavedObjects (Merkliste.jsx): dieser Hook
  // wird von App() VOR AppProviders/AccountProvider aufgerufen (Ctx-Wert wird
  // dort synchron gebaut, bevor der Account-Context ueberhaupt existiert) -
  // useAccountCtx() waere in useSavedObjects also immer null. Statt App.jsx
  // grossflaechig umzubauen, meldet sich der Pro-Status hier ueber ein
  // Custom-Event + einen localStorage-Cache ab (kein Sicherheitsrisiko: die
  // eigentliche Rechtepruefung bleibt serverseitig, 4.9 - dieses Signal
  // entscheidet nur, welchen Speicherweg der Client anzeigt).
  const broadcastIsPro = useCallback((isPro) => {
    try {
      localStorage.setItem("if_ispro_cache", isPro ? "1" : "0");
    } catch {
      /* Storage evtl. blockiert - kein Blocker */
    }
    window.dispatchEvent(new CustomEvent("if:ispro-changed", { detail: isPro }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/me");
      if (res.status === 401) {
        setMe(null);
        broadcastIsPro(false);
        return;
      }
      if (!res.ok) throw new Error(`me_failed_${res.status}`);
      const json = await res.json();
      setMe(json);
      broadcastIsPro(Boolean(json?.isPro));
    } catch (e) {
      console.error("[account] refresh fehlgeschlagen:", e);
      setError("refresh_failed");
      setMe(null);
      broadcastIsPro(false);
    } finally {
      setLoading(false);
    }
  }, [broadcastIsPro]);

  // Nach OAuth-/Magic-Link-Redirect landet der Nutzer mit
  // ?login_success=1|login_error=...|email_change_success=1|email_change_error=...
  // in der URL zurueck (Worker-Redirects, siehe routes/auth.ts) - einmal lesen,
  // aus der URL entfernen (kein History-Muell) und den Kontostatus neu laden.
  useEffect(() => {
    if (didHandleRedirectRef.current) return;
    didHandleRedirectRef.current = true;
    const url = new URL(window.location.href);
    const hasAuthParam = [
      "login_success",
      "login_error",
      "email_change_success",
      "email_change_error",
    ].some((k) => url.searchParams.has(k));
    if (hasAuthParam) {
      const loginError = url.searchParams.get("login_error");
      const emailChangeError = url.searchParams.get("email_change_error");
      for (const k of ["login_success", "login_error", "email_change_success", "email_change_error"]) {
        url.searchParams.delete(k);
      }
      window.history.replaceState({}, "", url.toString());
      if (loginError) setError(`login_error_${loginError}`);
      if (emailChangeError) setError(`email_change_error_${emailChangeError}`);
    }
    refresh();
  }, [refresh]);

  // Google/Apple bleiben Browser-Redirect-Flows (10.0: "PWA-weites Rough
  // Edge", akzeptiert) - kein Bearer-Token-Pfad dafuer in dieser Runde, siehe
  // routes/auth.ts. Fuer eine native Huelle (Phase D) braeuchte das eigene
  // native Sign-in-Plugins statt des Web-OAuth-Redirects.
  const startGoogleLogin = useCallback(() => {
    window.location.href = apiV1("/auth/google/start");
  }, []);

  const startAppleLogin = useCallback(() => {
    window.location.href = apiV1("/auth/apple/start");
  }, []);

  const requestMagicLink = useCallback(async (email) => {
    const res = await apiFetch("/auth/magic-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) return { ok: false, error: "rate_limited" };
    if (!res.ok) return { ok: false, error: "invalid_email" };
    return { ok: true };
  }, []);

  // Passkey ist aktuell der einzige Login-Weg ohne Browser-Redirect - der
  // Worker gibt hier zusaetzlich zum Cookie ein `token` im Body zurueck, das
  // nativ (Capacitor) in Secure Storage landet (10.0, S1-4/S6-2).
  const passkeyLogin = useCallback(async () => {
    const { startAuthentication } = await import("@simplewebauthn/browser");
    const optionsRes = await apiFetch("/auth/passkey/login/options", { method: "POST" });
    if (!optionsRes.ok) throw new Error("passkey_options_failed");
    const { flowId, options } = await optionsRes.json();
    const assertion = await startAuthentication({ optionsJSON: options });
    const verifyRes = await apiFetch("/auth/passkey/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId, response: assertion }),
    });
    if (!verifyRes.ok) throw new Error("passkey_login_failed");
    const { token } = await verifyRes.json();
    await storeNativeToken(token);
    await refresh();
  }, [refresh]);

  const passkeyRegister = useCallback(
    async (email) => {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await apiFetch("/auth/passkey/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!optionsRes.ok) throw new Error("passkey_register_options_failed");
      const { options } = await optionsRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await apiFetch("/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          response: attestation,
          deviceLabel: navigator.userAgentData?.platform || navigator.platform || null,
        }),
      });
      if (!verifyRes.ok) throw new Error("passkey_register_failed");
      const { token } = await verifyRes.json();
      await storeNativeToken(token);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    await clearNativeToken();
    setMe(null);
    broadcastIsPro(false);
  }, [broadcastIsPro]);

  const logoutAllDevices = useCallback(async () => {
    await apiFetch("/auth/logout-all", { method: "POST" });
    await clearNativeToken();
    setMe(null);
    broadcastIsPro(false);
  }, [broadcastIsPro]);

  // Paddle-Checkout (4.6): erzeugt server-seitig eine Transaktion, oeffnet sie
  // per dynamisch nachgeladenem Paddle.js als Overlay (paddleLoader.js).
  const startCheckout = useCallback(async (plan) => {
    const res = await apiFetch("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("checkout_failed");
    const { transactionId } = await res.json();
    const { loadPaddle } = await import("../utils/paddleLoader.js");
    const Paddle = await loadPaddle();
    Paddle.Checkout.open({
      transactionId,
      settings: {
        successUrl: `${window.location.origin}/?login_success=1`,
      },
    });
  }, []);

  const openBillingPortal = useCallback(async () => {
    const res = await apiFetch("/billing/portal");
    if (!res.ok) throw new Error("portal_failed");
    const { url } = await res.json();
    window.open(url, "_blank");
  }, []);

  const cancelSubscription = useCallback(async () => {
    const res = await apiFetch("/billing/cancel", { method: "POST" });
    if (!res.ok) throw new Error("cancel_failed");
    await refresh();
    return res.json();
  }, [refresh]);

  const reactivateSubscription = useCallback(async () => {
    const res = await apiFetch("/billing/reactivate", { method: "POST" });
    if (!res.ok) throw new Error("reactivate_failed");
    await refresh();
  }, [refresh]);

  const refundSubscription = useCallback(async () => {
    const res = await apiFetch("/billing/refund", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "refund_failed");
    }
    await refresh();
  }, [refresh]);

  const changeEmail = useCallback(async (newEmail) => {
    const res = await apiFetch("/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });
    return res.ok;
  }, []);

  const exportData = useCallback(() => {
    // Direkter Download-Link statt fetch+Blob - der Browser uebernimmt den
    // Dateinamen aus Content-Disposition, kein zusaetzlicher Code noetig.
    window.open(apiV1("/account/export"), "_blank");
  }, []);

  const deleteAccount = useCallback(async () => {
    const res = await apiFetch("/account/delete", { method: "POST" });
    if (!res.ok) throw new Error("delete_failed");
    await clearNativeToken();
    setMe(null);
    broadcastIsPro(false);
  }, [broadcastIsPro]);

  return {
    loading,
    me,
    isLoggedIn: Boolean(me),
    isPro: Boolean(me?.isPro),
    error,
    refresh,
    startGoogleLogin,
    startAppleLogin,
    requestMagicLink,
    passkeyLogin,
    passkeyRegister,
    logout,
    logoutAllDevices,
    startCheckout,
    openBillingPortal,
    cancelSubscription,
    reactivateSubscription,
    refundSubscription,
    changeEmail,
    exportData,
    deleteAccount,
    apiBase,
  };
}
