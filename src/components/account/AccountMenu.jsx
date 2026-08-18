import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { Sheet } from "../ui/Sheet.jsx";
import { IconAvatar, IconChevronDown } from "./accountIcons.jsx";
import { AccountMenuPanel } from "./AccountMenuPanel.jsx";
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
  lang,
  variant = "full",
  anchorRef,
  open,
  onSelect,
  onLogout,
  onClose,
  logoutBusy = false,
}) {
  const isDesktop = useIsDesktop();

  // Desktop = nicht-modales Popover am Knopf (Sheet variant="anchored"),
  // Mobil = modales Sheet von unten - Sheet.jsx uebernimmt Portal,
  // Backdrop/z-index, Scroll-Sperre bzw. Fokus-Trap je nach Variante,
  // Positionierung und die Escape-/Aussenklick-Behandlung.
  //
  // Seit der Neugestaltung 2026-08-17 ist dies der EINZIGE Weg ins
  // Kontomenue - vorher uebernahm mobil ein eigenes Vollbildmenue
  // (HeaderMenu), das dieselben Zeilen ein zweites Mal zeichnete. HeaderMenu
  // ist seither ausschliesslich die Seiten-Navigation der Landingpage.
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={isDesktop ? "anchored" : "bottom"}
      anchorRef={anchorRef}
      label={t.accountMenuAria}
      size={isDesktop ? 300 : undefined}
    >
      <AccountMenuPanel
        t={t}
        me={me}
        lang={lang}
        showSections={variant === "full"}
        onSelect={onSelect}
        onLogout={onLogout}
        logoutBusy={logoutBusy}
        // Im Browser sitzt das Menue als kleines Popover am Knopf und darf
        // enger sein; auf dem Handy brauchen die Zeilen die volle
        // Treffergroesse.
        compactRows={isDesktop}
      />
    </Sheet>
  );
}

// Avatar-Knopf, der das Menue oeffnet (Entwurf: Kreis + Name + Chevron).
// Auf dem Handy nur der Kreis - Name und E-Mail stehen dort im Kopf des
// Sheets, und der Kopfbereich ist bei 375px schon ohne Namen gut gefuellt.
// Initialen aus Name (oder ersatzweise E-Mail) fuer den Avatar - nur auf
// Mobile genutzt (Nutzer-Vorgabe 2026-08-18). Auf dem Desktop bleibt es beim
// Personen-Symbol: der Grund von 2026-08-12 gilt dort weiterhin, zwei
// Grossbuchstaben neben der Sprachauswahl lasen sich wie ein Sprachcode
// ("EN" wie die englische Sprachfassung) - auf Mobile steht die
// Sprachauswahl nicht direkt daneben, das Risiko besteht dort also nicht.
function initialsFor(me) {
  const name = (me?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
    return initials.toUpperCase();
  }
  return (me?.email || "").trim().charAt(0).toUpperCase();
}

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
      {/* Desktop: Personen-Symbol (Nutzer-Entwurf 2026-08-12) - zwei
          Grossbuchstaben im Kreis lasen sich im Kopf als Sprachcode - "EN"
          wirkte wie die englische Sprachfassung, zumal die Sprachwahl
          daneben genau dieses Format nutzt. Mobile: Initialen (Nutzer-
          Vorgabe 2026-08-18) - dort steht die Sprachauswahl nicht direkt
          daneben, das Verwechslungsrisiko besteht also nicht. */}
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
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {isDesktop ? <IconAvatar size={17} /> : initialsFor(me)}
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
              display: "flex",
              color: "var(--ch)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          >
            {/* Gezeichnetes Chevron statt des Unicode-Zeichens ▼: dessen
                Strichstaerke und Groesse wechseln je nach Betriebssystem und
                passten neben den gezeichneten Icons nie. */}
            <IconChevronDown size={14} />
          </span>
        </>
      )}
    </button>
  );
}
