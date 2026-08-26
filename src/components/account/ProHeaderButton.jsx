import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { lazyWithReload } from "../../utils/lazyRetry.js";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { LoginSuccessToast } from "./LoginSuccessToast.jsx";
import { AccountAvatarButton, AccountMenu } from "./AccountMenu.jsx";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";

// Lazy statt statischem Import (Befund 2026-08-18, siehe release-notes.txt) -
// ProHeaderButton haengt fest in der Kopfzeile jeder Seite, CheckoutWizard/
// MyAccount aber nur bei openMode !== null tatsaechlich sichtbar.
const CheckoutWizard = lazyWithReload(
  () => import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
  "CheckoutWizard",
);
const MyAccount = lazyWithReload(
  () => import("./MyAccount.jsx").then((m) => ({ default: m.MyAccount })),
  "MyAccount",
);

// Einstiegspunkt in der Logo-Kopfzeile (Spec 4.3, korrigiert gegenueber v1:
// NICHT in Statusleiste.jsx). Label "Pro" mit Kroenchen-Icon, Fuchs-Orange.
// Jeder eingeloggte Nutzer (Free UND Pro) landet in "Mein Konto" (Wireframe
// 14.2: zentrale Anlaufstelle fuer E-Mail-Aenderung, Datenexport,
// Kontoloeschung - keine Pro-exklusiven Aktionen). Nur nicht eingeloggte
// Nutzer sehen den Login-/Vergleichs-Flow. Vorher faelschlich an isPro
// geknuepft (Bugreport 06.08.): Free-Nutzer hatten dadurch ueberhaupt keinen
// Zugang zu "Mein Konto" und landeten stattdessen zwangsweise in der
// Plan-Auswahl.
//
// Diese Komponente ist zusaetzlich der Ort, an dem Rueckkehrer aus einem
// Redirect abgefangen werden: sie haengt fest in der Kopfzeile (App.jsx) und
// ist damit unabhaengig davon montiert, von welchem Einstiegspunkt aus der
// Nutzer den Wizard urspruenglich geoeffnet hatte.
export function ProHeaderButton() {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  // Was geoeffnet ist, wird beim Oeffnen einmal festgelegt und NICHT bei jedem
  // Render neu aus isLoggedIn abgeleitet (Befund 06.08.): vorher entschied ein
  // Ternaer im Render darueber, wodurch die Anmeldung mitten im Kauf die
  // Flaeche unter dem Nutzer austauschte - aus dem Checkout-Wizard wurde
  // schlagartig "Mein Konto", der begonnene Kauf war weg. Ein Ablauf darf
  // nicht dadurch enden, dass sein Zwischenziel (Login) erreicht wurde.
  const [openMode, setOpenMode] = useState(null); // null | "checkout" | "login" | "account"
  const [menuOpen, setMenuOpen] = useState(false);
  // Welcher Bereich beim Oeffnen von "Mein Konto" gezeigt wird - kommt aus
  // dem Kontomenue (Nutzer-Entwurf 2026-08-12).
  const [sectionKey, setSectionKey] = useState("profil");
  const avatarRef = useRef(null);

  // Passwort-Reset-Link (?reset_token=..., Ergaenzung 04.08.) muss die Maske
  // von selbst oeffnen - anders als bei OAuth gibt es hier keinen Weg, den
  // Screen ohne Nutzereingabe (neues Passwort) abzuschliessen.
  useEffect(() => {
    if (account?.resetToken) setOpenMode("checkout");
  }, [account?.resetToken]);

  // Wiederaufnahme nach Google-/Apple-Login (Bugreport 06.08.): der Nutzer
  // hatte den Kauf begonnen, wurde zum Anbieter geschickt und landete
  // anschliessend wieder auf dem Ausgangsbildschirm - ohne Bestaetigung und
  // ohne seine Planauswahl. Jetzt oeffnet sich der Wizard direkt beim
  // Zahlungsschritt weiter, dessen Kopf bereits "✓ Angemeldet als ..." zeigt.
  // Bewusst nur fuer Free-Nutzer: wer bereits Pro ist, hat nichts zu kaufen
  // und bekommt nur die Bestaetigungs-Einblendung.
  const resumesCheckout = Boolean(account?.pendingCheckout) && account?.isLoggedIn && !account?.isPro;
  const { dismissLoginSuccess } = account || {};
  useEffect(() => {
    if (!resumesCheckout) return;
    setOpenMode("checkout");
    // Der Zahlungsschritt bestaetigt die Anmeldung selbst - eine zusaetzliche
    // Einblendung darueber waere doppelt.
    dismissLoginSuccess?.();
  }, [resumesCheckout, dismissLoginSuccess]);

  const handleClose = useCallback(() => {
    setOpenMode(null);
    account?.clearPendingCheckout?.();
  }, [account]);

  if (!account || account.loading) return null;

  return (
    <>
      {/* Nutzer-Entwurf 2026-08-12: Eingeloggte sehen den Avatar mit Namen,
          der ein Menue oeffnet; erst die Auswahl darin fuehrt in den
          passenden Bereich von "Mein Konto". Vorher landete jeder Klick auf
          "Profil" - jeder andere Bereich kostete zwei zusaetzliche Klicks.
          Ausgeloggte behalten den schlichten "Anmelden"-Knopf: fuer sie gibt
          es weder Avatar noch Bereiche.
          Der Tarif-Chip sitzt jetzt im Avatar-Knopf (nur Desktop) statt
          davor - auf 375px waere er neben Logo und Sprachwahl wieder zu
          breit (bekannter Ueberlauf-Fehler, siehe .hdr-Regeln in App.jsx). */}
      {account.isLoggedIn ? (
        <AccountAvatarButton
          t={t}
          me={account.me}
          open={menuOpen}
          onToggle={() => setMenuOpen((o) => !o)}
          innerRef={avatarRef}
          showChip
        />
      ) : (
        <button
          onClick={() => setOpenMode("login")}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "7px 11px",
            border: "1px solid var(--ca-bd)",
            borderRadius: 8,
            // Weiss statt --ca-bg (S2-5): --ca-dk auf --ca-bg landet bei
            // ~4.28:1 Kontrast, knapp unter der WCAG-AA-Grenze (4.5:1) fuer
            // diese Schriftgroesse. Auf Weiss liegt --ca-dk bei ~4.76:1.
            background: "var(--cc)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ca-dk)",
            minHeight: 38,
          }}
        >
          {t.loginSubmit}
        </button>
      )}
      {/* Immer gemountet statt `{menuOpen && ...}` - `open` steuert die
          Sichtbarkeit, nur so kann die Ausstiegs-Animation ablaufen (siehe
          Sheet.jsx). Seit der Neugestaltung 2026-08-17 EINE Komponente fuer
          beide Groessen: AccountMenu waehlt selbst zwischen angedocktem
          Popover (Browser) und Sheet von unten (Handy). Vorher stand hier
          eine Verzweigung auf ein zweites, eigenstaendiges Vollbildmenue. */}
      <AccountMenu
        t={t}
        me={account.me}
        lang={lang}
        open={menuOpen}
        anchorRef={avatarRef}
        onClose={() => setMenuOpen(false)}
        onSelect={(key) => {
          setMenuOpen(false);
          setSectionKey(key);
          setOpenMode("account");
        }}
        onLogout={async () => {
          setMenuOpen(false);
          await account.logout();
        }}
      />
      {account.loginSuccess && (
        <LoginSuccessToast
          t={t}
          name={account.me?.name}
          email={account.me?.email}
          onDone={account.dismissLoginSuccess}
        />
      )}
      {account.accountDeleted && (
        <LoginSuccessToast
          t={t}
          message={t.accountDeletedToast}
          onDone={account.dismissAccountDeleted}
        />
      )}
      {/* Sicherheitsnetz fuer den Kauf-Abschluss (Bugreport 26.08.): reagiert
          auf den tatsaechlichen Pro-Status statt auf ein einzelnes
          Client-Event, das gelegentlich ausbleibt - siehe useAccount.js,
          noteProStatus. Zeigt die Bestaetigung also auch dann, wenn
          CheckoutWizard/WelcomeStep davon nichts mitbekommen haben und der
          Nutzer kommentarlos auf seiner vorherigen Seite landet. */}
      {account.purchaseSuccess && (
        <LoginSuccessToast
          t={t}
          message={t.purchaseSuccessToast}
          onDone={account.dismissPurchaseSuccess}
        />
      )}
      {(openMode === "account" || openMode === "login" || openMode === "checkout") && (
        <Suspense fallback={<LazyPanelFallback />}>
          {openMode === "account" && (
            <MyAccount
              onClose={handleClose}
              // Handy: ← fuehrt zurueck ins Menue statt raus in die App
              // (Nutzer-Korrektur 2026-08-13) - Bereich → ← → Menue → ✕ → App.
              onBackToMenu={() => {
                setOpenMode(null);
                setMenuOpen(true);
              }}
              initialSection={sectionKey}
            />
          )}
          {openMode === "login" && <CheckoutWizard onClose={handleClose} entryPoint="login" />}
          {openMode === "checkout" &&
            (resumesCheckout ? (
              <CheckoutWizard
                onClose={handleClose}
                entryPoint="payment"
                initialPlan={account.pendingCheckout?.plan}
              />
            ) : (
              <CheckoutWizard onClose={handleClose} />
            ))}
        </Suspense>
      )}
    </>
  );
}
