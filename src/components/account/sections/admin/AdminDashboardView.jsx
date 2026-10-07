import { useEffect, useState } from "react";
import { fetchActivity, fetchCheckoutGate, fetchDashboard, setCheckoutGate, triggerTestEmails } from "./adminApi.js";
import { useAdminToast } from "./AdminToast.jsx";
import {
  PLAN_LABELS,
  errorText,
  mutedTextStyle,
  secondaryBtnStyle,
  dangerBtnStyle,
} from "./adminUiStyles.js";

const TILES = [
  { key: "totalUsers", label: "Nutzer gesamt", format: (v) => v.toLocaleString("de-DE") },
  { key: "newUsersThisMonth", label: "Neue Nutzer (Monat)", format: (v) => v.toLocaleString("de-DE") },
  { key: "activeSubscriptions", label: "Aktive Abos", format: (v) => v.toLocaleString("de-DE") },
  { key: "trialUsers", label: "Trial-Nutzer", format: (v) => v.toLocaleString("de-DE") },
  {
    key: "mrr",
    label: "MRR",
    format: (v) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  },
  { key: "cancellationsThisMonth", label: "Kündigungen (Monat)", format: (v) => v.toLocaleString("de-DE") },
];

// Beschriftung und Farbe je Ereignisart. Die Schluessel kommen 1:1 aus
// listAdminActivity (worker/src/db.ts).
const ACTIVITY_KINDS = {
  // var(--primary-tx) statt #1E3A5F (Bugreport 2026-09-09): als TEXTFARBE auf
  // Kartenhintergrund ist festes Marineblau im Dark Mode kaum lesbar.
  "user.registered": { label: "Neuer Nutzer registriert", color: "var(--primary-tx)" },
  "subscription.started": { label: "Subscription abgeschlossen", color: "#22c55e" },
  "subscription.canceled": { label: "Subscription gekündigt", color: "#c0392b" },
  "admin.action": { label: "Admin-Aktion", color: "var(--ca-dk)" },
};

