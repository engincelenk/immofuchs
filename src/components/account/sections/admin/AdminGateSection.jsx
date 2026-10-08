import { useEffect, useState } from "react";
import { useAdminToast } from "./AdminToast.jsx";
import { AdminConfirmBox, AdminSettingRow, AdminSwitch } from "./AdminSettingRow.jsx";
import { errorText, secondaryBtnStyle, dangerBtnStyle } from "./adminUiStyles.js";

// Ein-/Aus-Schalter (Zeile im Admin-Dashboard) mit Statusanzeige und Bestaetigung fuer die Sperren im Dashboard
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
    <AdminSettingRow
      title={title}
      control={
        <AdminSwitch
          checked={gate.open}
          label={title}
          disabled={busy || confirm}
          onClick={() => setConfirm(true)}
        />
      }
      below={
        confirm && (
          <AdminConfirmBox>
            <span style={{ fontSize: 13 }}>{gate.open ? texts.askClose : texts.askOpen}</span>
            <button type="button" style={dangerBtnStyle} disabled={busy} onClick={handleToggle}>
              {busy ? "Speichert …" : gate.open ? "Ja, sperren" : "Ja, freigeben"}
            </button>
            <button
              type="button"
              style={secondaryBtnStyle}
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Abbrechen
            </button>
          </AdminConfirmBox>
        )
      }
    >
      Aktuell:{" "}
      <strong style={{ color: gate.open ? "#22c55e" : "#c0392b" }}>
        {gate.open ? texts.stateOpen : texts.stateClosed}
      </strong>
      {gate.source === "env" &&
        " – Startwert aus der Server-Konfiguration, noch nie hier umgestellt."}
    </AdminSettingRow>
  );
}
