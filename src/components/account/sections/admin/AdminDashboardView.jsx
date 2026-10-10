import { useEffect, useState } from "react";
import {
  fetchActivity,
  fetchAdminMfaGate,
  fetchCheckoutGate,
  fetchDashboard,
  fetchRegistrationGate,
  setAdminMfaGate,
  setCheckoutGate,
  setRegistrationGate,
  triggerTestEmails,
} from "./adminApi.js";
import { AdminGateSection } from "./AdminGateSection.jsx";
import { AdminBackupSection } from "./AdminBackupSection.jsx";
import { AdminConfirmBox, AdminSettingRow, AdminSettingsCard } from "./AdminSettingRow.jsx";
import { useAdminToast } from "./AdminToast.jsx";
import {
  PLAN_LABELS,
  errorText,
  mutedTextStyle,
  secondaryBtnStyle,
  dangerBtnStyle,
} from "./adminUiStyles.js";

// MRR steht als Hauptkachel ueber der vollen Breite, die uebrigen darunter.
const HERO_TILE = "mrr";

const TILES = [
  { key: "totalUsers", label: "Nutzer gesamt", format: (v) => v.toLocaleString("de-DE") },
  {
    key: "newUsersThisMonth",
    label: "Neue Nutzer (Monat)",
    format: (v) => v.toLocaleString("de-DE"),
  },
  { key: "activeSubscriptions", label: "Aktive Abos", format: (v) => v.toLocaleString("de-DE") },
  { key: "trialUsers", label: "Trial-Nutzer", format: (v) => v.toLocaleString("de-DE") },
  {
    key: "mrr",
    label: "MRR",
    format: (v) =>
      `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  },
  {
    key: "cancellationsThisMonth",
    label: "Kündigungen (Monat)",
    format: (v) => v.toLocaleString("de-DE"),
  },
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
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTestEmails() {
    setTestEmailsBusy(true);
    try {
      const res = await triggerTestEmails();
      const failed = res.results?.filter((r) => !r.ok) ?? [];
      if (failed.length > 0) {
        toast.error(
          `${res.results.length - failed.length}/${res.results.length} Mails an ${res.to} verschickt, ${failed.length} fehlgeschlagen.`,
        );
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
            gap: 12,
          }}
        >
          {TILES.map((tile) => {
            const hero = tile.key === HERO_TILE;
            return (
              <div
                key={tile.key}
                style={{
                  background: "var(--cc)",
                  border: "1px solid var(--cb)",
                  borderRadius: 12,
                  padding: 16,
                  order: hero ? -1 : 0,
                  ...(hero && {
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                  }),
                }}
              >
                <div
                  style={{
                    fontSize: hero ? 13 : 11.5,
                    color: "var(--ch)",
                    marginBottom: hero ? 0 : 6,
                  }}
                >
                  {hero ? "MRR (Monatsumsatz)" : tile.label}
                </div>
                <div
                  style={{
                    fontSize: hero ? 30 : 22,
                    fontWeight: 700,
                    color: hero ? "var(--ca)" : undefined,
                  }}
                >
                  {tile.format(stats[tile.key] ?? 0)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminSettingsCard>
        <AdminGateSection
          title="Kauf freigeben"
          load={fetchCheckoutGate}
          save={setCheckoutGate}
          texts={{
            stateOpen: "für alle offen",
            stateClosed: "gesperrt (nur Admins und Testuser)",
            askClose: "Kauf für alle Nutzer sperren?",
            askOpen: "Kauf jetzt für alle Nutzer freigeben?",
            toastClosed: "Kauf ist jetzt gesperrt.",
            toastOpen: "Kauf ist jetzt für alle freigegeben.",
          }}
        />

        <AdminGateSection
          title="Registrierung öffnen"
          load={fetchRegistrationGate}
          save={setRegistrationGate}
          texts={{
            stateOpen: "für alle offen",
            stateClosed: "gesperrt (bestehende Konten melden sich weiter an)",
            askClose: "Neue Registrierungen sperren?",
            askOpen: "Registrierung jetzt für alle öffnen?",
            toastClosed: "Registrierung ist jetzt gesperrt.",
            toastOpen: "Registrierung ist jetzt für alle geöffnet.",
          }}
        />

        <AdminGateSection
          title="Admin-Zweitfaktor"
          load={fetchAdminMfaGate}
          save={setAdminMfaGate}
          texts={{
            stateOpen: "an (E-Mail-Code bei jeder Admin-Anmeldung)",
            stateClosed: "aus",
            askClose: "Zweitfaktor für Admins ausschalten? Admin-Anmeldungen brauchen dann keinen E-Mail-Code mehr.",
            askOpen: "Zweitfaktor für Admins einschalten? Danach brauchen alle Admin-Sitzungen einen E-Mail-Code, auch deine.",
            confirmClose: "Ja, ausschalten",
            confirmOpen: "Ja, einschalten",
            toastClosed: "Admin-Zweitfaktor ist jetzt aus.",
            toastOpen: "Admin-Zweitfaktor ist jetzt an.",
          }}
        />

        <AdminBackupSection />

        <AdminSettingRow
          title="E-Mail-Vorlagen testen"
          control={
            <button
              type="button"
              style={secondaryBtnStyle}
              disabled={testEmailsConfirm}
              onClick={() => setTestEmailsConfirm(true)}
            >
              📧 Alle E-Mail-Vorlagen testen
            </button>
          }
          below={
            testEmailsConfirm && (
              <AdminConfirmBox>
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
              </AdminConfirmBox>
            )
          }
        >
          Schickt alle 17 im System vorkommenden E-Mail-Vorlagen (Registrierung, Login, Passwort,
          Abo-Ereignisse, Erinnerungen) einmal an deine eigene Login-Adresse, um Layout und Inhalt
          im echten Postfach zu prüfen.
        </AdminSettingRow>
      </AdminSettingsCard>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>Letzte Aktivitäten</h3>
        <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
          Registrierungen, Abo-Abschlüsse, Kündigungen und Admin-Aktionen. Gutschein-Einlösungen
          erscheinen hier nicht – die finden bei Stripe statt und werden in ImmoFuchs nicht
          gespeichert.
        </p>

        {activity === null && <div style={mutedTextStyle}>Wird geladen …</div>}
        {activity?.length === 0 && <div style={mutedTextStyle}>Noch keine Aktivitäten.</div>}

        {activity && activity.length > 0 && (
          <div
            style={{
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: kind.color }}>
                      {kind.label}
                    </div>
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
