import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { useScrollLock } from "../../hooks/useScrollLock.js";
import { goToLandingPage } from "../../utils/helpers.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { AccountAvatarButton, AccountMenu } from "./AccountMenu.jsx";
import { IconArrowLeft, IconChevronRight, IconHome } from "./accountIcons.jsx";
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
  // Avatar-Menue im Kopf. Auf dem Desktop die Kurzfassung (Name, E-Mail,
  // Abmelden) - die Bereiche stehen dort dauerhaft in der Seitenleiste. Auf
  // dem Handy die volle Fassung inklusive Bereiche.
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
            {/* Logo+Schriftzug fuehren zur Landingpage (Nutzer-Vorgabe
                2026-08-18) - ueber goToLandingPage() statt onClose(), weil
                dieser Bereich sowohl von der Landingpage als auch aus dem
                eingeloggten Rechner-Bereich (ProHeaderButton.jsx) geoeffnet
                wird und "onClose" je nach Herkunft etwas anderes bedeutet. */}
            <button
              onClick={goToLandingPage}
              aria-label="immofuchs.info"
              className="ma-brand"
              style={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <img
                src="/icon-192.png"
                alt=""
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
            </button>
            {/* Nutzer-Vorgabe 2026-08-13: "Zurueck" ist eine globale
                Verlassen-Aktion (zurueck in die App), kein Bereich der
                Sidebar - deshalb hier neben dem Logo statt im rechten
                Cluster beim Avatar (die beiden wirkten dort 10px
                auseinander wie ein verklebter Klumpen) oder unten in der
                Bereichsliste (dort gibts auf dem Handy keine Entsprechung,
                die Liste existiert nur bei isDesktop, und ihre Laenge
                wandert mit der Rollenfilterung - "Zurueck" braucht eine
                stabile Position). Der Avatar steht dadurch jetzt allein
                rechts.
                Nur noch Desktop (Nutzer-Korrektur 2026-08-14): auf dem Handy
                fuehrte "Zurueck ins Menue" hier bereits zur vorigen Stufe -
                der Knopf sitzt jetzt stattdessen bei der Bereichsueberschrift
                (SectionTitle.jsx / onBack), auf Hoehe von z.B. "Profil". */}
            {isDesktop && (
              <>
                <button
                  onClick={onClose}
                  aria-label={t.wizardBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--ca-dk)",
                    fontFamily: "inherit",
                    padding: "6px 2px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                >
                  <IconArrowLeft size={16} />
                  <span>{t.wizardBack}</span>
                </button>
              </>
            )}
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
        {/* Immer gemountet statt `{menuOpen && ...}` - `open` steuert die
            Sichtbarkeit, nur so kann die Ausstiegs-Animation ablaufen (siehe
            Sheet.jsx). Seit der Neugestaltung 2026-08-17 dieselbe Komponente
            wie im App-Kopf; sie waehlt selbst die Darstellung.
            Die Bereichsliste bleibt hier nur auf dem Desktop ausgespart
            (variant="compact"): dort steht sie dauerhaft in der Seitenleiste
            daneben, ein zweites Mal waere reine Wiederholung. Auf dem Handy
            wird die volle Liste gebraucht. */}
        <AccountMenu
          t={t}
          me={account.me}
          lang={lang}
          open={menuOpen}
          variant={isDesktop ? "compact" : "full"}
          anchorRef={avatarRef}
          onClose={() => setMenuOpen(false)}
          onSelect={(key) => {
            setMenuOpen(false);
            setActiveKey(key);
          }}
          onLogout={handleLogout}
          logoutBusy={logoutBusy}
        />

        <div className="ma-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Brotkrumen (Vorbild). Sie beantworten die Frage, die der
              Kontobereich vorher offen liess: wo bin ich, und wie komme ich
              eine Stufe zurueck? Das Haus fuehrt aus dem Kontobereich heraus
              in die Anwendung - dieselbe Handlung wie "Zurueck" oben, aber an
              der Stelle, an der man sie im Vorbild sucht. */}
          <nav aria-label={t.breadcrumbAria} style={{ marginBottom: 10 }}>
            <ol
              style={{
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                margin: 0,
                padding: 0,
                fontSize: 13,
              }}
            >
              <li style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={onClose}
                  aria-label={t.breadcrumbHomeAria}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    padding: 4,
                    margin: -4,
                    cursor: "pointer",
                    color: "var(--ch)",
                    fontFamily: "inherit",
                  }}
                >
                  <IconHome size={16} />
                </button>
              </li>
              <li aria-hidden="true" style={{ display: "flex", color: "var(--ch)" }}>
                <IconChevronRight size={14} />
              </li>
              <li style={{ color: "var(--ch)" }}>{t.accountTitle}</li>
              <li aria-hidden="true" style={{ display: "flex", color: "var(--ch)" }}>
                <IconChevronRight size={14} />
              </li>
              <li style={{ fontWeight: 700, color: "var(--ct)" }} aria-current="page">
                {t[active.labelKey]}
              </li>
            </ol>
          </nav>

          <div
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
                  groupStart={s.groupStart}
                  onClick={() => setActiveKey(s.key)}
                />
              ))}
            </nav>
          ) : (
            /* Mobile Bereichswahl (Neugestaltung 2026-08-17). Vorher gab es
               auf dem Handy GAR KEINE Navigation: wer einen Bereich offen
               hatte, musste ueber das ← zurueck ins Menue und von dort neu
               hinein, nur um von "Profil" nach "Zahlungen" zu wechseln. Die
               waagerecht scrollende Pillen-Leiste ist dasselbe Muster, das
               der Admin-Bereich bereits nutzt (AdminSection.jsx). */
            <nav
              aria-label={t.accountNavAria}
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 12,
                marginBottom: 4,
                // Zieht die Leiste bis an die Kanten des Inhaltsbereichs, damit
                // beim Scrollen nichts abgeschnitten "klebt".
                marginLeft: -14,
                marginRight: -14,
                paddingLeft: 14,
                paddingRight: 14,
                scrollbarWidth: "none",
              }}
            >
              {sections.map((s) => (
                <SectionPill
                  key={s.key}
                  label={t[s.labelKey]}
                  Icon={s.Icon}
                  active={s.key === activeKey}
                  onClick={() => setActiveKey(s.key)}
                />
              ))}
            </nav>
          )}

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
              onBack={!isDesktop ? onBackToMenu : undefined}
            />
          </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Desktop-Seitenleiste. Neugestaltung 2026-08-17: der aktive Eintrag trug
