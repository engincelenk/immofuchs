import { useState } from "react";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Bereich 4: Zahlungsdaten liegen ausschliesslich bei Paddle - wir speichern
// weder Kartennummer noch Rechnungsadresse. Deshalb gibt es hier bewusst kein
// eigenes Formular, sondern nur den Weg ins Kundenportal.
export function ZahlungsmethodenSection({ t, account }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const hasSubscription = Boolean(account.me.subscription);

  async function handleOpen() {
    setBusy(true);
    setError(false);
    try {
      await account.openBillingPortal();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navZahlung}</h2>
      <p style={sectionIntroStyle}>{t.zahlungBody}</p>

      {error && <div style={errorBannerStyle}>{t.zahlungError}</div>}

      <div style={blockCardStyle}>
        {hasSubscription ? (
          <button onClick={handleOpen} disabled={busy} style={actionBtnStyle}>
            {t.zahlungCta} ↗
          </button>
        ) : (
          <p style={{ ...blockHintStyle, margin: 0 }}>{t.zahlungFreeHint}</p>
        )}
      </div>
    </div>
  );
}
