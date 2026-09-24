// Die sichtbare Kernantwort der Objektseite - "Geführtes Cockpit" (Variante
// D, docs/technical_specs/objekt-detailseite-redesign.md). Alle Zahlen aus
// briefing.js/investmentScore.js, keine KI; nur Schritt 4 (Analyse) nimmt ein
// KI-Ergebnis entgegen. Reine Anzeige-Ableitungen (Antwortsatz, Differenzen,
// Jahreswert, Ueberschriften der Abweichungsbalken, "Groesster Hebel") stehen
// in utils/objektCockpit.js, hier nur Darstellung.
//
// Bewegung: nur beim ERSTEN Erscheinen der Karte (CSS-Animationen, kein
// State), unter 700 ms, bei prefers-reduced-motion nur ein kurzes Einblenden.
// Farben ausschliesslich ueber bestehende Tokens (Dark Mode laeuft allein
// darueber) - keine neuen Tokens, keine Hex-Werte.
import { useState } from "react";
import { fmt, fmtE } from "../../utils/helpers.js";
import { berechneVollstaendigkeit } from "../../utils/objektKennzahlen.js";
import { hebelTexteVon, risikenVon, staerkenVon } from "../../utils/aiEngine.js";
import {
  cockpitAntwortsatz,
  cockpitCashflowJahr,
  cockpitDiff,
  cockpitMarktUeberschrift,
  fmtKompakt,
} from "../../utils/objektCockpit.js";

export const STATUS_FARBEN = {
  rot: { tx: "var(--bad-tx)", bg: "var(--bad-bg)", bd: "var(--bad-bd)" },
  gelb: { tx: "var(--warn-tx)", bg: "var(--warn-bg)", bd: "var(--warn-bd)" },
  gruen: { tx: "var(--ok-tx)", bg: "var(--ok-bg)", bd: "var(--ok-bd)" },
  orange: { tx: "var(--ca-dk)", bg: "var(--ca-bg)", bd: "var(--ca-bd)" },
  neutral: { tx: "var(--ch)", bg: "var(--cro)", bd: "transparent" },
};

