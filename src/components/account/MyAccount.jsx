import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";
import { ProfilSection } from "./sections/ProfilSection.jsx";
import { AbonnementSection } from "./sections/AbonnementSection.jsx";
import { RechnungenSection } from "./sections/RechnungenSection.jsx";
import { ZahlungsmethodenSection } from "./sections/ZahlungsmethodenSection.jsx";
import { GespeicherteSection } from "./sections/GespeicherteSection.jsx";
import { SicherheitSection } from "./sections/SicherheitSection.jsx";
import { DatenschutzSection } from "./sections/DatenschutzSection.jsx";
import { SupportSection } from "./sections/SupportSection.jsx";

// "Mein Konto" als vollflaechiger Bereich (Phase 2) - loest das bisherige
// kleine AccountPanel-Modal ab, in dem alle Kontofunktionen als eine einzige
// scrollende Liste untereinander hingen. Optik und Portal-Aufbau folgen
// bewusst dem Checkout-Wizard aus Phase 1, damit beide Vollbild-Flaechen als
// dieselbe Anwendung wahrgenommen werden.
const SECTIONS = [
  { key: "profil", labelKey: "navProfil", icon: "👤", Component: ProfilSection },
  { key: "abo", labelKey: "navAbonnement", icon: "👑", Component: AbonnementSection },
  { key: "rechnungen", labelKey: "navRechnungen", icon: "🧾", Component: RechnungenSection },
  { key: "zahlung", labelKey: "navZahlung", icon: "💳", Component: ZahlungsmethodenSection },
  { key: "gespeichert", labelKey: "navGespeichert", icon: "🔖", Component: GespeicherteSection },
  { key: "sicherheit", labelKey: "navSicherheit", icon: "🔒", Component: SicherheitSection },
  { key: "datenschutz", labelKey: "navDatenschutz", icon: "🛡", Component: DatenschutzSection },
  { key: "support", labelKey: "navSupport", icon: "💬", Component: SupportSection },
];

export function MyAccount({ onClose }) {
  const { lang, setLang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const isDesktop = useIsDesktop();
  const dialogRef = useRef(null);
  const [activeKey, setActiveKey] = useState("profil");
  // Upgrade-Einstieg fuer Free-Nutzer liegt bewusst hier und nicht im
  // Abo-Bereich: der Checkout-Wizard bringt einen eigenen Fokus-Trap mit, und
  // zwei gleichzeitig aktive Traps wuerden sich beim Tabben gegenseitig
  // ueberschreiben. Deshalb ersetzt der Wizard diesen Bereich komplett.
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Bewusst OHNE deps: der Fokus-Trap ermittelt die fokussierbaren Elemente
  // bei jedem Tastendruck neu, ein Bereichswechsel braucht also keinen
  // Neuaufbau. Mit deps wuerde der Fokus nach jedem Klick in der Navigation
  // auf den Schliessen-Knopf zurueckspringen.
  useFocusTrap(dialogRef, onClose);

  if (!account?.me) return null;
  if (showUpgrade) return <CheckoutWizard onClose={onClose} entryPoint="payment" />;
  const active = SECTIONS.find((s) => s.key === activeKey) || SECTIONS[0];
  const ActiveSection = active.Component;

  return createPortal(
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 1000, overflowY: "auto" }}
    >
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              🦊 {t.accountTitle}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ch)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {account.me.email}
            </div>
          </div>
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
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

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
          <nav
            aria-label={t.accountNavAria}
            style={
              isDesktop
                ? { flex: "0 0 210px", display: "flex", flexDirection: "column", gap: 2 }
                : {
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    padding: "0 20px 12px",
                    borderBottom: "1px solid var(--cb)",
                  }
            }
          >
            {SECTIONS.map((s) => (
              <NavItem
                key={s.key}
                label={t[s.labelKey]}
                icon={s.icon}
                active={s.key === activeKey}
                isDesktop={isDesktop}
                onClick={() => setActiveKey(s.key)}
              />
            ))}
          </nav>

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

// Ein einziger Knopf fuer beide Navigationsformen: auf dem Desktop eine
// vertikale Liste, darunter ein horizontal scrollender Reiter-Streifen -
// derselbe Zustand, nur andere Anordnung.
function NavItem({ label, icon, active, isDesktop, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: isDesktop ? "10px 12px" : "9px 12px",
        borderRadius: 10,
        border: isDesktop ? "none" : `1px solid ${active ? "var(--ca)" : "var(--cb)"}`,
        background: active ? "var(--ca-bg)" : isDesktop ? "transparent" : "var(--cc)",
        // --ca-dk statt --ca: auf --ca-bg liegt --ca unter der WCAG-AA-Grenze
        // fuer diese Schriftgroesse (S2-5).
        color: active ? "var(--ca-dk)" : "var(--ct)",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        whiteSpace: "nowrap",
        flexShrink: 0,
        minHeight: 40,
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
