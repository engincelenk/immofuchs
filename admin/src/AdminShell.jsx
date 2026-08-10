// admin/src/AdminShell.jsx
import { useState } from "react";
import UsersView from "./UsersView.jsx";

// 11 Bereiche aus Neue-Phase-Konsolidiert.md Abschnitt 6.16 - nur "Nutzer"
// ist in dieser Etappe funktionsfaehig, alle anderen sind sichtbare, aber
// deaktivierte Platzhalter (macht das Zielbild des vollstaendigen Admin
// Panels erkennbar, siehe Spec-Dokument Abschnitt 5).
const NAV_ITEMS = [
  { key: "users", label: "Nutzer", enabled: true },
  { key: "subscriptions", label: "Abos & Payments", enabled: false },
  { key: "coupons", label: "Gutscheine", enabled: false },
  { key: "features", label: "Features", enabled: false },
  { key: "ai", label: "KI Management", enabled: false },
  { key: "data", label: "Immobiliendaten", enabled: false },
  { key: "marketing", label: "Marketing", enabled: false },
  { key: "communication", label: "Kommunikation", enabled: false },
  { key: "support", label: "Support", enabled: false },
  { key: "security", label: "Sicherheit & Audit Log", enabled: false },
  { key: "settings", label: "Einstellungen", enabled: false },
];

export default function AdminShell({ me }) {
  const [activeKey, setActiveKey] = useState("users");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "var(--cc)", borderRight: "1px solid var(--cb)", padding: "20px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 20px", fontSize: 15, fontWeight: 700 }}>ImmoFuchs Admin</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              disabled={!item.enabled}
              onClick={() => item.enabled && setActiveKey(item.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 20px",
                border: "none",
                background: activeKey === item.key ? "var(--ca-bg)" : "transparent",
                color: item.enabled ? "var(--ct)" : "var(--ch)",
                fontSize: 14,
                cursor: item.enabled ? "pointer" : "default",
              }}
            >
              {item.label}
              {!item.enabled && <span style={{ float: "right", fontSize: 11, color: "var(--ch)" }}>bald</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: 20, fontSize: 12, color: "var(--ch)", borderTop: "1px solid var(--cb)", marginTop: 20 }}>
          Angemeldet als
          <br />
          {me?.email}
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, minWidth: 0 }}>{activeKey === "users" && <UsersView />}</main>
    </div>
  );
}
