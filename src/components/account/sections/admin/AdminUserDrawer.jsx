import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  addSupportNote,
  deleteUser,
  fetchUserDetail,
  revokeSessions,
  setUserFlags,
  setUserRole,
  setUserStatus,
  triggerPasswordReset,
} from "./adminApi.js";
import { useAdminToast } from "./AdminToast.jsx";
import {
  PLAN_LABELS,
  ROLE_OPTIONS,
  SUB_STATUS_LABELS,
  dangerBtnStyle,
  errorText,
  formatDate,
  formatDateTime,
  labelStyle,
  mutedTextStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  selectStyle,
  textInputStyle,
} from "./adminUiStyles.js";

// Nutzer-Detail als Side Drawer (Admin-MVP Abschnitt 5: "Beim Klick auf einen
// Nutzer soll sich ein Side Drawer oeffnen. Keine neue Seite erforderlich.").
// Loest die fruehere AdminUserDetailView ab, die die Liste komplett ersetzt
// hat - dabei ging der Listen-Zustand (Seite, Filter, Scrollposition) beim
// Zurueckgehen verloren.
//
// Bewusst KEIN eigener Fokus-Trap: "Mein Konto" haelt bereits einen aktiv
// (MyAccount.jsx/useFocusTrap), und zwei gleichzeitig aktive Traps
// ueberschreiben sich beim Tabben gegenseitig - dieselbe Begruendung, aus der
// der Checkout-Wizard den Konto-Bereich ersetzt statt sich darueberzulegen.
// Stattdessen: Escape schliesst, der Schliessen-Knopf ist erstes Element.
export function AdminUserDrawer({ userId, currentUser, onClose, onChanged }) {
  const toast = useAdminToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Welche Aktion gerade laeuft ("role", "status", ...) - blockiert genau
  // deren Bedienelement statt des ganzen Drawers.
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null); // "suspend" | "delete" | null
  const [note, setNote] = useState("");

  // Der Auftrag (Abschnitt 13) verlangt, dass Support nur ansehen und
  // Notizen schreiben darf. Der Worker setzt das durch (403), die UI
  // versteckt die Bedienelemente zusaetzlich - beides, nicht nur eins:
  // "UI-Verstecken alleine reicht nicht" (Abschnitt 16).
  const canManage = currentUser?.role === "admin";
  const isSelf = detail?.id === currentUser?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await fetchUserDetail(userId));
    } catch (err) {
      setLoadError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Einheitlicher Ablauf fuer jede schreibende Aktion (Auftrag Abschnitt 11):
  // Backend speichern -> Erfolg melden -> Detail neu laden (damit die
  // Anzeige den serverseitig gespeicherten Stand zeigt, nicht den erhofften)
  // -> Liste im Hintergrund auffrischen.
  async function run(key, fn, successText, { reloadList = true } = {}) {
    setBusy(key);
    try {
      await fn();
      toast.success(successText);
      await load();
      if (reloadList) onChanged?.();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy("delete");
    try {
      await deleteUser(userId);
      toast.success("Nutzer wurde gelöscht.");
      onChanged?.();
      onClose(); // Das Konto existiert nicht mehr - kein Neuladen des Details.
    } catch (err) {
      toast.error(errorText(err));
      setBusy(null);
    }
  }

  async function handleNoteSubmit(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    await run("note", () => addSupportNote(userId, text), "Notiz gespeichert.", { reloadList: false });
    setNote("");
  }

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        // Ueber dem Konto-Overlay (z-index 1000), unter den Toasts (1200).
        zIndex: 1100,
        background: "rgba(26,26,26,.32)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Nutzer ${detail?.email || ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          height: "100%",
          overflowY: "auto",
          background: "var(--bg)",
          borderLeft: "1px solid var(--cb)",
          boxSizing: "border-box",
          padding: "16px 16px calc(24px + env(safe-area-inset-bottom))",
          paddingTop: "calc(16px + env(safe-area-inset-top))",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, wordBreak: "break-word" }}>
            {detail?.email || "Nutzer"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{ ...secondaryBtnStyle, padding: "6px 12px", minHeight: 34, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {loading && <p style={{ ...mutedTextStyle, marginTop: 16 }}>Wird geladen …</p>}
        {loadError && <p style={{ color: "#c0392b", fontSize: 12.5, marginTop: 16 }}>{loadError}</p>}

        {detail && (
          <>
            <Block title="Account">
              <Row label="E-Mail" value={detail.email} />
              <Row label="Name" value={detail.name || "–"} />
              <Row label="Registriert" value={formatDateTime(detail.createdAt)} />
              <Row label="Letzter Login" value={formatDateTime(detail.lastLoginAt)} />
              <Row label="E-Mail bestätigt" value={detail.emailVerified ? "Ja" : "Nein"} />

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle} htmlFor="admin-role">
                  Rolle
                </label>
                {canManage ? (
                  <select
                    id="admin-role"
                    value={detail.role}
                    disabled={busy === "role"}
                    onChange={(e) =>
                      run("role", () => setUserRole(userId, e.target.value), "Rolle erfolgreich geändert.")
                    }
                    style={selectStyle}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 13 }}>{ROLE_OPTIONS.find((o) => o.value === detail.role)?.label || detail.role}</div>
                )}
                {canManage && isSelf && (
                  <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 0 }}>
                    Eigenes Konto: die Admin-Rolle lässt sich hier nicht entziehen.
                  </p>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle} htmlFor="admin-status">
                  Status
                </label>
                {canManage ? (
                  <select
                    id="admin-status"
                    value={detail.accountStatus}
                    disabled={busy === "status"}
                    onChange={(e) => {
                      // Sperren beendet alle Sitzungen sofort - das ist eine
                      // kritische Aktion und bekommt die vom Auftrag
                      // (Abschnitt 11) verlangte Bestaetigung. Entsperren
                      // nicht, das ist folgenlos zurueckdrehbar.
                      if (e.target.value === "SUSPENDED") setConfirm("suspend");
                      else run("status", () => setUserStatus(userId, "ACTIVE"), "Konto entsperrt.");
                    }}
                    style={selectStyle}
                  >
                    <option value="ACTIVE">Aktiv</option>
                    <option value="SUSPENDED">Gesperrt</option>
                  </select>
                ) : (
                  <StatusBadge status={detail.accountStatus} />
                )}
              </div>

              {confirm === "suspend" && (
                <ConfirmBox
                  text="Konto wirklich sperren? Alle aktiven Sitzungen dieses Nutzers werden sofort beendet."
                  confirmLabel="Ja, sperren"
                  busy={busy === "status"}
                  onCancel={() => setConfirm(null)}
                  onConfirm={async () => {
                    await run("status", () => setUserStatus(userId, "SUSPENDED"), "Konto gesperrt.");
                    setConfirm(null);
                  }}
                />
              )}

              {canManage && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <Toggle
                    label="Testuser"
                    checked={detail.isTestUser}
                    busy={busy === "flags"}
                    onChange={(next) =>
                      run(
                        "flags",
                        () => setUserFlags(userId, { isTestUser: next }),
                        next ? "Testuser aktiviert." : "Testuser deaktiviert.",
                      )
                    }
                  />
                  <Toggle
                    label="Beta-Zugriff"
                    checked={detail.isBeta}
                    busy={busy === "flags"}
                    onChange={(next) =>
                      run(
                        "flags",
                        () => setUserFlags(userId, { isBeta: next }),
                        next ? "Beta-Zugriff aktiviert." : "Beta-Zugriff deaktiviert.",
                      )
                    }
                  />
                </div>
              )}
            </Block>

            <Block title="Subscription">
              {detail.subscription ? (
                <>
                  <Row label="Plan" value={PLAN_LABELS[detail.subscription.plan] || detail.subscription.plan} />
                  <Row
                    label="Status"
                    value={SUB_STATUS_LABELS[detail.subscription.status] || detail.subscription.status}
                  />
                  <Row label="Startdatum" value={formatDate(detail.subscription.firstPurchaseAt)} />
                  <Row
                    label={detail.subscription.status === "trialing" ? "Testphase endet" : "Nächste Zahlung"}
                    value={formatDate(detail.subscription.currentPeriodEnd)}
                  />
                  <Row label="Paddle Customer ID" value={detail.subscription.paddleCustomerId} mono />
                  <Row label="Paddle Subscription ID" value={detail.subscription.paddleSubscriptionId} mono />
                </>
              ) : (
                <p style={{ ...mutedTextStyle, margin: 0 }}>Kein aktives Abo (Free).</p>
              )}
            </Block>

            <Block title="Support-Notizen">
              <form onSubmit={handleNoteSubmit} style={{ marginBottom: detail.supportNotes.length ? 14 : 0 }}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Support-Notiz hinzufügen …"
                  maxLength={2000}
                  rows={3}
                  style={{ ...textInputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="submit" disabled={busy === "note" || !note.trim()} style={primaryBtnStyle}>
                    Notiz speichern
                  </button>
                </div>
              </form>
              {detail.supportNotes.length === 0 && (
                <p style={{ ...mutedTextStyle, margin: 0 }}>Noch keine Notizen.</p>
              )}
              {detail.supportNotes.map((entry) => (
                <div key={entry.id} style={{ borderTop: "1px solid var(--cb)", padding: "10px 0" }}>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{entry.note}</div>
                  <div style={{ ...mutedTextStyle, fontSize: 11.5, marginTop: 4 }}>
                    {entry.adminEmail} · {formatDateTime(entry.createdAt)}
                  </div>
                </div>
              ))}
            </Block>

            {canManage && (
              <Block title="Aktionen">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() =>
                      run(
                        "reset",
                        () => triggerPasswordReset(userId),
                        "Passwort-Reset-Mail wurde verschickt.",
                        { reloadList: false },
                      )
                    }
                    // Ohne Passwort (reines Google-/Apple-/Passkey-Konto) gibt
                    // es keinen Reset-Weg - der Knopf waere ein Blindgaenger.
                    disabled={busy === "reset" || !detail.hasPassword}
                    style={secondaryBtnStyle}
                  >
                    Passwort-Reset senden
                  </button>
                  {!detail.hasPassword && (
                    <p style={{ ...mutedTextStyle, margin: 0 }}>
                      Konto ohne Passwort (Google/Apple/Passkey) – kein Reset möglich.
                    </p>
                  )}
                  <button
                    onClick={() =>
                      run("sessions", () => revokeSessions(userId), "Alle Sitzungen wurden beendet.", {
                        reloadList: false,
                      })
                    }
                    disabled={busy === "sessions"}
                    style={secondaryBtnStyle}
                  >
                    Alle Sitzungen beenden
                  </button>
                </div>
              </Block>
            )}

            {canManage && !isSelf && (
              <div
                style={{
                  marginTop: 14,
                  border: "1px solid #e8b4ad",
                  borderRadius: 12,
                  padding: 16,
                  background: "var(--cc)",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#c0392b", marginBottom: 6 }}>Danger Zone</div>
                <p style={{ ...mutedTextStyle, marginTop: 0 }}>
                  Löscht das Konto endgültig samt gespeicherter Objekte und Notizen. Ein laufendes Abo wird sofort
                  bei Paddle gekündigt. Diese Aktion lässt sich nicht rückgängig machen.
                </p>
                {confirm === "delete" ? (
                  <ConfirmBox
                    text="Konto wirklich endgültig löschen?"
                    confirmLabel="Ja, endgültig löschen"
                    busy={busy === "delete"}
                    onCancel={() => setConfirm(null)}
                    onConfirm={handleDelete}
                  />
                ) : (
                  <button onClick={() => setConfirm("delete")} style={dangerBtnStyle}>
                    Nutzer löschen
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

function Block({ title, children }) {
  return (
    <section
      style={{
        marginTop: 14,
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value, mono }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "5px 0",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--ch)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-all",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
          fontSize: mono ? 11.5 : 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const suspended = status === "SUSPENDED";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        color: "#fff",
        background: suspended ? "#c0392b" : "#22c55e",
      }}
    >
      {suspended ? "Gesperrt" : "Aktiv"}
    </span>
  );
}

function Toggle({ label, checked, busy, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "var(--ca)", cursor: "pointer" }}
      />
      <span>{label}</span>
    </label>
  );
}

function ConfirmBox({ text, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12.5, color: "var(--ct)", marginTop: 0, marginBottom: 10 }}>{text}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onConfirm} disabled={busy} style={dangerBtnStyle}>
          {confirmLabel}
        </button>
        <button onClick={onCancel} disabled={busy} style={secondaryBtnStyle}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
