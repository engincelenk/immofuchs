import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, apiV1, apiFetch } from "../utils/apiBase.js";
import { storeNativeToken, clearNativeToken } from "../utils/nativeAuth.js";

// Kaufabsicht ueber den OAuth-Redirect hinweg (Bugreport 06.08.): Google und
// Apple verlassen die Seite komplett, wodurch der komplette Wizard-State
// stirbt - er haengt an lokalem useState in ProHeaderButton/
// CalculatorTrialGate/Merkliste. Nach der Rueckkehr sah der Nutzer deshalb
// wieder exakt den Ausgangsbildschirm (z.B. den gesperrten Rechner), ohne
// jeden Hinweis, dass die Anmeldung geklappt hat, und ohne seine
// Planauswahl. sessionStorage statt localStorage: die Absicht gilt nur fuer
// diesen einen Tab-Besuch und darf einen spaeteren Besuch nicht beeinflussen.
const CHECKOUT_INTENT_KEY = "if_checkout_intent";

function rememberCheckoutIntent(plan) {
  try {
    // Die OAuth-Knoepfe haengen teils direkt an onClick, bekommen also ein
    // Event statt eines Plans - deshalb hier pruefen statt blind speichern.
    sessionStorage.setItem(
      CHECKOUT_INTENT_KEY,
      JSON.stringify({ plan: typeof plan === "string" ? plan : null }),
    );
  } catch {
    /* Storage evtl. blockiert - dann entfaellt nur die Wiederaufnahme */
  }
}

