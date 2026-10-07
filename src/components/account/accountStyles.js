// Geteilte Inline-Styles fuer "Mein Konto" (Phase 2). Bewusst nur das, was
// der Checkout-Wizard NICHT schon liefert - Buttons, Inputs und Banner kommen
// weiterhin aus checkoutStyles.js, damit beide Vollbild-Flaechen dieselbe
// Optik behalten und es keine zweite Wahrheit fuer z.B. die Akzentfarbe gibt.

export const sectionTitleStyle = {
  fontSize: 17,
  fontWeight: 800,
  color: "var(--ct)",
  marginBottom: 4,
};

export const sectionIntroStyle = {
  fontSize: 12.5,
  color: "var(--ch)",
  lineHeight: 1.6,
  margin: "0 0 18px",
};

// Zwischenueberschrift innerhalb eines Bereichs (z.B. "Passwort aendern").
export const blockTitleStyle = {
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--ct)",
  marginBottom: 6,
};

export const blockHintStyle = {
  fontSize: 11.5,
  color: "var(--ch)",
  lineHeight: 1.6,
  margin: "0 0 12px",
};

// Karten trennen die Bloecke innerhalb eines Bereichs voneinander - ohne sie
// verschwimmen "Passwort aendern" und "Sprache" auf dem Handy zu einer Wand.
export const blockCardStyle = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};

export const labelValueRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "7px 0",
  fontSize: 13,
};

export const labelStyle = { color: "var(--ch)", flexShrink: 0 };

export const valueStyle = { fontWeight: 600, textAlign: "right", wordBreak: "break-word" };

// Textbutton in Fliesstext-Groesse ("aendern"). --ca-dk statt --ca wegen
// Kontrast auf weissem Kartenhintergrund (S2-5).
export const inlineLinkBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--ca-dk)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
};

// Sekundaerer Button in Zeilenbreite - fuer Aktionen, die eine externe Seite
// oder einen Unterdialog oeffnen.
export const actionBtnStyle = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 13.5,
  fontWeight: 600,
  background: "var(--ci)",
  color: "var(--ct)",
  border: "1px solid var(--cb)",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  minHeight: 44,
};

// Rot nur fuer wirklich zerstoerende Aktionen (Konto loeschen) - Kuendigung
// ist bewusst neutral, sie ist ein legitimer, jederzeit erlaubter Schritt.
export const dangerBtnStyle = {
  ...actionBtnStyle,
  color: "#c0392b",
  border: "1px solid #e8b4ad",
};

export const successBannerStyle = {
  background: "#E7F3EA",
  border: "1px solid #2d8a4e",
  color: "#1f6b3a",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 12,
};

export const emptyStateStyle = {
  fontSize: 12.5,
  color: "var(--ch)",
  lineHeight: 1.6,
  padding: "18px 0",
  textAlign: "center",
};
