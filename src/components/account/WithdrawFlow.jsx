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
  const [name, setName] = useState(account.me?.name || "");
  const [nameError, setNameError] = useState(false);
  const sub = account.me?.subscription;

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
    // § 356a Abs. 2 BGB: Name, Vertrag und Kommunikationsmittel gehoeren zur Erklaerung.
    if (name.trim().length < 2) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setBusy(true);
    setError(false);
    try {
      const res = await account.withdrawSubscription(name.trim());
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
          {t.withdrawDoneBody.replace("{time}", done.receivedAt || "").replace("{refund}", eur(done.refundCents))}
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
          <div
            style={{
              fontSize: 12.5,
              color: "var(--cl)",
              background: "var(--ci)",
              border: "1px solid var(--cb)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              lineHeight: 1.6,
            }}
          >
            {t.withdrawContract
              .replace("{plan}", sub?.plan === "yearly" ? t.planYearly : t.planMonthly)
              .replace("{email}", account.me?.email || "")}
          </div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }} htmlFor="wd-name">
            {t.withdrawName}
          </label>
          <input
            id="wd-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            style={{
              width: "100%",
              fontSize: 16,
              fontFamily: "inherit",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--cb)",
              background: "var(--ci)",
              color: "var(--ct)",
              marginBottom: 6,
            }}
          />
          {nameError && <div style={{ fontSize: 12, color: "var(--ca-dk)", marginBottom: 8 }}>{t.withdrawNameRequired}</div>}
          <p style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.6, margin: "10px 0 18px" }}>
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
