// Geteilte Inline-Style-Objekte fuer alle Checkout-Wizard-Schritte (Extrakt
// aus dem bisherigen LoginModal.jsx, Verhalten/Werte unveraendert).
export const primaryBtnStyle = {
  width: "100%",
  padding: "14px",
  fontSize: 15,
  fontWeight: 700,
  background: "var(--ca)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const secondaryBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "12px",
  fontSize: 14,
  fontWeight: 600,
  background: "var(--ci)",
  color: "var(--ct)",
  border: "1px solid var(--cb)",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};

// Apple-Branding-Vorgabe: schwarzer Button mit weissem Logo+Text ist die
// von Apple vorgegebene, immer zulaessige Variante.
export const appleBtnStyle = {
  ...secondaryBtnStyle,
  background: "#000",
  color: "#fff",
  border: "1px solid #000",
};

export const textInputStyle = {
  width: "100%",
  height: 42,
  fontSize: 16,
  padding: "0 12px",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--ci)",
  color: "var(--ct)",
  fontFamily: "inherit",
};

// Native <select> in derselben Optik wie textInputStyle. appearance:none
// entfernt den Betriebssystem-Pfeil, der eingebettete SVG-Pfeil (data-URI,
// damit keine zusaetzliche Anfrage noetig ist) sitzt dafuer an fester Stelle -
// sonst sieht das Feld auf jedem System anders aus als die Textfelder daneben.
// paddingRight haelt den Platz fuer den Pfeil frei.
export const selectInputStyle = {
  ...textInputStyle,
  padding: "0 34px 0 12px",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
  backgroundImage:
    "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%238A8A80' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

export const linkBtnStyle = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 11.5,
  color: "var(--ca-dk)",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};

export const warnBannerStyle = {
  background: "var(--ca-bg)",
  border: "1px solid var(--ca)",
  color: "var(--ca-dk)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
};

export const infoBannerStyle = {
  background: "var(--info-bg)",
  border: "1px solid var(--primary-tx)",
  color: "var(--primary-tx)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 11.5,
};

export const errorBannerStyle = {
  background: "var(--ca-bg)",
  border: "1px solid var(--ca-bd)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--ca-dk)",
  marginBottom: 12,
};

// Zusammenfassungs-Karte (Bestelluebersicht/Willkommen) - Extrakt, da
// PaymentStep und WelcomeStep dieselbe Karten-Optik dupliziert hatten
// (Befund finaler Review, 2026-08-06).
export const cardStyle = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 10,
  padding: 14,
};

// ═══ Checkout-Neugestaltung 2026-08-17 (Referenz-Screenshots) ═══

// Textbutton neben dem Primary-Button ("Abbrechen"). Die Referenz stellt die
// Abbruch-Option bewusst als Link daneben statt als zweiten Rahmen-Button -
// das laesst den Weiter-Weg als einzige echte Handlung stehen.
export const ghostBtnStyle = {
  background: "none",
  border: "none",
  padding: "14px 18px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--ca-dk)",
  cursor: "pointer",
  fontFamily: "inherit",
  borderRadius: 10,
};

// Graue Kostenbox unter der Laufzeit-Auswahl. Absichtlich --ci (Input-Ton)
// statt --cc: sie soll sich als ruhige Flaeche vom weissen Karten-Umfeld
// abheben, so wie im Vorbild.
export const summaryBoxStyle = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: 16,
};

// Preis-Chip rechts in den Laufzeit-Karten (Vorbild: grau hinterlegter
// Preis neben dem durchgestrichenen Listenpreis).
export const priceChipStyle = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  padding: "5px 9px",
  fontSize: 14,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

// Ersparnis-Badge ("17 % sparen") - heller Akzent-Hintergrund statt
// vollflaechigem Orange, damit er neben dem Preis nicht lauter ist als der
// Preis selbst.
export const saveBadgeStyle = {
  display: "inline-block",
  background: "#FCE9DC",
  color: "var(--ca-dk)",
  borderRadius: 20,
  padding: "3px 9px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const strikePriceStyle = {
  fontSize: 12.5,
  color: "var(--ch)",
  textDecoration: "line-through",
};
