import { useEffect, useState } from "react";
import { TL } from "../i18n/translations.js";
import { MARKET_RATES } from "../data.js";
import { LANG_LOCALE } from "../utils/helpers.js";
import { LangSel } from "../components/ui/LangSel.jsx";
import { ZinsAlarm } from "../components/shell/ZinsAlarm.jsx";
import { LandingMascot } from "../components/assistant/LandingMascot.jsx";
import { useAccountCtx } from "../context/AccountContext.jsx";
import { Ctx } from "../context/AppContext.jsx";
import { ACCOUNT_T } from "../i18n/account.js";
import { CheckoutWizard } from "../components/checkout/CheckoutWizard.jsx";
import { MyAccount } from "../components/account/MyAccount.jsx";
import { LoginSuccessToast } from "../components/account/LoginSuccessToast.jsx";
import { PlanChip } from "../components/account/PlanChip.jsx";
import { useSavedObjects } from "../components/shell/Merkliste.jsx";
import { BrandIcon } from "../components/ui/BrandIcon.jsx";

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
const navLinkMobile = {
  ...navLink,
  padding: "12px 4px",
  fontSize: 15,
  textAlign: "left",
  borderBottom: "1px solid var(--cb)",
};

export function Landing({ onStart, zinsen, lang, setLang }) {
  const l = TL[lang] || TL.de;
  const at = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const zB = zinsen?.bundesanleihe_10j;
  const [navOpen, setNavOpen] = useState(false);
  // Slide-in-Schublade statt Dropdown unter dem Header (Nutzer-Vorgabe
  // 2026-08-11, Referenz-Screenshots): Hintergrund darf waehrend der
  // Schublade nicht scrollen, Escape schliesst wie bei jedem Overlay in
  // dieser App (Wizard/Mein Konto nutzen dafuer useFocusTrap).
  useEffect(() => {
    if (!navOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handler);
    };
  }, [navOpen]);
  // Login-Standard-Flow (Konzept-Dok Abschnitt 2/1.5): "Anmelden" ist bereits
  // auf der Landingpage sichtbar, statt erst beim Klick in einen Rechner.
  // AccountProvider sitzt seit dieser Aenderung in main.jsx (ausserhalb von
  // App()), daher hier direkt per Context verfuegbar, ohne Prop-Drilling.
  const account = useAccountCtx();
  const [openMode, setOpenMode] = useState(null); // null | "checkout" | "login" | "account"

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
  const { savedList, isPro: isProSavedObjects, freeLimit: savedObjectsFreeLimit } = useSavedObjects();
  const landingCtxValue = {
    lang,
    setLang,
    savedList,
    isProSavedObjects,
    savedObjectsFreeLimit,
    setTabExt: (id) => onStart(id),
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
      setNavOpen(false);
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
          background: "rgba(245,245,240,.92)",
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
            <img
              src="/icon-192.png"
              alt="Immofuchs"
              className="lp-logo-icon"
              style={{
                width: 52,
                height: 52,
                objectFit: "contain",
                flexShrink: 0,
                borderRadius: 10,
              }}
            />
            {/* Nutzer-Feedback 2026-08-11 (Screenshot): Logo+Wortmarke allein
                nahmen bei 375px schon 234px ein (52px Icon + 23px-Text) -
                zusammen mit Konto-Knopf + Menü-Button blieb kein Platz mehr,
                beide rutschten unsichtbar aus dem Viewport. .lp-logo-text
                schrumpft deshalb bei ≤880px (Regel unten). */}
            <div
              className="lp-logo-text"
              style={{
                fontSize: 23,
                fontWeight: 800,
                letterSpacing: -0.5,
                lineHeight: 1,
                color: "var(--ct)",
              }}
            >
              immo<span style={{ color: "var(--ca)" }}>fuchs</span>
              <span style={{ color: "var(--ct)", fontWeight: 700 }}>.info</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="lp-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <button onClick={() => scrollTo("rechner")} style={navLink}>
              {l.navRechner}
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
            {account && !account.loading && (
              <button
                onClick={() => setOpenMode(account.isLoggedIn ? "account" : "login")}
                className="lp-account-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
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
                {/* Tarif-Status auch hier dauerhaft sichtbar (UX-Audit
                    2026-08-11) - gleiche Komponente wie im App-Shell, damit
                    beide Kopfzeilen dieselbe Aussage in derselben Form
                    treffen. */}
                {account.isLoggedIn && <PlanChip t={at} me={account.me} />}
                {account.isLoggedIn ? at.accountTitle : at.loginSubmit}
              </button>
            )}
            {/* Nutzer-Feedback 2026-08-11 (Screenshot): Sprachwahl + Menü-
                Button ragten bei ≤880px zusammen mit Konto-Knopf + Logo
                ueber den Viewport hinaus (kein Umbruch, keine Kuerzung) -
                bei 375px lagen beide bereits jenseits x=375, also komplett
                unsichtbar/unerreichbar. Fix: Sprachwahl zieht bei ≤880px in
                die Mobile-Schublade um (siehe unten), hier nur noch auf
                breiteren Screens sichtbar (.lp-langsel-top-Regel unten). */}
            <div className="lp-langsel-top">
              <LangSel lang={lang} setLang={setLang} />
            </div>
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
            {/* Mobile nav toggle */}
            <button
              onClick={() => setNavOpen((o) => !o)}
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
              }}
            >
              <span style={{ fontSize: 18 }}>☰</span>
            </button>
          </div>
        </div>

      </header>

      {/* Mobile nav drawer (Nutzer-Vorgabe 2026-08-11, Referenz-Screenshots):
          seitlich einschiebende Flaeche mit abgedunkeltem Hintergrund statt
          eines Dropdowns unter dem Header - dasselbe Muster wie das
          Seitenmenue der Referenz-App. Ausserhalb von <header>, damit sie
          ueber der gesamten Seite liegt, nicht nur unter der Kopfzeile. */}
      {navOpen && (
        <>
          <div
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,.45)", zIndex: 59 }}
          />
          <div
            className="lp-nav-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={at.accountNavAria}
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(300px, 84vw)",
              background: "var(--cc)",
              zIndex: 60,
              boxShadow: "6px 0 28px rgba(0,0,0,.18)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              paddingTop: "env(safe-area-inset-top)",
              animation: "lp-drawer-in .22s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderBottom: "1px solid var(--cb)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BrandIcon size={30} />
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ct)" }}>
                  immo<span style={{ color: "var(--ca)" }}>fuchs</span>
                </span>
              </div>
              <button
                onClick={() => setNavOpen(false)}
                aria-label={at.close}
                style={{ background: "none", border: "none", fontSize: 20, color: "var(--ch)", cursor: "pointer", padding: 4, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <button onClick={() => scrollTo("rechner")} style={navLinkMobile}>
                {l.navRechner}
              </button>
              <button onClick={() => scrollTo("funktioniert")} style={navLinkMobile}>
                {l.navHow}
              </button>
              <button onClick={() => scrollTo("zinsen")} style={navLinkMobile}>
                {l.navZinsen}
              </button>
              {/* UX-Review 2026-08-11 (ui-designer-Agent): der "Anmelden"/"Mein
                  Konto"-Eintrag hier war der dritte Auftritt derselben Aktion
                  (Header-Button bleibt auch mobil sichtbar - .lp-account-btn
                  wird bei ≤880px nur verkleinert, nie ausgeblendet). Anders
                  als Header+Hero-CTA (unterschiedliche Scroll-Positionen)
                  brachte diese Kopie keine zusaetzliche Erreichbarkeit, nur
                  eine weitere Animation/einen weiteren Tap fuer denselben Klick. */}
              {/* Sprachwahl zieht bei ≤880px hierher um, siehe Kommentar oben
                  bei .lp-langsel-top - Platz in der Kopfzeile reichte dort
                  nicht fuer Logo + Konto-Knopf + Sprachwahl + Menü-Button. */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--cb)" }}>
                <LangSel lang={lang} setLang={setLang} />
              </div>
            </div>
          </div>
        </>
      )}
      {(openMode === "checkout" || openMode === "login" || openMode === "account") && (
        <Ctx.Provider value={landingCtxValue}>
          {openMode === "checkout" && <CheckoutWizard onClose={() => setOpenMode(null)} />}
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
          {openMode === "account" && <MyAccount onClose={() => setOpenMode(null)} />}
        </Ctx.Provider>
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
                    style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ca)", letterSpacing: 0.8 }}
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

      {/* ═══════════ DATEN-ABSCHNITT ═══════════ */}
      <section
        style={{
          background: "var(--bg)",
          borderTop: "1px solid var(--cb)",
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
                color: "var(--ca)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {l.dataEyebrow}
            </div>
            <h2
              style={{
                fontSize: "clamp(24px,3vw,36px)",
                fontWeight: 800,
                color: "var(--ct)",
                margin: "0 0 14px",
                letterSpacing: -0.5,
                lineHeight: 1.15,
              }}
            >
              {l.dataTitle}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--ch)",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              {l.dataSub}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              {
                // Bugfix (Nutzer-Feedback 2026-08-11): zeigte bisher immer
                // den statischen Fallback MARKET_RATES.avg, unabhaengig vom
                // live geladenen zinsen.json - dadurch wich der Wert vom
                // Bauzinsen-Ticker weiter unten ab (der zinsen?.avg nutzt,
                // den ueber alle 5 Quellen live berechneten Durchschnitt,
                // siehe App.jsx loadZinsen()). Jetzt dieselbe Quelle/
                // Prioritaet wie der Ticker (ratesCompact weiter unten).
                ic: "💰",
                label: l.dc1L,
                val: `${(zinsen?.avg ?? MARKET_RATES.avg).toLocaleString("de-DE", { minimumFractionDigits: 2 })} %`,
                sub: l.dc1S,
              },
              { ic: "📊", label: l.dc2L, val: "+2,1 %/Jahr", sub: l.dc2S },
              { ic: "🏠", label: l.dc3L, val: "+2,0 %/Jahr", sub: l.dc3S },
              { ic: "🏛️", label: l.dc4L, val: l.dc4V, sub: l.dc4S },
              { ic: "⚖️", label: l.dc5L, val: l.dc5V, sub: l.dc5S },
              { ic: "🏗️", label: l.dc6L, val: l.dc6V, sub: l.dc6S },
              { ic: "🌱", label: l.dc7L, val: l.dc7V, sub: l.dc7S },
              { ic: "📋", label: l.dc8L, val: l.dc8V, sub: l.dc8S },
              { ic: "💶", label: l.dc9L, val: l.dc9V, sub: l.dc9S, green: true },
            ].map((d, i) => (
              <div
                key={i}
                style={{
                  background: "var(--cc)",
                  borderRadius: 12,
                  border: "1px solid var(--cb)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{d.ic}</div>
                <div style={{ fontSize: 11, color: "var(--ch)", fontWeight: 500, marginBottom: 4 }}>
                  {d.label}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: d.green ? "#22c55e" : "var(--ca)",
                    lineHeight: 1.1,
                    marginBottom: 3,
                  }}
                >
                  {d.val}
                </div>
                <div style={{ fontSize: 11, color: "var(--ch)" }}>{d.sub}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--ch)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span>
              {(() => {
                const n = new Date();
                return (
                  l.dataStand +
                  " " +
                  n.toLocaleDateString(LANG_LOCALE[lang] || "de-DE", {
                    month: "long",
                    year: "numeric",
                  })
                );
              })()}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════ USP ═══════════ */}
      <section
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
                color: "var(--ca)",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              {l.uspTitle}
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
              {l.uspSub}
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 24,
            }}
          >
            {[
              { ic: "⚖️", h: l.usp2H, p: l.usp2P },
              { ic: "🔒", h: l.usp5H, p: l.usp5P },
              { ic: "🌐", h: l.usp6H, p: l.usp6P },
              { ic: "💻", h: l.usp4H, p: l.usp4P },
              { ic: "💬", h: l.uspAiH, p: l.uspAiP, neu: true },
            ].map((u, i) => (
              <div key={i}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{u.ic}</div>
                {u.neu && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: "var(--ca)",
                      marginBottom: 4,
                    }}
                  >
                    {l.badgeNeu}
                  </div>
                )}
                <h3
                  style={{ fontSize: 15, fontWeight: 700, color: "var(--ct)", margin: "0 0 6px" }}
                >
                  {u.h}
                </h3>
                <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, margin: 0 }}>
                  {u.p}
                </p>
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
              </strong>{" "}
              · {l.ratesShort}: <strong>{zinsen?.top || MARKET_RATES.top} %</strong>
              {zB && (
                <>
                  {" "}
                  · {l.ratesShort3}: <strong>{zB} %</strong>
                </>
              )}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--ch)", lineHeight: 1.5 }}>
              {l.ratesSources}: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche
              Bundesbank · {l.ratesDisclaim}
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
                src="/icon-192.png"
                alt="Immofuchs"
                style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8 }}
              />
              <div
                style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3, color: "var(--ct)" }}
              >
                immo<span style={{ color: "var(--ca)" }}>fuchs</span>
                <span style={{ color: "var(--ct)" }}>.info</span>
              </div>
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
              <a href="/impressum.html" style={{ ...navLink, fontSize: 13, textDecoration: "none" }}>
                {l.imp}
              </a>
              <a
                href="/datenschutz.html"
                style={{ ...navLink, fontSize: 13, textDecoration: "none" }}
              >
                {l.dse}
              </a>
              <button
                onClick={() => window.ccReopen?.()}
                style={{ ...navLink, fontSize: 13 }}
              >
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
      .how-steps-grid{display:grid;grid-template-columns:1fr;gap:14px}
      @media(min-width:560px){.how-steps-grid{grid-template-columns:repeat(2,1fr)}}
      @media(min-width:860px){.how-steps-grid{grid-template-columns:repeat(4,1fr)}}
      @media(max-width:880px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
        .lp-langsel-top{display:none!important}
        .lp-logo-icon{width:36px!important;height:36px!important}
        .lp-logo-text{font-size:16px!important}
        .lp-account-btn{padding:8px 10px!important;font-size:12.5px!important}
      }
      @media(max-width:340px){
        .lp-logo-text{font-size:14px!important}
        .lp-hdr-inner{gap:10px!important}
        .lp-account-btn{padding:8px 8px!important;font-size:11.5px!important}
      }
      @media(min-width:881px){
        .lp-nav-mobile{display:none!important}
      }
      @media(max-width:560px){
        .lp-cta{display:none!important}
      }
      @keyframes lp-drawer-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}
    `}</style>
      <LandingMascot onStart={onStart} lang={lang} />
    </div>
  );
}
