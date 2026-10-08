import { useCallback, useEffect, useState } from "react";
import { fetchBackupStatus, runBackupNow } from "./adminApi.js";
import { useAdminToast } from "./AdminToast.jsx";
import { AdminSettingRow } from "./AdminSettingRow.jsx";
import { errorText, secondaryBtnStyle } from "./adminUiStyles.js";

// Zeigt die letzte Datenbank-Sicherung (worker/src/backup/job.ts) und erlaubt, eine anzustossen.
// Die Sicherung ist verschluesselt; zum Wiederherstellen wird der private Schluessel gebraucht
// (docs/betrieb/backup-schluessel.txt, Werkzeug scripts/backup_entschluesseln.mjs).
const STALE_AFTER_MS = 36 * 60 * 60 * 1000; // taeglicher Lauf + Puffer

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} kB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const formatTime = (iso) => new Date(iso).toLocaleString("de-DE");

export function AdminBackupSection() {
  const [state, setState] = useState(null); // {configured, status} | null
  const [busy, setBusy] = useState(false);
  const toast = useAdminToast();

  const load = useCallback(async () => {
    try {
      setState(await fetchBackupStatus());
    } catch {
      setState({ configured: false, status: null, loadFailed: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun() {
    setBusy(true);
    try {
      const res = await runBackupNow();
      setState(res);
      if (res.status?.ok) toast.success("Sicherung erstellt.");
      else toast.error(`Sicherung fehlgeschlagen: ${res.status?.error ?? "unbekannt"}`);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const status = state.status;
  const lastSuccess = status?.ok ? status.at : status?.lastSuccessAt;
  const stale = !lastSuccess || Date.now() - new Date(lastSuccess).getTime() > STALE_AFTER_MS;

  let headline;
  let color = "var(--ch)";
  if (!state.configured) {
    headline = state.loadFailed
      ? "Status konnte nicht geladen werden."
      : "nicht eingerichtet (auf dieser Umgebung läuft keine Sicherung)";
  } else if (!status) {
    headline = "noch keine Sicherung vorhanden";
    color = "#c0392b";
  } else if (!status.ok) {
    headline = `letzter Lauf fehlgeschlagen (${formatTime(status.at)}): ${status.error}`;
    color = "#c0392b";
  } else {
    headline = `letzte Sicherung ${formatTime(status.at)} · ${formatSize(status.bytesEncrypted)} verschlüsselt · ${status.rows} Datensätze`;
    color = stale ? "#c0392b" : "#22c55e";
  }

  return (
    <AdminSettingRow
      title="Datenbank-Sicherung"
      control={
        state.configured && (
          <button type="button" style={secondaryBtnStyle} disabled={busy} onClick={handleRun}>
            {busy ? "Sichert …" : "💾 Jetzt sichern"}
          </button>
        )
      }
    >
      <strong style={{ color }}>{headline}</strong>
      {state.configured &&
        lastSuccess &&
        !status?.ok &&
        ` – letzter Erfolg: ${formatTime(lastSuccess)}`}
      {state.configured && stale && status?.ok && " – älter als 36 Stunden, bitte prüfen."}
      <br />
      Täglich automatisch, verschlüsselt in R2 (EU). Wiederherstellen: Notfall-Runbook.
    </AdminSettingRow>
  );
}
