import { useEffect, useRef, useState, Suspense } from "react";
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

// Der Server liefert den Zinsstand als "2026-09" - fuer Menschen als
// "September 2026" in der Seitensprache. Andere Formate bleiben unveraendert.
function standLesbar(stand, lang) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(stand || ""));
  if (!m) return stand;
  return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(LANG_LOCALE[lang] || "de-DE", {
    month: "long",
    year: "numeric",
  });
}

// ═══ Kleine Bausteine der Landingpage (Neugestaltung 2026-09-28) ═══
// Der Vier-Zacken-Stern ist das KI-Zeichen der Seite (Hero, KI-Sektion,
// Schritt 4). Farbe ueber currentColor, damit ihn die umgebende Klasse steuert.
function Stern({ size = 16, className, style }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
}

// Abschnitts-Kennung ueber der Ueberschrift: dunkle Schrift mit orangem
// Punkt statt 11px-Orange - das erreichte auf Weiss nur 3,4:1 (WCAG AA
// verlangt 4,5:1 fuer diese Schriftgroesse).
function Eyebrow({ children }) {
  return (
    <div className="lp-eyebrow">
      <span aria-hidden="true" className="lp-eyebrow-dot" />
      {children}
    </div>
  );
}

function Linie({ size = 24, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const IconDoc = () => (
  <Linie size={28}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h4" />
  </Linie>
);
const IconChat = () => (
  <Linie size={28}>
    <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 16H9l-4 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 5z" />
    <path d="M7.5 9.5h9M7.5 12.5h5.5" />
  </Linie>
);
const IconWarn = () => (
  <Linie size={22}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Linie>
);
const IconRegler = () => (
  <Linie size={22}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Linie>
);
const IconPin = () => (
  <Linie size={22}>
    <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Linie>
);
const IconClipboard = () => (
  <Linie size={22}>
    <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    <path d="M9 3h6v3H9z" />
    <path d="m8.5 12.5 2 2 4-4" />
    <path d="M8.5 18h7" />
  </Linie>
);
const IconUser = () => (
  <Linie>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Linie>
);
const IconUpload = () => (
  <Linie>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 17v-6" />
    <path d="m9 13 3-3 3 3" />
  </Linie>
);
const IconBars = () => (
  <Linie>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Linie>
);

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
  // Fester Handy-Balken erst zeigen, wenn der Hero-Knopf aus dem Bild ist
  // (sonst stehen zwei "Kostenlos starten" gleichzeitig auf dem Screen).
  const heroCtaRef = useRef(null);
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setHeroCtaVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Sanftes Einblenden der Abschnitte und Karten beim Scrollen. Aus bei "Bewegung
  // reduzieren" und ohne IntersectionObserver. Stufung je Geschwister-Position,
  // damit Kartenreihen nacheinander erscheinen statt alle gleichzeitig.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ziele = Array.from(
      document.querySelectorAll(".lp-ki-top,.lp-ki-karte,.lp-step,.calc-hero-card,.calc-cards-support>*"),
    );
    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          io.unobserve(el);
          el.classList.add("lp-rev-in");
          setTimeout(() => el.classList.remove("lp-rev", "lp-rev-in"), 1100);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    ziele.forEach((el) => {
      // Schon oberhalb des Bildschirms (z.B. nach Neuladen mitten auf der Seite):
      // gar nicht erst ausblenden, sonst bliebe es unsichtbar, bis man hochscrollt.
      if (el.getBoundingClientRect().bottom < 0) return;
      const pos = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--rd", `${(pos % 4) * 70}ms`);
      el.classList.add("lp-rev");
      io.observe(el);
    });
    return () => {
      io.disconnect();
      ziele.forEach((el) => el.classList.remove("lp-rev", "lp-rev-in"));
    };
  }, []);

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
  // Die App-Ansicht ist seit 2026-09-09 nur angemeldet erreichbar (siehe
  // App.jsx). Dort wird ein nicht angemeldeter Nutzer auf die Landingpage
  // zurueckgeworfen - ohne diesen Umweg passierte auf einen Rechnerklick
  // scheinbar nichts. Deshalb hier gar nicht erst hineinfuehren, sondern den
  // Login oeffnen: derselbe Dialog, den auch der "Anmelden"-Knopf zeigt, und
  // nach erfolgreicher Anmeldung landet man bei seinen Objekten (openMode
  // "login" ruft onStart("saved") beim Schliessen).
  const starteRechner = (tab, opts) => {
    if (!account?.isLoggedIn) {
      setOpenMode("login");
      return;
    }
    onStart(tab, opts);
  };
  const landingCtxValue = {
    lang,
    setLang,
    savedList,
    isProSavedObjects,
    savedObjectsFreeLimit,
    setTabExt: (id) => starteRechner(id),
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
  // Reihenfolge = Reihenfolge der Sektionen auf der Seite (seit 2026-09-28
  // stehen die KI-Funktionen direkt unter dem Hero). Kopfzeile und
  // Handy-Schublade teilen sich diese eine Liste.
  const navItems = [
    { key: "ki", label: l.navKi, onSelect: () => scrollTo("ki") },
    { key: "funktioniert", label: l.navHow, onSelect: () => scrollTo("funktioniert") },
    { key: "rechner", label: l.navRechner, onSelect: () => scrollTo("rechner") },
    { key: "preise", label: l.navPreise, onSelect: () => scrollTo("preise") },
    { key: "zinsen", label: l.navZinsen, onSelect: () => scrollTo("zinsen") },
  ];

  return (
    <div
      className={account && !account.initialLoading && !account.isLoggedIn ? "lp-sticky-pad" : undefined}
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
            // Muss mit .lp-container fluchten, sonst sitzt das Logo nicht
            // mehr ueber der Inhaltskante - dort jetzt ohne feste Deckelung.
            maxWidth: "none",
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
            {navItems.map((n) => (
              <button key={n.key} onClick={n.onSelect} style={navLink}>
                {n.label}
              </button>
            ))}
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
              navItems={navItems}
              langSelector={<LangSel lang={lang} setLang={setLang} align="left" />}
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
            {/* REQ-LP-01 (Nutzer-Konzept 2026-08-11): eingeloggt "Jetzt
                rechnen". Seit 2026-09-28 (Landing Option C, Nutzer-Freigabe)
                bekommen auch nicht eingeloggte Besucher einen gefuellten
                "Kostenlos starten"-Knopf neben "Anmelden": beide oeffnen
                dieselbe Anmeldung, aber nur einer sagt, dass der Einstieg
                nichts kostet. Erst ab 1200px (.lp-cta-free), darunter reicht
                der Platz neben Navigation und Sprachwahl nicht. Die
                serverseitige Durchsetzung uebernehmen ohnehin requireAuth +
                CalculatorTrialGate, unabhaengig von dieser reinen UI-Sichtbarkeit. */}
            {account && !account.initialLoading && (
              <button
                onClick={() => (account.isLoggedIn ? scrollTo("rechner") : setOpenMode("login"))}
                className={account.isLoggedIn ? "lp-cta" : "lp-cta lp-cta-free"}
                style={{
                  padding: "10px 18px",
                  background: account.isLoggedIn ? "var(--ca)" : "var(--ca-dk)",
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
                {account.isLoggedIn ? l.heroCtaPrimary : l.ctaFree}
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
              landet bei seinen Objekten. Passwort laeuft ohne Redirect, der
              Wizard schliesst sich nur selbst und der Nutzer stand wieder auf
              der Landingpage, wo er "Jetzt rechnen" erst suchen musste.
              Derselbe Vorsatz fuehrte also je nach Anmeldeweg woanders hin,
              entgegen der Vorgabe in App.jsx ("Login landet immer auf dem
              Dashboard, nie zurueck auf S1"). Jetzt fuehren beide Wege in die
              Objekt-Uebersicht ("saved", Standardeinstieg seit A5; bis
              2026-09-30 stand hier der Renditerechner) - bei Abbruch ohne
              Anmeldung bleibt alles wie gehabt. */}
            {openMode === "login" && (
              <CheckoutWizard
                onClose={() => {
                  setOpenMode(null);
                  if (account?.isLoggedIn) onStart("saved");
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
      {/* Bugfund 2026-08-11: Passwort-Login ueber "Anmelden" auf
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
      {/* Neugestaltung 2026-09-28 (Landing Option C, Hero E - Nutzer-Auswahl
          aus fuenf Varianten): zentrierter Text auf weichem Orange-Schimmer,
          ohne Bild. Vorher rechts ein Browser-Mockup mit Beispielzahlen und
          darunter die Exposé-Kachel. Nachgebaute Oberflaechen muessten bei
          jeder App-Aenderung mitgezogen werden - Nutzer-Vorgabe: keine
          Screenshots, Bilder sollen universell sein. Die KI-Funktionen folgen
          direkt darunter in einer eigenen Sektion statt als Labels hier
          (Nutzer-Korrektur am Mockup: sonst doppelt). */}
      <section
        className="lp-container lp-hero"
        style={{
          paddingTop: "clamp(40px,7vw,88px)",
          paddingBottom: "clamp(44px,7vw,96px)",
          width: "100%",
        }}
      >
        <Stern className="lp-stern lp-hero-stern" size={26} style={{ left: "11%", top: "16%" }} />
        <Stern
          className="lp-stern lp-hero-stern lp-stern-hell"
          size={16}
          style={{ left: "14%", top: "27%", animationDelay: "300ms" }}
        />
        <Stern
          className="lp-stern lp-hero-stern lp-stern-hell"
          size={22}
          style={{ right: "11%", top: "20%", animationDelay: "600ms" }}
        />
        <div className="lp-hero-inner">
          <h1 className="lp-hero-h1">
            {l.h1a}
            <span style={{ color: "var(--ca)" }}>{l.h1b}</span>
            {l.h1c.startsWith(" ") ? " " : ""}
            <br className="lp-h1-br" />
            {l.h1c.trim()}
          </h1>
          <p className="lp-auf lp-hero-sub" style={{ animationDelay: "60ms" }}>
            {l.subShort}
          </p>
          {/* REQ-LP-01: nicht eingeloggte Besucher starten kostenlos ueber
              die Anmeldung (Konto + 7-Tage-Test), eingeloggte springen direkt
              zu den Rechnern. */}
          <div className="lp-auf lp-hero-ctas" style={{ animationDelay: "120ms" }}>
            <button
              ref={heroCtaRef}
              onClick={() => (account?.isLoggedIn ? scrollTo("rechner") : setOpenMode("login"))}
              className="lp-btn-primary"
            >
              {account?.isLoggedIn ? l.heroCtaPrimary : l.ctaFree}{" "}
              <span aria-hidden="true">→</span>
            </button>
            <button onClick={() => scrollTo("funktioniert")} className="lp-btn-secondary">
              {l.heroCtaSecondary}
            </button>
          </div>
          <div className="lp-auf lp-hero-trust" style={{ animationDelay: "180ms" }}>
            {[at.pricingTrialBadge, l.heroTrustLang].map((txt) => (
              <span key={txt}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ok-tx)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {txt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ KI-FUNKTIONEN ═══════════ */}
      {/* Ersetzt 2026-09-28 die fruehere Sektion "Mehr als nur ein Rechner"
          (USP + Datenbasis) und steht bewusst direkt unter dem Hero: die
          KI-Funktionen sind das, was ImmoFuchs von einem reinen Rechner
          unterscheidet (Nutzer-Vorgabe: KI-Funktionen hervorheben). Schwarz
          (#111111, seit 2026-09-29 statt Marineblau, auch im Dark Mode
          unveraendert) hebt sie als einzige dunkle Flaeche der Seite ab. Ohne eigene Buttons (Nutzer-Korrektur am
          Mockup) - der Einstieg laeuft ueber die Konto-Anmeldung. */}
      <section id="ki" className="lp-ki">
        <div className="lp-container">
          <div className="lp-ki-top">
            <div>
              <div className="lp-ki-eyebrow">
                <Stern className="lp-stern" size={13} />
                <Stern className="lp-stern" size={17} style={{ animationDelay: "300ms" }} />
                <Stern className="lp-stern" size={13} style={{ animationDelay: "600ms" }} />
                <span style={{ marginLeft: 4 }}>{l.navKi}</span>
              </div>
              <h2 className="lp-ki-h2">{l.kiH2}</h2>
              <p className="lp-ki-lead">{l.kiLead}</p>
            </div>
            <div className="lp-ki-maskottchen" aria-hidden="true">
              <img src="/finn.webp" alt="" width="166" height="280" loading="lazy" />
            </div>
          </div>
          <div className="lp-ki-main">
            {[
              { icon: <IconDoc />, h: l.kiScanH, p: l.kiScanP },
              { icon: <IconChat />, h: l.kiFinnH, p: l.kiFinnP },
            ].map((k) => (
              <div key={k.h} className="lp-ki-karte lp-ki-karte-gross">
                <span className="lp-ki-ic lp-ki-ic-gross">{k.icon}</span>
                <div>
                  <h3>{k.h}</h3>
                  <p>{k.p}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-ki-more">
            {[
              { icon: <IconWarn />, h: l.kiRiskH, p: l.kiRiskP },
              { icon: <IconRegler />, h: l.kiHebelH, p: l.kiHebelP },
              { icon: <IconPin />, h: l.kiLageH, p: l.kiLageP },
              { icon: <IconClipboard />, h: l.kiHandoutH, p: l.kiHandoutP },
            ].map((k) => (
              <div key={k.h} className="lp-ki-karte">
                <span className="lp-ki-ic">{k.icon}</span>
                <h3>{k.h}</h3>
                <p>{k.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      {/* Gestaltung 2026-09-28 an die neue Landingpage angeglichen: SVG statt
          Emoji (rendern je Plattform anders, Screenreader lasen sie vor),
          "Schritt 1" in der Seitensprache statt festem "STEP 1", weisse Karten
          auf Seitengrund. Inhalt und Reihenfolge der vier Schritte unveraendert
          (Nutzer-Vorgabe 2026-09-11). */}
      <section id="funktioniert" style={{ padding: "clamp(40px,5vw,80px) 0" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>{l.howTitle}</Eyebrow>
            <h2 className="lp-h2">{l.howShort}</h2>
          </div>
          <div className="how-steps-grid">
            {[
              { n: 1, icon: <IconUser />, t: l.step1H, d: l.step1P },
              { n: 2, icon: <IconUpload />, t: l.step2H, d: l.step2P },
              { n: 3, icon: <IconBars />, t: l.step3H, d: l.step3P },
              { n: 4, icon: <Stern size={22} />, t: l.step4H, d: l.step4P },
            ].map((s) => (
              <div key={s.n} className="lp-step lp-karte">
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <span className="lp-step-ic">{s.icon}</span>
                  <span className="lp-step-n">
                    {l.stepLabel} {s.n}
                  </span>
                </div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CALCULATOR CARDS ═══════════ */}
      <section
        id="rechner"
        style={{
          padding: "clamp(40px,5vw,72px) 0",
          background: "var(--cc)",
          borderTop: "1px solid var(--cb)",
        }}
      >
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>{l.cardsTitle}</Eyebrow>
            <h2 className="lp-h2">{l.cardsSub}</h2>
          </div>

          {/* ── HERO: Renditerechner ── */}
          {/* Fuehrt seit 2026-09-11 zum Objekt-Tab statt direkt in den
              Rechner (Nutzer-Vorgabe): "Objekt anlegen" ist dort der
              Einstieg, der Nutzer landet danach ohnehin im Renditerechner -
              siehe Merkliste.objektAnlegen(). Der direkte Rechner-Link ohne
              Objekt bleibt fuer die 5 Ergaenzungsrechner unten bestehen, die
              erzeugen bewusst kein Objekt. */}
          <button
            onClick={() => starteRechner("saved")}
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
                onClick={() => starteRechner(c.tab)}
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

      {/* ═══════════ ZINSEN ═══════════ */}
      {/* Die Zinsdaten werden monatlich aktualisiert (Nutzer-Korrektur
          2026-09-28: vorher hiess es "tagesaktuell", dazu ein pulsierender
          Live-Punkt - beides versprach mehr, als die Daten leisten). */}
      <section
        id="zinsen"
        style={{ padding: "clamp(36px,4vw,56px) 24px", borderTop: "1px solid var(--cb)" }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ borderLeft: "3px solid var(--ca)", paddingLeft: 20 }}>
            <div className="lp-eyebrow" style={{ letterSpacing: 1.5 }}>
              <span aria-hidden="true" className="lp-eyebrow-dot" />
              {l.ratesTitle} · {l.ratesStand}: {standLesbar(zinsen?.stand || MARKET_RATES.stand, lang)}
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--cl)", lineHeight: 1.6 }}>
              {l.ratesIntro2}{" "}
              <strong>
                {l.ratesCompact}: {zinsen?.avg || MARKET_RATES.avg} %
              </strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ch)", lineHeight: 1.5 }}>
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
      /* Keine feste Deckelung (gemessen 2026-09-09, dritter Anlauf).
         Vorgeschichte: erst 1400px, dann 1180px (der Breite des
         Rechnerinhalts), dann wieder 1400px - keiner der Werte loeste das
         Problem, weil das Problem kein Wert ist.

         Der Rechner SKALIERT mit dem Fenster: .shell hat max-width:none, die
         Sidebar klebt bei x=0, der Inhalt zentriert sich in der Restbreite.
         Ein zentrierter Kasten mit fester Breite kann das prinzipiell nicht
         einholen - er behaelt links wie rechts denselben Rand, der auf
         breiten Schirmen immer groesser wird:

             Viewport 1600:  Rechner 0..1495, Kasten(1400)   85..1485  ok
             Viewport 2560:  Rechner 0..1990, Kasten(1400)  565..1965  Insel

         Auf einem 2560er-Monitor blieben links 565px und rechts 595px leer,
         waehrend der Rechner am linken Rand beginnt - genau der vom Nutzer
         gemeldete Unterschied. Deshalb hier dieselbe Regel wie bei .shell:
         volle Breite, gesteuert nur ueber das responsive Seitenpadding
         (14/28/40px je Breakpoint). Wo Zeilenlaengen wichtig sind, deckeln
         die einzelnen Abschnitte weiterhin selbst. */
      .lp-container{max-width:none;margin:0 auto;padding:0 14px;box-sizing:border-box}
      @media(min-width:700px){.lp-container{padding-left:28px;padding-right:28px}}
      @media(min-width:1100px){.lp-container{padding-left:40px;padding-right:40px}}
      /* ── Landing Option C (2026-09-28) ── */
      @keyframes lp-auf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @keyframes lp-stern{0%{opacity:.4;transform:scale(.8)}100%{opacity:1;transform:scale(1.15)}}
      .lp-auf{animation:lp-auf .32s var(--ease-out) both}
      /* Endliche Wiederholung statt infinite: die Sterne sollen beim
         Ankommen aufmerksam machen, nicht dauerhaft neben dem Text flackern. */
      .lp-stern{display:inline-block;flex-shrink:0;animation:lp-stern 1.8s ease-in-out 6 alternate}
      /* Ohne Orange-Schimmer im Hintergrund (Nutzer-Korrektur 2026-09-28). */
      .lp-hero{position:relative;text-align:center}
      .lp-hero-stern{position:absolute;pointer-events:none;color:var(--ca)}
      .lp-stern-hell{color:#ffb27a}
      /* Handy/Tablet: zwei kleine Sterne im oberen Polster des Heros (dort liegt
         kein Text), der mittlere entfaellt - die grossen Positionen wuerden die
         Ueberschrift ueberdecken. */
      @media(max-width:1180px){
        .lp-hero-stern{width:13px;height:13px}
        .lp-hero-stern:nth-of-type(1){left:10%!important;top:16px!important}
        .lp-hero-stern:nth-of-type(2){display:none}
        .lp-hero-stern:nth-of-type(3){right:12%!important;top:22px!important}
      }
      .lp-hero-inner{max-width:980px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:24px}
      .lp-hero-h1{margin:0;font-size:clamp(34px,5.2vw,64px);font-weight:800;color:var(--ct);letter-spacing:-1.2px;line-height:1.05}
      .lp-hero-sub{margin:0;max-width:720px;font-size:clamp(16px,1.6vw,19px);color:var(--cl);line-height:1.55}
      .lp-hero-ctas{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
      .lp-btn-primary,.lp-btn-secondary{min-height:52px;padding:0 26px;border-radius:12px;font-family:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
      .lp-btn-primary{border:none;background:var(--ca);color:#fff;font-size:17px;box-shadow:0 8px 20px rgba(232,96,10,.28);transition:background .15s,transform .12s var(--ease-out)}
      .lp-btn-secondary{transition:transform .12s var(--ease-out)}
      .lp-btn-primary:hover{background:var(--ca-dk)}
      .lp-btn-secondary{border:1.5px solid var(--cb);background:var(--cc);color:var(--ct);font-size:16px;font-weight:600}
      .lp-hero-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;font-size:14px;color:var(--cl)}
      .lp-hero-trust>span{display:inline-flex;align-items:center;gap:6px}
      @media(max-width:560px){
        .lp-h1-br{display:none}
        .lp-hero-ctas{width:100%;flex-direction:column}
        .lp-hero-ctas>button{justify-content:center;width:100%}
      }
      .lp-eyebrow{display:inline-flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ct)}
      .lp-eyebrow-dot{width:7px;height:7px;border-radius:50%;background:var(--ca);flex-shrink:0}
      .lp-h2{margin:0;font-size:clamp(26px,3vw,40px);font-weight:800;color:var(--ct);letter-spacing:-.5px;line-height:1.15}
      .lp-karte{transition:transform .2s var(--ease-out),box-shadow .2s,border-color .2s}
      .lp-karte:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(30,58,95,.12);border-color:var(--ca)}
      /* Sanftes Einblenden beim Scrollen (Nutzerwunsch 2026-09-30, Handy hatte keine
         Effekte). Die Klassen setzt ein Effekt in Landing() erst per Skript - ohne
         JS bleibt alles sichtbar. Nach dem Einblenden werden sie wieder entfernt,
         damit Hover/Druck-Effekte der Karten ihre eigenen Zeiten behalten. */
      .lp-rev{opacity:0;transform:translateY(14px);transition:opacity .5s var(--ease-out),transform .5s var(--ease-out);transition-delay:var(--rd,0ms)}
      .lp-rev.lp-rev-in{opacity:1;transform:none}
      /* Touch hat kein Hover: stattdessen ein kurzes Eindruecken beim Antippen. */
      @media(hover:none){
        .lp-karte:active,.lp-ki-karte:active{transform:scale(.985)}
        .lp-btn-primary:active,.lp-btn-secondary:active{transform:scale(.98)}
      }
      /* KI-Sektion folgt dem Theme (Nutzer 2026-09-30, vorher festes Schwarz): leicht
         abgesetzter Streifen (--cro) mit Karten wie die uebrigen Bereiche. */
      .lp-ki{background-color:var(--cro);padding:clamp(48px,6vw,88px) 0;color:var(--ct)}
      .lp-ki-top{display:grid;grid-template-columns:1fr;gap:32px;align-items:center;margin-bottom:36px}
      @media(min-width:900px){.lp-ki-top{grid-template-columns:1fr 1fr;gap:56px}}
      .lp-ki-eyebrow{display:flex;align-items:center;gap:6px;margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ct)}
      .lp-ki-eyebrow svg{color:var(--ca)}
      .lp-ki-h2{margin:0 0 14px;font-size:clamp(28px,3.4vw,46px);font-weight:800;letter-spacing:-.8px;line-height:1.1;color:var(--ct)}
      .lp-ki-lead{margin:0;max-width:560px;font-size:clamp(16px,1.4vw,18px);line-height:1.6;color:var(--cl)}
      .lp-ki-maskottchen{display:none}
      @media(min-width:900px){.lp-ki-maskottchen{display:flex;justify-content:center;align-items:center}}
      /* Finn als Oberkörper (2026-09-29, ersetzt den Kopf) ohne Kreis-Zuschnitt
         und ohne Orange-Schein; der untere Rand blendet per Maske ins Schwarz
         aus, das Bild endet an der Hüfte. */
      .lp-ki-maskottchen img{width:auto;height:280px;-webkit-mask-image:linear-gradient(to bottom,#000 72%,transparent 100%);mask-image:linear-gradient(to bottom,#000 72%,transparent 100%)}
      .lp-ki-main,.lp-ki-more{display:grid;grid-template-columns:1fr;gap:16px}
      .lp-ki-more{margin-top:16px}
      @media(min-width:760px){.lp-ki-main{grid-template-columns:1fr 1fr}.lp-ki-more{grid-template-columns:1fr 1fr}}
      @media(min-width:1100px){.lp-ki-more{grid-template-columns:repeat(4,1fr)}}
      .lp-ki-karte{padding:24px;border-radius:12px;background:var(--cc);border:1px solid var(--cb);display:flex;flex-direction:column;gap:10px;transition:border-color .2s,transform .15s var(--ease-out)}
      .lp-ki-karte:hover{border-color:rgba(232,96,10,.6)}
      .lp-ki-karte-gross{padding:28px;flex-direction:row;gap:20px;align-items:flex-start}
      .lp-ki-karte h3{margin:0;font-size:18px;font-weight:800;color:var(--ct)}
      .lp-ki-karte-gross h3{font-size:22px;margin-bottom:8px}
      .lp-ki-karte p{margin:0;font-size:15px;line-height:1.55;color:var(--cl)}
      .lp-ki-karte-gross p{font-size:16px}
      .lp-ki-ic{width:46px;height:46px;flex-shrink:0;border-radius:12px;border:1px solid var(--cb);background:var(--ca-bg);display:inline-flex;align-items:center;justify-content:center;color:var(--ca-dk)}
      .lp-ki-ic-gross{width:56px;height:56px}
      .lp-step{padding:26px;border:1px solid var(--cb);border-radius:12px;background:var(--cc)}
      .lp-step h3{margin:0 0 6px;font-size:19px;font-weight:800;color:var(--ct);letter-spacing:-.2px}
      .lp-step p{margin:0;font-size:15px;line-height:1.55;color:var(--cl)}
      .lp-step-ic{width:48px;height:48px;flex-shrink:0;border-radius:12px;background:var(--ca-bg);color:var(--ca-dk);display:inline-flex;align-items:center;justify-content:center}
      .lp-step-n{font-size:14px;font-weight:700;color:var(--ca-dk)}
      /* Dark Mode: --ca-dk (#c44d00) erreicht auf dunklen Karten nur ~3:1,
         dort traegt das hellere --ca (~5:1). */
      html[data-theme="dark"] .lp-step-n,html[data-theme="dark"] .lp-step-ic,html[data-theme="dark"] .lp-ki-ic{color:var(--ca)}
      @media(prefers-color-scheme:dark){html:not([data-theme="light"]):not([data-theme="dark"]) :is(.lp-step-n,.lp-step-ic,.lp-ki-ic){color:var(--ca)}}
      /* Handy: fester "Kostenlos starten"-Balken unten, nur fuer nicht
         eingeloggte Besucher. Finns Knopf sitzt mit bottom:76px darueber. */
      .lp-sticky-cta{display:none}
      @media(max-width:560px){
        .lp-sticky-cta{display:block;position:fixed;left:0;right:0;bottom:0;z-index:40;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:var(--cc);border-top:1px solid var(--cb)}
        .lp-sticky-cta button{width:100%;min-height:48px;border:none;border-radius:12px;background:var(--ca-dk);color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer}
        .lp-sticky-pad{padding-bottom:calc(72px + env(safe-area-inset-bottom))}
      }
      @media(prefers-reduced-motion:reduce){
        .lp-auf,.lp-stern{animation:none}
        .lp-karte:hover{transform:none}
        .lp-rev{opacity:1;transform:none;transition:none}
        .lp-karte:active,.lp-ki-karte:active,.lp-btn-primary:active,.lp-btn-secondary:active{transform:none}
      }
      .calc-hero-card{grid-template-columns:1fr!important}
      @media(min-width:640px){.calc-hero-card{grid-template-columns:1fr 1fr!important}}
      .calc-hero-card>div:first-child{min-height:200px}
      @media(min-width:640px){.calc-hero-card>div:first-child{min-height:0;height:100%}}
      .calc-cards-support{display:grid;grid-template-columns:1fr;gap:12px}
      .calc-cards-support>*{width:100%;min-width:0;box-sizing:border-box}
      @media(min-width:640px){.calc-cards-support{grid-template-columns:repeat(3,1fr)}}
      @media(min-width:900px){.calc-cards-support{grid-template-columns:repeat(5,1fr)}}
      .how-steps-grid{display:grid;grid-template-columns:1fr;gap:16px}
      @media(min-width:560px){.how-steps-grid{grid-template-columns:repeat(2,1fr)}}
      @media(min-width:1000px){.how-steps-grid{grid-template-columns:repeat(4,1fr);gap:20px}}
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
      /* Navigation seit 2026-09-28 mit fuenf Eintraegen (KI-Funktionen dazu)
         - sie klappt deshalb schon unter 1000px in die Schublade, nicht erst
         unter 880px. Der "Kostenlos starten"-Knopf im Kopf braucht noch
         mehr Platz und erscheint erst ab 1200px. */
      .lp-cta-free{display:none}
      @media(min-width:1200px){.lp-cta-free{display:inline-block}}
      @media(max-width:1000px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
      }
      @media(max-width:880px){
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
      {account && !account.initialLoading && !account.isLoggedIn && !heroCtaVisible && (
        <div className="lp-sticky-cta">
          <button onClick={() => setOpenMode("login")}>{l.ctaFree}</button>
        </div>
      )}
      <LandingMascot onStart={starteRechner} lang={lang} />
    </div>
  );
}