export function AdminDashboardView() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);
  const [testEmailsConfirm, setTestEmailsConfirm] = useState(false);
  const [testEmailsBusy, setTestEmailsBusy] = useState(false);
  const [gate, setGate] = useState(null); // {open, source} | null
  const [gateConfirm, setGateConfirm] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const toast = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    // Beide Abfragen unabhaengig: faellt der Aktivitaets-Feed aus, sollen die
    // Kennzahlen trotzdem stehen - und umgekehrt.
    fetchDashboard()
      .then((data) => !cancelled && setStats(data))
      .catch((err) => !cancelled && setError(errorText(err)));
    fetchActivity()
      .then((data) => !cancelled && setActivity(data.entries))
      .catch(() => !cancelled && setActivity([]));
    fetchCheckoutGate()
      .then((data) => !cancelled && setGate(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGateToggle() {
    setGateBusy(true);
    try {
      const res = await setCheckoutGate(!gate.open);
      setGate(res);
      toast.success(res.open ? "Kauf ist jetzt für alle freigegeben." : "Kauf ist jetzt gesperrt.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setGateBusy(false);
      setGateConfirm(false);
    }
  }

  async function handleTestEmails() {
    setTestEmailsBusy(true);
    try {
      const res = await triggerTestEmails();
      const failed = res.results?.filter((r) => !r.ok) ?? [];
      if (failed.length > 0) {
        toast.error(`${res.results.length - failed.length}/${res.results.length} Mails an ${res.to} verschickt, ${failed.length} fehlgeschlagen.`);
      } else {
        toast.success(`Alle ${res.results.length} E-Mail-Vorlagen an ${res.to} verschickt.`);
      }
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTestEmailsBusy(false);
      setTestEmailsConfirm(false);
    }
  }

  return (
    <div>
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!stats && !error && <div style={mutedTextStyle}>Wird geladen …</div>}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          {TILES.map((tile) => (
            <div
              key={tile.key}
              style={{
                background: "var(--cc)",
                border: "1px solid var(--cb)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 6 }}>{tile.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{tile.format(stats[tile.key] ?? 0)}</div>
            </div>
          ))}
        </div>
      )}

      {gate && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>Kauf freigeben</h3>
          <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
            Aktuell:{" "}
            <strong style={{ color: gate.open ? "#22c55e" : "#c0392b" }}>
              {gate.open ? "für alle offen" : "gesperrt (nur Admins und Testuser)"}
            </strong>
            {gate.source === "env" && " – Startwert aus der Server-Konfiguration, noch nie hier umgestellt."}
          </p>
          {!gateConfirm ? (
            <button type="button" style={secondaryBtnStyle} onClick={() => setGateConfirm(true)}>
              {gate.open ? "🔒 Kauf sperren" : "🔓 Kauf für alle freigeben"}
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                background: "var(--cc)",
                border: "1px solid var(--cb)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <span style={{ fontSize: 13 }}>
                {gate.open ? "Kauf für alle Nutzer sperren?" : "Kauf jetzt für alle Nutzer freigeben?"}
              </span>
              <button type="button" style={dangerBtnStyle} disabled={gateBusy} onClick={handleGateToggle}>
                {gateBusy ? "Speichert …" : gate.open ? "Ja, sperren" : "Ja, freigeben"}
              </button>
              <button
                type="button"
                style={secondaryBtnStyle}
                disabled={gateBusy}
                onClick={() => setGateConfirm(false)}
              >
                Abbrechen
              </button>
            </div>
          )}
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>E-Mail-Vorlagen testen</h3>
        <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
          Schickt alle 17 im System vorkommenden E-Mail-Vorlagen (Registrierung, Login, Passwort,
          Abo-Ereignisse, Erinnerungen) einmal an deine eigene Login-Adresse, um Layout und Inhalt im
          echten Postfach zu prüfen.
        </p>
        {!testEmailsConfirm ? (
          <button type="button" style={secondaryBtnStyle} onClick={() => setTestEmailsConfirm(true)}>
            📧 Alle E-Mail-Vorlagen testen
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <span style={{ fontSize: 13 }}>
              17 E-Mails an deine eigene Adresse verschicken?
            </span>
            <button
              type="button"
              style={dangerBtnStyle}
              disabled={testEmailsBusy}
              onClick={handleTestEmails}
            >
              {testEmailsBusy ? "Sendet …" : "Ja, verschicken"}
            </button>
            <button
              type="button"
              style={secondaryBtnStyle}
              disabled={testEmailsBusy}
              onClick={() => setTestEmailsConfirm(false)}
            >
              Abbrechen
            </button>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>Letzte Aktivitäten</h3>
        <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
          Registrierungen, Abo-Abschlüsse, Kündigungen und Admin-Aktionen. Gutschein-Einlösungen erscheinen hier
          nicht – die finden bei Stripe statt und werden in ImmoFuchs nicht gespeichert.
        </p>

        {activity === null && <div style={mutedTextStyle}>Wird geladen …</div>}
        {activity?.length === 0 && <div style={mutedTextStyle}>Noch keine Aktivitäten.</div>}

        {activity && activity.length > 0 && (
          <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, overflow: "hidden" }}>
            {activity.map((entry, i) => {
              const kind = ACTIVITY_KINDS[entry.kind] || { label: entry.kind, color: "var(--ch)" };
              return (
                <div
                  key={`${entry.kind}-${entry.at}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    padding: "10px 16px",
                    borderTop: i === 0 ? "none" : "1px solid var(--cb)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: kind.color }}>{kind.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ch)", wordBreak: "break-word" }}>
                      {entry.subject}
                      {entry.detail && ` · ${PLAN_LABELS[entry.detail] || entry.detail}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ch)", whiteSpace: "nowrap" }}>
                    {new Date(entry.at).toLocaleString("de-DE")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
