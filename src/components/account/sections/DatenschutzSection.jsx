import { useState } from "react";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  dangerBtnStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Bereich 7: DSGVO-Rechte. Export (Art. 20) und Loeschung (Art. 17) sind
// unveraendert aus dem alten AccountPanel uebernommen, inklusive der
// Sicherheitsabfrage vor dem Loeschen - die Aktion ist serverseitig
// unwiderruflich.
export function DatenschutzSection({ t, account, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t.accountDeleteConfirm)) return;
    setBusy(true);
    setError(false);
    try {
      await account.deleteAccount();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navDatenschutz}</h2>
      <p style={sectionIntroStyle}>{t.datenschutzIntro}</p>

      {error && <div style={errorBannerStyle}>{t.datenschutzDeleteError}</div>}

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountExport}</div>
        <p style={blockHintStyle}>{t.datenschutzExportHint}</p>
        <button onClick={account.exportData} style={actionBtnStyle}>
          {t.accountExport} ↓
        </button>
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.accountDelete}</div>
        <p style={blockHintStyle}>{t.datenschutzDeleteHint}</p>
        <button onClick={handleDelete} disabled={busy} style={dangerBtnStyle}>
          {t.accountDelete}
        </button>
      </div>
    </div>
  );
}
