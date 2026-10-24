// Auswahl "Finanzierungsanteil" unter dem Eigenkapital-Feld (Renditerechner und Kreditrechner, 2026-10-24,
// Nutzerwunsch): zeigt je Stufe (50 bis 100 %) den Zins, der zu dieser Finanzierung gehoert. Die Zinszahlen
// kommen LIVE aus ZINS_NACH_FINANZIERUNG (data.js, schreibt der Monatsjob) und stehen nicht in den Uebersetzungen.
// Tippen auf eine Stufe setzt das Eigenkapital so, dass das Bankdarlehen dem Anteil entspricht, und schaltet die
// Zins-Automatik wieder ein (setzeFinanzierungsanteil in App.jsx).
// Darunter einklappbar der Stufen-Vergleich (Rate, Cashflow, Eigenkapital je Stufe, mit Zins-Puffer) und der
// Verhandlungs-Kaufpreis (utils/finanzierungsVergleich.js). Die Rechnung laeuft nur, solange der Vergleich offen ist.
import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { aktiveStufe, sichtbareStufen } from "../../utils/zinsStaffel.js";
import {
  ersteTragendeStufe,
  hatMiete,
  maxKaufpreisFuerCashflow,
  stufenVergleich,
  zinsDerStufe,
} from "../../utils/finanzierungsVergleich.js";
import { fmt, fmtE } from "../../utils/helpers.js";

const komma = (v) => String(v).replace(".", ",");
const PUFFER = [0, 0.3, 0.5];
const fuelle = (text, werte) =>
  Object.entries(werte).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), text || "");

