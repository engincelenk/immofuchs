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
import { ObjektLage } from "./ObjektUnterlagen.jsx";
import {
  cockpitAntwortsatz,
  cockpitCashflowJahr,
  cockpitDiff,
  cockpitMarktSatz,
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

// Breakpoint 768px - so wie in der Vorlage (Variante E, @media max-width:767
// bzw. min-width:768), nicht die sonst im Projekt fuer den Objektbereich
// uebliche 1280px-Grenze (App.jsx) - Nutzer-Vorgabe 2026-09-24: "genau so
// wie in der HTML, nicht anders".
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
.cockpit-stepnav{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:10px 2px;margin:0 -2px;position:sticky;top:0;z-index:5;background:var(--bg)}
.cockpit-stepnav::-webkit-scrollbar{display:none}
.cockpit-schritte{display:flex;flex-direction:column;gap:14px}
.cockpit-stellschrauben-desktop{display:none}
.cockpit-stellschrauben-mobile{display:block}
.cockpit-cmp{grid-template-columns:minmax(0,1fr)!important}
.cockpit-cmp-icon{display:none}
.cockpit-cmp-note{padding-left:0!important}
.cockpit-next{display:flex;flex-direction:column;gap:14px}
.cockpit-next-besichtigung{order:-1}
.cockpit-mobile-bar{position:fixed;left:0;right:0;bottom:62px;padding:10px 16px;background:var(--cc);border-top:1px solid var(--cb);z-index:30}
.cockpit-s5{padding-bottom:76px}
@media(min-width:768px){
  .cockpit-kennzahlen{grid-template-columns:repeat(4,minmax(0,1fr))}
  .cockpit-nur-desktop{display:block}
  .cockpit-stepnav{position:static;overflow:visible;padding:14px 0;margin:0}
  .cockpit-schritte{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
  .cockpit-s2{grid-column:span 2}
  .cockpit-s3{grid-column:span 2}
  .cockpit-s5{grid-column:1 / -1}
  .cockpit-stellschrauben-desktop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .cockpit-stellschrauben-mobile{display:none}
  .cockpit-cmp{grid-template-columns:32px minmax(0,1fr)!important}
  .cockpit-cmp-icon{display:flex}
  .cockpit-cmp-note{padding-left:60px!important}
  .cockpit-next{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:20px;align-items:start}
  .cockpit-next-besichtigung{order:0}
  .cockpit-mobile-bar{display:none}
  .cockpit-s5{padding-bottom:0}
}
`;

export function CockpitStyle() {
  return <style>{COCKPIT_CSS}</style>;
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 16,
  padding: "22px 24px",
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
        <div className="cockpit-nur-desktop" style={{ height: 5, borderRadius: 3, background: "var(--cro)", marginTop: 6 }}>
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
          className="cockpit-nur-desktop"
          style={{
            fontSize: 10.5,
            marginTop: 3,
            whiteSpace: "nowrap",
            color: negativ || k.ueberMarkt ? "var(--bad-tx)" : "var(--ch)",
          }}
        >
          {zusatz}
        </div>
      )}
    </div>
  );
}

// ── Schritt-Navigation ───────────────────────────────────────────────────
// IDs als volle Wörter (schritt-kosten … schritt-weiter) statt s1…s5 - so
// wie in der Vorlage (Variante E). Aktiver Schritt ist reiner Klick-Zustand
// (kein Scroll-Spy, bewusst - siehe redesign-Spec §4.9), Default Schritt 1.
export const SCHRITTE = [
  { id: "schritt-kosten", nr: 1, kurz: "Kosten" },
  { id: "schritt-markt", nr: 2, kurz: "Markt" },
  { id: "schritt-stellschrauben", nr: 3, kurz: "Stellschrauben" },
  { id: "schritt-risiken", nr: 4, kurz: "Risiken" },
  { id: "schritt-weiter", nr: 5, kurz: "Weiter" },
];

export function SchrittNav({ t }) {
  const [aktiv, setAktiv] = useState(SCHRITTE[0].id);

  function springen(e, id) {
    e.preventDefault();
    setAktiv(id);
    const el = document.getElementById(id);
    if (!el) return;
    const reduziert = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "start" });
  }
  return (
    <nav aria-label={L(t, "cockSchritteLabel", "Schritte")} className="cockpit-stepnav">
      {SCHRITTE.map((s) => {
        const istAktiv = s.id === aktiv;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={istAktiv ? "true" : undefined}
            onClick={(e) => springen(e, s.id)}
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 40,
              padding: "0 14px 0 6px",
              borderRadius: 999,
              border: `1px solid ${istAktiv ? "var(--ct)" : "var(--cb)"}`,
              background: istAktiv ? "var(--ct)" : "var(--cc)",
              color: istAktiv ? "var(--bg)" : "var(--ch)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                border: `2px solid ${istAktiv ? "var(--bg)" : "var(--ca)"}`,
                color: istAktiv ? "var(--bg)" : "var(--ca)",
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
        );
      })}
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
    <section id="schritt-kosten" className="bv bv-auf cockpit-s1" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
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

// ── Schritt 2: Wie es zum Markt passt ───────────────────────────────────────
// Icon-Kreis (SVG) + Fliesssatz + Chip, darunter zwei beschriftete Balken-
// zeilen ("Du"/"Markt", Laenge ∝ Wert) - Nutzer-Vorgabe 2026-09-24
// (Vorlage-HTML "Variante E", genau nachgebaut statt frei interpretiert).
function MarktIcon({ status }) {
  if (status === "orange") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    );
  }
  if (status === "rot") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v5M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MarktZeile({ art, v, formatWert, einheitLabel, extra, letzte, t }) {
  if (!v || v.abw == null || !isFinite(v.abw)) return null;
  const f = STATUS_FARBEN[v.status] || STATUS_FARBEN.neutral;
  const satz = cockpitMarktSatz(v, art);
  const chipText = `${prozent(v.abw, 0)}${v.status === "orange" ? ` ${L(t, "cockPotenzial", "Potenzial")}` : ""}`;
  // "Dein Wert"-Balken in der Statusfarbe, im neutralen Fall in der
  // normalen Textfarbe (kein eigener Warn-/Erfolgs-Ton fuer "im Rahmen").
  const balkenFarbe = v.status === "neutral" ? "var(--ct)" : f.tx;
  const skala = Math.max(v.eigen, v.markt, 0.0001) * 1.08;
  const breiteEigen = Math.max(4, (v.eigen / skala) * 100);
  const breiteMarkt = Math.max(4, (v.markt / skala) * 100);

  return (
    <div
      className="cockpit-cmp"
      style={{
        display: "grid",
        gridTemplateColumns: "32px minmax(0,1fr)",
        gap: 14,
        padding: letzte ? "16px 0 4px" : "16px 0",
        borderBottom: letzte ? "none" : "1px solid var(--cb)",
      }}
    >
      <span
        aria-hidden="true"
        className="cockpit-cmp-icon"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: f.bg,
          color: f.tx,
        }}
      >
        <MarktIcon status={v.status} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
          <span>{satz}</span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: f.tx,
              background: f.bg,
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {chipText}
          </span>
        </div>
        <BalkenZeile
          label={L(t, "cockDu", "Du")}
          wert={`${formatWert(v.eigen)}${einheitLabel ? ` ${einheitLabel}` : ""}`}
          breite={breiteEigen}
          farbe={balkenFarbe}
          betont
        />
        <BalkenZeile
          label={L(t, "brfMarkt", "Markt")}
          wert={`${formatWert(v.markt)}${einheitLabel ? ` ${einheitLabel}` : ""}`}
          breite={breiteMarkt}
          farbe="var(--ch)"
        />
        {extra}
      </div>
    </div>
  );
}

function BalkenZeile({ label, wert, breite, farbe, betont }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 48, flexShrink: 0, fontSize: 12, color: "var(--ch)", fontWeight: 600 }}>{label}</span>
      <div style={{ flexGrow: 1, height: 12, borderRadius: 6, background: "var(--cro)" }}>
        <div
          className="bv-wachsen"
          style={{ width: `${breite}%`, height: 12, borderRadius: 6, background: farbe, transformOrigin: "left center" }}
        />
      </div>
      <span
        className="num"
        style={{
          width: 96,
          flexShrink: 0,
          textAlign: "right",
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          fontWeight: betont ? 700 : 400,
          color: betont ? "var(--ct)" : "var(--ch)",
        }}
      >
        {wert}
      </span>
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
      <div className="cockpit-cmp-note" style={{ ...klein, paddingLeft: 60 }}>
        {L(t, "brfErreichbar", "In 3 Jahren erreichbar")}:{" "}
        <strong style={{ color: "var(--ct)" }}>{fmtQm(v2.erreichbarQm)} €/m²</strong>
        {v2.kappungsgrenzeProzent != null &&
          ` (${L(t, "brfKappung", "Kappungsgrenze")} ${fmt(v2.kappungsgrenzeProzent, 0)} %)`}
      </div>
    ) : null;

  return (
    <section id="schritt-markt" className="bv bv-auf cockpit-s2" style={{ ...karte, marginTop: 0, padding: "22px 24px 12px", scrollMarginTop: 78 }}>
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
      <div style={{ marginTop: 4 }}>
        {v1 && (
          <MarktZeile art="kaufpreis" v={v1} formatWert={fmtQm} einheitLabel="€/m²" letzte={!v2 && !fb} t={t} />
        )}
        {v2 && (
          <MarktZeile art="miete" v={v2} formatWert={fmtQm} einheitLabel="€/m²" extra={mieteExtra} letzte={!fb} t={t} />
        )}
        {fb && <MarktZeile art="faktor" v={fb} formatWert={fmtFaktor} einheitLabel="" letzte t={t} />}
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
    <section id="schritt-stellschrauben" className="bv bv-auf cockpit-s3" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
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
    <section id="schritt-risiken" className="bv bv-auf cockpit-s4" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
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

      {/* Flache Liste "Titel. Text" - dieselbe Reihenfolge wie die Chips oben
          (Risiken, Stärken), ohne Gruppen-Zwischenueberschriften (Vorlage
          "Variante E" zeigt hier keine STÄRKEN/RISIKEN-Blocktitel mehr). */}
      {aufgeklappt && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...risiken, ...staerken, ...hebel].map((e) => (
            <p key={e.title} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ch)" }}>
              <strong style={{ color: "var(--ct)" }}>
                {e.title}
                {e.value && <span style={{ color: "var(--ca)" }}> · {e.value}</span>}.
              </strong>{" "}
              {e.text}
            </p>
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

// ── Schritt 5: Deine nächsten Schritte ──────────────────────────────────────
// Zwei Karten (Lage, Besichtigung) statt vier Kacheln - Vorlage "Variante E".
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

// ── Lage-Kombikarte: Kartenflaeche+Adresse oben, Lage-Analyse-KI unten ─────
// Ersetzt LageMiniKarte + die vormalige separate "Lage prüfen"-Kachel - in
// der Vorlage (Variante E) ist das EINE Karte, keine zwei nebeneinander.
const LAGE_KURZTEXT_SCHWELLE = 260;

export function LageKombiKarte({ data, titel, ergebnis, laufend, fehler, consent, onStarten, onConsentJa, onConsentAbbrechen, t }) {
  const [ausgeklappt, setAusgeklappt] = useState(false);
  const laenglich = (ergebnis?.text?.length || 0) > LAGE_KURZTEXT_SCHWELLE;

  return (
    <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: "1px solid var(--cb)" }}>
        <div
          aria-hidden="true"
          style={{
            width: 110,
            flexShrink: 0,
            minHeight: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--cro)",
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 23px, var(--cb) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, var(--cb) 23px 24px)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 22 }}>📍</span>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <ObjektLage data={data} titel={titel} eingebettet />
        </div>
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 15, color: "var(--ct)" }}>{L(t, "brfLageTitel2", "Lage-Analyse")}</strong>
          {ergebnis && (
            <button type="button" onClick={onStarten} aria-label="Lage-Analyse neu erstellen" style={neuIconLinkKnopf}>
              ↻ {L(t, "cockNeu", "Neu")}
            </button>
          )}
        </div>

        {ergebnis ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--ch)",
                whiteSpace: "pre-line",
                ...(laenglich && !ausgeklappt
                  ? {
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }
                  : {}),
              }}
            >
              {ergebnis.text}
            </p>
            {laenglich && (
              <button
                type="button"
                onClick={() => setAusgeklappt((o) => !o)}
                aria-expanded={ausgeklappt}
                style={{ ...textLink, marginTop: 0, alignSelf: "flex-start" }}
              >
                {ausgeklappt ? L(t, "cockWenigerAnzeigen", "Weniger anzeigen") : L(t, "cockWeiterlesen", "Weiterlesen")}
              </button>
            )}
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
        ) : consent ? (
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
        ) : laufend ? (
          <div aria-busy="true" style={{ fontSize: 12.5, color: "var(--cl)" }}>
            {L(t, "brfLaeuft", "Wird berechnet …")}
          </div>
        ) : fehler ? (
          <>
            <div style={lageFehlerBand}>{fehler}</div>
            <button type="button" onClick={onStarten} style={sekundaerKnopfStyle(true)}>
              {L(t, "brfLageWiederholen", "Erneut versuchen")}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.45 }}>
              {L(t, "cockLageKurz", "Großprojekte, Wirtschaftsstruktur der Region")}
            </span>
            <button type="button" onClick={onStarten} style={sekundaerKnopfStyle(true)}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
              {L(t, "brfLageStarten", "Lage-Analyse erstellen")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const neuIconLinkKnopf = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 36,
};

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
