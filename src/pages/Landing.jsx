import { useRef, useState, Suspense } from "react";
import { lazyWithReload } from "../utils/lazyRetry.js";
import { TL } from "../i18n/translations.js";
import { MARKET_RATES } from "../data.js";
import { LANG_LOCALE } from "../utils/helpers.js";
import { LangSel } from "../components/ui/LangSel.jsx";
import { ZinsAlarm } from "../components/shell/ZinsAlarm.jsx";
import { LandingMascot } from "../components/assistant/LandingMascot.jsx";
import { useAccountCtx } from "../context/AccountContext.jsx";
import { useAnyWizardOpen } from "../components/checkout/wizardPresence.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { Ctx } from "../context/AppContext.jsx";
import { ACCOUNT_T } from "../i18n/account.js";
import { PricingSection } from "../components/checkout/PricingSection.jsx";

// Lazy statt statischem Import (Befund 2026-08-18: der Landing-Page-Bundle
// riss bei manchen Verbindungen mitten in der Auslieferung ab, vermutlich
// Groessen-/Uebertragungs-Problem bei sehr grossen komprimierten Antworten -
// siehe release-notes.txt). CheckoutWizard/MyAccount (inkl. dem darin
// verschachtelten Admin-Bereich) werden erst geladen, wenn openMode das
// tatsaechlich braucht - auf der reinen Landingpage (openMode === null)
// vorher nie gerendert, gehoeren also nicht ins initiale Bundle.
const CheckoutWizard = lazyWithReload(
  () =>
    import("../components/checkout/CheckoutWizard.jsx").then((m) => ({
      default: m.CheckoutWizard,
    })),
  "CheckoutWizard",
);
const MyAccount = lazyWithReload(
  () => import("../components/account/MyAccount.jsx").then((m) => ({ default: m.MyAccount })),
  "MyAccount",
);
// Die Kauf-Bestaetigung muss es auch hier geben (Bugreport 2026-08-27): wer
// den Kauf von dieser Seite aus abschliesst, OHNE dass eine Zahlungsart die
// Seite verlaesst (Karte ohne 3D Secure), bleibt genau hier - und der
// ProHeaderButton, der die Bestaetigung sonst rendert, existiert nur im
// App-Shell. Fuer den Redirect-Weg sorgt zusaetzlich hasAuthRedirectParam()
// in App.jsx dafuer, dass die Rueckkehr direkt im App-Shell landet.
const PurchaseConfirmModal = lazyWithReload(
  () =>
    import("../components/checkout/PurchaseConfirmModal.jsx").then((m) => ({
      default: m.PurchaseConfirmModal,
    })),
  "PurchaseConfirmModal",
);
import { LoginSuccessToast } from "../components/account/LoginSuccessToast.jsx";
import { AccountAvatarButton, AccountMenu } from "../components/account/AccountMenu.jsx";
import { HeaderMenu } from "../components/account/HeaderMenu.jsx";
import { IconMenu } from "../components/account/accountIcons.jsx";
import { useSavedObjects } from "../components/shell/Merkliste.jsx";
import { LazyPanelFallback } from "../components/ui/LazyPanelFallback.jsx";

