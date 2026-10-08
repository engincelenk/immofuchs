import { useEffect, useState } from "react";
import { useAdminToast } from "./AdminToast.jsx";
import { errorText, mutedTextStyle, secondaryBtnStyle, dangerBtnStyle } from "./adminUiStyles.js";

// Ein-/Aus-Schalter mit Statusanzeige und Bestaetigung fuer die Sperren im Dashboard
// (Kaufsperre, Registrierungssperre). `load` liefert {open, source}, `save(open)` setzt
// den Wert. Beide Sperren folgen dem Muster aus worker/src/checkoutGate.ts bzw.
// registrationGate.ts: ein Datenbank-Wert schlaegt die Variable aus wrangler.toml.
export function AdminGateSection({ title, load, save, texts }) {
  const [gate, setGate] = useState(null); // {open, source} | null
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useAdminToast();

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setGate(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleToggle() {
    setBusy(true);
    try {
      const res = await save(!gate.open);
      setGate(res);
      toast.success(res.open ? texts.toastOpen : texts.toastClosed);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  if (!gate) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>{title}</h3>
      <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 12 }}>
        Aktuell:{" "}
        <strong style={{ color: gate.open ? "#22c55e" : "#c0392b" }}>
          {gate.open ? texts.stateOpen : texts.stateClosed}
        </strong>
        {gate.source === "env" && " – Startwert aus der Server-Konfiguration, noch nie hier umgestellt."}
      </p>
      {!confirm ? (
        <button type="button" style={secondaryBtnStyle} onClick={() => setConfirm(true)}>
          {gate.open ? texts.buttonClose : texts.buttonOpen}
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
          <span style={{ fontSize: 13 }}>{gate.open ? texts.askClose : texts.askOpen}</span>
          <button type="button" style={dangerBtnStyle} disabled={busy} onClick={handleToggle}>
            {busy ? "Speichert …" : gate.open ? "Ja, sperren" : "Ja, freigeben"}
          </button>
          <button type="button" style={secondaryBtnStyle} disabled={busy} onClick={() => setConfirm(false)}>
            Abbrechen
          </button>
        </div>
      )}
    </section>
  );
}
