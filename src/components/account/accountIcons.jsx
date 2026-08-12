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
