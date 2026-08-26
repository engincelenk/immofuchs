import { useState } from "react";
import { LANGS } from "../../i18n/translations.js";
import { useTheme } from "../../context/ThemeContext.jsx";
import { IconChevronRight, IconLanguage, IconLogout, IconTheme } from "./accountIcons.jsx";
import { visibleSections } from "./accountSections.js";
import { PlanChip } from "./PlanChip.jsx";

// Inhalt des Kontomenues - die eine Stelle, an der die Menuezeilen entstehen
// (Neugestaltung 2026-08-17 nach den Referenz-Screenshots).
//
// Vorher gab es diese Liste zweimal: einmal in AccountMenu.jsx fuer das
// Desktop-Dropdown und einmal in HeaderMenu.jsx fuer das mobile Vollbild -
// mit unterschiedlichen Zeilenhoehen, unterschiedlichen Chevrons und sogar
// zwei verschiedenen Avataren fuer dieselbe Person (SVG-Silhouette im Kopf,
// Initialbuchstabe im Menue). Jetzt rendert beides diese Komponente; nur die
// Huelle drumherum (angedocktes Popover bzw. Sheet von unten) unterscheidet
// sich noch, und die liefert Sheet.jsx.
//
// Einzeilige Zeilen (Nutzer-Entscheidung 2026-08-17): die frueheren
// Beschreibungstexte unter jedem Eintrag ("Deine Daten und Einstellungen")
// verdoppelten die Hoehe des Menues, ohne dem Label etwas hinzuzufuegen.
export function AccountMenuPanel({
  t,
  me,
  lang,
  showSections = true,
  onSelect,
  onLogout,
  logoutBusy = false,
  compactRows = false,
}) {
  const sections = showSections ? visibleSections(me?.role) : [];
  const currentLang = LANGS.find((l) => l.v === lang);
  const { theme } = useTheme();
  const themeLabel = { light: t.profilThemeLight, dark: t.profilThemeDark, system: t.profilThemeSystem }[
    theme
  ];

  return (
    <div>
      {/* Kopf mit Name und E-Mail - im Vorbild immer sichtbar. Bisher zeigte
          ihn das Desktop-Menue NICHT (nur mobil oder in der Kurzfassung), man
          sah dort also nirgends, als wer man angemeldet ist. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: compactRows ? "13px 16px" : "15px 16px",
          borderBottom: "1px solid var(--cb)",
        }}
      >
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontSize: compactRows ? 14 : 15,
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
              fontSize: 12,
              color: "var(--ch)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {me?.email}
          </span>
        </span>
      </div>

      {sections.length > 0 && (
        <div style={{ padding: "4px 0" }}>
          {sections.map((s) => (
            <MenuRow
              key={s.key}
              compact={compactRows}
              groupStart={s.groupStart}
              icon={<s.Icon size={20} />}
              label={t[s.labelKey]}
              onClick={() => onSelect(s.key)}
              trailing={<IconChevronRight size={17} />}
            />
          ))}

          {/* Sprache mit aktuellem Wert rechts (Vorbild). Fuehrt in den
              Bereich "Einstellungen", wo die Auswahl bereits liegt - bewusst
              keine zweite Umschaltstelle, sondern ein Kurzweg zur
              vorhandenen. */}
          <MenuRow
            compact={compactRows}
            groupStart
            icon={<IconLanguage size={20} />}
            label={t.profilLanguageTitle}
            value={currentLang?.full}
            onClick={() => onSelect("einstellungen")}
          />
        </div>
      )}

      {/* Darstellung mit aktuellem Wert rechts (Nutzer-Vorgabe 2026-08-26,
          gleiches Muster wie Sprache oben): Kurzweg nach "Einstellungen",
          wo die Auswahl bereits liegt. Bewusst AUSSERHALB des
          sections.length-Blocks, also auch in der kompakten Variante
          sichtbar (innerhalb von "Mein Konto" selbst, wo sections leer ist,
          weil die Bereiche schon in der Seitenleiste stehen) - Darstellung
          ist eine Geraete-/Browser-Einstellung, keine Kontobereich-Kachel,
          die dort schon dupliziert waere. */}
      <div style={{ borderTop: "1px solid var(--cb)", padding: "4px 0" }}>
        <MenuRow
          compact={compactRows}
          icon={<IconTheme size={20} />}
          label={t.profilThemeTitle}
          value={themeLabel}
          onClick={() => onSelect("einstellungen")}
        />
      </div>

      <div style={{ borderTop: "1px solid var(--cb)", padding: "4px 0" }}>
        <MenuRow
          compact={compactRows}
          icon={<IconLogout size={20} />}
          label={t.logout}
          onClick={onLogout}
          disabled={logoutBusy}
          // Einziger farbiger Eintrag: Abmelden ist die einzige Aktion hier,
          // die den Zustand der Anwendung verlaesst.
          danger
        />
      </div>
    </div>
  );
}

// Spuerbarer :active-Zustand per Pointer-Handler statt CSS-Pseudoklasse -
// Inline-Styles kennen kein :active, und eine eigene Stylesheet-Regel nur
// dafuer waere hier unverhaeltnismaessig. Uebernommen aus HeaderMenu.jsx,
// das diese Zeilen vorher selbst zeichnete.
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

function MenuRow({ icon, label, value, trailing, onClick, danger, disabled, groupStart, compact }) {
  const { pressed, handlers } = useTapFeedback();
  const color = danger ? "var(--ca-dk)" : "var(--ct)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...handlers}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        // 44px ist die kleinste Flaeche, die sich auf dem Handy zuverlaessig
        // treffen laesst - im Browser darf es etwas enger sein.
        minHeight: compact ? 42 : 48,
        padding: compact ? "8px 16px" : "10px 16px",
        border: "none",
        borderTop: groupStart ? "1px solid var(--cb)" : "none",
        marginTop: groupStart ? 4 : 0,
        paddingTop: groupStart ? (compact ? 12 : 14) : undefined,
        background: pressed ? "var(--ci)" : "transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
        textAlign: "left",
        color,
        transition: "background .1s",
      }}
    >
      <span style={{ display: "flex", color: danger ? "var(--ca-dk)" : "var(--cl)", flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: compact ? 13.5 : 15,
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {value && (
        <span style={{ fontSize: compact ? 12.5 : 13.5, color: "var(--ch)", flexShrink: 0 }}>{value}</span>
      )}
      {trailing && (
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--ch)",
            flexShrink: 0,
            transform: pressed ? "translateX(2px)" : "translateX(0)",
            transition: "transform .1s",
          }}
        >
          {trailing}
        </span>
      )}
    </button>
  );
}