// vorher einen kompletten orangen Rahmen um die Pille - im Vorbild markiert
// eine ruhige Flaeche den Ort, kein Kasten. Statt des Rahmens jetzt eine
// getoente Flaeche mit einem senkrechten Balken an der linken Kante, der die
// Lesekante der Liste betont statt sie zu unterbrechen.
function NavItem({ label, Icon, active, groupStart, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: "none",
        background: active ? "var(--ca-bg)" : "transparent",
        // --ca-dk statt --ca: auf --ca-bg liegt --ca unter der WCAG-AA-Grenze
        // fuer diese Schriftgroesse (S2-5).
        color: active ? "var(--ca-dk)" : "var(--ct)",
        fontSize: 13.5,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        whiteSpace: "nowrap",
        // Trennlinie vor der zweiten Gruppe - dieselbe Gruppierung wie im
        // Menue, beide kommen aus accountSections.js.
        marginTop: groupStart ? 10 : 0,
        paddingTop: groupStart ? 16 : 10,
        // Explizit "none" statt undefined (Bugreport 2026-08-18): ein
        // undefined-Wert wird von React beim Setzen der Inline-Styles
        // uebersprungen statt border-top zurueckzusetzen - der Browser-
        // Standardrahmen des <button> blieb dadurch auf allen Items ausser
        // dem groupStart-Eintrag sichtbar ("Zwischenstriche").
        borderTop: groupStart ? "1px solid var(--cb)" : "none",
        borderTopLeftRadius: groupStart ? 0 : 10,
        borderTopRightRadius: groupStart ? 0 : 10,
      }}
    >
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: groupStart ? 10 : 6,
            bottom: 6,
            width: 3,
            borderRadius: 3,
            background: "var(--ca)",
          }}
        />
      )}
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

// Mobile Bereichswahl als waagerecht scrollende Pille - im Gegensatz zur
// Seitenleiste ohne Beschreibung und ohne Balken, weil die Leiste sonst
// breiter als der Bildschirm waere.
function SectionPill({ label, Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        flexShrink: 0,
        padding: "9px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--ca)" : "var(--cb)"}`,
        background: active ? "var(--ca-bg)" : "var(--cc)",
        color: active ? "var(--ca-dk)" : "var(--ct)",
        fontSize: 13.5,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        minHeight: 40,
      }}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}
