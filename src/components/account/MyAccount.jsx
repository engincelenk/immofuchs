import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { BrandIcon } from "../ui/BrandIcon.jsx";
import { PlanChip } from "./PlanChip.jsx";
import { AccountAvatarButton, AccountMenu } from "./AccountMenu.jsx";
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

export function MyAccount({ onClose, initialSection = "profil" }) {
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
  // Mobile-Bereichswahl: erst eine scrollende Reiterleiste (zwang zum
  // Scrollen nach rechts), dann ein Chevron mit Inline-Aufklappen darunter.
  // Nutzer-Vorgabe 2026-08-11 (dritte Runde): dasselbe ☰-Slide-in-Muster wie
  // die neue mobile Navigation auf Landing.jsx, fuer optische Konsistenz
  // zwischen beiden Vollbild-Bereichen. Zum Unterschied gegenueber Landing
  // (ui-designer-Agent-Empfehlung): Panel-Kopf zeigt Kontoidentitaet statt
  // Marke/Logo, keine Sprachwahl (lebt bereits unter Einstellungen).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  // Avatar-Menue im Kopf (Nutzer-Entwurf 2026-08-12) - hier in der
  // Kurzfassung: Name, E-Mail, Abmelden. Die Bereiche stehen daneben in der
  // Seitenleiste bzw. im ☰-Panel, im Menue waeren sie eine Doppelung.
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  // Eigener Escape-Handler mit stopPropagation in der Capture-Phase: ohne
  // das wuerde Escape sowohl diesen Handler ALS AUCH den bubble-phasigen
  // Handler aus useFocusTrap(dialogRef, onClose) unten ausloesen - letzterer
  // schliesst das gesamte "Mein Konto", nicht nur das Nav-Panel. Capture
  // laeuft vor Bubble, stopPropagation verhindert also, dass der
  // Fokus-Trap-Handler das Panel-Schliessen zum Verlassen von Mein Konto
  // eskaliert.
  // Die Scroll-Sperre liegt bewusst NICHT mehr hier, sondern im Effekt
  // darunter, der sie fuer die gesamte Lebensdauer dieses Bereichs haelt.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [mobileNavOpen]);

  // Nutzer-Feedback 2026-08-12: In "Mein Konto" waren ZWEI Scrollbalken
  // sichtbar - der dieser Flaeche (overflowY:auto auf dem fixed Overlay) und
  // zusaetzlich der der Seite dahinter, die weiterhin scrollbar blieb. Solange
  // dieser Bereich offen ist, wird der Seiten-Scroll deshalb gesperrt; es
  // bleibt genau ein Balken uebrig, der wie der gewohnte Browser-Scrollbalken
  // am rechten Rand sitzt.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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
  if (showUpgrade) return <CheckoutWizard onClose={onClose} entryPoint="payment" />;
  const sections = visibleSections(account.me.role);
  const active = sections.find((s) => s.key === activeKey) || sections[0];
  const ActiveSection = SECTION_COMPONENTS[active.key];

  return createPortal(
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 1000, overflowY: "auto" }}
    >
      <style>{`@keyframes myaccount-drawer-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.accountTitle}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* paddingTop mit safe-area-inset (Bugreport 06.08.): ohne das lag die
            Kopfzeile auf iOS unter der Statusleiste - Uhrzeit und Titel
            ueberlappten sich. Gleiche Behandlung wie .hdr in App.jsx. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 20px",
            paddingTop: "calc(14px + env(safe-area-inset-top))",
          }}
        >
          {/* Kopfzeile nach Nutzer-Entwurf 2026-08-12 (Bild 2): links Logo mit
              Wortmarke und Tarif-Chip, rechts der Avatar. "Abmelden" steckt
              seither IM Avatar-Menue - damit ist es auch nicht mehr Nachbar
              des ✕, was am 12.08. als zu dicht gemeldet worden war. Die
              Begruessungszeile entfaellt: der Name steht jetzt im Avatar und
              im Menue darunter, eine dritte Nennung waere Wiederholung. */}
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <BrandIcon size={26} />
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, color: "var(--ct)" }}>
              immo<span style={{ color: "var(--ca)" }}>fuchs</span>
              <span style={{ fontWeight: 700 }}>.info</span>
            </span>
            {/* Mit Restlaufzeit der Testphase (anders als in der schmalen
                App-Kopfzeile) - beantwortet "wann wird abgebucht?" sofort,
                statt erst im Bereich Abonnement. */}
            <PlanChip t={t} me={account.me} withTrialDays />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <AccountAvatarButton
              t={t}
              me={account.me}
              open={menuOpen}
              onToggle={() => setMenuOpen((o) => !o)}
              innerRef={avatarRef}
            />
            {/* Im Entwurf gibt es keinen sichtbaren Rueckweg zu den Rechnern -
                ohne das ✕ waere diese Flaeche eine Sackgasse, deshalb bleibt
                es (mit dem Nutzer am 12.08. so abgestimmt). */}
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
                padding: "0 0 0 4px",
              }}
            >
              ✕
            </button>
          </div>
        </div>
        {menuOpen && (
          <AccountMenu
            t={t}
            me={account.me}
            variant="compact"
            anchorRef={avatarRef}
            onClose={() => setMenuOpen(false)}
            onLogout={handleLogout}
            logoutBusy={logoutBusy}
          />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            alignItems: "stretch",
            gap: isDesktop ? 20 : 0,
            padding: isDesktop ? "8px 20px 40px" : "0 0 40px",
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
          ) : (
            <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--cb)" }}>
              {/* Nutzer-Vorgabe 2026-08-12: nur noch die Striche, wie auf der
                  Landingpage - ohne den Namen des aktuellen Bereichs. Der
                  steht ohnehin als Ueberschrift direkt darunter im Inhalt,
                  die Leiste hat ihn also doppelt gezeigt. */}
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-expanded={mobileNavOpen}
                aria-label={t.accountNavAria}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 40,
                  padding: 0,
                  borderRadius: 10,
                  border: "1px solid var(--cb)",
                  background: "var(--cc)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18 }}>☰</span>
              </button>
            </div>
          )}

          {mobileNavOpen && !isDesktop && (
            <>
              <div
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
                style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,.45)", zIndex: 1010 }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t.accountNavAria}
                style={{
                  position: "fixed",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: "min(300px, 84vw)",
                  background: "var(--cc)",
                  zIndex: 1011,
                  boxShadow: "6px 0 28px rgba(0,0,0,.18)",
                  display: "flex",
                  flexDirection: "column",
                  overflowY: "auto",
                  paddingTop: "env(safe-area-inset-top)",
                  animation: "myaccount-drawer-in .22s ease-out",
                }}
              >
                {/* Panel-Kopf zeigt Kontoidentitaet statt Marke/Logo
                    (ui-designer-Agent-Empfehlung 2026-08-11): anders als
                    Landing.jsx wird dieses Panel innerhalb eines bereits
                    identifizierten Kontos geoeffnet, die Marke steht schon in
                    der Kopfzeile darueber. */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--cb)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: "var(--ct)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {account.me.name || account.me.email}
                    </div>
                    {account.me.name && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--ch)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {account.me.email}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    aria-label={t.close}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 20,
                      color: "var(--ch)",
                      cursor: "pointer",
                      padding: 4,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ padding: "10px 12px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {sections.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        setActiveKey(s.key);
                        setMobileNavOpen(false);
                      }}
                      aria-current={s.key === activeKey ? "page" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: s.key === activeKey ? "var(--ca-bg)" : "transparent",
                        color: s.key === activeKey ? "var(--ca-dk)" : "var(--ct)",
                        fontSize: 13.5,
                        fontWeight: s.key === activeKey ? 700 : 600,
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        minHeight: 44,
                      }}
                    >
                      <s.Icon size={18} />
                      {t[s.labelKey]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ flex: 1, minWidth: 0, padding: isDesktop ? "0" : "20px 20px 0" }}>
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
