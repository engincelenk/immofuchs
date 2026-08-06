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
  background: "#FDEBD3",
  border: "1px solid var(--ca)",
  color: "var(--ca-dk)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
};

export const infoBannerStyle = {
  background: "#E4EAF1",
  border: "1px solid var(--primary)",
  color: "var(--primary)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 11.5,
};

export const errorBannerStyle = {
  background: "#fff1e8",
  border: "1px solid #f5cba9",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--ca-dk)",
  marginBottom: 12,
};
