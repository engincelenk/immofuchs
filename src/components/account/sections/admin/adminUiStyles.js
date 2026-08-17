// Geteilte Inline-Styles der Admin-Oberflaeche (Admin-MVP Phase 2).
// Bewusst eigene Datei statt accountStyles.js: die Kunden-Bereiche sind
// schmale Formular-Spalten (480/560px), der Admin-Bereich ist eine
// datendichte Tabellen-Oberflaeche - dieselben Werte wuerden hier nicht
// passen und die Kunden-Styles wuerden bei jeder Admin-Aenderung mitwandern.

export const cardStyle = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: 16,
};

export const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  overflow: "hidden",
};

export const thStyle = {
  padding: 10,
  fontSize: 11.5,
  color: "var(--ch)",
  fontWeight: 600,
  textAlign: "left",
  whiteSpace: "nowrap",
};

export const tdStyle = { padding: 10, fontSize: 13, verticalAlign: "middle" };

export const selectStyle = {
  // 16px auf Mobilgeraeten Pflicht (Projektregel: iOS zoomt sonst beim
  // Fokussieren in das Feld hinein).
  fontSize: 16,
  padding: "8px 10px",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--ci)",
  color: "var(--ct)",
  fontFamily: "inherit",
  minHeight: 40,
};

export const textInputStyle = { ...selectStyle, width: "100%", boxSizing: "border-box" };

export const primaryBtnStyle = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  background: "var(--ca)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 40,
};

export const secondaryBtnStyle = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ct)",
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 40,
};

// Rot ist der Danger-Zone vorbehalten (Loeschen, Sperren) - dieselbe Linie
// wie im Kundenbereich, wo Kuendigen bewusst neutral bleibt.
export const dangerBtnStyle = {
  ...primaryBtnStyle,
  background: "#c0392b",
};

export const labelStyle = {
  display: "block",
  fontSize: 11.5,
  color: "var(--ch)",
  fontWeight: 600,
  marginBottom: 5,
};

export const errorTextStyle = { color: "#c0392b", fontSize: 12.5 };

export const mutedTextStyle = { color: "var(--ch)", fontSize: 12.5 };

// ── Beschriftungen ──────────────────────────────────────────────────
// Rollennamen erscheinen an mehreren Stellen (Tabelle, Drawer-Dropdown,
// Filter) - eine Quelle, damit sie nicht auseinanderlaufen. Die Werte sind
// die DB-Rollen aus entitlement.ts.
export const ROLE_LABELS = {
  customer: "Customer",
  admin: "Admin",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export const SUB_STATUS_LABELS = {
  active: "Aktiv",
  trialing: "Testphase",
  past_due: "Zahlung offen",
  cancel_scheduled: "Gekündigt zum Periodenende",
  canceled: "Gekündigt",
};

export const PLAN_LABELS = { monthly: "Monatlich", yearly: "Jährlich" };

export function formatDate(ms) {
  return ms ? new Date(ms).toLocaleDateString("de-DE") : "–";
}

export function formatDateTime(ms) {
  return ms ? new Date(ms).toLocaleString("de-DE") : "–";
}

// Fehlerschluessel des Workers in lesbare Saetze uebersetzen - die rohen
// Codes ("cannot_demote_self") sind fuer den Betreiber unbrauchbar.
const ERROR_TEXTS = {
  forbidden: "Dafür fehlt deinem Konto die Berechtigung.",
  not_found: "Nutzer nicht gefunden.",
  invalid_role: "Unbekannte Rolle.",
  invalid_flags: "Keine gültige Änderung übergeben.",
  invalid_note: "Notiz ist leer oder zu lang (max. 2000 Zeichen).",
  invalid_status: "Ungültiger Status.",
  cannot_suspend_self: "Du kannst dein eigenes Konto nicht sperren.",
  cannot_demote_self: "Du kannst dir nicht selbst die Admin-Rechte entziehen.",
  cannot_delete_self: "Du kannst dein eigenes Konto hier nicht löschen.",
  no_password_account: "Dieses Konto hat kein Passwort (Google/Apple/Passkey) – ein Reset ist nicht möglich.",
  delete_failed_try_again: "Löschen fehlgeschlagen. Die Paddle-Kündigung lief nicht durch – bitte erneut versuchen.",
  invalid_email: "Ungültige E-Mail-Adresse.",
  email_exists: "Ein Konto mit dieser E-Mail-Adresse existiert bereits.",
  invalid_subscription: "Ungültiger Abo-Status oder -Plan.",
  subscription_requires_test_user: "Ein Abo-Zustand lässt sich nur für Testuser direkt setzen.",
  request_failed: "Die Aktion ist fehlgeschlagen.",
};

export function errorText(err) {
  return ERROR_TEXTS[err?.message] || ERROR_TEXTS.request_failed;
}
