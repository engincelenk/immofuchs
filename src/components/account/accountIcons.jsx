// Linien-Icons fuer das Kontomenue und die Bereichs-Navigation
// (Nutzer-Entwurf 2026-08-12). Ersetzt die vormals verwendeten Emoji
// (👤👑💳⚙️💬🔒🛠️): im Entwurf sind es durchgezeichnete Strich-Icons, und die
// App hat denselben Stil bereits in der Tab-Leiste (IC in App.jsx) - Emoji
// wirkten daneben wie ein Fremdkoerper und sehen je nach Betriebssystem
// anders aus.
//
// Alle Icons: 24er-Koordinatensystem, stroke=currentColor, damit sie die
// Farbe des umgebenden Textes uebernehmen (aktiver Bereich orange, sonst
// dunkel) und ueber `size` frei skalierbar bleiben.
function Svg({ size = 20, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export function IconProfil({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function IconAbo({ size }) {
  return (
    <Svg size={size}>
      <path d="M3 8l3.5 3L12 5l5.5 6L21 8v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V8z" />
      <path d="M3 16h18" />
    </Svg>
  );
}

export function IconZahlung({ size }) {
  return (
    <Svg size={size}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 15h3.5" />
    </Svg>
  );
}

export function IconEinstellungen({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.72 15a1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.72h.08A1.6 1.6 0 0 0 10 3.26V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.28 9v.08a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </Svg>
  );
}

export function IconSupport({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
    </Svg>
  );
}

export function IconSicherheit({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 3l7.5 3v5.5c0 4.5-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5-7.5-9.5V6L12 3z" />
    </Svg>
  );
}

export function IconAdmin({ size }) {
  return (
    <Svg size={size}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.5 5.5a3.2 3.2 0 0 1 0 6" />
      <path d="M18 13.6a6.2 6.2 0 0 1 3.2 5.4" />
    </Svg>
  );
}

// Avatar-Symbol (Nutzer-Entwurf 2026-08-12, beide Entwurfsbilder). Ersetzt
// die zwischenzeitlich verwendeten Initialen: zwei Grossbuchstaben in einem
// orange umrandeten Kreis lasen sich im Kopf als Sprachcode ("EN" = English),
// zumal die Sprachwahl daneben genau so aussieht (zweistelliges Kuerzel).
// Dickerer Strich als bei den Menue-Icons, damit die Silhouette auch bei
// 18px im Kreis noch deutlich bleibt.
export function IconAvatar({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </svg>
  );
}

// Tuer mit hinauszeigendem Pfeil - im Entwurf orange abgesetzt.
export function IconLogout({ size }) {
  return (
    <Svg size={size}>
      <path d="M9.5 4.5h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4" />
      <path d="M15.5 8l4 4-4 4" />
      <path d="M19.5 12h-11" />
    </Svg>
  );
}

// ═══ Ergaenzung Menue-Neugestaltung 2026-08-17 ═══
//
// Bisher waren nur die sieben Bereichs-Icons gezeichnet; alles Kleinteilige
// drumherum lief ueber Unicode-Zeichen (▼ ✕ › ← ↗ ↓ →) und in den
// Bereichsinhalten ueber Emoji (💳 🧾 ✉ 💡 🔒 ✨). Beide sehen je nach
// Betriebssystem anders aus, haben eine andere Strichstaerke als die Icons
// daneben und lassen sich nicht auf die Textfarbe einstellen - genau die
// Begruendung, aus der die Bereichs-Icons schon 2026-08-12 gezeichnet wurden.
// Die Ausnahme bleiben die Flaggen der Sprachwahl (LangSel.jsx): dort sind
// Emoji eine bewusste Nutzer-Entscheidung.

export function IconChevronRight({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function IconChevronDown({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M5 9l7 7 7-7" />
    </Svg>
  );
}

export function IconArrowLeft({ size }) {
  return (
    <Svg size={size}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconArrowRight({ size }) {
  return (
    <Svg size={size}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconMenu({ size }) {
  return (
    <Svg size={size}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose({ size }) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

// Pfeil aus einem Rahmen heraus - kennzeichnet Ziele ausserhalb der App
// (neuer Tab), wie das ↗ im Vorbild.
export function IconExternal({ size }) {
  return (
    <Svg size={size}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M19 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5h4.5" />
    </Svg>
  );
}

export function IconDownload({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 3v12" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </Svg>
  );
}

export function IconHome({ size }) {
  return (
    <Svg size={size}>
      <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.5z" />
    </Svg>
  );
}

// Schriftzeichen mit lateinischem "A" - das gaengige Sinnbild fuer
// Sprachwahl, wie im Vorbild.
export function IconLanguage({ size }) {
  return (
    <Svg size={size}>
      <path d="M3 5.5h9" />
      <path d="M7.5 3.5v2" />
      <path d="M10 5.5c0 4-3 7-6.5 8" />
      <path d="M5.5 9c1 2 2.7 3.5 4.7 4.3" />
      <path d="M13 20l4-9 4 9" />
      <path d="M14.4 17h5.2" />
    </Svg>
  );
}

// Halbmond - Darstellung (Hell/Dunkel/System), Etappe 1 Light/Dark/System
// 2026-08-26, gleicher Platz wie IconLanguage im Kontomenue. Bewusst nur der
// Mond (kein Sonne/Mond-Duo): das gaengige, eindeutige Symbol fuer
// "Darstellung/Theme" in vergleichbaren Apps, unabhaengig davon, welcher der
// drei Zustaende gerade aktiv ist.
export function IconTheme({ size }) {
  return (
    <Svg size={size}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </Svg>
  );
}

// Rechnung/Beleg - ersetzt 🧾 in den Zahlungen.
export function IconBeleg({ size }) {
  return (
    <Svg size={size}>
      <path d="M5.5 3.5h13v17l-2.2-1.5-2.1 1.5-2.2-1.5L9.8 20l-2.1-1.5L5.5 20V3.5z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  );
}

// Briefumschlag - ersetzt ✉ im Support.
export function IconMail({ size }) {
  return (
    <Svg size={size}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </Svg>
  );
}

// Gluehbirne - ersetzt 💡 im Support.
export function IconIdee({ size }) {
  return (
    <Svg size={size}>
      <path d="M9 17.5h6" />
      <path d="M10 20.5h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.7.6 1.2v.4h5.8v-.4c0-.5.2-.9.6-1.2A6 6 0 0 0 12 3z" />
    </Svg>
  );
}

// Geschlossenes Schloss - ersetzt 🔒 an der Rechner-Sperre.
export function IconSchloss({ size }) {
  return (
    <Svg size={size}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </Svg>
  );
}

// Funkeln - ersetzt ✨ dort, wo auf Pro-Funktionen hingewiesen wird.
export function IconFunkeln({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3z" />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </Svg>
  );
}
