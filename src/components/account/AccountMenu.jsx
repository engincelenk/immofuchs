import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { Sheet } from "../ui/Sheet.jsx";
import { IconAvatar, IconLogout } from "./accountIcons.jsx";
import { visibleSections } from "./accountSections.js";
import { PlanChip } from "./PlanChip.jsx";

// Kontomenue nach Nutzer-Entwurf 2026-08-12 (zwei Screenshots), seit dem
// UX-Audit 2026-08-13 auf dem gemeinsamen Sheet-Bauteil (src/components/ui).
//
// Der Konto-Knopf im Kopf oeffnet seither NICHT mehr direkt die Vollbild-
// flaeche, sondern erst dieses Menue; der gewaehlte Eintrag entscheidet, in
// welchem Bereich "Mein Konto" aufgeht. Vorher landete jeder Klick auf
// "Profil", jeder andere Bereich kostete also zwei zusaetzliche Klicks.
//
// variant:
//   "full"    - alle Bereiche + Abmelden (Kopf der App/Landingpage)
//   "compact" - nur Name, E-Mail und Abmelden (INNERHALB von "Mein Konto",
//               wo die Bereiche bereits in der Seitenleiste stehen; ein
//               zweites Mal dieselbe Liste waere dort reine Wiederholung)
//
// Desktop: nicht-modales Popover am Knopf (Sheet variant="anchored"). Mobil:
// modales Sheet von unten, wie die "Alle Rechner"-Liste an der Tab-Leiste -
// oben zusaetzlich Name und E-Mail, weil der Avatar dort aus Platzgruenden
// ohne Namen auskommt.
//
// `open` steuert sichtbar/unsichtbar, die Komponente selbst bleibt IMMER
// gemountet (Aufrufer rendern nicht mehr bedingt) - nur so kann Sheet die
// Ausstiegs-Animation zeigen, bevor der Aufrufer sie tatsaechlich entfernt.
export function AccountMenu({
  t,
  me,
  variant = "full",
  anchorRef,
  open,
  onSelect,
  onLogout,
  onClose,
  logoutBusy = false,
}) {
  const isDesktop = useIsDesktop();
  const sections = variant === "full" ? visibleSections(me?.role) : [];

  const identity = (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--cb)" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ct)", overflowWrap: "anywhere" }}>
        {me?.name || t.accountTitle}
      </div>
      <div style={{ fontSize: 12, color: "var(--ch)", overflowWrap: "anywhere", marginTop: 2 }}>{me?.email}</div>
    </div>
  );

  const logoutRow = (
    <button
      onClick={onLogout}
      // Verhindert ein zweites Abmelden, waehrend das erste noch laeuft.
      disabled={logoutBusy}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        padding: "12px 18px",
        border: "none",
        background: "transparent",
        cursor: logoutBusy ? "default" : "pointer",
        opacity: logoutBusy ? 0.6 : 1,
        fontFamily: "inherit",
        textAlign: "left",
        // Einziger farbiger Eintrag (Entwurf): Abmelden ist die einzige
        // Aktion hier, die den Zustand der Anwendung verlaesst.
        color: "var(--ca-dk)",
        minHeight: 48,
      }}
    >
      <span style={{ marginTop: 1 }}>
        <IconLogout />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{t.logout}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 1 }}>{t.logoutDesc}</span>
      </span>
    </button>
  );

  const body = (
    <>
      {(!isDesktop || variant === "compact") && identity}
      {sections.map((s) => (
        <button
          key={s.key}
          onClick={() => onSelect(s.key)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            width: "100%",
            padding: "12px 18px",
            border: "none",
            borderTop: s.groupStart ? "1px solid var(--cb)" : "none",
            marginTop: s.groupStart ? 6 : 0,
            paddingTop: s.groupStart ? 14 : 12,
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            color: "var(--ct)",
            minHeight: 48,
          }}
        >
          <span style={{ marginTop: 1, color: "var(--cl)" }}>
            <s.Icon />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>
              {t[s.titleKey || s.labelKey]}
            </span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 1 }}>{t[s.descKey]}</span>
          </span>
        </button>
      ))}
      {/* Nutzer-Hinweis 2026-08-12: In der Kurzfassung (nur Identitaet +
          Abmelden) lagen hier zwei Trennlinien dicht uebereinander - die
          unter dem Namensblock und diese. Bei nur zwei Bloecken genuegt eine;
          die zweite Linie kam nur noch dann dazu, wenn darueber wirklich
          eine Liste von Bereichen steht. */}
      {sections.length > 0 ? (
        <div style={{ borderTop: "1px solid var(--cb)", marginTop: 6, paddingTop: 6 }}>{logoutRow}</div>
      ) : (
        <div style={{ paddingTop: 2 }}>{logoutRow}</div>
      )}
    </>
  );

  // Desktop = nicht-modales Popover am Knopf (Sheet variant="anchored"),
  // Mobil = modales Sheet von unten - Sheet.jsx uebernimmt Portal,
  // Backdrop/z-index, Scroll-Sperre bzw. Fokus-Trap je nach Variante,
  // Positionierung und die Escape-/Aussenklick-Behandlung.
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={isDesktop ? "anchored" : "bottom"}
      anchorRef={anchorRef}
      label={t.accountMenuAria}
      size={isDesktop ? 320 : undefined}
    >
      {/* Die "6px 0"-Luft gab es urspruenglich nur in der Desktop-Fassung -
          mobil sitzen die Zeilen direkt unter der abgerundeten Kante. */}
      <div style={{ padding: isDesktop ? "6px 0" : undefined }}>{body}</div>
    </Sheet>
  );
}

// Avatar-Knopf, der das Menue oeffnet (Entwurf: Kreis + Name + Chevron).
// Auf dem Handy nur der Kreis - Name und E-Mail stehen dort im Kopf des
// Sheets, und der Kopfbereich ist bei 375px schon ohne Namen gut gefuellt.
export function AccountAvatarButton({ t, me, open, onToggle, innerRef, showChip = false }) {
  const isDesktop = useIsDesktop();
  return (
    <button
      ref={innerRef}
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t.accountMenuAria}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: isDesktop ? "5px 10px 5px 5px" : 3,
        border: "1px solid var(--cb)",
        borderRadius: 999,
        background: "var(--cc)",
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: 38,
      }}
    >
      {/* Personen-Symbol statt Initialen (Nutzer-Entwurf 2026-08-12): zwei
          Grossbuchstaben im Kreis lasen sich im Kopf als Sprachcode - "EN"
          wirkte wie die englische Sprachfassung, zumal die Sprachwahl
          daneben genau dieses Format nutzt. */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--ca-bg)",
          color: "var(--ca-dk)",
          flexShrink: 0,
        }}
      >
        <IconAvatar size={17} />
      </span>
      {isDesktop && (
        <>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ct)",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {me?.name || me?.email}
          </span>
          {showChip && <PlanChip t={t} me={me} />}
          <span
            aria-hidden="true"
            style={{
              fontSize: 9,
              color: "var(--ch)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          >
            ▼
          </span>
        </>
      )}
    </button>
  );
}
