import { useState } from "react";
import { Sheet } from "../ui/Sheet.jsx";
import { ThemeSwitchPills } from "../ui/ThemeSwitchPills.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { IconClose } from "./accountIcons.jsx";

// Seiten-Navigation der Landingpage als Schublade von links (Vorbild:
// Referenz-Screenshot des Burger-Menues).
//
// Zuschnitt seit der Menue-Neugestaltung 2026-08-17: Diese Komponente traegt
// NUR NOCH die Seiten-Navigation. Vorher war sie zugleich das mobile
// Kontomenue und zeichnete die Bereichsliste, die Identitaetszeile und
// "Abmelden" ein zweites Mal - mit anderen Zeilenhoehen und einem anderen
// Avatar als das Desktop-Dropdown. Das Kontomenue kommt jetzt ueberall aus
// AccountMenu/AccountMenuPanel; hier bleibt, was wirklich Seiten-Navigation
// ist.
//
// Zuvor ein eigenes Vollbild-Portal mit eigener Animation, eigener
// Scroll-Sperre und eigenem Fokus-Trap - all das liefert inzwischen das
// gemeinsame Sheet-Bauteil (variant="left"), wie im Vorbild eine Schublade
// von der Seite statt einer bildschirmfuellenden Flaeche.
export function HeaderMenu({
  open,
  onClose,
  t,
  navItems, // [{key, label, onSelect}] - Landings Scroll-Anker
  langSelector, // Sprachwahl mit Flaggen (LangSel) - seit 2026-08-28 unabhaengig vom Login-Status sichtbar, zusaetzlich zu "Einstellungen"
  isLoggedIn,
  onLogin,
  onLogoClick, // Nutzer-Vorgabe 2026-08-18: Logo+Schriftzug fuehrt wie ueberall in der App zur Landingpage
}) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/logo-wordmark-dark.png" : "/logo-wordmark.png";
  return (
    <Sheet open={open} onClose={onClose} variant="left" label={t.siteNavAria} size="min(320px, 86vw)">
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {/* Kopfzeile mit dem VOLLEN Logo (Icon + Wortmarke inkl. ".info"),
            identisch zum App-/Seitenkopf (Nutzer-Vorgabe 2026-08-13).
            Logo-Groesse wie im Rechner-Kopf (Nutzer-Korrektur 2026-08-14);
            seit 2026-08-20 ein Schriftzug-Bild, daher nur noch die Hoehe -
            gleiche Werte wie .hdr-logo-img in App.jsx. */}
        <style>{`
          .hm-logo{height:40px;width:auto}
          @media(min-width:480px){
            .hm-logo{height:56px;width:auto}
          }
        `}</style>
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 12px 12px 16px",
            borderBottom: "1px solid var(--cb)",
          }}
        >
          <button
            onClick={onLogoClick}
            aria-label="immofuchs.info"
            // tabIndex -1 (Bugfix 2026-08-18, sichtbarer blauer Fokusring
            // beim Oeffnen): useFocusTrap fokussiert automatisch das erste
            // fokussierbare Element im Sheet - vor diesem Button war das der
            // "Schliessen"-Knopf, jetzt sonst dieser Logo-Button. Per Maus/
            // Touch bleibt er ganz normal klickbar, nur aus dem
            // Tab-Fokus-Zyklus und damit dem Auto-Fokus ausgenommen.
            tabIndex={-1}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {/* Schriftzug-Bild statt Icon + HTML-Text (2026-08-20, app-weit
                ein Logo-File - siehe BrandIcon.jsx). */}
            <img
              src={logoSrc}
              alt="immofuchs.info"
              className="hm-logo"
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
          </button>
          <button
            onClick={onClose}
            aria-label={t.close}
            // data-focus-skip (Bugreport 2026-08-28): der Fokus-Trap
            // fokussiert sonst automatisch diesen X-Button beim Oeffnen (er
            // ist wegen tabIndex={-1} am Logo daneben das erste fokussierbare
            // Element) - dadurch zeigte er browserabhaengig manchmal einen
            // sichtbaren Fokusring. Bleibt trotzdem ganz normal per Tab
            // erreichbar, siehe useFocusTrap.js.
            data-focus-skip="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              background: "none",
              border: "none",
              color: "var(--ch)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconClose size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 24px" }}>
          {navItems?.map((item) => (
            <NavRow key={item.key} label={item.label} onClick={item.onSelect} />
          ))}

          {/* Anmelden nur fuer Besucher ohne Konto - wer angemeldet ist,
              erreicht alles Weitere ueber den Avatar daneben. */}
          {!isLoggedIn && (
            <div style={{ borderTop: navItems?.length > 0 ? "1px solid var(--cb)" : "none", marginTop: 4, paddingTop: 4 }}>
              <NavRow label={t.loginSubmit} onClick={onLogin} />
            </div>
          )}

          {langSelector && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 14,
                borderTop: "1px solid var(--cb)",
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              {langSelector}
            </div>
          )}

          {/* Hell/Dunkel/System (Nutzer-Vorgabe 2026-08-26): zusaetzlich zu
              "Mein Konto" -> "Einstellungen" auch hier direkt erreichbar -
              anders als die Sprachwahl unabhaengig vom Login-Status sichtbar,
              da die Darstellung eine Geraete-/Browser-Einstellung ist, keine
              Kontoeinstellung. */}
          <div
            style={{
              marginTop: langSelector ? 14 : 8,
              paddingTop: langSelector ? 0 : 14,
              borderTop: langSelector ? "none" : "1px solid var(--cb)",
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ch)", marginBottom: 8 }}>
              {t.profilThemeTitle}
            </div>
            <ThemeSwitchPills t={t} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// Spuerbarer :active-Zustand per Pointer-Handler statt CSS-Pseudoklasse -
// Inline-Styles kennen kein :active.
function NavRow({ label, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        minHeight: 48,
        padding: "10px 16px",
        border: "none",
        background: pressed ? "var(--ci)" : "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        color: "var(--ct)",
        transition: "background .1s",
      }}
    >
      {/* Kein Chevron mehr (Nutzer-Korrektur 2026-08-18): die Zeilen hier
          sind reine Scroll-Anker ohne Unterkategorie - der Pfeil suggerierte
          faelschlich, dass sich noch etwas oeffnet. Nur echte Untermenues
          sollten hier kuenftig einen Chevron bekommen. */}
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
