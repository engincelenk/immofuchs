import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { GREST, KFW_KREDIT } from "../../data.js";
import { berechneKfwPlan, teileFinanzierung } from "../../utils/kfwDarlehen.js";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtE, fmtP } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI, Ins, VT, Toggle } from "../ui/atoms.jsx";
import { Tip } from "../ui/Tip.jsx";
import { Legal } from "../ui/LangSel.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SaveBtn } from "../shell/Merkliste.jsx";
import { AssistantGate } from "../assistant/AssistantGate.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { buildAssistantContext } from "../../utils/assistantContext.js";
import { rate } from "../../utils/bands.js";

export default function Kredit() {
  const { d, set, t, tip, lang } = useApp();
  const [view, setView] = useState("input");
  const [sondTP, setSondTP] = useState("5");

  const R = useMemo(() => {
    const kp = +d.kaufpreis || 0,
      ga = +d.garage || 0,
      gKP = kp + ga,
      ek = +d.eigenkapital || 0;
    const zP = +d.zinssatz || 0,
      tP = +d.tilgung || 0,
      zbJ = +d.zinsbindung || 10;
    const gP = GREST[d.bundesland] || 0,
      nP = +d.notar || 0,
      mP = +d.makler || 0;
    if (kp <= 0) return null;
    const nkFinanzieren = !!d.nkFinanzieren;
    const nbk = (gKP * (gP + nP + mP)) / 100;
    // Wie in rendite.js: nkFinanzieren AN rechnet wie ein Bank-Finanzierungsangebot
    // (Nebenkosten mit im Darlehen), AUS = bisheriges Verhalten (Nebenkosten
    // bleiben ausserhalb, extra bar zu zahlen).
    const finBasis = nkFinanzieren ? gKP + nbk : gKP;

    // ── KfW-Foerderdarlehen (2026-08-25) ───────────────────────────────────
    // Laeuft als zweites Darlehen neben dem Bankdarlehen, mit eigenem Zins,
    // eigener Laufzeit und tilgungsfreien Anlaufjahren. Programm 124 ist
    // Selbstnutzern vorbehalten (KFW_KREDIT.wohneigentum.vermietbar === false)
    // und wird Vermietern deshalb gar nicht erst angeboten.
    const kfwAktiv = !!d.kfwAktiv;
    const eigennutzung = d.kfwNutzung === "eigen";
    const prog =
      eigennutzung && d.kfwProg === "124" ? KFW_KREDIT.wohneigentum : KFW_KREDIT.kfn;
    const we = Math.max(1, +d.wohneinheiten || 1);
    const kfwDeckel = kfwAktiv ? (d.qng ? prog.maxProWE_qng : prog.maxProWE) * we : 0;
    const kfwZins = +d.kfwZins > 0 ? +d.kfwZins : prog.zins;
    const kfwTf = Math.max(0, Math.round(+d.kfwTilgungsfrei) || 0);
    const auf = teileFinanzierung({
      basis: finBasis,
      eigenkapital: ek,
      kfwWunsch: kfwAktiv ? (+d.kfwBetrag > 0 ? +d.kfwBetrag : kfwDeckel) : 0,
      kfwDeckel,
    });
    const daKfw = auf.kfw;
    const daBank = auf.bank;
    // "da" bleibt die Gesamtsumme: Beleihungsauslauf und alle bisherigen
    // Kennzahlen beziehen sich weiterhin auf die gesamte Fremdfinanzierung.
    const da = daBank + daKfw;
    // Beleihung bewusst gegen gKP (Beleihungswert), nicht gegen finBasis - siehe rendite.js.
    const bel = gKP > 0 ? (da / gKP) * 100 : 0,
      mz = zP / 100 / 12;
    // Annuitaet und Tilgungsplan beziehen sich auf das Bankdarlehen - es ist
    // ueber den Tilgungssatz parametrisiert, das KfW-Darlehen ueber seine
    // Laufzeit.
    const ann = (daBank * (zP + tP)) / 100 / 12;
    let lz = 0;
    if (mz > 0 && ann > daBank * mz)
      lz = Math.log(ann / (ann - daBank * mz)) / Math.log(1 + mz) / 12;
    else if (mz === 0 && ann > 0) lz = daBank / ann / 12;
    let rs = daBank,
      sZ = 0,
      rows = [],
      rZB = daBank;
    const mJ = Math.min(isFinite(lz) ? Math.ceil(lz) + 1 : 60, 60);
    const kfwPlan = berechneKfwPlan({
      betrag: daKfw,
      zinsProz: kfwZins,
      laufzeit: +d.kfwLaufzeit || 30,
      tilgungsfrei: kfwTf,
      jahre: Math.max(mJ, +d.kfwLaufzeit || 30),
    });
    for (let j = 1; j <= mJ; j++) {
      // Monatliche Iteration: Restschuld sinkt monatlich → korrekte Jahreszinsen
      let z = 0,
        t2 = 0;
      for (let m = 0; m < 12 && rs > 0; m++) {
        const zm = rs * mz;
        const tm = Math.min(ann - zm, rs);
        if (tm <= 0) break;
        z += zm;
        t2 += tm;
        rs = Math.max(0, rs - tm);
      }
      sZ += z;
      if (j === zbJ) rZB = rs;
      const kz = kfwPlan.rows[j - 1] || { zins: 0, tilgung: 0, restStart: 0 };
      rows.push({
        j,
        z: z + kz.zins,
        t: t2 + kz.tilgung,
        rest: rs + Math.max(0, kz.restStart - kz.tilgung),
        zBank: z,
        tBank: t2,
        restBank: rs,
        zKfw: kz.zins,
        tKfw: kz.tilgung,
        restKfw: Math.max(0, kz.restStart - kz.tilgung),
        isZB: j === zbJ,
      });
      if (rs <= 0 && kfwPlan.rows[j - 1] && kfwPlan.rows[j - 1].restStart <= 0) break;
    }
    // Zinssumme und Raten inklusive KfW
    const sZKfw = kfwPlan.rows.reduce((a, r) => a + r.zins, 0);
    const kfwRateJ1 = ((kfwPlan.rows[0]?.zins || 0) + (kfwPlan.rows[0]?.tilgung || 0)) / 12;
    const kfwRateNachTf =
      daKfw > 0
        ? ((kfwPlan.rows[kfwTf]?.zins || 0) + (kfwPlan.rows[kfwTf]?.tilgung || 0)) / 12
        : 0;
    const rateJ1 = ann + kfwRateJ1;
    const rateNachTf = ann + kfwRateNachTf;
    const mzins = da > 0 ? (daBank * zP + daKfw * kfwZins) / da : 0;
    const z1 = da * mz,
      t1 = ann - z1;
    const sondP = +sondTP || 0,
      sondE = (da * sondP) / 100;
    let rs2 = da,
      sZ2 = 0,
      years2 = 0;
    const mZm = zP / 100 / 12,
      annM = (da * (zP + tP)) / 100 / 12;
    while (rs2 > 0 && years2 < 60) {
      years2++;
      for (let m = 0; m < 12 && rs2 > 0; m++) {
        const zi = rs2 * mZm;
        const ti = Math.min(annM - zi, rs2);
        if (ti <= 0) {
          years2 = Infinity;
          break;
        }
        sZ2 += zi;
        rs2 = Math.max(0, rs2 - ti);
      }
      if (!isFinite(years2)) break;
      if (sondE > 0 && rs2 > 0) rs2 = Math.max(0, rs2 - sondE);
    }
    const zinsenGespart = sZ - sZ2;
    const jahreGespart = isFinite(years2) ? lz - years2 : 0;
    return {
      da,
      nbk,
      bel,
      ann,
      lz,
      sZ,
      rZB,
      rows,
      z1,
      t1,
      gP,
      zbJ,
      // nkFinanzieren AN: nbk steckt schon in da (Darlehen) - sonst doppelt gezaehlt.
      gA: da + sZ + sZKfw + (nkFinanzieren ? 0 : nbk),
      daBank,
      daKfw,
      kfwZins,
      kfwTf,
      kfwAnn: kfwPlan.annuitaet,
      sZKfw,
      rateJ1,
      rateNachTf,
      mzins,
      kfwDeckel,
      eigennutzung,
      progNr: prog.nr,
      sondP,
      sondE,
      sZ2,
      years2,
      zinsenGespart,
      jahreGespart,
    };
  }, [d, sondTP]);

  return (
    <div>
      <VT view={view} setView={setView} />
      <div className="split">
        <div className={`inp-pane ${view === "input" ? "act" : ""}`}>
          <Sec title={`${t.kaufpreis} & ${t.eigenkapital}`} icon="🏠" />
          <F
            label={t.kaufpreis}
            unit="€"
            value={d.kaufpreis}
            onChange={(v) => set("kaufpreis", v)}
            tip={tip("kaufpreis")}
            slider={{ min: 50000, max: 2000000, step: 1000 }}
          />
          <Row>
            <F
              label={t.eigenkapital}
              unit="€"
              value={d.eigenkapital}
              onChange={(v) => set("eigenkapital", v)}
              tip={tip("eigenkapital")}
              slider={{ min: 0, max: 500000, step: 1000 }}
            />
            <F
              label={t.darlehen}
              unit="€"
              value={R ? fmt(R.da) : "—"}
              readOnly
              hint={
                R && R.daKfw > 0
                  ? `${t.bank} ${fmt(R.daBank)} € · KfW ${fmt(R.daKfw)} €`
                  : ""
              }
            />
          </Row>
          <Toggle
            checked={!!d.nkFinanzieren}
            onChange={(v) => set("nkFinanzieren", v)}
            label={t.nkFinanzierenLabel}
            sub={t.nkFinanzierenSub}
            tip={tip("nkFinanzieren")}
          />
          <Sec title={t.nbk} icon="📋" />
          <Row>
            <F label={t.grEst} unit="%" value={R?.gP || "—"} readOnly tip={tip("grEst")} />
            <F
              label={t.notar}
              unit="%"
              value={d.notar}
              onChange={(v) => set("notar", v)}
              step="0.1"
              tip={tip("notar")}
            />
          </Row>
          <Row>
            <F
              label={t.makler}
              unit="%"
              value={d.makler}
              onChange={(v) => set("makler", v)}
              step="0.01"
              tip={tip("makler")}
            />
            <F label="NBK ges." unit="€" value={R ? fmt(R.nbk) : "—"} readOnly />
          </Row>
          <Sec title={t.fin} icon="🏦" />
          <Row>
            <F
              label={t.zinssatz}
              unit="% p.a."
              value={d.zinssatz}
              onChange={(v) => set("zinssatz", v)}
              step="0.05"
              tip={tip("zinssatz")}
              slider={{ min: 0.5, max: 8, step: 0.05 }}
            />
            <F
              label={t.tilgung}
              unit="% p.a."
              value={d.tilgung}
              onChange={(v) => set("tilgung", v)}
              step="0.05"
              tip={tip("tilgung")}
              slider={{ min: 0.5, max: 8, step: 0.05 }}
            />
          </Row>
          <Sel
            label={t.zinsbindung}
            value={d.zinsbindung}
            onChange={(v) => set("zinsbindung", v)}
            options={[5, 10, 15, 20, 25, 30].map((y) => ({ v: y, l: `${y} J.` }))}
            tip={tip("zinsbindung")}
          />

          {/* ── KfW-Foerderdarlehen ──────────────────────────────────────
              Standardmaessig aus; erst der Schalter blendet die Felder ein,
              damit der Rechner fuer alle ohne Foerderung unveraendert bleibt.

              Das Wohneigentumsprogramm 124 wird Vermietern nicht angeboten -
              nicht deaktiviert, nicht durchgestrichen, es steht schlicht
              nicht in der Liste. Darunter eine Zeile, die erklaert warum.
              Ausschluss VOR der Wahl statt Fehlermeldung danach: es entsteht
              nie ein Moment, in dem der Nutzer etwas Falsches getan hat. */}
          <Sec title={t.kfwTitel} icon="🏛️" />
          <Toggle
            checked={!!d.kfwAktiv}
            onChange={(v) => set("kfwAktiv", v)}
            label={t.kfwAktivLabel}
            sub={t.kfwAktivSub}
            tip={tip("kfwAktiv")}
          />
          {d.kfwAktiv && (
            <>
              <Sel
                label={t.kfwNutzung}
                value={d.kfwNutzung || "vermietet"}
                onChange={(v) => {
                  set("kfwNutzung", v);
                  if (v !== "eigen") set("kfwProg", "297");
                }}
                options={[
                  { v: "vermietet", l: t.kfwVermietet },
                  { v: "eigen", l: t.kfwEigen },
                ]}
                tip={tip("kfwNutzung")}
              />
              <Sel
                label={t.kfwProgramm}
                value={d.kfwProg || "297"}
                onChange={(v) => set("kfwProg", v)}
                options={
                  d.kfwNutzung === "eigen"
                    ? [
                        { v: "297", l: t.kfwProg297 },
                        { v: "124", l: t.kfwProg124 },
                      ]
                    : [{ v: "297", l: t.kfwProg297 }]
                }
                tip={tip("kfwProgramm")}
              />
              {d.kfwNutzung !== "eigen" && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--cl)",
                    marginTop: -8,
                    marginBottom: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {t.kfwHint124}
                </div>
              )}
              {(d.kfwProg || "297") === "297" && (
                <Toggle
                  checked={!!d.qng}
                  onChange={(v) => set("qng", v)}
                  label={t.qngLabel}
                  sub={t.qngSub}
                  tip={tip("qng")}
                />
              )}
              <Row>
                <F
                  label={t.kfwWE}
                  value={d.wohneinheiten || "1"}
                  onChange={(v) => set("wohneinheiten", v)}
                  tip={tip("wohneinheiten")}
                />
                <F
                  label={t.kfwBetrag}
                  unit="€"
                  value={d.kfwBetrag}
                  onChange={(v) => set("kfwBetrag", v)}
                  hint={R ? `${t.kfwMax}: ${fmt(R.kfwDeckel)} €` : ""}
                  tip={tip("kfwBetrag")}
                />
              </Row>
              <Row>
                <F
                  label={t.kfwZinsLabel}
                  unit="% p.a."
                  value={d.kfwZins}
                  onChange={(v) => set("kfwZins", v)}
                  step="0.05"
                  tip={tip("kfwZins")}
                  slider={{ min: 0, max: 5, step: 0.05 }}
                />
                <Sel
                  label={t.kfwTfLabel}
                  value={d.kfwTilgungsfrei || "0"}
                  onChange={(v) => set("kfwTilgungsfrei", v)}
                  options={[0, 1, 2, 3, 4, 5].map((y) => ({ v: y, l: `${y} J.` }))}
                  tip={tip("kfwTilgungsfrei")}
                />
              </Row>
              <Sel
                label={t.kfwLaufzeitLabel}
                value={d.kfwLaufzeit || "30"}
                onChange={(v) => set("kfwLaufzeit", v)}
                options={[10, 15, 20, 25, 30, 35].map((y) => ({ v: y, l: `${y} J.` }))}
                tip={tip("kfwLaufzeit")}
              />
            </>
          )}
          <button
            className="mob-next-btn"
            onClick={() => {
              setView("result");
              setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
            }}
          >
            {t.ergebnis} →
          </button>
        </div>
        <div className={`res-pane ${view === "result" ? "act" : ""}`}>
          {!R ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ch)" }}>🏦</div>
          ) : (
            <>
              <div
                style={{
                  background: "linear-gradient(135deg,var(--ca),var(--ca-dk))",
                  borderRadius: 14,
                  padding: "18px 16px",
                  color: "#fff",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase" }}>
                  {t.rate}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
                  {fmtE(R.rateJ1)}
                </div>
                {R.daKfw > 0 && R.rateNachTf > R.rateJ1 + 1 && (
                  // Der Zahlungsschock am Ende der tilgungsfreien Zeit ist die
                  // wichtigste Zahl dieses Blocks - vorher zahlt der Nutzer
                  // nur Zinsen auf den KfW-Anteil.
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                    {t.kfwRateAb.replace("{j}", String(R.kfwTf + 1))}: {fmtE(R.rateNachTf)}
                  </div>
                )}
                <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{t.zins}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtE(R.z1)}/Mo.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{t.tilgK}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtE(R.t1)}/Mo.</div>
                  </div>
                </div>
              </div>
              <div className="if-row" style={{ marginBottom: 14 }}>
                <KPI
                  label={t.darlehen}
                  value={fmtE(R.da)}
                  sub={
                    R.daKfw > 0
                      ? `${t.bank} ${fmtE(R.daBank)} · KfW ${fmtE(R.daKfw)}`
                      : `${t.bel}: ${fmtP(R.bel)}`
                  }
                />
                {R.daKfw > 0 && (
                  <KPI
                    label={t.kfwMischzins}
                    value={fmtP(R.mzins)}
                    sub={`${t.kfwOhne}: ${fmtP(+d.zinssatz || 0)}`}
                  />
                )}
                <KPI label={t.laufzeit} value={isFinite(R.lz) ? `${fmt(R.lz, 1)} J.` : "—"} />
                <KPI label={t.gZin} value={fmtE(R.sZ)} />
                <KPI label={t.nbk} value={fmtE(R.nbk)} />
                <KPI label={t.gAuf} value={fmtE(R.gA)} />
                <KPI label={t.rest} value={fmtE(R.rZB)} sub={`nach ${R.zbJ} J.`} />
              </div>
              <div
                style={{
                  background: "var(--cc)",
                  borderRadius: 12,
                  padding: "12px",
                  border: "1px solid var(--cb)",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{t.bel}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: R.bel > 90 ? "#ef4444" : R.bel > 80 ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    {fmtP(R.bel)}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: "var(--cb)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(R.bel, 100)}%`,
                      borderRadius: 3,
                      background: R.bel > 90 ? "#ef4444" : R.bel > 80 ? "#f59e0b" : "var(--ca)",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 4 }}>
                  {R.bel > 90 ? t.belCond90 : R.bel > 80 ? t.belCond80 : t.belCondOk}
                </div>
              </div>
              <div
                style={{
                  background: "var(--cc)",
                  borderRadius: 12,
                  padding: "14px",
                  border: "2px solid var(--ca)",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>💰 {t.sondTilgLabel}</span>
                  <Tip text={tip("sondertilg")} />
                </div>
                <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 10 }}>
                  {t.sondTilgSub}
                </div>
                <Row>
                  <F
                    label={t.vereinbSatz}
                    unit="%"
                    value={sondTP}
                    onChange={setSondTP}
                    step="1"
                    slider={{ min: 0, max: 20, step: 1 }}
                  />
                  <F label={t.entspricht} unit="€/Jahr" value={fmt(R.sondE)} readOnly />
                </Row>
                <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 2, marginBottom: 10 }}>
                  {t.stdSond}
                </div>
                {R.sondE > 0 && isFinite(R.years2) && (
                  <div
                    style={{
                      background: "var(--ci)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--ca)", marginBottom: 6 }}>
                      {t.effekt} {fmt(R.sondP)}% = {fmtE(R.sondE)}/J.:
                    </div>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}
                    >
                      <span>{t.neueLaufzeit}</span>
                      <span style={{ fontWeight: 600, color: "#22c55e" }}>
                        {fmt(R.years2, 1)} J. ({t.statt} {fmt(R.lz, 1)} J.)
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}
                    >
                      <span>{t.zinsenGespart}</span>
                      <span style={{ fontWeight: 600, color: "#22c55e" }}>
                        {fmtE(R.zinsenGespart)}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}
                    >
                      <span>{t.jahre}</span>
                      <span style={{ fontWeight: 600, color: "#22c55e" }}>
                        {fmt(R.jahreGespart, 1)} J.
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  background: "var(--cc)",
                  borderRadius: 12,
                  padding: "12px",
                  border: "1px solid var(--cb)",
                  marginBottom: 12,
                  overflow: "auto",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t.tPl}</div>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--cb)" }}>
                      {[t.jahre.slice(0, 2), t.rate, t.gZin, t.tilgung, t.rest].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "3px 4px",
                            textAlign: "right",
                            fontWeight: 500,
                            color: "var(--ch)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {R.rows.map((r) => (
                      <tr
                        key={r.j}
                        style={{
                          borderBottom: "1px solid var(--cb)",
                          background: r.isZB ? "var(--ci)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "3px 4px" }}>
                          {r.j}
                          {r.isZB ? " ◀" : ""}
                        </td>
                        <td style={{ padding: "3px 4px", textAlign: "right" }}>
                          {fmtE(R.ann * 12)}
                        </td>
                        <td style={{ padding: "3px 4px", textAlign: "right", color: "#ef4444" }}>
                          {fmtE(r.z)}
                        </td>
                        <td style={{ padding: "3px 4px", textAlign: "right" }}>{fmtE(r.t)}</td>
                        <td style={{ padding: "3px 4px", textAlign: "right" }}>
                          {r.rest > 0 ? fmtE(r.rest) : "✅"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t.advTitle}</div>
                {R.restZB > 0 && R.da > 0 && R.restZB / R.da > 0.6 && (
                  <Ins emoji="⚠️" text={t.adv7} type="bad" />
                )}
                {+d.zinsbindung < 10 && +d.zinssatz > 3.5 && (
                  <Ins emoji="🛡️" text={t.adv8} type="warn" />
                )}
                {+d.tilgung < 2 && <Ins emoji="🐌" text={t.adv9} type="warn" />}
                {R.lz > 25 && R.sondP === 0 && <Ins emoji="💰" text={t.adv10} type="info" />}
                {R.bel >= 80 && R.bel <= 90 && <Ins emoji="🏦" text={t.adv11} type="info" />}
              </div>
              <SaveBtn tab="kredit" />
              <ExportPDF title={t.kreditFull || t.kredit} rechner="finanzierung" />
              <Legal items={LEG.kredit} />
            </>
          )}
        </div>
      </div>
      {/* ═══ KI-ASSISTENT (Phase 2, Sprint 4 — Konzept Abschnitt 5) ═══
      Bewusst AUSSERHALB der beiden Panes: auf Mobile blendet
      @media(max-width:699px) die gerade inaktive Pane per display:none aus.
      Stand das Widget darin, verschwand der position:fixed-Fuchs in der
      Eingabe-Ansicht komplett (Nutzer-Feedback 2026-07-22). */}
      {(() => {
        const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
        const suggested = [
          at.finSuggested1,
          at.finSuggested2,
          at.finSuggested3,
          at.finSuggested4,
          at.finSuggested5,
          at.finSuggested6,
          at.finSuggested7,
          at.finSuggested8,
          at.finSuggested9,
          at.finSuggested10,
          at.finSuggested11,
          at.finSuggested12,
        ];
        return (
          <AssistantGate
            active={!!R}
            rechner="finanzierung"
            buildKontext={() => {
              const belTier = rate("bel", R.bel).tier;
              return buildAssistantContext("finanzierung", d, {
                beleihungsauslauf: R.bel,
                sondertilgungSatzProzent: +sondTP,
                bewertung: { tier: belTier },
              });
            }}
            contextLabel={at.contextFinanzierung}
            suggested={suggested}
            lang={lang}
          />
        );
      })()}
    </div>
  );
}
