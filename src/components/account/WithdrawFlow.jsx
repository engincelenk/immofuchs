import { useEffect, useState } from "react";

const eur = (cents) =>
  ((cents || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// Widerruf innerhalb von 14 Tagen (§ 355 BGB, Widerrufsfunktion nach Richtlinie
// (EU) 2023/2673). Wie CancelFlow eine eigene Bestaetigungsseite im Konto: zeigt
// vorab, was erstattet wird (bezahlter Betrag minus Wertersatz fuer die bisherige
// Nutzung, siehe AGB Ziffer 7) - dieselbe Rechnung wie der Worker beim Absenden.
export function WithdrawFlow({ t, account, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    let alive = true;
    account
      .withdrawPreview()
      .then((p) => alive && setPreview(p))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, [account]);

  async function handleConfirm() {
    setBusy(true);
    setError(false);
    try {
      const res = await account.withdrawSubscription();
      setDone(res);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const btn = {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    background: "var(--ci)",
    color: "var(--ct)",
    border: "1px solid var(--cb)",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  if (done) {
    return (
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{t.withdrawDoneTitle}</div>
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, marginBottom: 18 }}>
          {t.withdrawDoneBody.replace("{refund}", eur(done.refundCents))}
        </p>
        <button onClick={onDone} style={{ ...btn, width: "100%" }}>
          {t.withdrawClose}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{t.withdrawTitle}</div>
      {loadError && <p style={{ fontSize: 13, color: "var(--ca-dk)" }}>{t.withdrawLoadError}</p>}
      {!loadError && !preview && <p style={{ fontSize: 13, color: "var(--ch)" }}>{t.withdrawLoading}</p>}
      {preview && !preview.eligible && (
        <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6 }}>{t.withdrawExpired}</p>
      )}
      {preview?.eligible && (
        <>
          <p style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.6, marginBottom: 12 }}>
            {t.withdrawBody
              .replace("{days}", String(preview.daysLeft))
              .replace("{used}", String(preview.daysUsed))
              .replace("{compensation}", eur(preview.compensationCents))
              .replace("{refund}", eur(preview.refundCents))}
          </p>
          <p style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.6, marginBottom: 18 }}>
            {t.withdrawNote}
          </p>
          {error && <div style={{ fontSize: 12, color: "var(--ca-dk)", marginBottom: 10 }}>{t.withdrawError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onDone} style={btn}>
              {t.withdrawBack}
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              style={{ ...btn, fontWeight: 700, background: "var(--ca)", color: "#fff", border: "none" }}
            >
              {t.withdrawConfirm}
            </button>
          </div>
        </>
      )}
      {(!preview || !preview.eligible) && (
        <button onClick={onDone} style={{ ...btn, width: "100%", marginTop: 14 }}>
          {t.withdrawBack}
        </button>
      )}
    </div>
  );
}
