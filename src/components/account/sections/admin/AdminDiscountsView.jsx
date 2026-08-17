import { useCallback, useEffect, useState } from "react";
import {
  createDiscount,
  createDiscountsBulk,
  fetchDiscounts,
  setDiscountStatus,
  updateDiscount,
} from "./adminApi.js";
import { useAdminToast } from "./AdminToast.jsx";
import {
  errorText,
  labelStyle,
  mutedTextStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  textInputStyle,
  thStyle,
} from "./adminUiStyles.js";

// Gutscheine (Admin-MVP Abschnitt 9). Paddle bleibt die einzige Quelle -
// D1 speichert dazu nichts (Nutzer-Entscheidung 2026-08-13, bestaetigt:
// Paddle setzt den Rabatt beim Checkout durch, eine zweite Wahrheit wuerde
// zwangslaeufig auseinanderlaufen).
//
// ZWEI FELDER AUS DEM AUFTRAG GIBT ES BEI PADDLE NICHT (offizielle Referenz,
// 2026-08-13 geprueft) und sie fehlen deshalb bewusst:
//  - "Startdatum": Paddle kennt nur expires_at; ein Gutschein gilt ab dem
//    Anlegen. Wer spaeter starten will, legt ihn spaeter an.
//  - "pro Kunde nur einmal": usage_limit ist ausdruecklich ein GESAMT-Limit,
//    kein Limit je Kunde.

const EMPTY_FORM = {
  code: "",
  description: "",
  type: "percentage",
  amount: "",
  usageLimit: "",
  expiresAt: "",
};

const STATUS_FILTERS = [
  { value: "active", label: "Aktiv" },
  { value: "archived", label: "Inaktiv" },
  { value: "expired", label: "Abgelaufen" },
];

const STATUS_LABELS = { active: "Aktiv", archived: "Deaktiviert", expired: "Abgelaufen" };
const STATUS_COLORS = { active: "#22c55e", archived: "#8A8A80", expired: "#8A8A80" };

