import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useScrollLock } from "../../hooks/useScrollLock.js";
import { IconLogout } from "./accountIcons.jsx";
import { PlanChip } from "./PlanChip.jsx";
import { visibleSections } from "./accountSections.js";

// Vollbild-Drill-down-Menue fuer den mobilen Header-Trigger (UX-Konzept
// 2026-08-13, CHECK24-Referenz). Loest an drei Stellen (ProHeaderButton,
// Landing, MyAccount) die bisherige mobile Sheet-Variante von AccountMenu ab
// UND Landings separaten ☰-Knopf, der ganz entfaellt - EIN Trigger (der
// Avatar) oeffnet jetzt ueberall dasselbe Menue. Desktop bleibt unveraendert
// bei AccountMenu (Sheet variant="anchored"): dort gibt es das Platzproblem
// nicht, ein Vollbild-Overlay fuer ein Dropdown waere dort ueberdimensioniert.
//
// Zwei Ebenen:
//  - Wurzel: eingeloggt -> Identitaet + zwei Kategorien (spiegeln 1:1 die
//    bestehende groupStart-Aufteilung aus accountSections.js, keine neue
//    Datenquelle) + Abmelden. Nicht eingeloggt -> flache Liste (zu wenige
//    Eintraege fuer Kategorien).
//  - Kategorie-Ansicht: slidet von rechts ein, fixierter Kopf mit Zurueck +
//    Titel, Liste der Bereiche (gleiche Zeilenoptik wie zuvor in AccountMenu).
//
// Eigene Komponente statt einer weiteren Sheet.jsx-Variante: die Zwei-Ebenen-
// Slide-Logik passt nicht ins Sheet-Positionierungsmodell (bottom/left/
// right/anchored sind alle einzelne, feste Panels). Nutzt aber dieselben
// geteilten Hooks (useFocusTrap, useScrollLock) wie jedes andere Overlay.
const MOTION_MS = 220;
const Z_MENU = 1200; // wie Sheet.jsx (Z_SHEET) - selbe Ebene, keine Ueberschneidung mit anderen Overlays

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeaderMenu({
  open,
  onClose,
  t,
  me,
  isLoggedIn,
  beforeIdentity, // z.B. Landings 3 Scroll-Anker - immer oben, unabhaengig vom Login-Status
  loggedOutFooter, // z.B. Landings Sprachwahl - nur sichtbar, wenn nicht eingeloggt
  onSelectSection,
  onLogin,
  onLogout,
  logoutBusy = false,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState(null); // null = Wurzel, sonst Kategorie-Key
  const closeTimer = useRef(null);
  const panelRef = useRef(null);
  const motionMs = prefersReducedMotion() ? 0 : MOTION_MS;

  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (open) {
      setMounted(true);
      setScreen(null); // jedes Oeffnen startet wieder an der Wurzel
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
  useFocusTrap(panelRef, onClose, [screen], mounted);

  if (!mounted) return null;

  // Gruppierung 1:1 aus accountSections.js uebernommen (groupStart trennt
  // dort bereits "Konto"-nahe von "Hilfe/Sicherheit"-nahen Bereichen) - keine
  // zweite, konkurrierende Kategorisierung an dieser Stelle.
  const sections = isLoggedIn ? visibleSections(me?.role) : [];
  const splitIndex = sections.findIndex((s) => s.groupStart);
  const groupAccount = splitIndex === -1 ? sections : sections.slice(0, splitIndex);
  const groupHelp = splitIndex === -1 ? [] : sections.slice(splitIndex);
  const categories = [
    groupAccount.length > 0 && { key: "account", title: t.menuGroupAccountTitle, items: groupAccount },
    groupHelp.length > 0 && { key: "help", title: t.menuGroupHelpTitle, items: groupHelp },
  ].filter(Boolean);
  const activeCategory = categories.find((c) => c.key === screen) || null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={activeCategory ? activeCategory.title : t.accountMenuAria}
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
      {/* Kopfzeile: auf der Wurzel nur der Schliessen-Knopf, in einer
          Kategorie zusaetzlich Zurueck + Titel - eine feste Zeile statt zwei
          verschiedener Layouts, damit beim Hin- und Herwechseln nichts
          springt. */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 12px",
          borderBottom: "1px solid var(--cb)",
        }}
      >
        {activeCategory ? (
          <button
            onClick={() => setScreen(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ct)",
              padding: "10px 4px",
              minHeight: 44,
            }}
          >
            <span aria-hidden="true" style={{ color: "var(--ca-dk)" }}>
              ←
            </span>
            {activeCategory.title}
          </button>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ct)" }}>
            immo<span style={{ color: "var(--ca)" }}>fuchs</span>
          </span>
        )}
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

      {/* Zwei Vollbild-Bahnen nebeneinander (200% breiter Streifen), die per
          transform seitlich verschoben werden - dieselbe Grundmechanik wie
          eine horizontale Slide-Karussell, hier auf genau zwei Zustaende
          begrenzt (Wurzel/Kategorie). */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            display: "flex",
            width: "200%",
            height: "100%",
            transform: activeCategory ? "translateX(-50%)" : "translateX(0%)",
            transition: motionMs ? `transform ${motionMs}ms cubic-bezier(.32,.72,0,1)` : undefined,
          }}
        >
          <div style={{ width: "50%", height: "100%", overflowY: "auto" }}>
            <RootScreen
              t={t}
              me={me}
              isLoggedIn={isLoggedIn}
              beforeIdentity={beforeIdentity}
              loggedOutFooter={loggedOutFooter}
              categories={categories}
              onOpenCategory={(key) => setScreen(key)}
              onLogin={onLogin}
              onLogout={onLogout}
              logoutBusy={logoutBusy}
            />
          </div>
          <div style={{ width: "50%", height: "100%", overflowY: "auto" }}>
            {activeCategory && (
              <CategoryScreen
                t={t}
                items={activeCategory.items}
                onSelect={(key) => {
                  onSelectSection(key);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  width: "100%",
  padding: "14px 16px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  color: "var(--ct)",
  minHeight: 56,
  transition: "background .1s, transform .1s",
};

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

function MenuRow({ onClick, icon, title, desc, chevron, danger, disabled }) {
  const { pressed, handlers } = useTapFeedback();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...handlers}
      style={{
        ...rowStyle,
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
        {desc && (
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>{desc}</span>
        )}
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

function RootScreen({
  t,
  me,
  isLoggedIn,
  beforeIdentity,
  loggedOutFooter,
  categories,
  onOpenCategory,
  onLogin,
  onLogout,
  logoutBusy,
}) {
  return (
    <div style={{ paddingBottom: 24 }}>
      {beforeIdentity}

      {isLoggedIn ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px", borderTop: beforeIdentity ? "1px solid var(--cb)" : "none" }}>
            <span
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
              aria-hidden="true"
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

          <div style={{ borderTop: "1px solid var(--cb)" }}>
            {categories.map((cat) => {
              // JSX-Tags erlauben keine indizierten Ausdruecke wie
              // `<cat.items[0].Icon />` - deshalb erst in eine Variable
              // (mit Grossbuchstaben, sonst haelt React sie faelschlich fuer
              // ein natives DOM-Element statt eine Komponente).
              const CategoryIcon = cat.items[0]?.Icon;
              return (
                <MenuRow
                  key={cat.key}
                  onClick={() => onOpenCategory(cat.key)}
                  icon={CategoryIcon ? <CategoryIcon /> : null}
                  title={cat.title}
                  desc={cat.items.map((s) => t[s.labelKey]).join(" · ")}
                  chevron
                />
              );
            })}
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
          <div style={{ borderTop: beforeIdentity ? "1px solid var(--cb)" : "none" }}>
            <MenuRow onClick={onLogin} title={t.loginSubmit} />
          </div>
          {loggedOutFooter && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--cb)", padding: "8px 16px" }}>
              {loggedOutFooter}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryScreen({ t, items, onSelect }) {
  return (
    <div>
      {items.map((s) => (
        <MenuRow
          key={s.key}
          onClick={() => onSelect(s.key)}
          icon={<s.Icon />}
          title={t[s.titleKey || s.labelKey]}
          desc={t[s.descKey]}
          chevron
        />
      ))}
    </div>
  );
}
