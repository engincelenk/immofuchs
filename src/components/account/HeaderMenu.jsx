import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useScrollLock } from "../../hooks/useScrollLock.js";
import { IconLogout } from "./accountIcons.jsx";
import { PlanChip } from "./PlanChip.jsx";
import { visibleSections } from "./accountSections.js";

// Vollbild-Menue fuer den mobilen Header-Trigger (UX-Konzept 2026-08-13).
// Loest an drei Stellen (ProHeaderButton, Landing, MyAccount) die bisherige
// mobile Sheet-Variante von AccountMenu ab UND Landings separaten ☰-Knopf -
// EIN Trigger oeffnet ueberall dasselbe Menue. Desktop bleibt bei AccountMenu
// (Sheet variant="anchored"): dort gibt es das Platzproblem nicht.
//
// FLACHE Liste, keine Kategorien (Nutzer-Korrektur 2026-08-13): der erste
// Entwurf buendelte die Bereiche in "Konto & Abo" / "Hilfe & Sicherheit" mit
// einer zweiten Ebene dahinter. Der Nutzer will alle Punkte direkt sehen -
// ein Vollbild-Menue hat genug Platz fuer die ~10 Zeilen, und jede
// Zwischenebene ist ein zusaetzlicher Klick zum eigentlichen Ziel.
//
// Der Drill-down beginnt damit erst EINE Stufe spaeter (Menue -> Bereich in
// "Mein Konto"); dessen Rueckweg liegt in MyAccount.jsx (onBackToMenu).
const MOTION_MS = 220;
const Z_MENU = 1200; // wie Sheet.jsx (Z_SHEET) - selbe Ebene, keine Ueberschneidung mit anderen Overlays

