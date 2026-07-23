import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  KFW,
  SAN_ENERGIE,
  SAN_NORMEN,
  SAN_TIERS,
  SAN_SRC_KEYS,
  LAND_F,
  LAND_BONUS_FQ,
  LAND_BONUS_CAP,
  ENERGIE_KLASSEN,
  BL_O,
} from "../../data.js";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtE, fmtP } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI, Ins, VT } from "../ui/atoms.jsx";
import { Tip } from "../ui/Tip.jsx";
import { Legal } from "../ui/LangSel.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SaveBtn } from "../shell/Merkliste.jsx";
import { AssistantWidget } from "../assistant/AssistantWidget.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { buildAssistantContext } from "../../utils/assistantContext.js";

const EC_O = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];
const EC_C = [
  "#0D6E3A",
  "#2E9E52",
  "#6DBE45",
  "#A7CE3F",
  "#F7CE1F",
  "#F6A623",
  "#E97020",
  "#DD3A1E",
  "#B01414",
];
const kw2ec = (k) => {
  if (k <= 30) return 0;
  if (k <= 50) return 1;
  if (k <= 75) return 2;
  if (k <= 100) return 3;
  if (k <= 130) return 4;
  if (k <= 160) return 5;
  if (k <= 200) return 6;
  if (k <= 250) return 7;
  return 8;
};

// SAN_TIERS und SAN_SRC_KEYS → importiert aus ./data.js

