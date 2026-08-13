import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { useScrollLock } from "../../hooks/useScrollLock.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { AccountAvatarButton, AccountMenu } from "./AccountMenu.jsx";
import { HeaderMenu } from "./HeaderMenu.jsx";
import { visibleSections } from "./accountSections.js";
import { ProfilSection } from "./sections/ProfilSection.jsx";
import { AbonnementSection } from "./sections/AbonnementSection.jsx";
import { ZahlungenSection } from "./sections/ZahlungenSection.jsx";
import { EinstellungenSection } from "./sections/EinstellungenSection.jsx";
import { KontoSection } from "./sections/KontoSection.jsx";
import { SupportSection } from "./sections/SupportSection.jsx";
import { AdminSection } from "./sections/AdminSection.jsx";

// "Mein Konto" als vollflaechiger Bereich (Phase 2) - loest das bisherige
// kleine AccountPanel-Modal ab, in dem alle Kontofunktionen als eine einzige
// scrollende Liste untereinander hingen. Optik und Portal-Aufbau folgen
// bewusst dem Checkout-Wizard aus Phase 1, damit beide Vollbild-Flaechen als
// dieselbe Anwendung wahrgenommen werden.
//
// 6 Bereiche statt vormals 8 (Spec-v3.0 Kap. 4.1, Nutzerentscheidung 07.08.):
// Rechnungen ist jetzt Teil von "Zahlungen", Sprache Teil von
// "Einstellungen" (vorher "Datenschutz"), Sitzungen/Gespeicherte
// Berechnungen/Konto-Loeschung sind in "Konto" gebuendelt (Spec sieht dafuer
// keinen eigenen Bereich vor, die Funktionalitaet sollte aber nicht
// verloren gehen).
// Reihenfolge, Beschriftung, Icons und Rollenfilter liegen seit dem
// Nutzer-Entwurf 2026-08-12 in accountSections.js - das Kontomenue im Kopf
// der App zeigt dieselbe Liste, eine zweite Kopie hier wuerde
// zwangslaeufig auseinanderlaufen. Hier bleibt nur die Zuordnung
// Bereich -> Komponente, die das Menue nicht braucht.
const SECTION_COMPONENTS = {
  profil: ProfilSection,
  abo: AbonnementSection,
  zahlung: ZahlungenSection,
  einstellungen: EinstellungenSection,
  support: SupportSection,
  konto: KontoSection,
  // Nur fuer role==='admin' (Filter in accountSections.js) - ersetzt die
  // vormals eigenstaendige admin/-App (Nutzer-Entscheidung 2026-08-11).
  admin: AdminSection,
};