const navLink = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--cl)",
  padding: "6px 0",
  letterSpacing: 0.1,
  transition: "color .15s",
};
export function Landing({ onStart, zinsen, lang, setLang }) {
  const l = TL[lang] || TL.de;
  const at = ACCOUNT_T[lang] || ACCOUNT_T.de;
  // Login-Standard-Flow (Konzept-Dok Abschnitt 2/1.5): "Anmelden" ist bereits
  // auf der Landingpage sichtbar, statt erst beim Klick in einen Rechner.
  // AccountProvider sitzt seit dieser Aenderung in main.jsx (ausserhalb von
  // App()), daher hier direkt per Context verfuegbar, ohne Prop-Drilling.
  const account = useAccountCtx();
  // Der Wizard wird auch von dieser Seite aus gemountet - waehrend er laeuft,
  // bleibt die eigenstaendige Kauf-Bestaetigung zu (er zeigt seine eigene).
  const anyWizardOpen = useAnyWizardOpen();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/logo-wordmark-dark.png" : "/logo-wordmark.png";
  const [openMode, setOpenMode] = useState(null); // null | "checkout" | "login" | "account"
  // Laufzeit, die der Besucher in der Preis-Sektion gewaehlt hat
  // (Checkout-Neugestaltung 2026-08-17). Ohne diese Uebergabe muesste er die
  // Wahl im Assistenten sofort ein zweites Mal treffen.
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  // Wieder zwei Zustaende (Neugestaltung 2026-08-17). 2026-08-13 waren sie zu
  // einem verschmolzen worden, weil beide Menues damals dieselbe Komponente
  // oeffneten und sich inhaltlich ueberschnitten. Seit das Kontomenue nur noch
  // Konto-Eintraege enthaelt und die Seiten-Navigation in einer eigenen
  // Schublade liegt, sind es wieder zwei verschiedene Dinge: `menuOpen` der
  // Avatar (Konto), `navOpen` der ☰-Knopf (Seiten-Navigation).
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [sectionKey, setSectionKey] = useState("profil");
  const avatarRef = useRef(null);

  // Bugfix (Nutzer-Feedback 2026-08-11): CheckoutWizard/MyAccount lesen
  // `lang` ueber useApp() aus Ctx (AppContext.jsx) - der existiert bisher
  // nur innerhalb von AppProviders im "landed"-Zustand. Auf der Landingpage
  // (!landed) gab es dafuer KEINEN Provider, useApp() lieferte `undefined`
  // und das Destructuring "{ lang } = useApp()" stuerzte beim Oeffnen ab
  // ("Cannot destructure property 'lang' of '_e(...)' as it is undefined").
  // KontoSection (ein Tab innerhalb von MyAccount) braucht zusaetzlich
  // savedList/isProSavedObjects/savedObjectsFreeLimit/setTabExt aus
  // demselben Ctx - useSavedObjects() ist bewusst so gebaut, dass es auch
  // ausserhalb von AppProviders aufgerufen werden kann (siehe Kommentar
  // dort), liefert hier also echte, funktionierende Werte statt Dummies.
  // setTabExt fuehrt hier in die App hinein (onStart), statt nur einen
  // App-internen Tab zu wechseln, den es auf der Landingpage nicht gibt.
  const {
    savedList,
    isPro: isProSavedObjects,
    freeLimit: savedObjectsFreeLimit,
  } = useSavedObjects();
  const landingCtxValue = {
    lang,
    setLang,
    savedList,
    isProSavedObjects,
    savedObjectsFreeLimit,
    setTabExt: (id) => onStart(id),
  };

  // Bugfix 2026-08-18 ("Links im Menü funktionieren nicht"): aus der
  // Seiten-Navigation in der Schublade (Sheet variant="left") heraus
  // aufgerufen, scrollte diese Funktion sofort - aber useScrollLock haelt
  // <body> waehrend der Schublade offen ist auf position:fixed, ein Scroll
  // schlaegt in diesem Zustand ins Leere. Schliesst die Schublade danach UND
  // stellt beim Entsperren die scrollY-Position von VOR dem Oeffnen wieder
  // her (siehe Sheet.jsx/useScrollLock.js) - das hat den Scroll-Versuch also
  // zusaetzlich rueckgaengig gemacht, sobald die Schliess-Animation fertig
  // war. Kommt der Aufruf aus einer offenen Schublade, deshalb erst
  // schliessen und NACH der Ausstiegs-Animation scrollen. 300ms erwiesen
  // sich per Live-Messung (window.scrollTo-Aufrufe mit Zeitstempel
  // protokolliert) als zu knapp: Sheet.jsx schliesst nach MOTION_MS.left=
  // 260ms, der Entsperren-Restore feuerte dabei ~1ms NACH diesem Scroll und
  // hat ihn wieder auf 0 zurueckgesetzt - 500ms lassen sicheren Abstand.
  // Direkt von der Kopfzeile aus (keine Schublade offen) bleibt es beim
  // sofortigen Scroll, damit Desktop-Klicks nicht unnoetig verzoegert werden.
  const scrollTo = (id) => {
    const wasInSheet = menuOpen || navOpen;
    setMenuOpen(false);
    setNavOpen(false);
    const doScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    };
    if (wasInSheet) {
      setTimeout(doScroll, 500);
    } else {
      doScroll();
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        fontFamily: "'DM Sans',sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingTop: "calc(80px + env(safe-area-inset-top))",
        overflowX: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {/* ═══════════ STICKY HEADER WITH NAV + CTA ═══════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--hdr-bg)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--cb)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div
          className="lp-hdr-inner"
          style={{
            // Nutzer-Feedback 2026-08-10: maxWidth/Padding jetzt identisch zu
            // .hdr-inner in App.jsx (dort 1400px + 14/28/40px je Breakpoint) -
            // vorher 1280px + fix 24px, dadurch war der seitliche Abstand auf
            // der Landingpage auf breiten Screens sichtbar groesser als bei
            // den Rechnern. Horizontales Padding kommt aus der
            // .lp-hdr-inner-Regel unten (responsiv) - hier NUR vertikal per
            // paddingTop/Bottom (Bugreport 2026-08-11: die vorherige
            // padding:"14px 0"-Kurzschreibweise setzte links/rechts explizit
            // auf 0 und ueberschrieb damit die Klassenregel, da Inline-Styles
            // jede externe/embedded CSS-Regel schlagen - Logo/Menue sassen
            // dadurch buendig am Rand statt eingerueckt wie der uebrige Inhalt).
            maxWidth: 1400,
            margin: "0 auto",
            paddingTop: 14,
            paddingBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            {/* Einheitliche Logogroesse mit App-/Kontokopf (Nutzer-Korrektur
                2026-08-14): vorher schrumpfte die Wortmarke bei ≤880px auf
                36px/16px wegen Platzmangels neben Konto-/Menü-Button
                (Nutzer-Feedback 2026-08-11) - der Knopf-Bereich bekommt den
                noetigen Platz jetzt stattdessen ueber .lp-hdr-inner-Gap bzw.
                die eigene .lp-account-btn-Verkleinerung weiter unten.
                Seit 2026-08-20 ein Schriftzug-Bild statt Icon + HTML-Text
                (app-weit ein Logo-File, siehe BrandIcon.jsx). */}
            <img
              src={logoSrc}
              alt="immofuchs.info"
              className="lp-logo-icon"
              style={{
                height: 56,
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          </button>

          {/* Desktop Nav */}
          <nav className="lp-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <button onClick={() => scrollTo("rechner")} style={navLink}>
              {l.navRechner}
            </button>
            <button onClick={() => scrollTo("preise")} style={navLink}>
              {l.navPreise}
            </button>
            <button onClick={() => scrollTo("funktioniert")} style={navLink}>
              {l.navHow}
            </button>
            <button onClick={() => scrollTo("zinsen")} style={navLink}>
              {l.navZinsen}
            </button>
          </nav>

          {/* Right side: Anmelden/Mein Konto + lang + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Nutzer-Entwurf 2026-08-12: eingeloggt derselbe Avatar mit
                Kontomenue wie im App-Shell (ProHeaderButton) - eine Aktion,
                ein Aussehen, egal auf welcher Flaeche. Der Tarif-Chip bleibt
                hier bewusst weg (Nutzer-Wunsch: auf der Marketing-Seite
                nicht noetig) - zusammen mit der langen Beschriftung war er
                die Ursache des abgeschnittenen Menue-Knopfs. */}
            {account && !account.initialLoading && account.isLoggedIn && (
              <AccountAvatarButton
                t={at}
                me={account.me}
                open={menuOpen}
                onToggle={() => setMenuOpen((o) => !o)}
                innerRef={avatarRef}
              />
            )}
            {account && !account.initialLoading && !account.isLoggedIn && (
              <button
                onClick={() => setOpenMode("login")}
                className="lp-account-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 14px",
                  background: "transparent",
                  color: "var(--ct)",
                  border: "1px solid var(--cb)",
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {at.loginSubmit}
              </button>
            )}
            {/* Immer gemountet statt `{menuOpen && ...}` - `open` steuert
                die Sichtbarkeit, nur so kann die Ausstiegs-Animation ablaufen
                (siehe Sheet.jsx). Seit der Neugestaltung 2026-08-17 EINE
                Komponente fuer beide Groessen; sie waehlt selbst zwischen
                angedocktem Popover und Sheet von unten. Die Seiten-Navigation
                liegt seither in der eigenen Schublade am ☰-Knopf, nicht mehr
                im selben Menue - zwei verschiedene Dinge, zwei Trigger. */}
            {account?.isLoggedIn && (
              <AccountMenu
                t={at}
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
            )}
            <HeaderMenu
              t={at}
              open={navOpen}
              isLoggedIn={Boolean(account?.isLoggedIn)}
              onClose={() => setNavOpen(false)}
              onLogoClick={() => {
                setNavOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              navItems={[
                { key: "rechner", label: l.navRechner, onSelect: () => scrollTo("rechner") },
                { key: "preise", label: l.navPreise, onSelect: () => scrollTo("preise") },
                { key: "funktioniert", label: l.navHow, onSelect: () => scrollTo("funktioniert") },
                { key: "zinsen", label: l.navZinsen, onSelect: () => scrollTo("zinsen") },
              ]}
              langSelector={<LangSel lang={lang} setLang={setLang} />}
              onLogin={() => {
                setNavOpen(false);
                setOpenMode("login");
              }}
            />
            {/* Nutzer-Feedback 2026-08-11 (Screenshot): Sprachwahl + Menü-
                Button ragten bei ≤880px zusammen mit Konto-Knopf + Logo
                ueber den Viewport hinaus (kein Umbruch, keine Kuerzung) -
                bei 375px lagen beide bereits jenseits x=375, also komplett
                unsichtbar/unerreichbar. Fix: Sprachwahl zieht bei ≤880px in
                die Mobile-Schublade um (siehe unten), hier nur noch auf
                breiteren Screens sichtbar (.lp-langsel-top-Regel unten). */}
            {/* Nutzer-Vorgabe 2026-08-12: fuer Eingeloggte liegt die
                Sprachwahl ausschliesslich in "Einstellungen". Nicht
                eingeloggte Besucher behalten sie hier - fuer die gibt es
                diesen Bereich nicht. */}
            {!account?.isLoggedIn && (
              <div className="lp-langsel-top">
                <LangSel lang={lang} setLang={setLang} />
              </div>
            )}
            {/* REQ-LP-01 (Nutzer-Konzept 2026-08-11): "Jetzt rechnen" nur fuer
                eingeloggte Nutzer sichtbar - nicht eingeloggte sehen bereits
                den "Anmelden"-Knopf oben, ein zweiter waere redundant. Die
                serverseitige Durchsetzung uebernehmen ohnehin requireAuth +
                CalculatorTrialGate, unabhaengig von dieser reinen UI-Sichtbarkeit. */}
            {account?.isLoggedIn && (
              <button
                onClick={() => scrollTo("rechner")}
                className="lp-cta"
                style={{
                  padding: "10px 18px",
                  background: "var(--ca)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(232,96,10,.25)",
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                }}
              >
                {l.heroCtaPrimary}
              </button>
            )}
            {/* ☰ oeffnet die Seiten-Navigation - jetzt fuer ALLE Besucher
                (Korrektur 2026-08-17). Vorher gab es ihn nur ausgeloggt, weil
                er sich dasselbe Menue mit dem Avatar teilte. Damit war die
                Seiten-Navigation (Rechner / So funktioniert's / Zinsen) fuer
                angemeldete Besucher auf dem Handy ueberhaupt nicht mehr
                erreichbar: die Links im Kopf sind ab 880px ausgeblendet, und
                das Kontomenue des Avatars fuehrt nur in den Kontobereich. */}
            <button
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-label={at.siteNavAria}
              className="lp-burger"
              style={{
                display: "none",
                width: 40,
                height: 40,
                padding: 0,
                background: "none",
                border: "1px solid var(--cb)",
                borderRadius: 8,
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ct)",
              }}
            >
              <IconMenu size={20} />
            </button>
          </div>
        </div>
      </header>

      {(openMode === "checkout" || openMode === "login" || openMode === "account") && (
        <Suspense fallback={<LazyPanelFallback />}>
          <Ctx.Provider value={landingCtxValue}>
            {openMode === "checkout" && (
              <CheckoutWizard
                onClose={() => {
                  setOpenMode(null);
                  setCheckoutPlan(null);
                }}
                initialPlan={checkoutPlan}
              />
            )}
            {/* UX-Audit 2026-08-11 (Punkt 2): Das Login-Ziel haengt bisher von
              der gewaehlten Methode ab. Google/Apple verlassen die Seite und
              kommen mit ?login_success=1 zurueck, worauf App.jsx
              (hasAuthRedirectParam) direkt den App-Shell zeigt - der Nutzer
              landet im Rechner. Passwort/Passkey laufen ohne Redirect, der
              Wizard schliesst sich nur selbst und der Nutzer stand wieder auf
              der Landingpage, wo er "Jetzt rechnen" erst suchen musste.
              Derselbe Vorsatz fuehrte also je nach Anmeldeweg woanders hin,
              entgegen der Vorgabe in App.jsx ("Login landet immer auf dem
              Dashboard, nie zurueck auf S1"). Jetzt fuehren beide Wege in den
              Rechner - bei Abbruch ohne Anmeldung bleibt alles wie gehabt. */}
            {openMode === "login" && (
              <CheckoutWizard
                onClose={() => {
                  setOpenMode(null);
                  if (account?.isLoggedIn) onStart("haupt");
                }}
                entryPoint="login"
              />
            )}
            {openMode === "account" && (
              <MyAccount
                onClose={() => setOpenMode(null)}
                // Handy: ← fuehrt zurueck ins Menue statt raus auf die Seite
                // (Nutzer-Korrektur 2026-08-13) - siehe MyAccount.jsx.
                onBackToMenu={() => {
                  setOpenMode(null);
                  setMenuOpen(true);
                }}
                initialSection={sectionKey}
              />
            )}
          </Ctx.Provider>
        </Suspense>
      )}
      {/* Bugfund 2026-08-11: Passwort-/Passkey-Login ueber "Anmelden" auf
          dieser Seite schliesst den Wizard automatisch und kehrt hierher
          zurueck (kein Redirect wie bei Google/Apple) - ohne diesen Toast
          gab es dafuer bislang KEINE Bestaetigung, da LoginSuccessToast
          vorher nur ueber ProHeaderButton im eingeloggten App-Shell
          gerendert wurde, den es auf der Landingpage gar nicht gibt. */}
      {account?.loginSuccess && (
        <LoginSuccessToast
          t={at}
          name={account.me?.name}
          email={account.me?.email}
          onDone={account.dismissLoginSuccess}
        />
      )}
      {/* Abmelde-Bestaetigung: sichtbar wird sie immer HIER, weil jedes
          Abmelden ueber goHome() auf dieser Seite endet (siehe
          ProHeaderButton.jsx / MyAccount.jsx). */}
      {account?.logoutSuccess && (
        <LoginSuccessToast t={at} message={at.logoutToast} onDone={account.dismissLogoutSuccess} />
      )}
      {/* Nicht, solange der Wizard laeuft - der zeigt seine eigene
          Bestaetigung als letzten Schritt (wizardPresence.js). */}
      {account?.purchaseSuccess && !anyWizardOpen && (
        <Suspense fallback={null}>
          <PurchaseConfirmModal onClose={account.dismissPurchaseSuccess} />
        </Suspense>
      )}

      {/* ═══════════ HERO ═══════════ */}
      <section
        className="lp-container"
        style={{
          // Nutzer-Feedback 2026-08-11: Hero-Kante muss mit Header/anderen
          // Abschnitten fluchten (.lp-container liefert dasselbe
          // max-width:1400px + responsives Padding). Vertikales Padding
          // bleibt inline (Klasse setzt nur horizontal) - siehe .lp-container
          // in der Style-Definition unten. Das eingebettete Bild
          // (finn-expose-tile.webp) nutzt bereits width:100%/height:100%/
          // objectFit:cover ueber den gesamten bisherigen Breiten-Bereich,
          // die zusaetzlichen 120px hier aendern daran nichts Grundsaetzliches.
          paddingTop: "clamp(32px,6vw,80px)",
          paddingBottom: "clamp(32px,5vw,60px)",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))",
            gap: "clamp(28px,5vw,48px)",
            alignItems: "start",
            justifyItems: "center",
          }}
        >
          {/* LEFT: Headline + CTAs */}
          <div style={{ width: "100%" }}>
            <h1
              style={{
                fontSize: "clamp(34px,5vw,56px)",
                fontWeight: 800,
                color: "var(--ct)",
                letterSpacing: -1,
                lineHeight: 1.05,
                margin: "0 0 18px",
              }}
            >
              {l.h1a}
              <span style={{ color: "var(--ca)" }}>{l.h1b}</span>
              {l.h1c}
            </h1>

            <p
              style={{
                fontSize: "clamp(16px,1.6vw,19px)",
                color: "var(--ch)",
                lineHeight: 1.55,
                margin: "0 0 28px",
                maxWidth: 540,
              }}
            >
              {l.subShort}
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
              {/* REQ-LP-01: Hero-Primaer-CTA hat keinen zweiten "Anmelden"-Knopf
                  in der Naehe (anders als der Header) - deshalb hier Label +
                  Aktion tauschen statt nur auszublenden, sonst faehlt
                  nicht eingeloggten Erstbesuchern die primaere Handlung. */}
              <button
                onClick={() => (account?.isLoggedIn ? scrollTo("rechner") : setOpenMode("login"))}
                style={{
                  padding: "14px 26px",
                  background: "var(--ca)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 11,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 8px 20px rgba(232,96,10,.28)",
                  letterSpacing: 0.2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {account?.isLoggedIn ? l.heroCtaPrimary : at.loginSubmit}{" "}
                <span style={{ fontSize: 18, marginTop: -2 }}>→</span>
              </button>
              <button
                onClick={() => scrollTo("funktioniert")}
                style={{
                  padding: "14px 24px",
                  background: "var(--cc)",
                  color: "var(--ct)",
                  border: "1.5px solid var(--cb)",
                  borderRadius: 11,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: 0.2,
                }}
              >
                {l.heroCtaSecondary}
              </button>
            </div>

            {/* Trust element: Datenstand statt statischer Marketing-Badges
                (Konzept-Dok 1.1) - ersetzt die vier alten Badges "100%
                kostenlos"/"In 1 Minute startklar"/"Aktuelle Marktdaten"/
                "KI-Assistent inklusive". Monat/Jahr wird wie zuvor in der
                jetzt entfernten Statusleiste dynamisch berechnet, nicht
                hartkodiert - sonst entsteht exakt das Datumsproblem, das
                Anlass fuer diese Aenderung war. */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 24px",
                fontSize: 13,
                color: "var(--ch)",
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#22c55e",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontWeight: 500, color: "var(--cl)" }}>
                  {l.trust4} · {l.ratesStand}:{" "}
                  {new Date().toLocaleDateString(LANG_LOCALE[lang] || "de-DE", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Browser Mockup (larger, more polished) */}
          <div
            style={{ position: "relative", width: "100%", maxWidth: "100%", overflow: "hidden" }}
          >
            <div
              style={{
                background: "#1a1a1a",
                borderRadius: "14px 14px 0 0",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 30px 60px -10px rgba(0,0,0,.18)",
              }}
            >
              <div style={{ display: "flex", gap: 7 }}>
                <div
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56" }}
                />
                <div
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }}
                />
                <div
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  background: "#2a2a2a",
                  borderRadius: 7,
                  padding: "5px 14px",
                  fontSize: 12,
                  color: "#aaa",
                  textAlign: "center",
                  fontFamily: "'DM Sans',sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#27c93f", fontSize: 10 }}>🔒</span> immofuchs.info
              </div>
            </div>
            <div
              style={{
                background: "var(--cc)",
                borderRadius: "0 0 14px 14px",
                padding: "20px",
                boxShadow: "0 30px 60px -10px rgba(0,0,0,.18)",
                border: "1px solid var(--cb)",
                borderTop: "none",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "var(--ch)",
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {l.mockKauf}
                    </div>
                    <div
                      style={{
                        padding: "9px 12px",
                        border: "1px solid var(--cb)",
                        borderRadius: 7,
                        fontSize: 14,
                        fontWeight: 600,
                        background: "var(--ci)",
                      }}
                    >
                      350.000 €
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "var(--ch)",
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {l.mockMiete}
                    </div>
                    <div
                      style={{
                        padding: "9px 12px",
                        border: "1px solid var(--cb)",
                        borderRadius: 7,
                        fontSize: 14,
                        fontWeight: 600,
                        background: "var(--ci)",
                      }}
                    >
                      1.200 €
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "var(--ch)",
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {l.mockZins}
                    </div>
                    <div
                      style={{
                        padding: "9px 12px",
                        border: "1px solid var(--cb)",
                        borderRadius: 7,
                        fontSize: 14,
                        fontWeight: 600,
                        background: "var(--ci)",
                      }}
                    >
                      {zinsen?.avg || MARKET_RATES.avg} % p.a.
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "var(--ch)",
                        marginBottom: 3,
                        fontWeight: 600,
                      }}
                    >
                      {l.mockEK}
                    </div>
                    <div
                      style={{
                        padding: "9px 12px",
                        border: "1px solid var(--cb)",
                        borderRadius: 7,
                        fontSize: 14,
                        fontWeight: 600,
                        background: "var(--ci)",
                      }}
                    >
                      70.000 €
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div
                      style={{
                        padding: "10px 11px",
                        background: "var(--ca-bg)",
                        border: "1px solid var(--ca-bd)",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                          color: "var(--ca)",
                          fontWeight: 700,
                        }}
                      >
                        {l.mockBrutto}
                      </div>
                      <div
                        style={{ fontSize: 18, fontWeight: 700, color: "var(--ca)", marginTop: 3 }}
                      >
                        4,11 %
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 11px",
                        background: "#e7f7ee",
                        border: "1px solid #b7e4c7",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                          color: "#1a7f3e",
                          fontWeight: 700,
                        }}
                      >
                        {l.mockNetto}
                      </div>
                      <div
                        style={{ fontSize: 18, fontWeight: 700, color: "#1a7f3e", marginTop: 3 }}
                      >
                        2,98 %
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--cb)",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "var(--cl)", fontWeight: 600 }}>
                        {l.mockRate}
                      </div>
                      <div style={{ fontSize: 9, color: "var(--ch)" }}>{l.mockRateSub}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1d6af5" }}>1.154 €</div>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#e7f7ee",
                      border: "1px solid #b7e4c7",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "#1a7f3e", fontWeight: 600 }}>
                        {l.mockCF}
                      </div>
                      <div style={{ fontSize: 9, color: "#5a8a6f" }}>{l.mockCFSub}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1a7f3e" }}>+46 €</div>
                  </div>
                  <div
                    style={{ padding: "10px 12px", border: "1px solid var(--cb)", borderRadius: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: "var(--ch)",
                        fontWeight: 700,
                        marginBottom: 7,
                      }}
                    >
                      {l.mockChart}
                    </div>
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 42 }}>
                      {[30, 36, 42, 50, 56, 64, 70, 78, 85, 92, 100].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: h + "%",
                            background: "var(--ca)",
                            borderRadius: "2px 2px 0 0",
                            opacity: 0.3 + i * 0.07,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expose-Upload Spotlight (Nutzerwunsch 2026-07-29, finale Form):
                nur noch EINE Kachel, hier unter dem Mockup in dessen Breite -
                die frueher zusaetzlich in der linken Spalte gerenderte
                Mobile-Instanz ist entfallen (doppelte Kachel war redundant).
                Aufbau bewusst identisch zur grossen Renditerechner-Karte weiter
                unten (`.calc-hero-card`): weisse Flaeche, 1.5px --cb-Rahmen,
                Radius 14, oranger Hover - Bild links / Text rechts je 50%.
                Das halbiert die Kachelhoehe gegenueber der frueheren
                Bild-ueber-Text-Variante und verhindert unnoetige Textzeilen,
                weil Titel, Beschreibung und CTA neben dem Bild stehen.
                "Jetzt hochladen" ist ein gefuellter Orange-Pill statt einer
                Textzeile (Nutzerwunsch: soll deutlich sichtbarer sein).
                Klick springt in den Renditerechner UND stoesst dort
                automatisch den Upload-Dialog an (App.jsx autoExpose). */}
            <button
              onClick={() => onStart("haupt", { openUpload: true })}
              className="hero-upload-spot"
              style={{
                display: "block",
                width: "100%",
                marginTop: 20,
                background: "var(--cc)",
                border: "1.5px solid var(--cb)",
                borderRadius: 14,
                overflow: "hidden",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                WebkitAppearance: "none",
              }}
            >
              <span className="hero-upload-grid" style={{ display: "grid" }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    background: "#E6F1FB",
                    minHeight: 150,
                  }}
                >
                  <img
                    src="/finn-expose-tile.webp"
                    alt=""
                    aria-hidden="true"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </span>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "20px 22px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "fit-content",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "#185FA5",
                      background: "#E6F1FB",
                      padding: "3px 8px",
                      borderRadius: 4,
                      marginBottom: 10,
                    }}
                  >
                    {l.heroUploadBadge}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 19,
                      fontWeight: 700,
                      color: "var(--ct)",
                      letterSpacing: -0.3,
                      marginBottom: 6,
                    }}
                  >
                    {l.heroUploadTitle}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      color: "var(--ch)",
                      lineHeight: 1.45,
                      marginBottom: 14,
                    }}
                  >
                    {l.heroUploadDesc}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      width: "fit-content",
                      background: "var(--ca)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "9px 16px",
                      borderRadius: 9,
                      boxShadow: "0 4px 12px rgba(232,96,10,.25)",
                    }}
                  >
                    {l.heroUploadCta} <span style={{ fontSize: 15, marginTop: -1 }}>→</span>
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section
        id="funktioniert"
        style={{
          padding: "clamp(40px,5vw,72px) 0",
          background: "var(--cc)",
          borderTop: "1px solid var(--cb)",
          borderBottom: "1px solid var(--cb)",
        }}
      >
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: "var(--ca)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {l.howTitle}
            </div>
            <h2
              style={{
                fontSize: "clamp(26px,3vw,38px)",
                fontWeight: 800,
                color: "var(--ct)",
                margin: 0,
                letterSpacing: -0.5,
                lineHeight: 1.15,
              }}
            >
              {l.howShort}
            </h2>
          </div>
          <div className="how-steps-grid">
            {[
              // Reihenfolge korrigiert (Nutzer-Feedback 2026-08-10): Anmelden
              // & Abo waehlen ist chronologisch der ERSTE Schritt, nicht der
              // letzte - Spec-v3.0 verlangt ein Konto vor jeder
              // Rechner-Nutzung. Die i18n-Schluessel heissen weiterhin
              // step1..4 in der urspruenglichen Reihenfolge, hier nur die
              // Anzeigereihenfolge/-nummer (s.n) angepasst.
              { n: "1", icon: "🦊", t: l.step4H, d: l.step4P },
              { n: "2", icon: "📍", t: l.step1H, d: l.step1P },
              { n: "3", icon: "📊", t: l.step2H, d: l.step2P },
              { n: "4", icon: "💡", t: l.step3H, d: l.step3P },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg)",
                  borderRadius: 14,
                  padding: "18px 16px",
                  border: "1px solid var(--cb)",
                  position: "relative",
                  transition: "transform .2s, box-shadow .2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      background: "var(--ca-bg)",
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      border: "1px solid var(--ca-bd)",
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "var(--ca)",
                      letterSpacing: 0.8,
                    }}
                  >
                    STEP {s.n}
                  </div>
                </div>
                <h3
                  style={{
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: "var(--ct)",
                    margin: "0 0 6px",
                    letterSpacing: -0.1,
                  }}
                >
                  {s.t}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5, margin: 0 }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CALCULATOR CARDS ═══════════ */}
      <section id="rechner" style={{ padding: "clamp(40px,5vw,72px) 0" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: "var(--ca)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {l.cardsTitle}
            </div>
            <h2
              style={{
                fontSize: "clamp(26px,3vw,38px)",
                fontWeight: 800,
                color: "var(--ct)",
                margin: 0,
                letterSpacing: -0.5,
                lineHeight: 1.15,
              }}
            >
              {l.cardsSub}
            </h2>
          </div>

          {/* ── HERO: Renditerechner ── */}
          <button
            onClick={() => onStart("haupt")}
            style={{
              display: "block",
              background: "transparent",
              border: "1.5px solid var(--cb)",
              borderRadius: 14,
              textAlign: "left",
              cursor: "pointer",
              transition: "all .2s",
              padding: 0,
              fontFamily: "inherit",
              width: "100%",
              marginBottom: 16,
              WebkitAppearance: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ca)";
              e.currentTarget.style.boxShadow = "0 8px 28px rgba(232,96,10,.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--cb)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div
              className="calc-hero-card"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "var(--cc)",
                borderRadius: 13,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <div
                style={{
                  overflow: "hidden",
                  background: "linear-gradient(135deg,#fff1e8 0%,#ffd9b8 100%)",
                  minHeight: 200,
                }}
              >
                <img
                  src="/card-rendite.webp"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  alt=""
                />
              </div>
              <div
                style={{
                  padding: "28px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "var(--ca)",
                    background: "var(--ca-bg)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    marginBottom: 12,
                    width: "fit-content",
                  }}
                >
                  {l.fullBadge}
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--ct)",
                    margin: "0 0 10px",
                    letterSpacing: -0.3,
                  }}
                >
                  {l.fullTitle}
                </h3>
                <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, margin: 0 }}>
                  {l.fullDesc}
                </p>
              </div>
            </div>
          </button>

          {/* ── SUPPORT: 5 Ergänzungs-Rechner ── */}
          <div className="calc-cards-support">
            {[
              {
                tab: "kredit",
                title: l.finTitle,
                badge: l.finBadge,
                desc: l.finDesc,
                feats: [l.finF1, l.finF2, l.finF3],
                bg: "linear-gradient(135deg,#e8f5ed 0%,#bce4ce 100%)",
                illus: (
                  <img
                    src="/card-kredit.webp"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    alt=""
                  />
                ),
              },
              {
                tab: "miete",
                title: l.rentTitle,
                badge: l.rentBadge,
                desc: l.rentDesc,
                feats: [l.rentF1, l.rentF2, l.rentF3],
                bg: "linear-gradient(135deg,#fff5e8 0%,#ffd5b8 100%)",
                illus: (
                  <img
                    src="/card-miete.webp"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    alt=""
                  />
                ),
              },
              {
                tab: "sanier",
                title: l.sanTitle,
                badge: l.sanBadge,
                desc: l.sanDesc,
                feats: [l.sanF1, l.sanF2, l.sanF3],
                bg: "linear-gradient(135deg,#e8f0f5 0%,#bcd4e6 100%)",
                illus: (
                  <img
                    src="/card-sanierung.webp"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    alt=""
                  />
                ),
              },
              {
                tab: "steuer6",
                title: l.st6Title,
                badge: l.st6Badge,
                desc: l.st6Desc,
                feats: [l.st6F1, l.st6F2, l.st6F3],
                bg: "linear-gradient(135deg,#e8eef5 0%,#c2d3e8 100%)",
                illus: (
                  <img
                    src="/card-steuer.webp"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    alt=""
                  />
                ),
              },
              {
                tab: "vfe",
                title: l.vfeTitle,
                badge: l.vfeBadge,
                desc: l.vfeDesc,
                feats: [l.vfeF1, l.vfeF2, l.vfeF3],
                bg: "linear-gradient(135deg,#f0eafa 0%,#d4c5f0 100%)",
                illus: (
                  <img
                    src="/card-vorfaelligkeit.webp"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    alt=""
                  />
                ),
              },
            ].map((c, i) => (
              <button
                key={i}
                onClick={() => onStart(c.tab)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--cc)",
                  border: "1.5px solid var(--cb)",
                  borderRadius: 14,
                  overflow: "hidden",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all .2s",
                  padding: 0,
                  fontFamily: "inherit",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "var(--ca)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(232,96,10,.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.borderColor = "var(--cb)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div
                  style={{
                    aspectRatio: "1200/520",
                    width: "100%",
                    overflow: "hidden",
                    borderRadius: "13px 13px 0 0",
                    borderBottom: "1px solid rgba(0,0,0,.05)",
                    flexShrink: 0,
                    background: c.bg,
                  }}
                >
                  {c.illus}
                </div>
                <div style={{ padding: "16px 16px", flex: 1 }}>
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "var(--ca)",
                      background: "var(--ca-bg)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  >
                    {c.badge}
                  </div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--ct)",
                      margin: "0 0 6px",
                      letterSpacing: -0.2,
                    }}
                  >
                    {c.title}
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--ch)", lineHeight: 1.5, margin: 0 }}>
                    {c.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PREISE ═══════════ */}
      {/* Steht bewusst direkt hinter der Rechner-Uebersicht (Nutzer-Vorgabe
          2026-08-18): wer sieht, was ImmoFuchs kann, soll gleich danach
          sehen, was es kostet, statt erst durch Daten-/USP-Abschnitte zu
          scrollen. */}
      <PricingSection
        lang={lang}
        onChoosePlan={(plan) => {
          setCheckoutPlan(plan);
          setOpenMode("checkout");
        }}
      />

      {/* ═══════════ USP + DATENBASIS ═══════════ */}
      {/* Zusammenlegung 2026-08-25 (Nutzer-Vorgabe): vorher zwei Sektionen —
          "Echte Marktdaten. Durchdachte Rechner." mit neun Wert-Kacheln und
          "Mehr als nur ein Rechner" mit sieben USP-Karten. Die Karten "Alle
          Daten aktuell" und "Recht und Bundesland eingebaut" erzaehlten
          dasselbe wie die Kacheln. Jetzt eine Sektion mit der Dramaturgie:
          was ImmoFuchs kann (Funktionen) -> worauf er basiert (Datenbasis).

          Gestaltung ueberarbeitet 2026-08-25 nach Design-Review:
          - 2+3-Komposition statt auto-fit. Bei 5 Karten erzeugt
            auto-fit,minmax(220px,1fr) je nach Fensterbreite eine
            Waisenreihe (1024-1200px: 4+1, 480-760px: 2+2+1) - 5 ist prim,
            auto-fit kann das nicht loesen. Explizite Breakpoints wie bei
            .calc-cards-support weiter oben; die beiden NEU-Funktionen
            stehen bewusst breit in der ersten Reihe.
          - Emoji durch Inline-SVG ersetzt: 📄 und 📋 sahen bei 28px fast
            gleich aus (beides ein weisses Blatt), Emoji rendern je
            Plattform in anderen Farben (Windows grau-blau, iOS bunt) und
            Screenreader lasen "Seite nach oben zeigend" vor jeder
            Ueberschrift.
          - Die neun Werte als Hairline-Raster statt gerahmter Chips: die
            Chips standen direkt unter der Preise-CTA und sahen dort nach
            Knoepfen aus, und flex-wrap+center liess die letzte Reihe in
            jeder Sprache anders ausfransen. 9 Werte gehen als 3x3 exakt auf.
          - Kontrast (WCAG AA, alles mit vorhandenen Tokens): Fliesstext
            --ch (3,5:1 auf Weiss) -> --cl, kleine orange Schrift --ca
            (3,4:1) -> --ca-dk, gruener Wert-Text (2,3:1) -> --ct mit
            gruenem Punkt davor. Orange traegt jetzt nur noch den einen
            Live-Wert (Bauzins) statt acht Werte gleichzeitig. */}
      <section
        aria-labelledby="usp-heading"
        style={{
          background: "var(--cc)",
          borderTop: "1px solid var(--cb)",
          borderBottom: "1px solid var(--cb)",
          padding: "clamp(40px,5vw,72px) 0",
        }}
      >
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: "var(--ca-dk)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {l.uspTitle}
            </div>
            <h2
              id="usp-heading"
              style={{
                fontSize: "clamp(26px,3vw,38px)",
                fontWeight: 800,
                color: "var(--ct)",
                margin: "0 0 14px",
                letterSpacing: -0.5,
                lineHeight: 1.15,
              }}
            >
              {l.uspSub}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--cl)",
                maxWidth: 600,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              {l.uspLead}
            </p>
          </div>
          {/* Funktionen als rahmenlose Spalten (Design-Review 2026-08-25,
              Variante A). Vorher gerahmte Karten in 2+3-Komposition: die
              trugen dasselbe visuelle Gewicht wie die Datentafel darunter,
              waehrend die Werte mit 15px kleiner gesetzt waren als die
              Headlines und sich dadurch als Fussnote lasen. Jetzt ein
              Gefaelle: Funktionen leicht (Haarlinie statt Rahmen), Zahlen
              schwer.

              Die NEU-Pillen bei Expose-Scan und Handout entfallen
              (Nutzer-Vorgabe 2026-08-25) - damit stehen alle fuenf
              Headlines auf einer Grundlinie. Der Schluessel l.badgeNeu
              bleibt vorerst ungenutzt in translations.js stehen.

              Reihenfolge unveraendert: die drei KI-Funktionen zuerst - sie
              sind das, was es sonst nirgends gibt -, danach der Einstieg.
              Die SVGs sind dieselben wie bisher: inline, ohne Fuellung,
              stroke="currentColor", damit sie die Akzentfarbe erben statt
              wie Emoji je Plattform in einer anderen Farbwelt zu landen. */}
          <div className="fn-row">
            {[
              {
                svg: (
                  <>
                    <path d="M13 3H7a2 2 0 0 0-2 2v5" />
                    <path d="M19 14v5a2 2 0 0 1-2 2h-6" />
                    <path d="M13 3l6 6" />
                    <path d="M13 3v6h6" />
                    <path d="M3 12h18" />
                  </>
                ),
                h: l.uspScanH,
                p: l.uspScanP,
              },
              {
                svg: (
                  <>
                    <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
                    <path d="M9 3h6v3H9z" />
                    <path d="M8.5 12.5l2 2 4-4" />
                    <path d="M8.5 18h7" />
                  </>
                ),
                h: l.uspHandoutH,
                p: l.uspHandoutP,
              },
              {
                svg: (
                  <>
                    <path d="M20 12a8 8 0 1 0-3.1 6.3L21 20l-1.2-3.6A7.9 7.9 0 0 0 20 12z" />
                    <path d="M9 10h6" />
                    <path d="M9 14h4" />
                  </>
                ),
                h: l.uspAiH,
                p: l.uspAiP,
              },
              {
                svg: (
                  <>
                    <path d="M4 18a8 8 0 1 1 16 0" />
                    <path d="M12 18l4-6" />
                    <path d="M12 18h.01" />
                  </>
                ),
                h: l.uspScoreH,
                p: l.uspScoreP,
              },
              {
                svg: (
                  <>
                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                  </>
                ),
                h: l.usp4H,
                p: l.usp4P,
              },
              {
                svg: (
                  <>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
                  </>
                ),
                h: l.usp6H,
                p: l.usp6P,
              },
            ].map((u, i) => (
              <div key={i} className="fn">
                <svg
                  className="fn-ic"
                  aria-hidden="true"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {u.svg}
                </svg>
                <h3 className="fn-h">{u.h}</h3>
                <p className="fn-p">{u.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ZINSEN — discreet ticker section ═══════════ */}
      <section id="zinsen" style={{ padding: "clamp(30px,4vw,50px) 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ borderLeft: "3px solid var(--ca)", paddingLeft: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                fontSize: 10,
                color: "var(--ca)",
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--ca)",
                  borderRadius: "50%",
                  animation: "pulse 2s infinite",
                }}
              />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
              📊 {l.ratesTitle} · {l.ratesStand}: {zinsen?.stand || MARKET_RATES.stand}
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--cl)", lineHeight: 1.7 }}>
              {l.ratesIntro2}{" "}
              <strong>
                {l.ratesCompact}: {zinsen?.avg || MARKET_RATES.avg} %
              </strong>
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--ch)", lineHeight: 1.5 }}>
              {l.ratesDisclaim}
            </p>
            <ZinsAlarm zinsen={zinsen} lang={lang} />
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--cb)",
          padding: "32px 0 28px",
          background: "var(--cc)",
        }}
      >
        <div className="lp-container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={logoSrc}
                alt="immofuchs.info"
                style={{ height: 40, width: "auto", objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                fontSize: 13,
                color: "var(--cl)",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/impressum.html"
                style={{ ...navLink, fontSize: 13, textDecoration: "none" }}
              >
                {l.imp}
              </a>
              <a
                href="/datenschutz.html"
                style={{ ...navLink, fontSize: 13, textDecoration: "none" }}
              >
                {l.dse}
              </a>
              <button onClick={() => window.ccReopen?.()} style={{ ...navLink, fontSize: 13 }}>
                Cookie-Einstellungen
              </button>
            </div>
          </div>
          <div
            style={{
              paddingTop: 18,
              borderTop: "1px solid var(--cb)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 11,
              color: "var(--ch)",
            }}
          >
            <div>{l.footerCr}</div>
            <div style={{ maxWidth: 600, lineHeight: 1.6, opacity: 0.85 }}>{l.footerNote}</div>
          </div>
        </div>
      </footer>

      {/* Responsive nav styles */}
      <style>{`
      /* Gleiche Breakpoints wie .hdr-inner in App.jsx (Nutzer-Feedback
         2026-08-10, Ausrichtungs-Bugfix). */
      .lp-hdr-inner{padding-left:14px;padding-right:14px}
      @media(min-width:700px){.lp-hdr-inner{padding-left:28px;padding-right:28px}}
      @media(min-width:1100px){.lp-hdr-inner{padding-left:40px;padding-right:40px}}
      /* Wiederverwendbar fuer reine Text-/Icon-Abschnitte ohne Bilder
         (Nutzer-Feedback 2026-08-11): gleiches Box-Modell wie .content in
         App.jsx (max-width:1400px, Padding INNERHALB der zentrierten Box,
         14/28/40px je Breakpoint). Bewusst NICHT auf Hero- und
         Rechner-Karten-Abschnitt angewendet - dort wuerden die
         objectFit:cover-Bildboxen bei einer breiteren Spalte anders
         zugeschnitten wirken. */
      .lp-container{max-width:1400px;margin:0 auto;padding:0 14px;box-sizing:border-box}
      @media(min-width:700px){.lp-container{padding-left:28px;padding-right:28px}}
      @media(min-width:1100px){.lp-container{padding-left:40px;padding-right:40px}}
      .hero-upload-spot{transition:border-color .2s,box-shadow .2s}
      .hero-upload-spot:hover{border-color:var(--ca);box-shadow:0 8px 28px rgba(232,96,10,.14)}
      .hero-upload-grid{grid-template-columns:1fr}
      @media(min-width:640px){.hero-upload-grid{grid-template-columns:1fr 1fr}}
      .calc-hero-card{grid-template-columns:1fr!important}
      @media(min-width:640px){.calc-hero-card{grid-template-columns:1fr 1fr!important}}
      .calc-hero-card>div:first-child{min-height:200px}
      @media(min-width:640px){.calc-hero-card>div:first-child{min-height:0;height:100%}}
      .calc-cards-support{display:grid;grid-template-columns:1fr;gap:12px}
      .calc-cards-support>*{width:100%;min-width:0;box-sizing:border-box}
      @media(min-width:640px){.calc-cards-support{grid-template-columns:repeat(3,1fr)}}
      @media(min-width:900px){.calc-cards-support{grid-template-columns:repeat(5,1fr)}}
      /* Funktionen als rahmenlose Spalten (Design-Review 2026-08-25,
         Variante A). Die gerahmten Karten trugen dasselbe visuelle Gewicht
         wie die Datentafel darunter - zwei Raster, die um dieselbe
         Aufmerksamkeit konkurrierten. Haarlinie statt Rahmen nimmt der
         Reihe das Gewicht, ohne eine Ebene zu verlieren.
         Kein auto-fit (siehe .calc-cards-support): 5 gleiche Spalten ab
         960px, darunter 2 Spalten mit waagerechten Trennern, mobil eine
         Liste. Damit gibt es in keiner Breite eine Waisenreihe. */
      .fn-row{display:grid;grid-template-columns:1fr;gap:0}
      .fn-row>*{min-width:0;box-sizing:border-box}
      .fn{padding:18px 0;border-top:1px solid var(--cb)}
      .fn:first-child{border-top:0}
      @media(min-width:560px){
        .fn-row{grid-template-columns:repeat(2,1fr);column-gap:28px}
        .fn:nth-child(2){border-top:0}
      }
      @media(min-width:960px){
        .fn-row{grid-template-columns:repeat(5,1fr);column-gap:26px}
        .fn{border-top:0;padding:0 0 0 20px;border-left:1px solid var(--cb)}
        .fn:first-child{padding-left:0;border-left:0}
      }
      .fn-ic{color:var(--ca);display:block;margin-bottom:12px}
      .fn-h{font-size:15.5px;font-weight:800;color:var(--ct);margin:0 0 5px;
        letter-spacing:-.2px;line-height:1.25}
      .fn-p{font-size:13px;color:var(--cl);line-height:1.55;margin:0}
      .how-steps-grid{display:grid;grid-template-columns:1fr;gap:14px}
      @media(min-width:560px){.how-steps-grid{grid-template-columns:repeat(2,1fr)}}
      @media(min-width:860px){.how-steps-grid{grid-template-columns:repeat(4,1fr)}}
      /* Bugreport 2026-08-12 (Screenshot: abgeschnittener Menue-Knopf): Nach
         dem Login wuchs der Konto-Knopf durch Tarif-Chip + "Mein Konto" so
         weit, dass der ☰-Knopf rechts aus dem Viewport lief. Die Kurzform
         gab es bisher nur im App-Shell (.acct-label-* in App.jsx) - dessen
         Style-Block wird auf der Landingpage gar nicht gerendert, die Regel
         fehlte hier also schlicht. */
      .lp-acct-full{display:none}
      .lp-acct-short{display:inline}
      /* Logo-Groesse identisch zum Rechner-Kopf (.hdr-logo-img in App.jsx,
         Nutzer-Korrektur 2026-08-14). Seit 2026-08-20 ein Schriftzug-Bild
         (3:1) statt Quadrat-Icon + HTML-Text - gesteuert wird nur noch die
         Hoehe, dieselben Werte wie .hdr-logo-img. */
      .lp-logo-icon{height:40px!important;width:auto!important}
      @media(min-width:480px){
        .lp-acct-full{display:inline}
        .lp-acct-short{display:none}
        .lp-logo-icon{height:56px!important;width:auto!important}
      }
      @media(max-width:880px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
        .lp-langsel-top{display:none!important}
        .lp-account-btn{padding:8px 10px!important;font-size:12.5px!important}
      }
      @media(max-width:340px){
        .lp-hdr-inner{gap:10px!important}
        .lp-account-btn{padding:8px 8px!important;font-size:11.5px!important}
      }
      @media(max-width:560px){
        .lp-cta{display:none!important}
      }
    `}</style>
      <LandingMascot onStart={onStart} lang={lang} />
    </div>
  );
}