export function Vergleich({ aktuellerAnteil, eigenerZins = false }) {
  const { d: dLive, t } = useApp();
  // Tippen im Eigenkapital-Feld wartet nicht auf den Vergleich: er rechnet mit dem zuletzt ruhigen Stand.
  const d = useDeferredValue(dLive);
  const punkte = useMemo(() => sichtbareStufen(d), [d]);
  const [puffer, setPuffer] = useState(0);
  const mitMiete = hatMiete(d);
  const zeilen = useMemo(() => stufenVergleich(d, punkte, puffer), [d, punkte, puffer]);
  const tragend = useMemo(() => ersteTragendeStufe(zeilen), [zeilen]);
  const kp = useMemo(() => {
    if (!mitMiete) return null;
    const zinsAkt = zinsDerStufe(aktuellerAnteil);
    const bestAnteil = punkte[0][0];
    return {
      aktuell: maxKaufpreisFuerCashflow(d, aktuellerAnteil, zinsAkt + puffer),
      best: maxKaufpreisFuerCashflow(d, bestAnteil, punkte[0][1] + puffer),
      bestAnteil,
    };
  }, [d, mitMiete, aktuellerAnteil, punkte, puffer]);
  const aktiv = aktiveStufe(aktuellerAnteil, punkte);

  const spalten = mitMiete ? "34px 1fr 1fr 1fr 1.1fr" : "34px 1fr 1fr 1.1fr";
  const kopf = { fontSize: 11, color: "var(--ch)", fontWeight: 600, textAlign: "right" };
  const zelle = { fontSize: 12.5, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const proz = (v) => fmt(Math.abs(v), 1) + " %";

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "var(--ch)" }}>{t.finVglPuffer}</span>
        {PUFFER.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPuffer(p)}
            aria-pressed={puffer === p}
            style={{
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 8,
              border: puffer === p ? "1px solid var(--ca)" : "1px solid var(--cb)",
              background: puffer === p ? "var(--ca)" : "var(--ci)",
              color: puffer === p ? "var(--on-ca)" : "var(--ct)",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {p === 0 ? "±0" : "+" + komma(p.toFixed(1))}
          </button>
        ))}
      </div>
      {eigenerZins && (
        <div style={{ fontSize: 12, color: "var(--warn-tx)", marginBottom: 8, fontWeight: 600 }}>{t.finVglMarkt}</div>
      )}
      {puffer > 0 && <div style={{ fontSize: 12, color: "var(--ch)", marginBottom: 8 }}>{t.finVglPufferSub}</div>}

      <div role="table" aria-label={t.finVglTitel}>
        <div role="row" style={{ display: "grid", gridTemplateColumns: spalten, gap: 4, padding: "0 6px 4px" }}>
          <span role="columnheader" style={{ ...kopf, textAlign: "left" }}>{t.finVglAnteil}</span>
          <span role="columnheader" style={kopf}>{t.finVglZins}</span>
          <span role="columnheader" style={kopf}>{t.finVglRate}</span>
          {mitMiete && <span role="columnheader" style={kopf}>{t.finVglCf}</span>}
          <span role="columnheader" style={kopf}>{t.finVglEk}</span>
        </div>
        {zeilen.map((z) => {
          const an = aktiv === z.anteil;
          const traegt = tragend?.anteil === z.anteil;
          return (
            <div
              key={z.anteil}
              role="row"
              style={{
                display: "grid",
                gridTemplateColumns: spalten,
                gap: 4,
                padding: "7px 6px",
                borderRadius: 8,
                border: an ? "1px solid var(--ca)" : "1px solid transparent",
                background: traegt ? "var(--ok-bg)" : an ? "var(--ci)" : "transparent",
                alignItems: "baseline",
              }}
            >
              <span role="cell" style={{ ...zelle, textAlign: "left", fontWeight: 700 }}>{Math.round(z.anteil)} %</span>
              <span role="cell" style={zelle}>{komma(z.zins.toFixed(2))}</span>
              <span role="cell" style={zelle}>{fmtE(z.rate)}</span>
              {mitMiete && (
                <span
                  role="cell"
                  style={{ ...zelle, fontWeight: 700, color: z.cashflow >= 0 ? "var(--ok-tx)" : "var(--bad-tx)" }}
                >
                  {fmtE(z.cashflow)}
                </span>
              )}
              <span role="cell" style={zelle}>{fmtE(z.eigenkapital)}</span>
            </div>
          );
        })}
      </div>
      {mitMiete && <div style={{ fontSize: 11.5, color: "var(--ch)", margin: "6px 0 0", lineHeight: 1.4 }}>{t.finVglCfNote}</div>}

      {mitMiete && (
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45, color: tragend ? "var(--ok-tx)" : "var(--bad-tx)", fontWeight: 600 }}>
          {tragend ? fuelle(t.finVglTraegt, { anteil: tragend.anteil }) : t.finVglNie}
        </div>
      )}

      {mitMiete && kp && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--cb)",
            background: "var(--ci)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.finKpTitel}</div>
          {kp.aktuell ? (
            <div>
              {fuelle(t.finKpText, {
                anteil: Math.round(aktuellerAnteil),
                preis: fmtE(kp.aktuell.preis),
              })}{" "}
              <strong style={{ color: kp.aktuell.abschlagProz >= 0 ? "var(--ok-tx)" : "var(--bad-tx)" }}>
                {kp.aktuell.abschlagProz >= 0
                  ? fuelle(t.finKpPlus, { proz: proz(kp.aktuell.abschlagProz) })
                  : fuelle(t.finKpMinus, { proz: proz(kp.aktuell.abschlagProz) })}
              </strong>
            </div>
          ) : (
            <div>{t.finKpNie}</div>
          )}
          {kp.best && (
            <div style={{ color: "var(--ch)", marginTop: 4 }}>
              {fuelle(t.finKpBest, { anteil: kp.bestAnteil, preis: fmtE(kp.best.preis) })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FinanzierungsAnteil() {
  const { d, t, zinsAuto, setzeFinanzierungsanteil, setzeMarktzins } = useApp();
  const [offen, setOffen] = useState(false);
  const punkte = useMemo(() => sichtbareStufen(d), [d]);
  // Ohne Kaufpreis gibt es nichts zu berechnen: die Auswahl bleibt dann weg.
  if (!zinsAuto || !setzeFinanzierungsanteil) return null;
  const aktiv = aktiveStufe(zinsAuto.anteil, punkte);
  const dazwischen = aktiv == null ? Math.round(zinsAuto.anteil) : null;
  const ueber100 = zinsAuto.anteil > 100.5;
  // Eigener Zins im Feld: die Kacheln zeigen dann nur noch die Marktzinsen (Referenz), die aktive Kachel ist umrandet.
  const eigenerZins = String(d.zinssatz ?? "").trim() !== "" && String(d.zinssatz) !== zinsAuto.zins;
  return (
    <div className="if-field" style={{ marginBottom: 14 }} role="group" aria-label={t.finAnteilTitel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 15, color: "var(--cl)", fontWeight: 500 }}>{t.finAnteilTitel}</span>
        {dazwischen != null && (
          <span style={{ fontSize: 12, color: "var(--ch)" }}>≈ {komma(dazwischen)} %</span>
        )}
      </div>
      {t.finAnteilSub && (
        <div style={{ fontSize: 12, color: "var(--ch)", margin: "2px 0 8px", lineHeight: 1.4 }}>{t.finAnteilSub}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${punkte.length}, minmax(0, 1fr))`, gap: 4 }}>
        {punkte.map(([anteil, zins]) => {
          const an = aktiv === anteil;
          const anzeige = Math.round(anteil);
          return (
            <button
              key={anteil}
              type="button"
              onClick={() => setzeFinanzierungsanteil(anteil)}
              aria-pressed={an}
              aria-label={(t.finAnteilAria || "{anteil} % / {zins} %")
                .replace("{anteil}", anzeige)
                .replace("{zins}", komma(zins.toFixed(2)))}
              style={{
                minHeight: 48,
                padding: "6px 0",
                borderRadius: 10,
                border: an ? (eigenerZins ? "2px dashed var(--ca)" : "1px solid var(--ca)") : "1px solid var(--cb)",
                background: an && !eigenerZins ? "var(--ca)" : "var(--ci)",
                color: an && !eigenerZins ? "var(--on-ca)" : "var(--ct)",
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                lineHeight: 1.15,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{anzeige} %</span>
              <span style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                {komma(zins.toFixed(2))}
              </span>
            </button>
          );
        })}
      </div>
      {eigenerZins && setzeMarktzins && (
        <div
          role="note"
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--info-bd)",
            background: "var(--info-bg)",
            color: "var(--info-tx)",
            fontSize: 12.5,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600 }}>{fuelle(t.finZinsEigen, { zins: komma(String(d.zinssatz).replace(",", ".")) })}</span>
          <button
            type="button"
            onClick={setzeMarktzins}
            style={{
              minHeight: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--info-tx)",
              background: "transparent",
              color: "var(--info-tx)",
              fontFamily: "inherit",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.finZinsMarkt}
          </button>
        </div>
      )}
      {ueber100 && (
        <div
          role="note"
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--warn-bd)",
            background: "var(--warn-bg)",
            color: "var(--warn-tx)",
            fontSize: 12.5,
            lineHeight: 1.45,
            fontWeight: 600,
          }}
        >
          {fuelle(t.finAnteilUeber, { anteil: Math.round(zinsAuto.anteil) })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        style={{
          marginTop: 8,
          minHeight: 40,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid var(--cb)",
          background: "transparent",
          color: "var(--ct)",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {t.finVglTitel} {offen ? "▴" : "▾"}
      </button>
      {offen && <Vergleich aktuellerAnteil={zinsAuto.anteil} eigenerZins={eigenerZins} />}
    </div>
  );
}
