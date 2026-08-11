import { useEffect, useState, useCallback } from "react";
import { fetchDiscounts, createDiscount, setDiscountStatus } from "./adminApi.js";

const emptyForm = { code: "", description: "", type: "percentage", amount: "", usageLimit: "" };

export function AdminDiscountsView() {
  const [discounts, setDiscounts] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [statusBusyId, setStatusBusyId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDiscounts();
      setDiscounts(data.discounts);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createDiscount({
        code: form.code,
        description: form.description,
        type: form.type,
        amount: form.amount,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleToggleStatus(discount) {
    setStatusBusyId(discount.id);
    try {
      await setDiscountStatus(discount.id, discount.status === "active" ? "archived" : "active");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusBusyId(null);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 0, marginBottom: 16 }}>
        Gutscheine werden direkt in Paddle verwaltet - hier nur Liste, Erstellen und Deaktivieren. Der Code wird im
        Zahlungsschritt eingelöst; der tatsächlich abgerechnete Betrag kommt immer von Paddle selbst.
      </p>

      <form
        onSubmit={handleCreate}
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        <Field label="Code">
          <input
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="SOMMER25"
            style={inputStyle}
          />
        </Field>
        <Field label="Beschreibung">
          <input
            required
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Sommeraktion 2026"
            style={inputStyle}
          />
        </Field>
        <Field label="Typ">
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
            <option value="percentage">Prozent</option>
            <option value="flat">Fester Betrag (Cent)</option>
          </select>
        </Field>
        <Field label={form.type === "percentage" ? "Wert (%)" : "Wert (Cent)"}>
          <input
            required
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder={form.type === "percentage" ? "10" : "500"}
            style={inputStyle}
          />
        </Field>
        <Field label="Nutzungslimit (optional)">
          <input
            value={form.usageLimit}
            onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            placeholder="unbegrenzt"
            style={inputStyle}
          />
        </Field>
        <button type="submit" disabled={createBusy} style={createBtnStyle}>
          {createBusy ? "Wird erstellt …" : "Gutschein erstellen"}
        </button>
        {createError && (
          <div style={{ gridColumn: "1 / -1", color: "#c0392b", fontSize: 12.5 }}>{createError}</div>
        )}
      </form>

      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
      {!discounts && !error && <div style={{ color: "var(--ch)", fontSize: 13 }}>Wird geladen …</div>}
      {discounts && discounts.length === 0 && <div style={{ color: "var(--ch)", fontSize: 13 }}>Noch keine Gutscheine.</div>}
      {discounts && discounts.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "var(--ci)", textAlign: "left" }}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Beschreibung</th>
                <th style={thStyle}>Wert</th>
                <th style={thStyle}>Genutzt</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--cb)" }}>
                  <td style={tdStyle}>{d.code}</td>
                  <td style={tdStyle}>{d.description}</td>
                  <td style={tdStyle}>{d.type === "percentage" ? `${d.amount} %` : `${(Number(d.amount) / 100).toFixed(2)} €`}</td>
                  <td style={tdStyle}>
                    {d.timesUsed}
                    {d.usageLimit ? ` / ${d.usageLimit}` : ""}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        color: "#fff",
                        background: d.status === "active" ? "#22c55e" : "#8A8A80",
                      }}
                    >
                      {d.status === "active" ? "Aktiv" : d.status === "archived" ? "Deaktiviert" : "Abgelaufen"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {d.status !== "expired" && (
                      <button
                        onClick={() => handleToggleStatus(d)}
                        disabled={statusBusyId === d.id}
                        style={{ ...pagerBtnStyle, color: d.status === "active" ? "#c0392b" : "var(--ct)" }}
                      >
                        {d.status === "active" ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--ch)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  fontSize: 14,
  padding: "8px 10px",
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--ci)",
  color: "var(--ct)",
  fontFamily: "inherit",
};

const thStyle = { padding: 10, fontSize: 11.5, color: "var(--ch)" };
const tdStyle = { padding: 10, fontSize: 13 };

const createBtnStyle = {
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  background: "var(--ca)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  height: 38,
};

const pagerBtnStyle = {
  padding: "6px 12px",
  fontSize: 12.5,
  border: "1px solid var(--cb)",
  borderRadius: 8,
  background: "var(--cc)",
  cursor: "pointer",
  fontFamily: "inherit",
};