// onBackToMenu (optional, Nutzer-Korrektur 2026-08-13): auf dem Handy fuehrt
// das ← zurueck ins Header-Menue statt den ganzen Kontobereich zu schliessen.
// Vorher endete der Weg hier in einer Sackgasse - man kam ueber das Menue in
// einen Bereich, das ← sprang aber gleich wieder ganz raus in die App, es gab
// also keinen Weg zur vorigen Stufe. Auf dem Desktop bleibt es beim
// Schliessen: dort steht die Bereichsliste ohnehin dauerhaft in der
// Seitenleiste, eine "vorige Stufe" gibt es nicht.
export function MyAccount({ onClose, onBackToMenu, initialSection = "profil" }) {
  const { lang, setLang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const isDesktop = useIsDesktop();
  const dialogRef = useRef(null);
  const [activeKey, setActiveKey] = useState(initialSection);
  // Upgrade-Einstieg fuer Free-Nutzer liegt bewusst hier und nicht im
  // Abo-Bereich: der Checkout-Wizard bringt einen eigenen Fokus-Trap mit, und
  // zwei gleichzeitig aktive Traps wuerden sich beim Tabben gegenseitig
  // ueberschreiben. Deshalb ersetzt der Wizard diesen Bereich komplett.
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  // Avatar-Menue im Kopf (Nutzer-Entwurf 2026-08-12). Auf dem Desktop die
  // Kurzfassung (Name, E-Mail, Abmelden) - die Bereiche stehen dort dauerhaft
  // in der Seitenleiste. Auf dem Handy die volle Fassung inklusive Bereiche,
  // seit die separate ☰-Zeile entfallen ist (Nutzer-Screenshot 2026-08-12:
  // eine ganze Zeile fuer einen einzelnen Knopf, daneben nur Weiss).
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  // Zwei Scrollbalken (Nutzer-Screenshots 12.08., zweiter Anlauf): siehe
  // useScrollLock.js fuer die volle Begruendung (html UND body sperren,
  // nicht nur body). Seit dem UX-Audit 2026-08-13 der gemeinsame Hook statt
  // einer eigenen Kopie, damit Sheet.jsx und dieser Bereich hier dieselbe
  // Logik teilen.
  useScrollLock(true);

  async function handleLogout() {
    setLogoutBusy(true);
    await account.logout();
    onClose();
  }

  // Bewusst OHNE deps: der Fokus-Trap ermittelt die fokussierbaren Elemente
  // bei jedem Tastendruck neu, ein Bereichswechsel braucht also keinen
  // Neuaufbau. Mit deps wuerde der Fokus nach jedem Klick in der Navigation
  // auf den Schliessen-Knopf zurueckspringen.
  useFocusTrap(dialogRef, onClose);

  if (!account?.me) return null;
  // Zwei Fehler auf einmal behoben (UX-Audit 2026-08-12):
  //
  // 1. entryPoint="payment" sprang direkt in die Zahlung. Die Variante
  //    "upgrade" kennt gar keinen Preise-Schritt (wizardSteps.js), `plan`
  //    fiel auf den Default "yearly" zurueck und "Plan aendern" war in dieser
  //    Variante abgeschaltet - wer von hier kam, konnte den Tarif also weder
  //    sehen noch auf monatlich wechseln. Ohne entryPoint startet der Wizard
  //    bei der Plan-Auswahl (der Konto-Schritt wird fuer Eingeloggte ohnehin
  //    uebersprungen), genau wie ueber die Rechner-Paywall und die Merkliste.
  // 2. onClose zeigte auf onClose dieses Bereichs, das ✕ des Wizards schloss
  //    also "Mein Konto" komplett - auch nach erfolgreichem Kauf. Und
  //    showUpgrade wurde nie zurueckgesetzt. Jetzt fuehrt Schliessen zurueck
  //    in den Abo-Bereich, wo dann direkt das frisch gebuchte Abo steht.
  if (showUpgrade) return <CheckoutWizard onClose={() => setShowUpgrade(false)} />;
  const sections = visibleSections(account.me.role);
  const active = sections.find((s) => s.key === activeKey) || sections[0];
  const ActiveSection = SECTION_COMPONENTS[active.key];

  return createPortal(
    <div
      role="presentation"
      // scrollbar-gutter:stable haelt den Platz fuer den Scrollbalken immer
      // frei. Ohne das ist die Flaeche bei kurzen Bereichen (Profil) 15px
      // breiter als bei langen (Konto & Sicherheit) - Logo und Bereichsliste
      // sprangen beim Bereichswechsel um 7px zur Seite. Zugleich stimmt die
      // linke Kante damit mit dem App-Shell ueberein, dessen Seite hinter dem
      // Overlay ebenfalls einen Balken zeigt.
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1000,
        overflowY: "scroll",
        scrollbarGutter: "stable",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.accountTitle}
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Nutzer-Feedback 2026-08-12: Der Wechsel vom Rechner hierher wirkte
            wie ein Bruch - "alles wird auf einmal kleiner". Ursache war eine
            eigene, deutlich kompaktere Kopfzeile (Logo 26px/Schrift 15px)
            gegenueber der des App-Shells (54px/24px, Hoehe 78px). Diese
            Kopfzeile uebernimmt deshalb exakt dessen Masse inklusive
            Umbruchpunkt bei 480px, sodass beim Oeffnen optisch nur der
            Inhalt darunter wechselt. Eigene Klassennamen statt .hdr-*, weil
            der Style-Block des App-Shells auf der Landingpage gar nicht
            gerendert wird - von dort laesst sich "Mein Konto" ebenfalls
            oeffnen.
            paddingTop mit safe-area-inset (Bugreport 06.08.): ohne das lag
            die Kopfzeile auf iOS unter der Statusleiste. */}
        <style>{`
          /* .ma-hdr-bar entspricht .hdr aus App.jsx: volle Fensterbreite,
             durchgehende Trennlinie, gleicher Hintergrund mit Weichzeichner.
             .ma-hdr und .ma-body wiederholen die Container-Masse von
             .hdr-inner bzw. .content (max-width 1400 + 14/28/40px Padding je
             Breakpoint) - dadurch beginnen Logo UND Bereichsliste automatisch
             auf derselben senkrechten Kante wie der Inhalt im Rechner. */
          .ma-hdr-bar{position:sticky;top:0;z-index:5;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);padding-top:env(safe-area-inset-top)}
          .ma-hdr{max-width:1400px;margin:0 auto;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;height:78px;padding:0 14px}
          .ma-body{max-width:1400px;margin:0 auto;width:100%;box-sizing:border-box;padding:14px 14px 40px}
          .ma-logo{width:38px;height:38px}
          .ma-wordmark{font-size:17px}
          .ma-brand{gap:8px}
          @media(min-width:480px){
            .ma-logo{width:54px;height:54px}
            .ma-wordmark{font-size:24px}
            .ma-brand{gap:14px}
          }
          @media(min-width:700px){
            .ma-hdr{padding-left:28px;padding-right:28px}
            .ma-body{padding:24px 28px 40px}
          }
          @media(min-width:1100px){
            .ma-hdr{padding-left:40px;padding-right:40px}
            .ma-body{padding:28px 40px 40px}
          }
        `}</style>
        <div className="ma-hdr-bar">
        <div className="ma-hdr">
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <div className="ma-brand" style={{ minWidth: 0, display: "flex", alignItems: "center" }}>
              <img
                src="/icon-192.png"
                alt="Immofuchs"
                className="ma-logo"
                style={{ objectFit: "contain", flexShrink: 0 }}
              />
              <span
                className="ma-wordmark"
                style={{ fontWeight: 800, letterSpacing: -0.5, lineHeight: 1, color: "var(--ct)", whiteSpace: "nowrap" }}
              >
                immo<span style={{ color: "var(--ca)" }}>fuchs</span>
                <span style={{ fontWeight: 700 }}>.info</span>
              </span>
            </div>
            {/* Nutzer-Vorgabe 2026-08-13: "Zurueck" ist eine globale
                Verlassen-Aktion (zurueck in die App), kein Bereich der
                Sidebar - deshalb hier neben dem Logo statt im rechten
                Cluster beim Avatar (die beiden wirkten dort 10px
                auseinander wie ein verklebter Klumpen) oder unten in der
                Bereichsliste (dort gibts auf dem Handy keine Entsprechung,
                die Liste existiert nur bei isDesktop, und ihre Laenge
                wandert mit der Rollenfilterung - "Zurueck" braucht eine
                stabile Position). Der Avatar steht dadurch jetzt allein
                rechts. */}
            <span aria-hidden="true" style={{ width: 1, height: 20, background: "var(--cb)", margin: "0 16px", flexShrink: 0 }} />
            {/* Auf dem Handy zurueck ins Menue (vorige Stufe), auf dem
                Desktop wie bisher raus in die App - siehe onBackToMenu oben. */}
            <button
              onClick={!isDesktop && onBackToMenu ? onBackToMenu : onClose}
              aria-label={t.wizardBack}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                background: "none",
                border: isDesktop ? "none" : "1px solid var(--cb)",
                borderRadius: isDesktop ? 0 : 999,
                width: isDesktop ? "auto" : 36,
                height: isDesktop ? "auto" : 36,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--ca-dk)",
                fontFamily: "inherit",
                padding: isDesktop ? "6px 2px" : 0,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span aria-hidden="true">←</span>
              {isDesktop && <span>{t.wizardBack}</span>}
            </button>
          </div>
          {/* Tarif-Chip sitzt jetzt IM Avatar statt neben dem Logo
              (Nutzer-Hinweis 12.08.): im App-Kopf stand er bereits dort,
              nebeneinander wirkten zwei Platzierungen fuer dieselbe
              Information uneinheitlich. Ohne Resttage - die stehen im
              Bereich "Abonnement", im Kopf waere die Zeile zu lang. */}
          <AccountAvatarButton
            t={t}
            me={account.me}
            open={menuOpen}
            onToggle={() => setMenuOpen((o) => !o)}
            innerRef={avatarRef}
            showChip
          />
        </div>
        </div>
        {/* Nutzer-Screenshot 2026-08-12: Auf dem Handy belegte der ☰-Knopf
            eine komplette eigene Zeile, in der sonst nichts stand (seit die
            Bereichsbezeichnung daraus entfernt wurde) - viel Weiss fuer einen
            44px-Knopf. Ausserdem standen dort zwei Menues uebereinander: der
            Avatar (Name/E-Mail/Abmelden) und ☰ (Bereiche), wobei der Avatar
            mobil nur "Abmelden" beitrug, weil Name und E-Mail bereits im Kopf
            des ☰-Panels standen. Beides loest dieselbe Massnahme: mobil
            oeffnet der Avatar das VOLLE Menue inklusive Bereiche, die
            ☰-Zeile entfaellt ersatzlos. Auf dem Desktop bleibt es bei
            Seitenleiste + Kurzmenue - dort gibt es keine Platznot und die
            Bereiche stehen ohnehin dauerhaft sichtbar daneben. */}
        {/* Immer gemountet statt `{menuOpen && ...}` - `open` steuert die
            Sichtbarkeit, nur so kann die Ausstiegs-Animation ablaufen (siehe
            AccountMenu.jsx/HeaderMenu.jsx). Desktop: kompaktes verankertes
            Dropdown (die Bereiche stehen dort bereits dauerhaft in der
            Seitenleiste). Mobil: Vollbild-Drill-down (HeaderMenu) - hier IST
            das Menue der einzige Weg, den Bereich zu wechseln, seit die
            Seitenleiste auf dem Handy nicht gerendert wird. */}
        {isDesktop ? (
          <AccountMenu
            t={t}
            me={account.me}
            open={menuOpen}
            variant="compact"
            anchorRef={avatarRef}
            onClose={() => setMenuOpen(false)}
            onSelect={(key) => {
              setMenuOpen(false);
              setActiveKey(key);
            }}
            onLogout={handleLogout}
            logoutBusy={logoutBusy}
          />
        ) : (
          <HeaderMenu
            t={t}
            me={account.me}
            open={menuOpen}
            isLoggedIn
            onClose={() => setMenuOpen(false)}
            onSelectSection={(key) => {
              setMenuOpen(false);
              setActiveKey(key);
            }}
            onLogout={handleLogout}
            logoutBusy={logoutBusy}
          />
        )}

        <div
          className="ma-body"
          style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            alignItems: "stretch",
            gap: isDesktop ? 24 : 0,
            flex: 1,
          }}
        >
          {isDesktop ? (
            <nav
              aria-label={t.accountNavAria}
              style={{ flex: "0 0 210px", display: "flex", flexDirection: "column", gap: 2 }}
            >
              {sections.map((s) => (
                <NavItem
                  key={s.key}
                  label={t[s.labelKey]}
                  Icon={s.Icon}
                  active={s.key === activeKey}
                  onClick={() => setActiveKey(s.key)}
                />
              ))}
            </nav>
          ) : null}

          {/* Inhaltsspalte gedeckelt: Ohne Deckel zoegen sich Zeilen wie
              "E-Mail ........ adresse@... ändern" auf einem 1920er-Schirm
              ueber ueber 1000px auseinander - Beschriftung und Wert haetten
              dann kaum noch erkennbar zusammengehoert. Die Bereichsliste
              bleibt davon unberuehrt und sitzt weiter buendig unter dem Logo. */}
          <div style={{ flex: 1, minWidth: 0, maxWidth: isDesktop ? 900 : "none" }}>
            <ActiveSection
              t={t}
              account={account}
              lang={lang}
              setLang={setLang}
              onClose={onClose}
              onUpgrade={() => setShowUpgrade(true)}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Desktop-Vertikalliste (mobil ersetzt durch die aufklappbare
// Bereichswahl weiter oben, siehe mobileNavOpen).
function NavItem({ label, Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--ca)" : "transparent"}`,
        background: active ? "var(--ca-bg)" : "transparent",
        // --ca-dk statt --ca: auf --ca-bg liegt --ca unter der WCAG-AA-Grenze
        // fuer diese Schriftgroesse (S2-5).
        color: active ? "var(--ca-dk)" : "var(--ct)",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
