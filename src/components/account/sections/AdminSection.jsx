import { useState } from "react";
import { sectionIntroStyle, sectionTitleStyle } from "../accountStyles.js";
import { AdminToastProvider } from "./admin/AdminToast.jsx";
import { AdminDashboardView } from "./admin/AdminDashboardView.jsx";
import { AdminUsersView } from "./admin/AdminUsersView.jsx";
import { AdminSubscriptionsView } from "./admin/AdminSubscriptionsView.jsx";
import { AdminAuditLogView } from "./admin/AdminAuditLogView.jsx";
import { AdminDiscountsView } from "./admin/AdminDiscountsView.jsx";

// Bereich nur fuer role==='admin' (siehe MyAccount.jsx SECTIONS-Filter).
// Ersetzt die vormals eigenstaendige admin/-App (eigener Login-Screen,
// eigener Port) - Nutzer-Entscheidung 2026-08-11: ein Admin-Konto meldet
// sich ueber den normalen App-Login an, das Dashboard erscheint dann hier
// als zusaetzlicher Bereich in "Mein Konto". Die Worker-Routen
// (/api/v1/admin/*) liefen schon vorher im selben Worker wie die Kunden-App,
// es brauchte dafuer keine Backend-Aenderung.
const TABS = [
  { key: "dashboard", label: "Dashboard", Component: AdminDashboardView },
  { key: "users", label: "Nutzer", Component: AdminUsersView },
  { key: "subscriptions", label: "Abos & Zahlungen", Component: AdminSubscriptionsView },
  { key: "discounts", label: "Gutscheine", Component: AdminDiscountsView },
  { key: "audit", label: "Sicherheit & Audit-Log", Component: AdminAuditLogView },
];

export function AdminSection({ t, account }) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const active = TABS.find((tab) => tab.key === activeKey) || TABS[0];
  const ActiveTab = active.Component;
  // Rolle des ANGEMELDETEN Admins (nicht die des betrachteten Nutzers) - die
  // Unteransichten blenden damit aus, was 'support' laut Auftrag Abschnitt 13
  // nicht darf. Der Worker lehnt es zusaetzlich mit 403 ab; die UI-Regel ist
  // Bequemlichkeit, nicht der Schutz (Auftrag Abschnitt 16).
  const currentUser = account?.me || null;
  const isSupportOnly = currentUser?.role === "support";

  return (
    <AdminToastProvider>
      <h2 style={sectionTitleStyle}>{t.navAdmin}</h2>
      <p style={sectionIntroStyle}>
        {isSupportOnly
          ? "Nutzer, Kennzahlen und Audit-Log ansehen. Änderungen an Rollen, Status und Gutscheinen sind Owner/Admin vorbehalten."
          : "Nutzerverwaltung, Kennzahlen und Audit-Log - nur für Administrator-Konten sichtbar."}
      </p>

      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          marginBottom: 18,
          borderBottom: "1px solid var(--cb)",
          paddingBottom: 10,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveKey(tab.key)}
            aria-current={tab.key === activeKey ? "page" : undefined}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: 20,
              border: `1px solid ${tab.key === activeKey ? "var(--ca)" : "var(--cb)"}`,
              background: tab.key === activeKey ? "var(--ca-bg)" : "var(--cc)",
              color: tab.key === activeKey ? "var(--ca-dk)" : "var(--ct)",
              fontSize: 12.5,
              fontWeight: tab.key === activeKey ? 700 : 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ActiveTab currentUser={currentUser} />
    </AdminToastProvider>
  );
}