function TierSel({ value, onChange, tiers }) {
  const { t } = useApp();
  const opts = [
    { k: "s", l: t.tierS || "Standard", c: "var(--ch)" },
    { k: "g", l: t.tierG || "Gehoben", c: "var(--ca)" },
    { k: "m", l: t.tierM || "Premium", c: "#b8860b" },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid var(--cb)",
        marginBottom: 6,
      }}
    >
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          style={{
            flex: 1,
            padding: "6px 2px",
            border: "none",
            fontSize: 10,
            fontWeight: value === o.k ? 600 : 400,
            cursor: "pointer",
            background: value === o.k ? "var(--ca)" : "var(--ci)",
            color: value === o.k ? "#fff" : "var(--ch)",
            fontFamily: "inherit",
            lineHeight: 1.2,
          }}
        >
          <div>{o.l}</div>
          {tiers[o.k] && (
            <div style={{ fontSize: 9, marginTop: 1, opacity: value === o.k ? 1 : 0.7 }}>
              {fmtE(tiers[o.k].p)}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function Sanier() {
  const { d, set, t, tip, lang } = useApp();
  const [view, setView] = useState("input");
  const [act, setAct] = useState({
    fenster: false,
    fassade: false,
    heizung: false,
    dach: false,
    tuer: false,
    pv: false,
    keller: false,
    ogdecke: false,
    batterie: false,
    lueftung: false,
  });
  const [tier, setTier] = useState({
    fenster: "s",
    fassade: "s",
    heizung: "s",
    dach: "s",
    tuer: "s",
    pv: "s",
    lueftung: "s",
  });
  const [s, setS] = useState({
    fA: "12",
    fXL: "0",
    fHST: "0",
    faF: "137",
    anbau: "frei",
    daF: "80",
    dachform: "sattel",
    pvK: "7",
    keF: "60",
    ogF: "60",
    batK: "7",
    epStrom: String(SAN_ENERGIE.defaultStrompreis),
    epHeiz: String(SAN_ENERGIE.defaultHeizpreis),
    hkJahr: "",
    skJahr: "",
    preisstieg: "2",
  });
  const sF = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const tog = (k) => setAct((p) => ({ ...p, [k]: !p[k] }));
  const setT = (k, v) => setTier((p) => ({ ...p, [k]: v }));
  const getEkl = (bj) => {
    const y = +bj || 1981;
    const hk = SAN_NORMEN.hkBaujahr.find((r) => y <= r.bis)?.hk ?? 50;
    return ENERGIE_KLASSEN.find((r) => hk <= r.bis)?.kl ?? "H";
  };

  const R = useMemo(() => {
    const fl = +d.sanFl || +d.flaeche || 140,
      bj = +d.baujahr || 1981,
      ht = d.sanHt || "heizoel",
      ha = d.sanHa || "alt",
      pe = +d.sanPe || 3;
    const hkEntry =
      SAN_NORMEN.hkBaujahr.find((e) => bj <= e.bis) ||
      SAN_NORMEN.hkBaujahr[SAN_NORMEN.hkBaujahr.length - 1];
    const hk = hkEntry.hk;
    const co2F = SAN_ENERGIE.co2F[ht] || 0.2;
    const ep = SAN_ENERGIE.ep[ht] || 0.12;
    const eH =
      Math.round(hk * fl) +
      Math.round(pe * SAN_NORMEN.warmwasserKWhPerson) +
      Math.round(fl * SAN_NORMEN.hilfsStromKWhM2);
    const co2H = Math.round(eH * co2F);
    const epStrom = +s.epStrom || SAN_ENERGIE.defaultStrompreis,
      epHeiz = +s.epHeiz || SAN_ENERGIE.defaultHeizpreis;
    const htIsStrom = ht === "wp" || ht === "strom";
    const epKwh = htIsStrom ? epStrom : epHeiz;
    // Jahreskosten: user-eingabe überschreibt Auto-Kalkulation (muss VOR kH/skJ stehen)
    const hkJahrUser = +s.hkJahr || 0,
      skJahrUser = +s.skJahr || 0;
    const preisstieg = (+s.preisstieg || 2) / 100; // %/Jahr Energiepreis-Steigerung
    const kH_auto = Math.round((eH * ep) / 50) * 50;
    const kH = hkJahrUser > 0 ? hkJahrUser : kH_auto; // User-Eingabe hat Vorrang
    const stromKWhBDEW = SAN_NORMEN.stromBDEW[Math.min(pe, 5)] || SAN_NORMEN.stromBDEW[3];
    const sk_auto = Math.round((stromKWhBDEW * epStrom) / 50) * 50; // BDEW-Norm nach Personenhaushalt
    const skJ = skJahrUser > 0 ? skJahrUser : sk_auto;

    const anbauF = s.anbau === "doppel" ? 0.75 : s.anbau === "mittel" ? 0.5 : 1;
    const oF = (ht === "heizoel" || ht === "gas" || ht === "kohle") && ha === "alt";
    const hFQ = Math.min(0.3 + (oF ? 0.2 : 0.0), 0.7); // BAFA BEG 2026: 30% Grund + 20% Klimabonus (alte Öl/Gas/Kohle), kein +5% für andere
    const iB = d.sanIsfp ? 0.05 : 0; // iSFP-Bonus: +5% auf alle BEG-fähigen Maßnahmen

    const FQ = {
      fenster: 0.15 + iB,
      fassade: 0.15 + iB,
      heizung: Math.min(hFQ + iB, 0.7),
      dach: 0.15 + iB,
      tuer: 0.15 + iB,
      pv: 0,
      keller: 0.15 + iB,
      ogdecke: 0.15 + iB,
      batterie: 0,
      lueftung: 0.15 + iB,
    };
    // BAFA/KfW Förder-Caps: dynamisch aus FQ (damit iSFP-Bonus automatisch einfliesst)
    const FO_CAP = {
      fenster: Math.round(30000 * FQ.fenster),
      fassade: Math.round(30000 * FQ.fassade),
      heizung: Math.round(30000 * FQ.heizung),
      dach: Math.round(30000 * FQ.dach),
      tuer: Math.round(30000 * FQ.tuer),
      pv: Infinity, // KfW 270: kein Betragscap
      keller: Math.round(30000 * FQ.keller),
      ogdecke: Math.round(30000 * FQ.ogdecke),
      batterie: Infinity, // Landesförderung: variiert
      lueftung: Math.round(30000 * FQ.lueftung),
    };
    const ES = {
      fenster: { ek: 0.12, co2: 0.1 },
      fassade: { ek: 0.2, co2: 0.18 },
      heizung: { ek: 0.35, co2: 0.45 },
      dach: { ek: 0.08, co2: 0.07 },
      tuer: { ek: 0.02, co2: 0.02 },
      pv: {
        ek: Math.min(((+s.pvK || 7) * SAN_NORMEN.pvErtragKWhKwp * ep) / Math.max(kH, 1), 0.25),
        co2: Math.min(
          ((+s.pvK || 7) * SAN_NORMEN.pvErtragKWhKwp * SAN_ENERGIE.co2F.strom) / Math.max(co2H, 1),
          0.2,
        ),
      },
      keller: { ek: 0.05, co2: 0.04 },
      ogdecke: { ek: 0.06, co2: 0.05 },
      batterie: { ek: 0.05, co2: 0.03 },
      lueftung: { ek: 0.08, co2: 0.06 },
    };

    const fA = +s.fA || 12,
      fXL = +s.fXL || 0,
      fHST = +s.fHST || 0;
    const tF = tier.fenster,
      tFa = tier.fassade,
      tH = tier.heizung,
      tD = tier.dach,
      tT = tier.tuer,
      tP = tier.pv,
      tL = tier.lueftung;
    const fenK =
      fA * SAN_TIERS.fenster[tF].p +
      fXL * (SAN_TIERS.fensterXL[tF]?.p || 2000) +
      fHST * (SAN_TIERS.fensterHST[tF]?.p || 5000);
    const faF2 = +s.faF || 137,
      fasK = Math.round((SAN_TIERS.fassade[tFa].p * anbauF * Math.max(faF2, 40)) / 137);
    const hzK = SAN_TIERS.heizung[tH].p;
    const daF2 = +s.daF || 80,
      daK = Math.round((SAN_TIERS.dach[tD].p * Math.max(daF2, 30)) / 80);
    const tuerK = SAN_TIERS.tuer[tT].p;
    const pvK2 = +s.pvK || 7,
      pvKo = Math.round((SAN_TIERS.pv[tP].p * pvK2) / 7);
    const keF2 = +s.keF || 60,
      kelK = Math.round(keF2 * 37);
    const ogF2 = +s.ogF || 60,
      ogK = Math.round(ogF2 * 35);
    const batK2 = +s.batK || 7,
      batKo = Math.round(batK2 * 1000);
    const lueK = SAN_TIERS.lueftung[tL].p;

    const ALL = [
      {
        k: "fenster",
        n: t.sanMassN1,
        c: fenK,
        em: "🪟",
        det: `${fA} Std.${fXL > 0 ? ", " + fXL + " XL" : ""}${fHST > 0 ? ", " + fHST + " HST" : ""}`,
        src: SAN_SRC_KEYS.fenster,
      },
      {
        k: "fassade",
        n: t.sanMassN2,
        c: fasK,
        em: "🧱",
        det: `${faF2}m² · ${s.anbau === "doppel" ? t.anbDoppel : s.anbau === "mittel" ? t.anbMittel : t.anbFrei} · ${SAN_TIERS.fassade[tFa].d}cm`,
        src: SAN_SRC_KEYS.fassade,
      },
      {
        k: "heizung",
        n: t.sanMassN3,
        c: hzK,
        em: "🔥",
        det: t[SAN_TIERS.heizung[tH].l] || SAN_TIERS.heizung[tH].l,
        src: SAN_SRC_KEYS.heizung,
      },
      {
        k: "dach",
        n: t.sanMassN4,
        c: daK,
        em: "🏠",
        det: `${daF2}m² · ${s.dachform === "flach" ? t.dchFlach : s.dachform === "walm" ? t.dchWalm : t.dchSattel}`,
        src: SAN_SRC_KEYS.dach,
      },
      {
        k: "tuer",
        n: t.sanMassN5,
        c: tuerK,
        em: "🚪",
        det: t[SAN_TIERS.tuer[tT].l] || SAN_TIERS.tuer[tT].l,
        src: SAN_SRC_KEYS.tuer,
      },
      {
        k: "pv",
        n: t.sanMassN6,
        c: pvKo,
        em: "☀️",
        det: `${pvK2} kWp · ${t[SAN_TIERS.pv[tP].l] || SAN_TIERS.pv[tP].l}`,
        src: SAN_SRC_KEYS.pv,
      },
      {
        k: "keller",
        n: t.sanMassN7,
        c: kelK,
        em: "🏗️",
        det: `${keF2}m²`,
        src: SAN_SRC_KEYS.keller,
      },
      {
        k: "ogdecke",
        n: t.sanMassN8,
        c: ogK,
        em: "🔝",
        det: `${ogF2}m²`,
        src: SAN_SRC_KEYS.ogdecke,
      },
      {
        k: "batterie",
        n: t.sanMassN9,
        c: batKo,
        em: "🔋",
        det: `${batK2} kWh`,
        src: SAN_SRC_KEYS.batterie,
      },
      {
        k: "lueftung",
        n: t.sanMassN10,
        c: lueK,
        em: "💨",
        det: t[SAN_TIERS.lueftung[tL].l] || SAN_TIERS.lueftung[tL].l,
        src: SAN_SRC_KEYS.lueftung,
      },
    ];

    let tK = 0,
      tFo = 0,
      tFoLand = 0,
      eM = 1,
      cM = 1;
    const rows = [];
    const blBonus = LAND_BONUS_FQ[d.bundesland] || {};
    ALL.forEach((m) => {
      if (!act[m.k]) return;
      const fq = FQ[m.k] || 0;
      const fqL = blBonus[m.k] || 0; // Landesbonus-Quote
      const foRaw = Math.round((m.c * fq) / 100) * 100;
      const fo = Math.min(foRaw, FO_CAP[m.k] ?? foRaw); // BAFA/KfW Cap
      const foLandRaw = Math.round((m.c * fqL) / 100) * 100;
      const foLand = Math.min(foLandRaw, LAND_BONUS_CAP); // Landesbonus Cap
      tK += m.c;
      tFo += fo;
      tFoLand += foLand;
      const ekE = Math.round((kH * (ES[m.k]?.ek || 0)) / 50) * 50;
      const co2E = Math.round(co2H * (ES[m.k]?.co2 || 0));
      eM *= 1 - (ES[m.k]?.ek || 0);
      cM *= 1 - (ES[m.k]?.co2 || 0);
      const capped = foRaw > fo;
      rows.push({
        n: m.n,
        em: m.em,
        c: m.c,
        f: fo,
        foLand,
        fqL: Math.round(fqL * 100),
        net: m.c - fo - foLand,
        ek: ekE,
        co2: co2E,
        src: m.src,
        fq: Math.round(fq * 100),
        det: m.det,
        k: m.k,
        capped,
      });
    });
    const ne = tK - tFo - tFoLand;
    const ekG = Math.round((kH * (1 - eM)) / 50) * 50;
    const co2G = Math.round(co2H * (1 - cM));
    const espEuro = ekG; // ekG bereits in €/Jahr — keine weitere Multiplikation mit epKwh
    // PV: Stromersparnis durch Eigenverbrauch (zusätzlich zur Heizersparnis)
    // min(PV-Eigenverbrauch kWh, tatsächlicher Jahresstromverbrauch kWh) × Strompreis
    const pvK2tmp = +s.pvK || 7;
    const pvEigenverbrauchKwh = act.pv
      ? Math.min(
          pvK2tmp * SAN_NORMEN.pvErtragKWhKwp * SAN_NORMEN.pvEigenverbrauchQuote,
          fl * SAN_NORMEN.hausStromKWhM2,
        )
      : 0;
    const pvStromEsp = Math.round((pvEigenverbrauchKwh * epStrom) / 50) * 50;
    const totalEsp = espEuro + pvStromEsp; // Gesamtersparnis für Amortisationsrechnung
    // Amortisation mit optionaler Preissteigerungs-Prognose
    let amJ = 99;
    if (totalEsp > 0 && ne > 0) {
      if (preisstieg <= 0) {
        amJ = Math.round((ne / totalEsp) * 10) / 10;
      } else {
        // Geometrische Reihe: ne = totalEsp * ((1+p)^n - 1) / p
        let kum = 0,
          yr = 0;
        while (kum < ne && yr < 80) {
          yr++;
          kum += totalEsp * Math.pow(1 + preisstieg, yr - 1);
        }
        amJ = yr < 80 ? yr : 99;
      }
    }

    const gegReq = [];
    if (bj < 2002 && ha === "alt" && (ht === "heizoel" || ht === "gas"))
      gegReq.push({ law: "§ 72 GEG", text: t.sanTip4, sev: "warn" });
    if (bj < 1984)
      gegReq.push({ law: "§ 47 GEG", text: t.sanMassN8 + " — " + t.sHTyp, sev: "info" });
    if (bj < 1978)
      gegReq.push({ law: "§ 71 GEG", text: t.sanMassN3 + ": 65% " + t.str, sev: "info" });
    if (hk > 200)
      gegReq.push({
        law: "EU-EPBD",
        text: `${t.eKl} ${EC_O[kw2ec(hk)]} (${hk} kWh/m²a)`,
        sev: "warn",
      });

    return {
      tK,
      tFo,
      tFoLand,
      ne,
      ekG,
      co2G,
      amJ,
      ecV: kw2ec(hk),
      ecN: kw2ec(Math.max(hk * eM, 10)),
      hk,
      eM,
      cM,
      kH,
      skJ,
      co2H,
      ALL,
      rows,
      epKwh,
      htIsStrom,
      espEuro,
      pvStromEsp,
      totalEsp,
      gegReq,
      preisstieg,
      sk_auto,
      kH_auto,
    };
  }, [d, s, act, tier, t]);

  const htO = [
    { v: "gas", l: t.gas },
    { v: "heizoel", l: t.oel },
    { v: "wp", l: t.wp },
    { v: "pellets", l: t.pel },
    { v: "fernw-std", l: t.fw },
    { v: "kohle", l: t.koh },
    { v: "strom", l: t.str },
  ];
  const haO = [
    { v: "alt", l: t.alt },
    { v: "mittel", l: t.mitt },
    { v: "neu", l: t.neu },
  ];
  const anbauO = [
    { v: "frei", l: t.anbFrei },
    { v: "doppel", l: t.anbDoppel },
    { v: "mittel", l: t.anbMittel },
  ];
  const dachO = [
    { v: "sattel", l: t.dchSattel },
    { v: "flach", l: t.dchFlach },
    { v: "walm", l: t.dchWalm },
  ];
  const hasTier = (k) =>
    ["fenster", "fassade", "heizung", "dach", "tuer", "pv", "lueftung"].includes(k);

  return (
    <div>
      <VT view={view} setView={setView} />
      <div className="split">
        <div className={`inp-pane ${view === "input" ? "act" : ""}`}>
          <Sec title={t.oL} icon="📍" />
          <Sel
            label={t.bundesland}
            value={d.bundesland}
            onChange={(v) => set("bundesland", v)}
            options={BL_O}
          />
          {d.bundesland && (
            <div
              style={{
                fontSize: 10,
                color: "var(--ch)",
                marginTop: -6,
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              🏦 Landesbank: {LAND_F[d.bundesland] || "BEG"} — {t.sanLandesbankHint}
            </div>
          )}
          <button
            onClick={() => set("sanIsfp", !d.sanIsfp)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              background: d.sanIsfp ? "#dcfce7" : "var(--ci)",
              border: `1px solid ${d.sanIsfp ? "#22c55e" : "var(--cb)"}`,
              borderRadius: 8,
              padding: "8px 10px",
              cursor: "pointer",
              marginBottom: 10,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <div
              style={{
                width: 34,
                height: 20,
                borderRadius: 10,
                background: d.sanIsfp ? "#22c55e" : "var(--cb)",
                position: "relative",
                flexShrink: 0,
                transition: "background .2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: d.sanIsfp ? 16 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: "#fff",
                  transition: "left .2s",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: d.sanIsfp ? "#15803d" : "var(--ct)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {t.sanIsfpLabel}
                  <Tip text={tip("isfp")} />
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>{t.sanIsfpSub}</div>
            </div>
          </button>
          <Sec title={t.sGebData} icon="🏠" />
          <Row>
            <F
              label={t.sWfl}
              unit="m²"
              value={d.sanFl || d.flaeche || "140"}
              onChange={(v) => set("sanFl", v)}
              tip={tip("flaeche")}
            />
            <F
              label={t.sBJ}
              value={d.baujahr || "1981"}
              onChange={(v) => set("baujahr", v)}
              tip={tip("sanBj")}
            />
          </Row>
          {(+d.baujahr || 0) > 0 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: -4,
                marginBottom: 8,
                fontSize: 11,
                paddingLeft: 2,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "var(--ch)" }}>
                🏠 {t.eKl}: <b style={{ color: "var(--ct)" }}>{getEkl(d.baujahr)}</b>
              </span>
              {+d.baujahr < KFW.klimaBonus_baujahrGrenze ? (
                <span style={{ color: "#15803d", fontWeight: 600 }}>· ✅ KfW Klimabonus</span>
              ) : (
                <span style={{ color: "var(--ch)" }}>· KfW Klimabonus: ✗</span>
              )}
            </div>
          )}
          <Row>
            <Sel
              label={t.sHTyp}
              value={d.sanHt || "heizoel"}
              onChange={(v) => set("sanHt", v)}
              options={htO}
            />
            <Sel
              label={t.sHAlt}
              value={d.sanHa || "alt"}
              onChange={(v) => set("sanHa", v)}
              options={haO}
            />
          </Row>
          <F
            label={t.sPers}
            value={d.sanPe ?? ""}
            placeholder="3"
            onChange={(v) => set("sanPe", v)}
            tip={tip("pers")}
          />
          <Sec title={t.sEnergie} icon="⚡" />
          <Row>
            <F
              label={t.sStrPr}
              unit="€/kWh"
              value={s.epStrom}
              onChange={(v) => sF("epStrom", v)}
              step="0.01"
              tip={tip("epStrom")}
            />
            <F
              label={t.sSkJahr}
              unit="€/J."
              value={s.skJahr}
              onChange={(v) => sF("skJahr", v)}
              tip={tip("skJahr")}
              placeholder={String(R.sk_auto)}
            />
          </Row>
          <Row>
            <F
              label={t.sHkos}
              unit="€/kWh"
              value={s.epHeiz}
              onChange={(v) => sF("epHeiz", v)}
              step="0.01"
              tip={tip("epHeiz")}
            />
            <F
              label={t.sHkJahr}
              unit="€/J."
              value={s.hkJahr}
              onChange={(v) => sF("hkJahr", v)}
              tip={tip("hkJahr")}
              placeholder={String(R.kH_auto)}
            />
          </Row>
          <Sel
            label={t.sPreisstieg}
            value={s.preisstieg || "2"}
            onChange={(v) => sF("preisstieg", v)}
            options={[
              { v: "0", l: t.sPS0 },
              { v: "1", l: t.sPS1 },
              { v: "2", l: t.sPS2 },
              { v: "3", l: t.sPS3 },
              { v: "5", l: t.sPS5 },
            ]}
          />

          <Sec title={t.sStruktur} icon="📐" />
          <Row>
            <Sel
              label={t.sAnbau}
              value={s.anbau}
              onChange={(v) => sF("anbau", v)}
              options={anbauO}
            />
            <Sel
              label={t.sDaForm}
              value={s.dachform}
              onChange={(v) => sF("dachform", v)}
              options={dachO}
            />
          </Row>

          <Sec title={t.sMassnahmen} icon="🔧" />
          {R.ALL.map((m) => (
            <div
              key={m.k}
              style={{
                marginBottom: 8,
                border: act[m.k] ? "2px solid var(--ca)" : "1px solid var(--cb)",
                borderRadius: 10,
                overflow: "visible",
                background: act[m.k] ? "var(--cc)" : "transparent",
                transition: "border .2s",
              }}
            >
              <div
                onClick={() => tog(m.k)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{m.em}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.n}</div>
                    {act[m.k] && (
                      <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>{m.det}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: act[m.k] ? "var(--ca)" : "var(--ch)",
                    }}
                  >
                    {fmtE(m.c)}
                  </span>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: act[m.k] ? "var(--ca)" : "var(--cb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background .2s",
                    }}
                  >
                    {act[m.k] && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                  </div>
                </div>
              </div>
              {act[m.k] && (
                <div style={{ padding: "0 12px 10px", borderTop: "1px solid var(--cb)" }}>
                  {hasTier(m.k) && (
                    <div style={{ marginTop: 8 }}>
                      <TierSel
                        value={tier[m.k]}
                        onChange={(v) => setT(m.k, v)}
                        tiers={SAN_TIERS[m.k]}
                      />
                    </div>
                  )}

                  {m.k === "fenster" && (
                    <div style={{ marginTop: 4 }}>
                      <Row>
                        <F label={t.sFenStd} value={s.fA} onChange={(v) => sF("fA", v)} />
                        <F label={t.sFenXL} value={s.fXL} onChange={(v) => sF("fXL", v)} />
                      </Row>
                      <F label={t.sFenHST} value={s.fHST} onChange={(v) => sF("fHST", v)} />
                    </div>
                  )}
                  {m.k === "fassade" && (
                    <F
                      label={t.sFasFl}
                      unit="m²"
                      value={s.faF}
                      onChange={(v) => sF("faF", v)}
                      tip={tip("fasFl")}
                    />
                  )}
                  {m.k === "dach" && (
                    <F
                      label={t.sDaFl}
                      unit="m²"
                      value={s.daF}
                      onChange={(v) => sF("daF", v)}
                      tip={tip("daFl")}
                    />
                  )}
                  {m.k === "pv" && (
                    <F
                      label={t.sLeist}
                      unit="kWp"
                      value={s.pvK}
                      onChange={(v) => sF("pvK", v)}
                      step="0.5"
                      tip={tip("pvLeistung")}
                    />
                  )}
                  {m.k === "keller" && (
                    <F
                      label={t.sKeFl}
                      unit="m²"
                      value={s.keF}
                      onChange={(v) => sF("keF", v)}
                      tip={tip("keFl")}
                    />
                  )}
                  {m.k === "ogdecke" && (
                    <F
                      label={t.sOgFl}
                      unit="m²"
                      value={s.ogF}
                      onChange={(v) => sF("ogF", v)}
                      tip={tip("ogdecke")}
                    />
                  )}
                  {m.k === "batterie" && (
                    <F
                      label={t.sKap}
                      unit="kWh"
                      value={s.batK}
                      onChange={(v) => sF("batK", v)}
                      tip={tip("batterie")}
                    />
                  )}

                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ch)",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>📚 {t[m.src] || m.src}</span>
                    {m.capped && (
                      <span
                        style={{
                          background: "#FFF8E6",
                          color: "#8a6d10",
                          borderRadius: 4,
                          padding: "1px 5px",
                          fontSize: 9,
                          fontWeight: 600,
                          border: "1px solid #F5E4A8",
                        }}
                      >
                        ⚠ Cap
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
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
          <div
            style={{
              background: "linear-gradient(135deg,var(--ca),var(--ca-dk))",
              borderRadius: 14,
              padding: "18px 16px",
              color: "#fff",
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase" }}>{t.sGesK}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
              {R.rows.length > 0 ? fmtE(R.tK) : "— €"}
            </div>
            {R.rows.length > 0 ? (
              <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>BAFA/KfW</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>–{fmtE(R.tFo)}</div>
                </div>
                {R.tFoLand > 0 && (
                  <div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>🏦 Landesbonus*</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#93c5fd" }}>
                      –{fmtE(R.tFoLand)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>{t.sNetK}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtE(R.ne)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>{t.amo}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {R.amJ > 30 ? "> 30 J." : `${R.amJ} J.`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>👈 {t.sMassnahmen}</div>
            )}
          </div>

          {d.bundesland && R.rows.length > 0 && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--ci)",
                borderRadius: 8,
                fontSize: 11,
                marginBottom: 12,
                color: "var(--ch)",
                border: "1px solid var(--cb)",
              }}
            >
              🏛️ {t.foe} (BAFA/KfW) · {t.check}:{" "}
              <b style={{ color: "var(--ct)" }}>{LAND_F[d.bundesland] || "BEG"}</b>
              {R.tFoLand > 0 && (
                <span style={{ marginLeft: 8, color: "#3b82f6" }}>
                  + ~{fmtE(R.tFoLand)} {LAND_F[d.bundesland]} Landesbonus*
                </span>
              )}
            </div>
          )}

          {R.gegReq.length > 0 && (
            <div
              style={{
                background: "#FFF8E6",
                borderRadius: 10,
                padding: "12px",
                border: "1px solid #F5E4A8",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8a6d10", marginBottom: 6 }}>
                ⚖️ {t.mR} — GEG
              </div>
              {R.gegReq.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 11 }}>
                  <span style={{ flexShrink: 0 }}>{g.sev === "warn" ? "⚠️" : "ℹ️"}</span>
                  <span style={{ color: "#6b5a10" }}>
                    <b>{g.law}:</b> {g.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {R.rows.length > 0 && (
            <>
              {R.rows.length > 0 && (
                <div
                  style={{
                    background: "var(--cc)",
                    borderRadius: 12,
                    padding: "12px",
                    border: "1px solid var(--cb)",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t.sMassDet}</div>
                  {R.rows.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        borderBottom: i < R.rows.length - 1 ? "1px solid var(--cb)" : "none",
                        padding: "10px 0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{r.em}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{r.n}</div>
                            <div style={{ fontSize: 10, color: "var(--ch)" }}>{r.det}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{fmtE(r.c)}</div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 6,
                          fontSize: 10,
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{ background: "var(--ci)", borderRadius: 4, padding: "4px 6px" }}
                        >
                          <div style={{ color: "var(--ch)" }}>BAFA/KfW ({r.fq}%)</div>
                          <div style={{ color: "#22c55e", fontWeight: 500 }}>–{fmtE(r.f)}</div>
                          {r.foLand > 0 && (
                            <div style={{ color: "#3b82f6", fontWeight: 500, marginTop: 1 }}>
                              +BL –{fmtE(r.foLand)}{" "}
                              <span style={{ fontWeight: 400, opacity: 0.8 }}>({r.fqL}%)*</span>
                            </div>
                          )}
                        </div>
                        <div
                          style={{ background: "var(--ci)", borderRadius: 4, padding: "4px 6px" }}
                        >
                          <div style={{ color: "var(--ch)" }}>{t.esp}</div>
                          <div style={{ fontWeight: 500 }}>{fmtE(r.ek)}/J.</div>
                        </div>
                        <div
                          style={{ background: "var(--ci)", borderRadius: 4, padding: "4px 6px" }}
                        >
                          <div style={{ color: "var(--ch)" }}>{t.co2}</div>
                          <div style={{ fontWeight: 500 }}>–{fmt(r.co2)} kg/J.</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, color: "var(--ch)", marginTop: 4 }}>
                        📚 {t[r.src] || r.src} · {t.sNetK}: {fmtE(r.net)}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: "2px solid var(--ct)",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{t.sGesamt}</span>
                    <span>
                      {fmtE(R.tK)} – {fmtE(R.tFo)}
                      {R.tFoLand > 0 && (
                        <span style={{ color: "#3b82f6" }}> –{fmtE(R.tFoLand)}</span>
                      )}{" "}
                      = <span style={{ color: "var(--ca)" }}>{fmtE(R.ne)}</span>
                    </span>
                  </div>
                  {R.tFoLand > 0 && (
                    <div
                      style={{
                        fontSize: 9,
                        color: "#3b82f6",
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: "1px solid var(--cb)",
                      }}
                    >
                      * Landesbonus ({LAND_F[d.bundesland]}) — {t.sanLandDis}
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  background: "var(--cc)",
                  borderRadius: 12,
                  padding: "14px",
                  border: "1px solid var(--cb)",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10 }}>{t.eKl}</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 4 }}>{t.vor}</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#fff",
                        background: EC_C[R.ecV],
                        borderRadius: 8,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                      }}
                    >
                      {EC_O[R.ecV]}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 4 }}>
                      {fmt(R.hk)} kWh/m²a
                    </div>
                  </div>
                  <div style={{ fontSize: 26, color: "var(--ca)", fontWeight: 600, lineHeight: 1 }}>
                    →
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 4 }}>{t.nac}</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#fff",
                        background: EC_C[R.ecN],
                        borderRadius: 8,
                        width: 44,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                      }}
                    >
                      {EC_O[R.ecN]}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 4 }}>
                      {fmt(Math.round(R.hk * R.eM))} kWh/m²a
                    </div>
                  </div>
                </div>
              </div>

              <div className="if-row" style={{ marginBottom: 14 }}>
                <KPI
                  label={t.sEnerEsp}
                  value={`-${Math.round((1 - R.eM) * 100)}%`}
                  sub={`${fmtE(R.kH)} → ${fmtE(Math.round((R.kH * R.eM) / 50) * 50)}/J.`}
                  accent
                />
                <KPI
                  label={t.sCO2R}
                  value={`-${Math.round((1 - R.cM) * 100)}%`}
                  sub={`${fmt(R.co2H)} → ${fmt(Math.round(R.co2H * R.cM))} kg/J.`}
                />
                <KPI
                  label={t.sJEsp}
                  value={fmtE(R.totalEsp)}
                  sub={
                    R.pvStromEsp > 0
                      ? `Heizung ${fmtE(R.espEuro)} + PV-Strom ${fmtE(R.pvStromEsp)}`
                      : `bei ${fmt(R.epKwh, 2)} €/kWh (${R.htIsStrom ? t.str : t.sHTyp})`
                  }
                  accent
                />
                <KPI
                  label={t.sFqAvg}
                  value={R.tK > 0 ? fmtP((R.tFo / R.tK) * 100) : "—"}
                  sub={`${fmtE(R.tFo)} ${t.foe}`}
                />
              </div>
              {d.sanIsfp && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: 8,
                    padding: "6px 10px",
                    marginBottom: 10,
                    fontSize: 11,
                  }}
                >
                  <span style={{ fontSize: 14 }}>📋</span>
                  <span style={{ fontWeight: 600, color: "#15803d" }}>
                    {t.sanIsfpActive.split("—")[0].trim()}
                  </span>
                  <span style={{ color: "#166534" }}>
                    {"— " + (t.sanIsfpActive.split("—")[1] || "").trim()}
                  </span>
                </div>
              )}

              <div className="if-row" style={{ marginBottom: 14 }}>
                <KPI label={t.sHkJahr} value={fmtE(R.kH)} sub={t.sAutoCalc} accent />
                <KPI label={t.sSkJahr} value={fmtE(R.skJ)} sub={t.sAutoCalc} />
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{t.sAmoR}</span>
                  {R.preisstieg > 0 && (
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--ch)",
                        background: "var(--ci)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        border: "1px solid var(--cb)",
                      }}
                    >
                      +{Math.round(R.preisstieg * 100)}%/J. {t.sPreisstieg}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ct)" }}>
                    {R.amJ > 30 ? "> 30 J." : `${R.amJ} J.`}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ch)" }}>{t.sAmoSub}</span>
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
                      width: `${Math.min((R.amJ / 30) * 100, 100)}%`,
                      borderRadius: 3,
                      background: R.amJ <= 10 ? "#22c55e" : R.amJ <= 20 ? "var(--ca)" : "#f59e0b",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 6, lineHeight: 1.6 }}>
                  {t.sNetK}: {fmtE(R.ne)} ÷ {t.sJEsp}: {fmtE(R.totalEsp)}/J.
                  {R.pvStromEsp > 0
                    ? ` (Heizung ${fmtE(R.espEuro)} + PV ${fmtE(R.pvStromEsp)})`
                    : ""}{" "}
                  = <b>{R.amJ > 30 ? "> 30" : R.amJ} J.</b>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>💡 {t.sBerat}</div>
                <Ins emoji="🔄" text={t.sanTip1} type="info" />
                {d.sanIsfp ? (
                  <Ins emoji="✅" text={t.sanIsfpTip} type="good" />
                ) : (
                  <Ins emoji="👨‍🔧" text={t.sanTip2} type="good" />
                )}
                <Ins emoji="📝" text={t.sanTip3} type="warn" />
                {(+d.baujahr || 1981) < 1977 && (
                  <Ins emoji="⚠️" text={`${t.sBJ} ${d.baujahr || 1981}: GEG § 47`} type="warn" />
                )}
                {d.sanHa === "alt" &&
                  (d.sanHt === "heizoel" || d.sanHt === "gas" || d.sanHt === "kohle") && (
                    <Ins emoji="🔥" text={t.sanTip4} type="bad" />
                  )}
                <Ins emoji="💸" text={t.sanTip5} type="good" />
                <Ins emoji="🌡️" text={t.sanTip6} type="info" />
                {d.bundesland && (
                  <Ins emoji="🏛️" text={`${t.foe}: ${LAND_F[d.bundesland] || "BEG"}`} type="info" />
                )}
                {act.pv && act.batterie && <Ins emoji="🔋" text={t.sanTip7} type="good" />}
                {R.amJ > 25 && R.rows.length > 0 && (
                  <Ins emoji="🧮" text={`${t.amo}: ${R.amJ > 30 ? ">30" : R.amJ} J.`} type="info" />
                )}
                {R.amJ > 20 && R.rows.length > 0 && <Ins emoji="🏦" text={t.adv16} type="info" />}
                {R.ecN !== undefined && R.ecN > 3 && <Ins emoji="🇪🇺" text={t.adv17} type="warn" />}
                {act && act.heizung && !act.fassade && !act.dach && (
                  <Ins emoji="🌡️" text={t.adv18} type="warn" />
                )}
              </div>
              <SaveBtn tab="sanier" />
              <ExportPDF title={t.sanierFull || t.sanier} />
              <Legal items={LEG.sanier} />
            </>
          )}
        </div>
      </div>
      {/* ═══ KI-ASSISTENT (Phase 2, Sprint 4 — Konzept Abschnitt 5) ═══
      Bewusst AUSSERHALB der beiden Panes: auf Mobile blendet
      @media(max-width:699px) die gerade inaktive Pane per display:none aus.
      Stand das Widget darin, verschwand der position:fixed-Fuchs in der
      Eingabe-Ansicht komplett (Nutzer-Feedback 2026-07-22).
      Ausserdem hing es hier zusaetzlich hinter "mindestens eine Massnahme
      gewaehlt" - dadurch fehlte Finn genau dann, wenn der Foerderhinweis
      (erst beantragen, dann beauftragen) am meisten wert ist. */}
      {R &&
        (() => {
          const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
          const kontext = buildAssistantContext("sanierung", d, {
            gesamtkosten: R.tK,
            foerderung: R.tFo + R.tFoLand,
            nettokosten: R.ne,
            amortisationJahre: R.amJ,
            energieeinsparungProzent: Math.round((1 - R.eM) * 100),
            bewertung: null,
          });
          const suggested = [at.sanSuggested1, at.sanSuggested2, at.sanSuggested3];
          return (
            <AssistantWidget
              rechner="sanierung"
              kontext={kontext}
              contextLabel={at.contextSanierung}
              suggested={suggested}
              lang={lang}
            />
          );
        })()}
    </div>
  );
}
