import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/apiBase.js";

// Zeigt oben einen Hinweis, wenn der Worker im Standby laeuft (worker/src/standby.ts): qa ist der Zwilling
// von prod, nutzt dieselbe Datenbank und darf nichts schreiben, nichts verschicken und nichts kaufen lassen.
// Fehlt die Antwort oder ist kein Standby aktiv, passiert nichts (prod, dev: kein Hinweis).
export function StandbyBanner() {
  const [standby, setStandby] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/standby-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.standby === true) setStandby(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!standby) return null;
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2000,
        background: "#E8600A",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        padding: "6px 12px",
      }}
    >
      Standby-Umgebung (Zwilling von prod): nur lesen, keine Mails, keine Käufe.
    </div>
  );
}