// Einmalig lesen UND loeschen: die Absicht darf sich nur ein einziges Mal
// einloesen, sonst oeffnete ein spaeterer Reload den Wizard erneut.
function takeCheckoutIntent() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CHECKOUT_INTENT_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Haelt Login-/Pro-Status, ruft /api/v1/me (Spec 5.3) - strukturell wie
// useAssistant/useFinnBubble. Ein einziger Provider (AccountContext.jsx)
// haelt genau eine Instanz, damit nicht jede Komponente ihren eigenen
// /api/v1/me-Aufruf ausloest.
export function useAccount() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // Rohantwort von /api/v1/me, oder null (nicht eingeloggt)
  const [error, setError] = useState(null);
  // E1 (Spec-v3.0 Kap. 2.2): OAuth-Callback lehnt bei bereits anders
  // registrierter E-Mail ab statt zu verknuepfen (Kap. 0.1) und haengt die
  // bekannten Methoden als ?providers=... an den Redirect an.
  const [oauthEmailTakenProviders, setOauthEmailTakenProviders] = useState(null);
  // Passwort-Reset-Token aus dem Reset-Link (?reset_token=..., Ergaenzung
  // 04.08.) - anders als die uebrigen Auth-Redirects (login_success/-error)
  // braucht dieser Weg eine Nutzereingabe (neues Passwort), kann also nicht
  // rein serverseitig per GET-Redirect abgeschlossen werden. Bleibt im State,
  // bis LoginModal ihn beim Reset-Submit verbraucht.
  const [resetToken, setResetToken] = useState(null);
  // Erfolgreicher Login war bisher das einzige Redirect-Ergebnis ohne jede
  // Rueckmeldung: login_success=1 wurde gelesen, aus der URL entfernt und
  // verworfen (nur login_error erzeugte einen sichtbaren Zustand). Beides
  // wird jetzt nach aussen gereicht - loginSuccess fuer die Bestaetigung,
  // pendingCheckout fuer die Wiederaufnahme des Kaufs.
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  // D2 (Spec-v3.0 Kap. 4.5): OAuth-Re-Auth-Loeschung schliesst mit einem
  // eigenen Redirect-Flag ab (kein login_success, da keine neue Session
  // entsteht) - siehe routes/auth.ts, /delete-reauth/{provider}/callback.
  const [accountDeleted, setAccountDeleted] = useState(false);
  const didHandleRedirectRef = useRef(false);

  // Globale Kauf-Bestaetigung (Bugreport 26.08.: nach einem Kauf kam manchmal
  // gar keine Meldung, weil ein Client-Event fuer den Wechsel zum WelcomeStep
  // fehlte und der Wizard dadurch kommentarlos schloss - der Nutzer landete
  // zurueck auf der Seite, auf der er vorher war). Dieser Toast haengt NICHT
  // am Wizard-Event, sondern direkt am tatsaechlichen Status aus /me.
  //
  // Zweiter Bugreport (26.08., selber Tag): erste Fassung hier prüfte
  // `isPro` false->true - das feuert bei so gut wie keinem echten Kauf, weil
  // `isPro` laut /me-Antwort (worker/src/routes/account.ts) schon waehrend
  // der kartenfreien 7-Tage-App-Testphase true ist (isPro = zugang !==
  // "keiner", und "zugang" kennt "pro" UND "trial"). Wer die Testphase
  // durchlaeuft und danach kauft, hat also nie einen isPro-Wechsel false->true
  // - `isPro` bleibt die ganze Zeit true. Das eigentliche Kaufsignal ist der
  // Wechsel von "trial"/"keiner" zu "pro" im Feld `zugang` (einzige Stelle,
  // die einen echten bezahlten Zugang von der kartenfreien Testphase
  // unterscheidet, siehe accountEntitlement.js/planStatusFromMe). wasProRef
  // startet bewusst erst nach dem ersten Refresh (proInitializedRef), damit
  // ein Reload als bereits bestehender Pro-Nutzer nicht faelschlich den Toast
  // ausloest.
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const wasProRef = useRef(false);
  const proInitializedRef = useRef(false);
  const noteProStatus = useCallback((isPro) => {
    if (proInitializedRef.current && !wasProRef.current && isPro) {
      setPurchaseSuccess(true);
    }
    wasProRef.current = isPro;
    proInitializedRef.current = true;
  }, []);

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
        noteProStatus(false);
        return;
      }
      if (!res.ok) throw new Error(`me_failed_${res.status}`);
      const json = await res.json();
      setMe(json);
      broadcastIsPro(Boolean(json?.isPro));
      // Bewusst `zugang === "pro"` statt des `isPro`-Felds fuer die
      // Kauf-Erkennung (siehe Kommentar bei noteProStatus oben) - "isPro"
      // ist waehrend der kartenfreien Testphase bereits true.
      noteProStatus(json?.zugang === "pro");
    } catch (e) {
      console.error("[account] refresh fehlgeschlagen:", e);
      setError("refresh_failed");
      setMe(null);
      broadcastIsPro(false);
      noteProStatus(false);
    } finally {
      setLoading(false);
    }
  }, [broadcastIsPro, noteProStatus]);

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
      "account_deleted",
    ].some((k) => url.searchParams.has(k));
    if (hasAuthParam) {
      const loginError = url.searchParams.get("login_error");
      const providersParam = url.searchParams.get("providers");
      const emailChangeError = url.searchParams.get("email_change_error");
      const loggedIn = url.searchParams.has("login_success");
      const deleted = url.searchParams.has("account_deleted");
      for (const k of ["login_success", "login_error", "email_change_success", "email_change_error", "providers", "account_deleted"]) {
        url.searchParams.delete(k);
      }
      window.history.replaceState({}, "", url.toString());
      if (loginError === "oauth_email_taken") {
        setOauthEmailTakenProviders(providersParam ? providersParam.split(",").filter(Boolean) : []);
      }
      if (loginError) setError(`login_error_${loginError}`);
      if (emailChangeError) setError(`email_change_error_${emailChangeError}`);
      if (deleted) {
        setAccountDeleted(true);
        setMe(null);
        broadcastIsPro(false);
      } else if (loggedIn) {
        setLoginSuccess(true);
        setPendingCheckout(takeCheckoutIntent());
      } else {
        // Abgebrochene/fehlgeschlagene Anmeldung: die gemerkte Absicht muss
        // weg, sonst spraenge der Wizard beim naechsten Login unerwartet auf.
        takeCheckoutIntent();
      }
    }
    const tokenFromLink = url.searchParams.get("reset_token");
    if (tokenFromLink) {
      url.searchParams.delete("reset_token");
      window.history.replaceState({}, "", url.toString());
      setResetToken(tokenFromLink);
    }
    refresh();
  }, [refresh, broadcastIsPro]);

  // Google/Apple bleiben Browser-Redirect-Flows (10.0: "PWA-weites Rough
  // Edge", akzeptiert) - kein Bearer-Token-Pfad dafuer in dieser Runde, siehe
  // routes/auth.ts. Fuer eine native Huelle (Phase D) braeuchte das eigene
  // native Sign-in-Plugins statt des Web-OAuth-Redirects.
  const startGoogleLogin = useCallback((plan) => {
    rememberCheckoutIntent(plan);
    window.location.href = apiV1("/auth/google/start");
  }, []);

  const startAppleLogin = useCallback((plan) => {
    rememberCheckoutIntent(plan);
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

  // E-Mail + Passwort (Ergaenzung 04.08., fuenfter Login-/Registrierungsweg,
  // Spec 4.4). Registrierung legt das Konto sofort mit password_hash an,
  // email_verified_at bleibt bis zum Klick auf den Bestaetigungslink NULL -
  // kein automatisches refresh()/Login hier, das passiert erst nach der
  // Bestaetigung (Worker setzt dabei direkt den Session-Cookie und leitet mit
  // login_success=1 zurueck, siehe redirect-Handling oben).
  const registerWithPassword = useCallback(
    async (email, password, acceptedTerms, name, turnstileToken = "") => {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, acceptedTerms, name, turnstileToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true };
      if (res.status === 409) return { ok: false, error: "email_taken", providers: body.providers || [] };
      if (res.status === 429) return { ok: false, error: "rate_limited" };
      // 403: Turnstile hat abgelehnt (bot_check_failed).
      if (res.status === 403) return { ok: false, error: "bot_check_failed" };
      return { ok: false, error: body.error || "invalid" };
    },
    [],
  );

  const resendVerification = useCallback(async (email) => {
    const res = await apiFetch("/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) return { ok: false, error: "rate_limited" };
    return { ok: true };
  }, []);

  const loginWithPassword = useCallback(
    async (email, password) => {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await refresh();
        // Bugfund 2026-08-11: bisher loeste NUR der Redirect-Rueckweg (OAuth/
        // Magic-Link/E-Mail-Bestaetigung) loginSuccess aus - Passwort-Login
        // (kein Redirect, laeuft komplett im Wizard) zeigte dadurch ueberhaupt
        // keine Willkommens-Rueckmeldung.
        setLoginSuccess(true);
        return { ok: true };
      }
      if (res.status === 423) return { ok: false, error: "locked", retryAfterSeconds: body.retryAfterSeconds };
      if (res.status === 403) return { ok: false, error: "email_not_verified" };
      // L3 (Spec-v3.0 Kap. 2.4): Konto existiert, wurde aber ueber Google/
      // Apple/Passkey angelegt - kein "Passwort verknuepfen"-Angebot mehr
      // (Kap. 0.1), nur der Hinweis auf die richtige Methode.
      if (res.status === 401 && body.error === "oauth_only") {
        return { ok: false, error: "oauth_only", providers: body.providers || [] };
      }
      return { ok: false, error: body.error || "invalid_credentials", warn: Boolean(body.warn) };
    },
    [refresh],
  );

  const requestPasswordReset = useCallback(async (email) => {
    await apiFetch("/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    // Immer {ok:true} (4.13, neutrale Antwort unabhaengig von Konto-Existenz).
    return { ok: true };
  }, []);

  const confirmPasswordReset = useCallback(async (token, newPassword) => {
    const res = await apiFetch("/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    if (res.ok) {
      setResetToken(null);
      return { ok: true };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "invalid_or_expired" };
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
    // Gleicher Bugfund wie bei loginWithPassword: kein Redirect, also ohne
    // dies keine Willkommens-Rueckmeldung.
    setLoginSuccess(true);
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

  const dismissLoginSuccess = useCallback(() => setLoginSuccess(false), []);
  const dismissPurchaseSuccess = useCallback(() => setPurchaseSuccess(false), []);
  const dismissAccountDeleted = useCallback(() => setAccountDeleted(false), []);
  // Wird aufgerufen, sobald die wiederaufgenommene Kaufabsicht eingeloest
  // (Wizard geoeffnet) oder verworfen wurde (Wizard geschlossen).
  const clearPendingCheckout = useCallback(() => setPendingCheckout(null), []);

  // Bugreport 07.08. ("Abmelden nicht möglich"): ohne try/catch bricht diese
  // Funktion bei JEDEM Netzwerkfehler (Timeout, kurzer Offline-Moment, CORS)
  // komplett ab, BEVOR setMe(null) ueberhaupt laeuft - der Klick auf
  // "Abmelden" wirkte dann nach aussen wie gar nicht angekommen, ohne
  // jegliche Fehlermeldung. Der lokale Logout (setMe(null)) laeuft jetzt in
  // jedem Fall, der Server-Call ist Best-Effort - der Nutzer sieht sich
  // sofort abgemeldet, auch wenn die Session serverseitig erst mit der
  // naechsten Anfrage oder durch Ablauf endet.
  const logout = useCallback(async () => {
    let ok = true;
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[account] logout fehlgeschlagen:", err);
      ok = false;
    }
    await clearNativeToken().catch(() => {});
    setMe(null);
    broadcastIsPro(false);
    return { ok };
  }, [broadcastIsPro]);

  const logoutAllDevices = useCallback(async () => {
    let ok = true;
    try {
      await apiFetch("/auth/logout-all", { method: "POST" });
    } catch (err) {
      console.error("[account] logout-all fehlgeschlagen:", err);
      ok = false;
    }
    await clearNativeToken().catch(() => {});
    setMe(null);
    broadcastIsPro(false);
    return { ok };
  }, [broadcastIsPro]);

  // Stripe-Checkout: erzeugt server-seitig eine Subscription mit offenem
  // PaymentIntent und liefert dessen clientSecret zurueck - PaymentStep.jsx
  // baut daraus das eingebettete Stripe Payment Element und ruft
  // stripe.confirmPayment() selbst auf (kein serverseitig geoeffnetes
  // Fremd-Overlay mehr wie zuvor bei Paddle).
  // discountCode optional (Stufe F, Nutzer-Konzept 2026-08-11) - wird
  // server-seitig gegen Stripe aufgeloest, siehe routes/billing.ts.
  // billingAddress (Bugreport 26.08.: die Rechnung zeigte bisher nur die
  // E-Mail-Adresse) landet auf dem Stripe-Kunden, siehe
  // worker/src/stripe/checkout.ts/findOrCreateCustomer.
  const startCheckout = useCallback(async (plan, discountCode, billingAddress) => {
    const res = await apiFetch("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        ...(discountCode ? { discountCode } : {}),
        ...(billingAddress ? { address: billingAddress } : {}),
      }),
    });
    if (!res.ok) {
      // Guard Kap. 3.0 (Spec-v3.0): eigener Fehlercode, damit PaymentStep
      // statt der generischen Fehlermeldung den Verifizierungs-Blocker mit
      // "erneut senden"-Button zeigen kann.
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "email_not_verified") throw new Error("email_not_verified");
      }
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "invalid_discount_code") throw new Error("invalid_discount_code");
      }
      // Unterscheidbar machen (Bugreport 05.08.): vorher warf jeder Fehlerpfad
      // dieselbe Meldung, und die Oberflaeche zeigte pauschal den
      // Adblocker-Hinweis - auch dann, wenn der Server mit 502
      // `stripe_not_configured` antwortete und Stripe.js nie geladen wurde.
      // "checkout_unavailable" heisst: serverseitig nicht moeglich (Stripe
      // nicht eingerichtet oder API-Fehler), NICHT clientseitig blockiert.
      throw new Error("checkout_unavailable");
    }
    return res.json(); // { clientSecret }
  }, []);

  // openBillingPortal() ist am 2026-08-20 entfallen (Nutzer-Entscheidung):
  // im Kundenportal liessen sich neben der Zahlungsart auch Kuendigung und
  // Rechnungsdaten aendern - Wege, die es hier bereits gibt bzw. die bewusst
  // nicht selbstbedient sein sollen. Die Worker-Route /billing/portal bleibt
  // bestehen (von der e2e-Suite abgedeckt), hat aber keine Bedienoberflaeche
  // mehr.

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

  // Tarifwechsel monatlich <-> jaehrlich (Phase 2). Der neue Plan landet
  // NICHT synchron in D1 - Stripe bestaetigt den Wechsel per
  // customer.subscription.updated-Webhook (siehe routes/billing.ts), der die
  // einzige Schreibquelle bleibt. Deshalb derselbe Doppel-Refresh wie nach
  // dem Checkout: einer sofort, einer verzoegert, falls der Webhook noch
  // laeuft.
  const changePlan = useCallback(
    async (plan) => {
      const res = await apiFetch("/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.error || "change_plan_failed" };
      }
      await refresh();
      setTimeout(() => refresh(), 1500);
      return { ok: true };
    },
    [refresh],
  );

  // Rechnungen kommen direkt von Stripe Invoicing - bewusst kein State im
  // Hook, die Liste ist nur solange relevant, wie der Rechnungs-Bereich
  // offen ist.
  const listInvoices = useCallback(async () => {
    const res = await apiFetch("/billing/invoices");
    if (!res.ok) throw new Error("invoices_failed");
    const { invoices } = await res.json();
    return invoices || [];
  }, []);

  // Die PDF-URL ist kurzlebig und signiert, wird deshalb bei jedem Klick
  // frisch geholt statt mit der Liste zwischengespeichert.
  const openInvoicePdf = useCallback(async (invoiceId) => {
    const res = await apiFetch(`/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`);
    if (!res.ok) throw new Error("invoice_pdf_failed");
    const { url } = await res.json();
    window.open(url, "_blank");
  }, []);

  const changeEmail = useCallback(async (newEmail) => {
    const res = await apiFetch("/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });
    return res.ok;
  }, []);

  // Direkt statt Double-Opt-In wie changeEmail: Name ist kein
  // sicherheitskritisches Feld (Konzept-Dok 1.6/3.3/8.8).
  const changeName = useCallback(async (newName) => {
    const res = await apiFetch("/account/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      refresh();
      return { ok: true };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "invalid_name" };
  }, [refresh]);

  // Login-/Test-Flow (Stufe A/B, Nutzer-Konzept 2026-08-11; seit 2026-08-18
  // pro Rechner statt kombiniert, Nutzer-Vorgabe): wird von CalculatorTrialGate
  // genau einmal je Rechner aufgerufen, sobald dieser Rechner offen ist und
  // Ergebnisse gezeigt hat - erhoeht den Zaehler fuer GENAU diesen Rechner.
  // Der refresh() danach spiegelt den neuen Stand in account.me fuer alle
  // NEUEN Gate-Mounts, ohne die gerade laufende Session zu unterbrechen.
  const consumeCalculatorTrial = useCallback(
    async (rechner) => {
      try {
        await apiFetch("/calculator-trial/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rechner }),
        });
      } catch (err) {
        console.error("[account] calculator-trial/consume fehlgeschlagen:", err);
      }
      await refresh();
    },
    [refresh],
  );

  // Passwort aendern bzw. erstmalig setzen (Phase 2, 4.13). currentPassword
  // ist nur Pflicht, wenn das Konto bereits eines hat - reine OAuth-/Passkey-
  // Konten setzen ihr erstes Passwort ohne. Welcher Fall vorliegt, verraet
  // /me nicht, deshalb entscheidet der Server: "current_password_required"
  // ist die Aufforderung an die Oberflaeche, das Feld nachzureichen.
  const changePassword = useCallback(async (newPassword, currentPassword) => {
    const res = await apiFetch("/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentPassword ? { currentPassword, newPassword } : { newPassword }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "password_change_failed" };
  }, []);

  // Aktive Sitzungen (nur Anzeige) - einzelne Geraete lassen sich serverseitig
  // nicht gezielt abmelden, dafuer gibt es weiterhin nur logoutAllDevices.
  const listDevices = useCallback(async () => {
    const res = await apiFetch("/account/devices");
    if (!res.ok) throw new Error("devices_failed");
    const { sessions } = await res.json();
    return sessions || [];
  }, []);

  const setMarketingEmailsEnabled = useCallback(async (enabled) => {
    const res = await apiFetch("/account/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingEmailsEnabled: enabled }),
    });
    if (res.ok) await refresh();
    return { ok: res.ok };
  }, [refresh]);

  const exportData = useCallback(() => {
    // Direkter Download-Link statt fetch+Blob - der Browser uebernimmt den
    // Dateinamen aus Content-Disposition, kein zusaetzlicher Code noetig.
    window.open(apiV1("/account/export"), "_blank");
  }, []);

  // D2 (Spec-v3.0 Kap. 4.5): Passwort-Konten bestaetigen hier direkt,
  // OAuth-Konten muessen stattdessen ueber startDeleteReauth(provider) einen
  // frischen Google/Apple-Login durchlaufen (siehe unten).
  const deleteAccount = useCallback(async (currentPassword) => {
    const res = await apiFetch("/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentPassword ? { currentPassword } : {}),
    });
    if (res.ok) {
      await clearNativeToken();
      setMe(null);
      broadcastIsPro(false);
      return { ok: true };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || "delete_failed" };
  }, [broadcastIsPro]);

  // Fuehrt zur Google/Apple-Anmeldung, kehrt aber NICHT als Login zurueck,
  // sondern loescht bei Erfolg das Konto (siehe routes/auth.ts,
  // /delete-reauth/{provider}) - vollstaendiger Seitenwechsel wie beim
  // regulaeren OAuth-Login.
  const startDeleteReauth = useCallback((provider) => {
    window.location.href = apiV1(`/auth/delete-reauth/${provider}`);
  }, []);

  return {
    loading,
    me,
    isLoggedIn: Boolean(me),
    isPro: Boolean(me?.isPro),
    // Zugangsstufe und Testphase (Preispolitik 2026-08-20). `zugang` ist
    // "pro" | "trial" | "keiner" - isPro allein kann die Testphase nicht
    // ausdruecken, die dieselben Funktionen mit kleineren Kontingenten hat.
    zugang: me?.zugang || "keiner",
    trial: me?.trial || null,
    consumeCalculatorTrial,
    error,
    oauthEmailTakenProviders,
    resetToken,
    loginSuccess,
    purchaseSuccess,
    accountDeleted,
    dismissLoginSuccess,
    dismissPurchaseSuccess,
    dismissAccountDeleted,
    pendingCheckout,
    clearPendingCheckout,
    refresh,
    startGoogleLogin,
    startAppleLogin,
    requestMagicLink,
    registerWithPassword,
    resendVerification,
    loginWithPassword,
    requestPasswordReset,
    confirmPasswordReset,
    passkeyLogin,
    passkeyRegister,
    logout,
    logoutAllDevices,
    startCheckout,
    cancelSubscription,
    reactivateSubscription,
    refundSubscription,
    changePlan,
    listInvoices,
    openInvoicePdf,
    changeEmail,
    changeName,
    changePassword,
    listDevices,
    setMarketingEmailsEnabled,
    exportData,
    deleteAccount,
    startDeleteReauth,
    apiBase,
  };
}