// Einheitlicher linker Abstand fuer ALLE Zeilen inkl. Kopf, Identitaet,
// Seiten-Navigation und Sprachwahl (Nutzer-Korrektur 2026-08-13: die
// Navigationszeilen sassen vorher bei 4px, "Anmelden" und die Sprachwahl bei
// 16px - die Woerter begannen dadurch auf zwei verschiedenen Kanten).
const SIDE_PAD = 16;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeaderMenu({
  open,
  onClose,
  t,
  me,
  isLoggedIn,
  navItems, // [{key, label, onSelect}] - z.B. Landings Scroll-Anker, immer oben
  langSelector, // Sprachwahl - nur fuer nicht eingeloggte Besucher (sonst in "Einstellungen")
  onSelectSection,
  onLogin,
  onLogout,
  logoutBusy = false,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef(null);
  const panelRef = useRef(null);
  const motionMs = prefersReducedMotion() ? 0 : MOTION_MS;

  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (open) {
      setMounted(true);
      if (motionMs === 0) setVisible(true);
      else requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounted(false), motionMs);
    }
    return () => clearTimeout(closeTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useScrollLock(mounted);
  useFocusTrap(panelRef, onClose, [], mounted);

  if (!mounted) return null;

  const sections = isLoggedIn ? visibleSections(me?.role) : [];

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.accountMenuAria}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_MENU,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
        opacity: visible ? 1 : 0,
        transition: motionMs ? `opacity ${motionMs}ms ease` : undefined,
      }}
    >
      {/* Logo-Groesse identisch zum Rechner-Kopf (.hdr-logo-img/.hdr-wordmark
          in App.jsx, Nutzer-Korrektur 2026-08-14): unter 480px 38px/17px,
          darueber 54px/24px - das war die uebersehene "richtige" Referenz,
          nicht die feste 54px/24px-Groesse. */}
      <style>{`
        .hm-logo{width:38px;height:38px}
        .hm-wordmark{font-size:17px}
        @media(min-width:480px){
          .hm-logo{width:54px;height:54px}
          .hm-wordmark{font-size:24px}
        }
      `}</style>
      {/* Kopfzeile mit dem VOLLEN Logo (Icon + Wortmarke inkl. ".info"),
          identisch zum App-/Seitenkopf (Nutzer-Vorgabe 2026-08-13). Vorher
          stand hier eine verkuerzte Textmarke ohne Icon und ohne ".info" -
          dieselbe Abweichung, die schon die alte Landing-Schublade hatte. */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: `calc(12px + env(safe-area-inset-top)) ${SIDE_PAD}px 12px`,
          borderBottom: "1px solid var(--cb)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img
            src="/icon-192.png"
            alt=""
            className="hm-logo"
            style={{ objectFit: "contain", flexShrink: 0, borderRadius: 8 }}
          />
          <span className="hm-wordmark" style={{ fontWeight: 800, letterSpacing: -0.5, color: "var(--ct)", whiteSpace: "nowrap" }}>
            immo<span style={{ color: "var(--ca)" }}>fuchs</span>
            <span style={{ fontWeight: 700 }}>.info</span>
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label={t.close}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            background: "none",
            border: "none",
            fontSize: 20,
            color: "var(--ch)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
        {/* Seiten-Navigation (nur Landingpage) - ohne Icons, deshalb ohne
            Icon-Spalte; der Text beginnt trotzdem auf derselben Kante wie
            alles andere. */}
        {navItems?.length > 0 && (
          <div>
            {navItems.map((item) => (
              <MenuRow key={item.key} onClick={item.onSelect} title={item.label} />
            ))}
          </div>
        )}

        {isLoggedIn ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: `18px ${SIDE_PAD}px`,
                borderTop: "1px solid var(--cb)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--ca-bg)",
                  color: "var(--ca-dk)",
                  flexShrink: 0,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {(me?.name || me?.email || "?").slice(0, 1).toUpperCase()}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 15.5,
                      fontWeight: 800,
                      color: "var(--ct)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {me?.name || t.accountTitle}
                  </span>
                  <PlanChip t={t} me={me} />
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    color: "var(--ch)",
                    marginTop: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {me?.email}
                </span>
              </span>
            </div>

            {/* Alle Kontobereiche flach untereinander - dieselbe Reihenfolge
                und Gruppentrennung wie in der Desktop-Seitenleiste, weil
                beide aus visibleSections() kommen. Die duenne Linie vor
                "Support" stammt aus dem groupStart-Flag in
                accountSections.js. */}
            <div style={{ borderTop: "1px solid var(--cb)" }}>
              {sections.map((s) => (
                <MenuRow
                  key={s.key}
                  onClick={() => onSelectSection(s.key)}
                  icon={<s.Icon />}
                  title={t[s.titleKey || s.labelKey]}
                  desc={t[s.descKey]}
                  chevron
                  groupStart={s.groupStart}
                />
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--cb)", marginTop: 6, paddingTop: 6 }}>
              <MenuRow
                onClick={onLogout}
                disabled={logoutBusy}
                icon={<IconLogout />}
                title={t.logout}
                desc={t.logoutDesc}
                danger
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ borderTop: navItems?.length > 0 ? "1px solid var(--cb)" : "none" }}>
              <MenuRow onClick={onLogin} title={t.loginSubmit} />
            </div>
            {langSelector && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 12,
                  borderTop: "1px solid var(--cb)",
                  paddingLeft: SIDE_PAD,
                  paddingRight: SIDE_PAD,
                }}
              >
                {langSelector}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Spuerbarer :active-Zustand per Pointer-Handler statt CSS-Pseudoklasse -
// inline Styles kennen kein :active, und eine separate Stylesheet-Regel nur
// dafuer waere hier unverhaeltnismaessig.
function useTapFeedback() {
  const [pressed, setPressed] = useState(false);
  return {
    pressed,
    handlers: {
      onPointerDown: () => setPressed(true),
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      onPointerCancel: () => setPressed(false),
    },
  };
}

function MenuRow({ onClick, icon, title, desc, chevron, danger, disabled, groupStart }) {
  const { pressed, handlers } = useTapFeedback();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...handlers}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        padding: `14px ${SIDE_PAD}px`,
        border: "none",
        borderTop: groupStart ? "1px solid var(--cb)" : "none",
        marginTop: groupStart ? 6 : 0,
        paddingTop: groupStart ? 18 : 14,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        minHeight: 56,
        transition: "background .1s, transform .1s",
        color: danger ? "var(--ca-dk)" : "var(--ct)",
        opacity: disabled ? 0.6 : 1,
        background: pressed ? "var(--ci)" : "transparent",
        transform: pressed ? "scale(0.98)" : "scale(1)",
      }}
    >
      {icon && (
        <span style={{ marginTop: 1, color: danger ? "var(--ca-dk)" : "var(--cl)", flexShrink: 0 }}>{icon}</span>
      )}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 15.5, fontWeight: 600 }}>{title}</span>
        {desc && <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>{desc}</span>}
      </span>
      {chevron && (
        <span
          aria-hidden="true"
          style={{
            color: "var(--ch)",
            fontSize: 16,
            flexShrink: 0,
            marginTop: 2,
            transform: pressed ? "translateX(2px)" : "translateX(0)",
            transition: "transform .1s",
          }}
        >
          ›
        </span>
      )}
    </button>
  );
}