// Deutscher Rueckfall wie im Rest der Briefing-Karte (t.brfX || "...").
const L = (t, key, fallback) => (t && t[key]) || fallback;
const prozent = (n, d = 0) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), d)} %`;

// Desktop-Grenze = die bestehende Grenze des Projekts fuer den Objektbereich
// (siehe App.jsx, DESKTOP-SEITENNAVIGATION-Block: Sidebar/Split-Layout ab
// 1280px, min-height:600px verhindert die Landscape-Handy-Kollision).
const COCKPIT_CSS = `
.bv{--bv-ease:var(--ease-out,cubic-bezier(0.23,1,0.32,1))}
@keyframes bv-auf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes bv-wachsen{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes bv-punkt{from{opacity:0;transform:translate(-50%,-50%) scale(.4)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.bv-auf{animation:bv-auf .32s var(--bv-ease) both;animation-delay:var(--bv-d,0ms)}
.bv-wachsen{animation:bv-wachsen .5s var(--bv-ease) both;animation-delay:var(--bv-d,0ms)}
.bv-punkt{animation:bv-punkt .3s var(--bv-ease) both;animation-delay:var(--bv-d,500ms)}
@media (prefers-reduced-motion: reduce){
  .bv-auf,.bv-wachsen,.bv-punkt{animation:bv-fade .2s ease both}
  @keyframes bv-fade{from{opacity:0}to{opacity:1}}
}
.cockpit-kennzahlen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cockpit-nur-desktop{display:none}
.cockpit-legende{display:none}
.cockpit-stepnav{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:10px 2px;margin:0 -2px;position:sticky;top:0;z-index:5;background:var(--bg)}
.cockpit-stepnav::-webkit-scrollbar{display:none}
.cockpit-schritte{display:flex;flex-direction:column;gap:14px}
.cockpit-weiter-grid{display:flex;flex-direction:column;gap:14px}
.cockpit-stellschrauben-desktop{display:none}
.cockpit-stellschrauben-mobile{display:block}
@media(min-width:1280px) and (min-height:600px){
  .cockpit-kennzahlen{grid-template-columns:repeat(4,minmax(0,1fr))}
  .cockpit-nur-desktop{display:block}
  .cockpit-legende{display:flex}
  .cockpit-stepnav{position:static;overflow:visible;padding:14px 0;margin:0}
  .cockpit-schritte{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
  .cockpit-s2{grid-column:span 2}
  .cockpit-s3{grid-column:span 2}
  .cockpit-s5{grid-column:1 / -1}
  .cockpit-weiter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .cockpit-stellschrauben-desktop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .cockpit-stellschrauben-mobile{display:none}
}
`;

export function CockpitStyle() {
  return <style>{COCKPIT_CSS}</style>;
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 12,
};
const klein = { fontSize: 11, color: "var(--cl)" };

// Zahl je Einheit. `nowrap` ueberall: eine umbrechende Zahl ist unlesbar.
function wertText(wert, einheit) {
  if (wert == null || !isFinite(wert)) return "—";
  if (einheit === "faktor") return `${fmt(wert, 1)}×`;
  if (einheit === "prozent") return `${fmt(wert, 1)} %`;
  return fmtE(Math.round(wert));
}

// ── Baustein 2: Hinweis zur Datengrundlage (bleibt, siehe redesign-Spec §0:
// nur die Darstellung der 5 Schritte ist neu - dieser Hinweis ist Vorbedingung
// fuer alle Schritte, deshalb bleibt er ganz oben stehen). ──────────────────
const EINGABE_SCHWELLE = 60;

export function EingabeHinweis({ data, t }) {
  const prozentVollstaendig = berechneVollstaendigkeit(data);
  if (prozentVollstaendig >= EINGABE_SCHWELLE) return null;
  return (
    <div className="bv" style={{ ...karte, background: "var(--info-bg)", borderColor: "var(--info-bd)" }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--info-tx)" }}>
        {L(
          t,
          "brfEingabeHinweis",
          "Für eine genaue Beurteilung: Lade ein Exposé hoch (die Werte werden in den Renditerechner übernommen) oder trage beim Anlegen die Pflichtfelder ein und ergänze den Rest im Renditerechner.",
        )}
      </div>
    </div>
  );
}

// ── Kopf: Antwortsatz + Kennzahlen-Leiste (Spec §3/§4.2/§4.3) ──────────────
export function AntwortsatzKopf({ cashflow, unterzeile, t }) {
  const antwort = cockpitAntwortsatz(cashflow, t);
  if (!antwort) return null;
  return (
    <div className="bv bv-auf">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ca)" }}>
        {L(t, "cockAntwortEyebrow", "Lohnt sich dieses Objekt?")}
      </div>
      <div
        style={{
          fontSize: 24,
          lineHeight: 1.2,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          marginTop: 4,
          color: "var(--ct)",
        }}
      >
        {antwort.negativ ? (
          <>
            {L(t, "cockAntwortNegativVorspann", "Aktuell nicht. Du zahlst jeden Monat")}{" "}
            <span style={{ color: "var(--bad-tx)", fontVariantNumeric: "tabular-nums" }}>{antwort.betrag}</span>{" "}
            {L(t, "cockAntwortNegativNachspann", "zu.")}
          </>
        ) : (
          <>
            {L(t, "cockAntwortPositivVorspann", "Ja, es trägt sich. Monatlich bleiben")}{" "}
            <span style={{ color: "var(--ok-tx)", fontVariantNumeric: "tabular-nums" }}>{antwort.betrag}</span>{" "}
            {L(t, "cockAntwortPositivNachspann", "übrig.")}
          </>
        )}
      </div>
      {unterzeile && (
        <div className="cockpit-nur-desktop" style={{ fontSize: 13, color: "var(--ch)", marginTop: 6, lineHeight: 1.4 }}>
          {unterzeile}
        </div>
      )}
    </div>
  );
}

const KERN_LABEL = {
  score: "Score",
  faktor: "Kaufpreisfaktor",
  nettorendite: "Nettomietrendite",
  cashflow: "Cashflow / Monat",
};

export function KennzahlenLeiste({ score, kennzahlen, t }) {
  const finde = (k) => kennzahlen?.find((x) => x.key === k);
  const cashflow = finde("cashflow");
  const nettorendite = finde("nettorendite");
  const faktor = finde("faktor");

  const kacheln = [];
  if (score?.verfuegbar && score.score != null) {
    kacheln.push({ key: "score", wert: score.score, einheit: "score" });
  }
  if (cashflow) kacheln.push(cashflow);
  if (nettorendite) kacheln.push(nettorendite);
  if (faktor) kacheln.push(faktor);
  if (kacheln.length === 0) return null;

  return (
    <div className="cockpit-kennzahlen bv bv-auf" style={{ marginTop: 14 }}>
      {kacheln.map((k) => (
        <KennzahlKachel key={k.key} k={k} t={t} />
      ))}
    </div>
  );
}

function KennzahlKachel({ k, t }) {
  const negativ = k.key === "cashflow" && k.wert < 0;
  const istScore = k.key === "score";
  // Kaufpreisfaktor-Kachel liefert nur `markt` (kein `abw`, siehe
  // briefingKernkennzahlen() in briefing.js) - die Abweichung wird hier aus
  // wert/markt nachgerechnet, dieselbe Formel wie briefing.js `abweichung()`.
  const faktorAbw =
    k.key === "faktor" && k.markt > 0 && k.wert > 0 ? (k.wert / k.markt - 1) * 100 : null;
  const zusatz =
    k.key === "faktor" && k.markt != null
      ? `${faktorAbw != null ? prozent(faktorAbw, 0) : ""} ${L(t, "brfFaktorGegen", "vs.")} ${
          k.ebeneName ? k.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "") : L(t, "brfMarktLand", "Land")
        }`.trim()
      : k.key === "cashflow" || k.key === "nettorendite"
        ? k.key === "cashflow"
          ? L(t, "brfKernNachSteuer", "nach Steuer")
          : L(t, "brfKernProJahr", "p. a.")
        : null;

  return (
    <div
      style={{
        background: negativ ? "var(--bad-bg)" : "var(--ci)",
        border: `1px solid ${negativ ? "var(--bad-bd)" : "var(--cb)"}`,
        borderRadius: 10,
        padding: "10px 10px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10.5, color: negativ ? "var(--bad-tx)" : "var(--ch)", fontWeight: 600 }}>
        {L(t, `cockKern${k.key}`, KERN_LABEL[k.key] || k.key)}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 800,
          whiteSpace: "nowrap",
          marginTop: 2,
          fontVariantNumeric: "tabular-nums",
          color: negativ ? "var(--bad-tx)" : "var(--ct)",
        }}
      >
        {istScore ? (
          <>
            {Math.round(k.wert)}
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ch)" }}> / 100</span>
          </>
        ) : (
          wertText(k.wert, k.einheit)
        )}
      </div>
      {istScore && (
        <div style={{ height: 5, borderRadius: 3, background: "var(--cro)", marginTop: 6 }}>
          <div
            className="bv-wachsen"
            style={{
              width: `${Math.max(0, Math.min(100, k.wert))}%`,
              height: 5,
              borderRadius: 3,
              background: "var(--ca)",
              transformOrigin: "left center",
            }}
          />
        </div>
      )}
      {zusatz && (
        <div
          style={{
            fontSize: 10.5,
            marginTop: 3,
            whiteSpace: "nowrap",
            color: negativ ? "var(--bad-tx)" : "var(--ch)",
          }}
        >
          {zusatz}
        </div>
      )}
    </div>
  );
}

// ── Schritt-Navigation (Spec §4.9) ──────────────────────────────────────────
const SCHRITTE = [
  { id: "s1", nr: 1, kurz: "Kosten" },
  { id: "s2", nr: 2, kurz: "Markt" },
  { id: "s3", nr: 3, kurz: "Stellschrauben" },
  { id: "s4", nr: 4, kurz: "Risiken" },
  { id: "s5", nr: 5, kurz: "Weiter" },
];

export function SchrittNav({ t }) {
  function springen(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduziert = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "start" });
  }
  return (
    <nav aria-label={L(t, "cockSchritteLabel", "Schritte")} className="cockpit-stepnav">
      {SCHRITTE.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={(e) => springen(e, s.id)}
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 40,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--cb)",
            background: "var(--cc)",
            color: "var(--ch)",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              border: "2px solid var(--ca)",
              color: "var(--ca)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {s.nr}
          </span>
          {L(t, `cockSchritt${s.nr}`, s.kurz)}
        </a>
      ))}
    </nav>
  );
}

function SchrittKopf({ nr, titel, aktion }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            border: `2px solid var(--ca)`,
            background: nr === 5 ? "var(--ca)" : "transparent",
            color: nr === 5 ? "#fff" : "var(--ca)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {nr}
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ct)" }}>
          {titel}
        </h2>
      </div>
      {aktion}
    </div>
  );
}

function ZeilePaar({ label, wert, borderTop }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: 13.5,
        padding: "8px 0",
        borderTop: borderTop ? "1px solid var(--cb)" : "none",
      }}
    >
      <span style={{ color: "var(--ch)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>{wert}</span>
    </div>
  );
}

// ── Schritt 1: Was dich das Objekt kostet (Spec §4.4) ───────────────────────
export function SchrittKosten({ briefing, cashflowVorSteuer, t }) {
  const kennzahlen = briefing?.kernkennzahlen;
  const cash = kennzahlen?.find((k) => k.key === "cashflow");
  const netto = kennzahlen?.find((k) => k.key === "nettorendite");
  if (!cash) return null;
  const negativ = cash.wert < 0;
  const jahr = cockpitCashflowJahr(cash.wert);

  return (
    <section id="s1" className="bv bv-auf cockpit-s1" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf nr={1} titel={L(t, "cockS1Titel", "Was dich das Objekt kostet")} />
      <div
        style={{
          marginTop: 14,
          padding: "14px 16px",
          borderRadius: 12,
          background: negativ ? "var(--bad-bg)" : "var(--ok-bg)",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: negativ ? "var(--bad-tx)" : "var(--ok-tx)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {wertText(cash.wert, "eurMonat")}{" "}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{L(t, "cockProMonat", "/ Monat")}</span>
        </div>
        {jahr != null && (
          <div style={{ fontSize: 12.5, marginTop: 2, color: negativ ? "var(--bad-tx)" : "var(--ok-tx)" }}>
            = {wertText(jahr, "eurMonat")}{" "}
            {negativ
              ? L(t, "cockProJahrZuzahlung", "pro Jahr aus eigener Tasche")
              : L(t, "cockProJahrUeberschuss", "Überschuss pro Jahr")}
          </div>
        )}
      </div>
      {cashflowVorSteuer != null && (
        <ZeilePaar label={L(t, "cockVorSteuer", "Vor Steuer / Monat")} wert={wertText(cashflowVorSteuer, "eurMonat")} borderTop />
      )}
      {netto && (
        <div className="cockpit-nur-desktop">
          <ZeilePaar label={L(t, "brfKernnettorendite", "Nettomietrendite")} wert={wertText(netto.wert, "prozent")} borderTop />
        </div>
      )}
    </section>
  );
}

// ── Schritt 2: Wie es zum Markt passt (Spec §4.5) ───────────────────────────
const MARKT_SPANNE = 40;

function AbweichungsBalken({ titel, art, v, formatWert, einheitLabel, extra, t }) {
  if (!v || v.abw == null || !isFinite(v.abw)) return null;
  const f = STATUS_FARBEN[v.status] || STATUS_FARBEN.neutral;
  const ueberschrift = cockpitMarktUeberschrift(v, art);
  const pos = (abw) => 50 + (Math.max(-MARKT_SPANNE, Math.min(MARKT_SPANNE, abw)) / (2 * MARKT_SPANNE)) * 100;
  const p = pos(v.abw);
  const vonLinks = Math.min(50, p);
  const breite = Math.abs(p - 50);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>
          {titel} {ueberschrift}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: f.tx,
            background: f.bg,
            border: f.bd !== "transparent" ? `1px solid ${f.bd}` : "none",
            borderRadius: 999,
            padding: "3px 9px",
          }}
        >
          {prozent(v.abw, 0)}
        </span>
      </div>
      <div
        style={{ position: "relative", height: 18, marginTop: 8 }}
        role="img"
        aria-label={`${titel}: ${formatWert(v.eigen)} du, ${formatWert(v.markt)} Markt`}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 7, height: 4, borderRadius: 2, background: "var(--cro)" }} />
        <div
          className="bv-wachsen"
          style={{
            position: "absolute",
            top: 7,
            height: 4,
            left: `${vonLinks}%`,
            width: `${breite}%`,
            borderRadius: 2,
            background: f.tx,
            transformOrigin: p >= 50 ? "left center" : "right center",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 1,
            width: 2,
            height: 16,
            marginLeft: -1,
            borderRadius: 1,
            background: "var(--ch)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 6,
          fontSize: 12.5,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ color: "var(--ct)" }}>
          <strong>{formatWert(v.eigen)}</strong> {einheitLabel} <span style={{ color: "var(--ch)" }}>{L(t, "brfDu", "du")}</span>
        </span>
        <span style={{ color: "var(--ch)" }}>
          {formatWert(v.markt)} {einheitLabel} {L(t, "brfMarkt", "Markt")}
        </span>
      </div>
      {extra}
    </div>
  );
}

const fmtQm = (w) => fmt(w, w < 100 ? 2 : 0);
const fmtFaktor = (w) => `${fmt(w, 1)}×`;

export function SchrittMarkt({ briefing, t }) {
  const v1 = briefing?.vergleiche?.find((v) => v.id === "v1");
  const v2 = briefing?.vergleiche?.find((v) => v.id === "v2");
  const fb = briefing?.faktorBenchmark;
  if (!v1 && !v2 && !fb) return null;
  const marktName = (fb?.ebeneName || v1?.ebeneName || v2?.ebeneName || "").replace(
    /\s*\((Kreis|Bezirk)\)\s*$/i,
    "",
  );

  const mieteExtra =
    v2?.erreichbarQm > 0 ? (
      <div style={{ ...klein, marginTop: 4 }}>
        {L(t, "brfErreichbar", "In 3 Jahren erreichbar")}: {fmtQm(v2.erreichbarQm)} €/m²
        {v2.kappungsgrenzeProzent != null &&
          ` (${L(t, "brfKappung", "Kappungsgrenze")} ${fmt(v2.kappungsgrenzeProzent, 0)} %)`}
      </div>
    ) : null;

  return (
    <section id="s2" className="bv bv-auf cockpit-s2" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf
        nr={2}
        titel={L(t, "cockS2Titel", "Wie es zum Markt passt")}
        aktion={
          marktName && (
            <span style={klein}>
              {L(t, "brfMarktTitel2", "Vergleich")}: {marktName}
            </span>
          )
        }
      />
      {v1 && (
        <AbweichungsBalken
          titel={L(t, "cockMarktKaufpreis", "Kaufpreis / m²")}
          art="kaufpreis"
          v={v1}
          formatWert={fmtQm}
          einheitLabel="€/m²"
          t={t}
        />
      )}
      {v2 && (
        <AbweichungsBalken
          titel={L(t, "brfMiete", "Miete")}
          art="miete"
          v={v2}
          formatWert={fmtQm}
          einheitLabel="€/m²"
          extra={mieteExtra}
          t={t}
        />
      )}
      {fb && (
        <AbweichungsBalken
          titel={L(t, "brfKernfaktor", "Kaufpreisfaktor")}
          art="faktor"
          v={fb}
          formatWert={fmtFaktor}
          einheitLabel=""
          t={t}
        />
      )}
      <div className="cockpit-legende" style={{ justifyContent: "space-between", fontSize: 11, color: "var(--ch)", borderTop: "1px solid var(--cb)", paddingTop: 10, marginTop: 16 }}>
        <span>{L(t, "cockLegendeLinks", "← günstiger / unter Markt")}</span>
        <span>{L(t, "cockLegendeRechts", "teurer / über Markt →")}</span>
      </div>
    </section>
  );
}

// ── Schritt 3: Was sich ändern müsste (Spec §4.6) ───────────────────────────
const SPANNEN_METRIK = [
  { key: "kaufpreis", titel: "Kaufpreis", monatlich: false },
  { key: "kaltmiete", titel: "Kaltmiete / Monat", titelKompakt: "Kaltmiete", monatlich: true },
  { key: "eigenkapital", titel: "Eigenkapital", monatlich: false },
];

function spannenWertText(wert, monatlich) {
  if (wert == null || !isFinite(wert)) return "—";
  return monatlich ? fmtE(Math.round(wert)) : fmtKompakt(wert);
}

export function SchrittStellschrauben({ spannen, groessterHebel, onEintragen, t }) {
  if (!spannen) return null;
  const zeilen = SPANNEN_METRIK.filter((m) => {
    const s = spannen[m.key];
    return s && (s.aktuell != null || s.realistisch != null || s.optimal != null);
  });
  if (zeilen.length === 0) return null;

  return (
    <section id="s3" className="bv bv-auf cockpit-s3" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf nr={3} titel={L(t, "cockS3Titel", "Was sich ändern müsste")} />

      {/* Desktop: 3 Mini-Karten */}
      <div className="cockpit-stellschrauben-desktop" style={{ marginTop: 14 }}>
        {zeilen.map((m) => (
          <SpannenMiniKarte
            key={m.key}
            titel={L(t, `brfSpannen${m.key}`, m.titel)}
            monatlich={m.monatlich}
            werte={spannen[m.key]}
            hebel={groessterHebel === m.key}
            onEintragen={m.key === "eigenkapital" ? onEintragen : null}
            t={t}
          />
        ))}
      </div>

      {/* Mobile: kompakte Tabelle */}
      <div className="cockpit-stellschrauben-mobile" style={{ marginTop: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr repeat(3, 1fr)",
            gap: 6,
            fontSize: 11,
            color: "var(--ch)",
            fontWeight: 600,
            paddingBottom: 6,
            borderBottom: "1px solid var(--cb)",
          }}
        >
          <span />
          <span style={{ textAlign: "right" }}>{L(t, "brfSpannenAktuell", "Heute")}</span>
          <span style={{ textAlign: "right" }}>{L(t, "brfSpannenRealistisch", "Realist.")}</span>
          <span style={{ textAlign: "right" }}>{L(t, "cockTragfaehig", "Tragfähig")}</span>
        </div>
        {zeilen.map((m) => (
          <SpannenZeileMobil
            key={m.key}
            titel={L(t, `brfSpannen${m.key}`, m.titelKompakt || m.titel)}
            monatlich={m.monatlich}
            werte={spannen[m.key]}
            onEintragen={m.key === "eigenkapital" ? onEintragen : null}
          />
        ))}
        {groessterHebel && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              background: "var(--ca-bg)",
              border: "1px solid var(--ca-bd)",
            }}
          >
            <HebelChip t={t} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>
              {L(
                t,
                `brfSpannen${groessterHebel}`,
                SPANNEN_METRIK.find((m) => m.key === groessterHebel)?.titelKompakt ||
                  SPANNEN_METRIK.find((m) => m.key === groessterHebel)?.titel ||
                  groessterHebel,
              )}
            </span>
          </div>
        )}
      </div>

      <div style={{ ...klein, marginTop: 14, lineHeight: 1.4 }}>
        {L(
          t,
          "cockSpannenErklaerung",
          "Realistisch = was der Markt hergibt · Tragfähig = ab hier trägt sich das Objekt",
        )}
      </div>
    </section>
  );
}

function HebelChip({ t }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ca-dk)",
        background: "var(--ca-bg)",
        border: "1px solid var(--ca-bd)",
        borderRadius: 999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {L(t, "cockGroessterHebel", "Größter Hebel")}
    </span>
  );
}

function SpannenMiniKarte({ titel, monatlich, werte, hebel, onEintragen, t }) {
  return (
    <div
      style={{
        background: "var(--ci)",
        border: hebel ? "1px solid var(--ca-bd)" : "1px solid var(--cb)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>{titel}</span>
        {hebel && <HebelChip t={t} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--ch)" }}>{L(t, "brfSpannenAktuell", "Heute")}</span>
        {werte.aktuell != null ? (
          <span style={{ fontWeight: 800, color: "var(--ca)", fontVariantNumeric: "tabular-nums" }}>
            {spannenWertText(werte.aktuell, monatlich)}
          </span>
        ) : onEintragen ? (
          <button type="button" onClick={onEintragen} style={eintragenLink}>
            {L(t, "cockEintragen", "Eintragen →")}
          </button>
        ) : (
          <span style={{ color: "var(--ch)" }}>—</span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--ch)" }}>{L(t, "brfSpannenRealistisch", "Realistisch")}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {spannenWertText(werte.realistisch, monatlich)}
          {cockpitDiff(werte.realistisch, werte.aktuell) && (
            <span style={{ color: "var(--ch)" }}> ({cockpitDiff(werte.realistisch, werte.aktuell)})</span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--ch)" }}>{L(t, "cockTragfaehig", "Tragfähig")}</span>
        <span style={{ color: "var(--ok-tx)", fontVariantNumeric: "tabular-nums" }}>
          {spannenWertText(werte.optimal, monatlich)}
          {cockpitDiff(werte.optimal, werte.aktuell) && (
            <span style={{ color: "var(--ch)" }}> ({cockpitDiff(werte.optimal, werte.aktuell)})</span>
          )}
        </span>
      </div>
    </div>
  );
}

function SpannenZeileMobil({ titel, monatlich, werte, onEintragen }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr repeat(3, 1fr)",
        gap: 6,
        fontSize: 13,
        alignItems: "baseline",
        padding: "6px 0",
        borderBottom: "1px solid var(--cb)",
      }}
    >
      <span style={{ fontWeight: 700, color: "var(--ct)" }}>{titel}</span>
      {werte.aktuell != null ? (
        <span style={{ textAlign: "right", fontWeight: 800, color: "var(--ca)", fontVariantNumeric: "tabular-nums" }}>
          {spannenWertText(werte.aktuell, monatlich)}
        </span>
      ) : onEintragen ? (
        <button type="button" onClick={onEintragen} style={{ ...eintragenLink, textAlign: "right" }}>
          Eintragen
        </button>
      ) : (
        <span style={{ textAlign: "right", color: "var(--ch)" }}>—</span>
      )}
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {spannenWertText(werte.realistisch, monatlich)}
      </span>
      <span style={{ textAlign: "right", color: "var(--ok-tx)", fontVariantNumeric: "tabular-nums" }}>
        {spannenWertText(werte.optimal, monatlich)}
      </span>
    </div>
  );
}

const eintragenLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 32,
};

// ── Schritt 4: Worauf achten (Spec §4.7) ────────────────────────────────────
// Chip + eine Zeile je Eintrag, Modernisierung als eigener Chip statt eigener
// Karte. "Ausführliche Begründung ansehen" klappt die vollen Texte (Titel,
// Wert, Beschreibung) an Ort und Stelle auf. Braucht ein KI-Ergebnis -
// derselbe Start-/Laden-/Fehler-/Einwilligungs-Ablauf wie zuvor in
// AnalyseKarte, nur kompakter dargestellt.
const MODBEDARF_LABEL = { gering: "Gering", mittel: "Mittel", hoch: "Hoch" };
const MODBEDARF_FARBE = { gering: "gruen", mittel: "gelb", hoch: "rot" };

function modGrundText(key, m) {
  if (key === "baujahr") {
    return m.baujahr < 1979
      ? `Baujahr ${m.baujahr} (vor 1979)`
      : `Baujahr ${m.baujahr} (1979–1994)`;
  }
  if (key === "heizungsalter") {
    return m.heizungsalter === "alt" ? "Heizung ist alt" : "Heizung mittleren Alters";
  }
  if (key === "energieklasse") {
    return ["F", "G", "H"].includes(m.energieklasse)
      ? `Energieeffizienzklasse ${m.energieklasse} (niedrig)`
      : `Energieeffizienzklasse ${m.energieklasse}`;
  }
  return "";
}

function Chip({ farbe, text }) {
  const f = STATUS_FARBEN[farbe] || STATUS_FARBEN.neutral;
  return (
    <span
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 700,
        color: f.tx,
        background: f.bg,
        border: f.bd !== "transparent" ? `1px solid ${f.bd}` : "none",
        borderRadius: 999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function SchrittRisiken({
  ergebnis,
  modernisierungsbedarf: m,
  t,
  laufend,
  fehlerText,
  zeigtConsent,
  bestaetigen,
  onStarten,
  onConsentJa,
  onConsentAbbrechen,
  onBestaetigenJa,
  onBestaetigenAbbrechen,
  erstelltText,
}) {
  const [aufgeklappt, setAufgeklappt] = useState(false);
  const risiken = ergebnis ? risikenVon(ergebnis) : [];
  const staerken = ergebnis ? staerkenVon(ergebnis) : [];
  const hebel = ergebnis ? hebelTexteVon(ergebnis) : [];
  const hatAnalyse = risiken.length + staerken.length + hebel.length > 0;
  const modText =
    m?.verfuegbar && m.gruende.length > 0
      ? m.gruende.map((g) => modGrundText(g, m)).join(", ")
      : null;

  return (
    <section id="s4" className="bv bv-auf cockpit-s4" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf
        nr={4}
        titel={L(t, "cockS4Titel", "Worauf achten")}
        aktion={
          hatAnalyse &&
          !laufend && (
            <button
              type="button"
              onClick={onStarten}
              aria-label={L(t, "brfNeuBerechnenAria", "Analyse neu berechnen")}
              style={neuBerechnenKnopf}
            >
              ↻
            </button>
          )
        }
      />

      {!hatAnalyse && !modText && !laufend && !zeigtConsent && !bestaetigen && (
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ch)", marginTop: 12 }}>
          {L(t, "brfAnalyseLeer", "Noch keine KI-Analyse zu diesem Objekt.")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: hatAnalyse || modText ? 12 : 0 }}>
        {risiken.map((r) => (
          <div key={r.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Chip farbe="rot" text={L(t, "brfRisikoChip", "Risiko")} />
            <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: "var(--ct)" }}>{r.title}</span>
          </div>
        ))}
        {staerken.map((s) => (
          <div key={s.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Chip farbe="gruen" text={L(t, "brfStaerkeChip", "Stärke")} />
            <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: "var(--ct)" }}>
              {s.title}
              {s.value && <span style={{ color: "var(--ca)" }}> · {s.value}</span>}
            </span>
          </div>
        ))}
        {modText && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Chip
              farbe={m?.stufe ? MODBEDARF_FARBE[m.stufe] : "gelb"}
              text={L(t, `brfModStufe${m?.stufe}`, MODBEDARF_LABEL[m?.stufe] || "Modernisierung")}
            />
            <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: "var(--ct)" }}>{modText}</span>
          </div>
        )}
      </div>

      {(risiken.length > 0 || staerken.length > 0 || hebel.length > 0) && (
        <button type="button" onClick={() => setAufgeklappt((o) => !o)} aria-expanded={aufgeklappt} style={textLink}>
          {aufgeklappt
            ? L(t, "cockWenigerAnzeigen", "Weniger anzeigen")
            : L(t, "cockAusfuehrlich", "Ausführliche Begründung ansehen")}
        </button>
      )}

      {aufgeklappt && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { titel: L(t, "brfStaerken", "Stärken"), farbe: "gruen", eintraege: staerken },
            { titel: L(t, "brfRisiken", "Risiken"), farbe: "rot", eintraege: risiken },
            { titel: L(t, "brfHebel", "Hebel"), farbe: "orange", eintraege: hebel },
          ]
            .filter((b) => b.eintraege.length > 0)
            .map((b) => (
              <div key={b.titel}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: STATUS_FARBEN[b.farbe].tx,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_FARBEN[b.farbe].tx }} />
                  {b.titel}
                </div>
                {b.eintraege.map((e) => (
                  <div key={e.title} style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>
                      {e.title}
                      {e.value && <span style={{ color: "var(--ca)" }}> · {e.value}</span>}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ct)", marginTop: 2 }}>{e.text}</div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {fehlerText && <div style={fehlerBand}>{fehlerText}</div>}

      {zeigtConsent && (
        <div style={consentBand}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {L(
              t,
              "brfConsentText",
              "Für die Auswertung werden die Kennzahlen dieses Objekts an unseren KI-Dienstleister übertragen — ohne Adresse und ohne Namen. Einverstanden?",
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onConsentJa} style={consentJa}>
              {L(t, "brfConsentJa", "Einverstanden, starten")}
            </button>
            <button type="button" onClick={onConsentAbbrechen} style={consentNein}>
              {L(t, "brfConsentNein", "Abbrechen")}
            </button>
          </div>
        </div>
      )}

      {bestaetigen && !zeigtConsent && (
        <div style={consentBand}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {(erstelltText
              ? L(t, "brfNeuBerechnenFrage", "Zuletzt erstellt am {datum}. Neu berechnen und die bisherige Auswertung ersetzen?")
              : ""
            ).replace("{datum}", erstelltText || "")}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onBestaetigenJa} style={consentJa}>
              {L(t, "brfNeuBerechnenJa", "Ja, neu berechnen")}
            </button>
            <button type="button" onClick={onBestaetigenAbbrechen} style={consentNein}>
              {L(t, "brfConsentNein", "Abbrechen")}
            </button>
          </div>
        </div>
      )}

      {laufend ? (
        <div aria-busy="true" style={{ marginTop: 12, fontSize: 12.5, color: "var(--cl)" }}>
          {L(t, "brfLaeuft", "Wird berechnet …")}
        </div>
      ) : (
        !zeigtConsent &&
        !bestaetigen && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: hatAnalyse ? "space-between" : "flex-start", gap: 8, marginTop: 14 }}>
            {erstelltText && hatAnalyse && (
              <span style={klein}>
                {L(t, "brfKiGeneriert", "KI-generiert")} · {erstelltText}
              </span>
            )}
            {!hatAnalyse && (
              <button type="button" onClick={onStarten} style={analyseKnopf}>
                <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
                {L(t, "brfStartKnopf", "Investment-Briefing erstellen")}
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}

const neuBerechnenKnopf = {
  width: 36,
  height: 36,
  border: "none",
  background: "transparent",
  color: "var(--ca)",
  fontSize: 16,
  cursor: "pointer",
  borderRadius: 8,
};

// ── Schritt 5: Deine nächsten Schritte (Spec §4.8) ──────────────────────────
export function LageMiniKarte({ children }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--ci)", border: "1px solid var(--cb)" }}>
      <div
        aria-hidden="true"
        style={{
          height: 64,
          backgroundColor: "var(--cro)",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 23px, var(--cb) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, var(--cb) 23px 24px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 22 }}>📍</span>
      </div>
      <div style={{ padding: 4 }}>{children}</div>
    </div>
  );
}

export function WeiterKachel({ titel, beschreibung, aktion, primaer }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: primaer ? "var(--ca-bg)" : "var(--ci)",
        border: `1px solid ${primaer ? "var(--ca-bd)" : "var(--cb)"}`,
      }}
    >
      <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ct)" }}>{titel}</span>
      {beschreibung && <span style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.45, flexGrow: 1 }}>{beschreibung}</span>}
      {aktion}
    </div>
  );
}

export function primaerKnopfStyle(breit = true) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: breit ? "100%" : "auto",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 10,
    border: "none",
    background: "var(--ca)",
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export function sekundaerKnopfStyle(breit = true) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: breit ? "100%" : "auto",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 10,
    border: "1.5px solid var(--cb)",
    background: "var(--cc)",
    color: "var(--ct)",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ── Baustein: Lage (KI-Einschaetzung, ohne Websuche) - bleibt weitgehend wie
// bisher, nur ohne eigene Kartentitel-Zeile (die traegt jetzt die kompakte
// Schritt-5-Kachel darum herum). ───────────────────────────────────────────
export function LageInhalt({ ergebnis, laufend, fehler, consent, onStarten, onConsentJa, onConsentAbbrechen, t }) {
  if (ergebnis) {
    return (
      <>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ct)", whiteSpace: "pre-line" }}>{ergebnis.text}</div>
        <div style={lageDisclaimer}>
          <span aria-hidden="true" style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
          <span>
            {L(
              t,
              "brfLageDisclaimer",
              "KI-generiert aus Trainingswissen, ohne Websuche und ohne Gewähr — Angaben können veraltet oder falsch sein. Prüfe wichtige Fakten selbst nach.",
            )}
          </span>
        </div>
      </>
    );
  }
  if (consent) {
    return (
      <div style={lageConsentBand}>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
          {L(
            t,
            "brfLageConsentText",
            "Für die Auswertung werden Ort, PLZ-Gebiet und Bundesland dieses Objekts an unseren KI-Dienstleister übertragen — ohne Adresse und ohne Namen. Einverstanden?",
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onConsentJa} style={{ ...consentJa, minHeight: 40 }}>
            {L(t, "brfConsentJa", "Einverstanden, starten")}
          </button>
          <button type="button" onClick={onConsentAbbrechen} style={{ ...consentNein, minHeight: 40 }}>
            {L(t, "brfConsentNein", "Abbrechen")}
          </button>
        </div>
      </div>
    );
  }
  if (laufend) {
    return (
      <div aria-busy="true" style={{ fontSize: 12.5, color: "var(--cl)" }}>
        {L(t, "brfLaeuft", "Wird berechnet …")}
      </div>
    );
  }
  if (fehler) {
    return (
      <>
        <div style={lageFehlerBand}>{fehler}</div>
        <button type="button" onClick={onStarten} style={sekundaerKnopfStyle(true)}>
          {L(t, "brfLageWiederholen", "Erneut versuchen")}
        </button>
      </>
    );
  }
  return (
    <>
      <span style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.45 }}>
        {L(t, "cockLageKurz", "Großprojekte, Wirtschaftsstruktur der Region")}
      </span>
      <button type="button" onClick={onStarten} style={sekundaerKnopfStyle(true)}>
        <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
        {L(t, "brfLageStarten", "Lage-Analyse erstellen")}
      </button>
    </>
  );
}

const lageConsentBand = { background: "var(--ci)", border: "1px solid var(--cb)", borderRadius: 10, padding: "10px 12px" };
const lageFehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12.5,
  lineHeight: 1.45,
};
const lageDisclaimer = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--warn-bg)",
  border: "1px solid var(--warn-bd)",
  color: "var(--warn-tx)",
  fontSize: 11,
  lineHeight: 1.4,
};

const textLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
  textAlign: "left",
  marginTop: 12,
};

const analyseKnopf = {
  display: "inline-flex",
  alignItems: "center",
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const consentBand = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
  marginTop: 12,
};

const consentJa = {
  display: "inline-flex",
  alignItems: "center",
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const consentNein = {
  ...consentJa,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
};

const fehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginTop: 12,
};

// ScoreKopf (Baustein 1) und EmpfehlungsKopf (Baustein 7) waren bereits vor
// diesem Redesign entfernt (Nutzer-Entscheidungen 2026-09-23) und blieben es -
// der Score kommt mit diesem Redesign nur in die Kennzahlen-Leiste zurueck
// (KennzahlenLeiste oben), nicht als eigener Urteils-Kopf.
//
// MarktVergleich/Balken/MarktKarte/FaktorKachel, Kernkennzahlen/KernKachel,
// BenchmarkKarte (Alternativanlagen), SpannenKarte/SpannenZeile und
// AnalyseKarte/ModernisierungsbedarfKarte als eigene Karten sind mit diesem
// Redesign (docs/technical_specs/objekt-detailseite-redesign.md) entfallen -
// ihre Daten leben unveraendert in briefing.js/investmentScore.js weiter,
// nur die Darstellung ist durch die Schritte 1-5 oben ersetzt. Alternativ-
// anlagen-Vergleich ist in der neuen Spec an keiner Stelle mehr vorgesehen.