export function AdminDiscountsView({ currentUser }) {
  const canManage = currentUser?.role === "admin";
  const toast = useAdminToast();

  const [discounts, setDiscounts] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkCount, setBulkCount] = useState("");
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null); // {id, description, amount, usageLimit, expiresAt}

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDiscounts();
      setDiscounts(data.discounts);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function formPayload() {
    return {
      description: form.description.trim(),
      type: form.type,
      amount: form.amount.trim(),
      usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      // Leeres Datumsfeld heisst "laeuft nicht ab" - null, nicht weglassen.
      expiresAt: form.expiresAt || null,
    };
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy("create");
    try {
      await createDiscount({ code: form.code.trim().toUpperCase(), ...formPayload() });
      toast.success("Gutschein erstellt.");
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  // Mehrfach-Erzeugung nutzt dasselbe Formular: der Code-Eingabewert dient
  // dabei als Praefix, die eindeutigen Suffixe erzeugt der Worker.
  async function handleBulk(count) {
    if (!form.description.trim() || !form.amount.trim()) {
      toast.error("Beschreibung und Rabattwert werden auch für Mehrfach-Codes gebraucht.");
      return;
    }
    setBusy("bulk");
    try {
      const res = await createDiscountsBulk({
        count,
        prefix: form.code.trim(),
        ...formPayload(),
      });
      toast.success(
        res.failed > 0
          ? `${res.codes.length} von ${res.requested} Codes erstellt (${res.failed} fehlgeschlagen).`
          : `${res.codes.length} Codes erstellt.`,
      );
      setForm(EMPTY_FORM);
      setBulkCount("");
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleStatus(discount) {
    setBusy(discount.id);
    try {
      const next = discount.status === "active" ? "archived" : "active";
      await setDiscountStatus(discount.id, next);
      toast.success(next === "archived" ? "Gutschein deaktiviert." : "Gutschein aktiviert.");
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setBusy("edit");
    try {
      await updateDiscount(editing.id, {
        description: editing.description.trim(),
        amount: editing.amount.trim(),
        usageLimit: editing.usageLimit ? parseInt(editing.usageLimit, 10) : null,
        expiresAt: editing.expiresAt || null,
      });
      toast.success("Gutschein gespeichert.");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  // Duplizieren fuellt das Anlegen-Formular vor, statt sofort anzulegen: der
  // Code muss ohnehin neu sein, und so kann der Betreiber vorher noch etwas
  // aendern. Anlegen passiert erst mit dem regulaeren Knopf.
  function handleDuplicate(discount) {
    setForm({
      code: "",
      description: discount.description,
      type: discount.type,
      amount: discount.amount,
      usageLimit: discount.usageLimit ? String(discount.usageLimit) : "",
      expiresAt: isoToDateInput(discount.expiresAt),
    });
    setEditing(null);
    toast.success("Werte übernommen – Code vergeben und speichern.");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code kopiert.");
    } catch {
      toast.error("Kopieren nicht möglich – bitte manuell markieren.");
    }
  }

  const visible = (discounts || []).filter((d) => !statusFilter || d.status === statusFilter);

  return (
    <div>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 16 }}>
        Gutscheine werden in Paddle geführt – der Code wird im Zahlungsschritt eingelöst, der abgerechnete Betrag
        kommt immer von Paddle selbst. Ein Startdatum und ein Limit „pro Kunde nur einmal“ bietet die Paddle-API
        nicht an; ein Gutschein gilt ab dem Anlegen, und das Nutzungslimit gilt insgesamt.
      </p>

      {canManage && (
        <form
          onSubmit={handleCreate}
          style={{
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>Gutschein erstellen</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
            }}
          >
            <Field label="Code" hint="Bei Mehrfach-Codes: Präfix">
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SOMMER25"
                style={textInputStyle}
              />
            </Field>
            <Field label="Beschreibung">
              <input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Sommeraktion 2026"
                style={textInputStyle}
              />
            </Field>
            <Field label="Rabattart">
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                style={{ ...selectStyle, width: "100%" }}
              >
                <option value="percentage">Prozent</option>
                <option value="flat">Fester Betrag</option>
              </select>
            </Field>
            <Field label={form.type === "percentage" ? "Wert (%)" : "Wert (Cent)"}>
              <input
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={form.type === "percentage" ? "10" : "500"}
                style={textInputStyle}
              />
            </Field>
            <Field label="Gültig bis" hint="leer = unbegrenzt">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                style={textInputStyle}
              />
            </Field>
            <Field label="Nutzungslimit" hint="leer = unbegrenzt">
              <input
                inputMode="numeric"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                placeholder="unbegrenzt"
                style={textInputStyle}
              />
            </Field>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, alignItems: "center" }}>
            <button type="submit" disabled={busy === "create" || !form.code.trim()} style={primaryBtnStyle}>
              {busy === "create" ? "Wird erstellt …" : "Gutschein erstellen"}
            </button>
            <span style={{ ...mutedTextStyle, marginLeft: 4 }}>oder</span>
            <select
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value)}
              aria-label="Anzahl Codes"
              style={selectStyle}
            >
              <option value="">Anzahl …</option>
              <option value="10">10 Codes</option>
              <option value="50">50 Codes</option>
              <option value="100">100 Codes</option>
            </select>
            <button
              type="button"
              disabled={busy === "bulk" || !bulkCount}
              onClick={() => handleBulk(parseInt(bulkCount, 10))}
              style={secondaryBtnStyle}
            >
              {busy === "bulk" ? "Wird erzeugt …" : "Codes generieren"}
            </button>
          </div>
        </form>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="admin-discount-status">
          Status
        </label>
        <select
          id="admin-discount-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Alle</option>
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {!discounts && !error && <div style={mutedTextStyle}>Wird geladen …</div>}

      {discounts && (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "var(--ci)" }}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Beschreibung</th>
                <th style={thStyle}>Rabatt</th>
                <th style={thStyle}>Gültig bis</th>
                <th style={thStyle}>Nutzung</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--cb)" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                        {d.code || "–"}
                      </code>
                      {d.code && (
                        <button
                          onClick={() => copyCode(d.code)}
                          aria-label={`Code ${d.code} kopieren`}
                          title="Code kopieren"
                          style={iconBtnStyle}
                        >
                          ⧉
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>{d.description}</td>
                  <td style={tdStyle}>
                    {d.type === "percentage" ? `${d.amount} %` : `${(Number(d.amount) / 100).toFixed(2)} €`}
                  </td>
                  <td style={tdStyle}>
                    {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("de-DE") : "–"}
                  </td>
                  <td style={tdStyle}>
                    {d.timesUsed}
                    {d.usageLimit ? ` / ${d.usageLimit}` : " / ∞"}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        background: STATUS_COLORS[d.status] || "#8A8A80",
                      }}
                    >
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {canManage && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Abgelaufene Gutscheine lassen sich nicht mehr
                            umschalten - der Zustand kommt bei Paddle aus dem
                            Datum, nicht aus einem Schalter. Bearbeiten geht,
                            damit ein neues Ablaufdatum gesetzt werden kann. */}
                        {d.status !== "expired" && (
                          <button
                            onClick={() => handleToggleStatus(d)}
                            disabled={busy === d.id}
                            style={{
                              ...smallBtnStyle,
                              color: d.status === "active" ? "#c0392b" : "var(--ct)",
                            }}
                          >
                            {d.status === "active" ? "Deaktivieren" : "Aktivieren"}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setEditing({
                              id: d.id,
                              code: d.code,
                              type: d.type,
                              description: d.description,
                              amount: d.amount,
                              usageLimit: d.usageLimit ? String(d.usageLimit) : "",
                              expiresAt: isoToDateInput(d.expiresAt),
                            })
                          }
                          style={smallBtnStyle}
                        >
                          Bearbeiten
                        </button>
                        <button onClick={() => handleDuplicate(d)} style={smallBtnStyle}>
                          Duplizieren
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 20, textAlign: "center", ...mutedTextStyle }}>
                    {statusFilter ? "Keine Gutscheine mit diesem Status." : "Noch keine Gutscheine."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditDialog
          editing={editing}
          setEditing={setEditing}
          busy={busy === "edit"}
          onSubmit={handleSaveEdit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// Paddle liefert ISO-8601 mit Zeit, input[type=date] will "YYYY-MM-DD".
function isoToDateInput(iso) {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function EditDialog({ editing, setEditing, busy, onSubmit, onCancel }) {
  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(26,26,26,.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 20,
          width: "min(420px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxSizing: "border-box",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Gutschein bearbeiten</div>
        <p style={{ ...mutedTextStyle, marginTop: 0 }}>
          Code <code>{editing.code || "–"}</code> und Rabattart lassen sich nicht ändern – ein bereits verteilter
          Gutschein würde sonst still zu einem anderen. Nutze dafür „Duplizieren“.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          <Field label="Beschreibung">
            <input
              required
              value={editing.description}
              onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
              style={textInputStyle}
            />
          </Field>
          <Field label={editing.type === "percentage" ? "Wert (%)" : "Wert (Cent)"}>
            <input
              required
              value={editing.amount}
              onChange={(e) => setEditing((s) => ({ ...s, amount: e.target.value }))}
              style={textInputStyle}
            />
          </Field>
          <Field label="Gültig bis" hint="leer = unbegrenzt">
            <input
              type="date"
              value={editing.expiresAt}
              onChange={(e) => setEditing((s) => ({ ...s, expiresAt: e.target.value }))}
              style={textInputStyle}
            />
          </Field>
          <Field label="Nutzungslimit" hint="leer = unbegrenzt">
            <input
              inputMode="numeric"
              value={editing.usageLimit}
              onChange={(e) => setEditing((s) => ({ ...s, usageLimit: e.target.value }))}
              placeholder="unbegrenzt"
              style={textInputStyle}
            />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={secondaryBtnStyle}>
            Abbrechen
          </button>
          <button type="submit" disabled={busy} style={primaryBtnStyle}>
            {busy ? "Wird gespeichert …" : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>
        {label}
        {hint && <span style={{ fontWeight: 400 }}> ({hint})</span>}
      </span>
      {children}
    </label>
  );
}

const smallBtnStyle = {
  padding: "5px 10px",
  fontSize: 12,
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--cc)",
  color: "var(--ct)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

const iconBtnStyle = {
  ...smallBtnStyle,
  padding: "2px 6px",
  fontSize: 13,
  lineHeight: 1,
};
