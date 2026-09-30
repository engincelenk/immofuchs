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
import { useEffect, useRef, useState } from "react";
import { fmt, fmtE } from "../../utils/helpers.js";
import { berechneVollstaendigkeit } from "../../utils/objektKennzahlen.js";
import { hebelTexteVon, risikenVon, staerkenVon } from "../../utils/aiEngine.js";
import { ObjektLage } from "./ObjektUnterlagen.jsx";
import { KiLadeeffekt } from "./AiEngine.jsx";
import {
  cockpitCashflowJahr,
  cockpitDiff,
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
const prozent = (n, d = 0) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), d)}\u00A0%`;

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
.bv-wachsen{animation:bv-wachsen .9s cubic-bezier(0.25,0.8,0.25,1) both;animation-delay:var(--bv-d,0ms)}
.bv-punkt{animation:bv-punkt .3s var(--bv-ease) both;animation-delay:var(--bv-d,500ms)}
@media (prefers-reduced-motion: reduce){
  .bv-auf,.bv-wachsen,.bv-punkt{animation:bv-fade .2s ease both}
  @keyframes bv-fade{from{opacity:0}to{opacity:1}}
}
.cockpit-kennzahlen{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cockpit-nur-desktop{display:none}
.cockpit-stepnav{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:10px 2px;margin:0 -2px;position:sticky;top:0;z-index:5;background:var(--bg)}
.cockpit-stepnav::-webkit-scrollbar{display:none}
.cockpit-schritte{display:flex;flex-direction:column;gap:14px;align-items:stretch}
.cockpit-spalte{display:flex;flex-direction:column;gap:14px;min-width:0}
.cockpit-schritte button:focus-visible,.cockpit-schritte a:focus-visible{outline:2px solid var(--ca);outline-offset:2px;border-radius:6px}
.cockpit-schritte button{touch-action:manipulation}
.cockpit-markt-liste{display:block}
.cockpit-stellschrauben-desktop{display:none}
.cockpit-stellschrauben-mobile{display:block}
.cockpit-cmp{grid-template-columns:minmax(0,1fr)!important}
.cockpit-next{display:flex;flex-direction:column;gap:14px}
.cockpit-next-besichtigung{order:-1}
.cockpit-mobile-bar{position:fixed;left:0;right:0;bottom:calc(62px + env(safe-area-inset-bottom));padding:10px 16px;background:var(--cc);border-top:1px solid var(--cb);z-index:30}
.cockpit-s5{padding-bottom:76px}
@media(min-width:768px){
  .cockpit-kennzahlen{grid-template-columns:repeat(4,minmax(0,1fr))}
  .cockpit-nur-desktop{display:block}
  .cockpit-stepnav{position:static;overflow:visible;padding:14px 0;margin:0}
  .cockpit-s5{grid-column:1 / -1}
  .cockpit-stellschrauben-desktop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .cockpit-stellschrauben-mobile{display:none}
  .cockpit-cmp{grid-template-columns:120px minmax(0,1fr)!important}
  .cockpit-next{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:20px;align-items:start}
  .cockpit-next-besichtigung{order:0}
  .cockpit-mobile-bar{display:none}
  .cockpit-s5{padding-bottom:0}
}
@media(min-width:1024px){
  .cockpit-schritte{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:16px;align-items:start}
  .cockpit-markt-liste{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));column-gap:32px}
  .cockpit-markt-liste>div>:last-child{border-bottom:none!important}
  .cockpit-risiken-liste{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 28px!important}
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
  if (einheit === "prozent") return `${fmt(wert, 1)}\u00A0%`;
  return fmtE(Math.round(wert)).replace(/ /g, "\u00A0");
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
// Zahlen im Satz einfaerben (Betrag: ok/Warnung, Prozent: schlecht), der Rest
// bleibt Fliesstext - so bleibt der Satz komplett uebersetzbar.
function faerbeSatz(einschaetzung) {
  const { satz, negativ, teuer } = einschaetzung;
  const betragFarbe = !negativ ? "var(--ok-tx)" : teuer ? "var(--bad-tx)" : "var(--warn-tx)";
  return satz.split(/(\d[\d.,]*[\s\u00A0]?(?:€|%)|%\d[\d.,]*)/).map((teil, i) => {
    if (i % 2 === 0) return teil;
    const farbe = teil.includes("%") ? "var(--bad-tx)" : betragFarbe;
    return (
      <span key={i} style={{ color: farbe, fontVariantNumeric: "tabular-nums" }}>
        {teil}
      </span>
    );
  });
}

export function AntwortsatzKopf({ einschaetzung, t }) {
  if (!einschaetzung) return null;
  return (
    <div className="bv bv-auf">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ca)" }}>
        {L(t, "cockAntwortEyebrow", "Was die Zahlen sagen")}
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
        {faerbeSatz(einschaetzung)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {einschaetzung.chips.map((c) => {
          const f = STATUS_FARBEN[c.stufe] || STATUS_FARBEN.neutral;
          return (
            <span
              key={c.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
                fontWeight: 700,
                color: f.tx,
                background: f.bg,
                borderRadius: 999,
                padding: "3px 10px",
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: f.tx }} />
              {c.text}
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 8, lineHeight: 1.4 }}>{einschaetzung.hinweis}</div>
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

// Zahl beim ersten Erscheinen von 0 auf den Zielwert hochzaehlen. Dauer/Verzoegerung
// (1,2 s / 250 ms) und die weiche Kurve passen zum Balken (bv-wachsen, .9 s).
// Vorher 0,6 s mit steiler Kurve: auf dem Handy kaum wahrnehmbar (Nutzer 2026-09-30).
const VERZOEGERUNG_SCORE = 250;
// Bei "Bewegung reduzieren" und ohne Browser (SSR/Tests) steht der Wert sofort da.
// Aendert sich der Zielwert spaeter, zaehlt die Zahl vom aktuellen Stand weiter.
function bewegungReduziert() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Animationen laufen erst, wenn das Element zum ersten Mal im Bild ist. Vorher
// starteten sie beim Aufbau der Seite: auf dem Handy liegt der Markt-Block weit
// unter dem Kostenkasten, und die Objektseite konnte mitten auf der Seite
// aufgehen - die Animation war vorbei, bevor man das Element sah (Nutzer-
// Rueckmeldung 2026-09-30). Ohne IntersectionObserver oder bei "Bewegung
// reduzieren" gilt das Element sofort als gesehen.
function useErstSichtbar() {
  const ref = useRef(null);
  const sofort = typeof IntersectionObserver === "undefined" || bewegungReduziert();
  const [gesehen, setGesehen] = useState(sofort);
  useEffect(() => {
    if (gesehen) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGesehen(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [gesehen]);
  return [ref, gesehen];
}

function useHochzaehlen(ziel, dauer = 1200, aktiv = true) {
  const sofort = typeof window === "undefined" || bewegungReduziert();
  const [wert, setWert] = useState(sofort ? ziel : 0);
  const aktuell = useRef(sofort ? ziel : 0);
  useEffect(() => {
    if (bewegungReduziert()) {
      aktuell.current = ziel;
      setWert(ziel);
      return undefined;
    }
    if (!aktiv) return undefined;
    const start = aktuell.current;
    const t0 = performance.now() + VERZOEGERUNG_SCORE;
    let raf;
    const schritt = (jetzt) => {
      const f = Math.max(0, Math.min(1, (jetzt - t0) / dauer));
      const eased = 1 - Math.pow(1 - f, 2);
      aktuell.current = start + (ziel - start) * eased;
      setWert(aktuell.current);
      if (f < 1) raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(raf);
  }, [ziel, dauer, aktiv]);
  return wert;
}

function KennzahlKachel({ k, t }) {
  const negativ = k.key === "cashflow" && k.wert < 0;
  const istScore = k.key === "score";
  const [scoreRef, scoreGesehen] = useErstSichtbar();
  const scoreAnzeige = useHochzaehlen(istScore ? k.wert : 0, 1200, scoreGesehen);
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
            {Math.round(scoreAnzeige)}
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ch)" }}> / 100</span>
          </>
        ) : (
          wertText(k.wert, k.einheit)
        )}
      </div>
      {istScore && (
        <div ref={scoreRef} style={{ height: 5, borderRadius: 3, background: "var(--cro)", marginTop: 6 }}>
          <div
            className={scoreGesehen ? "bv-wachsen" : undefined}
            style={{
              width: `${Math.max(0, Math.min(100, k.wert))}%`,
              height: 5,
              borderRadius: 3,
              background: "var(--ca)",
              transformOrigin: "left center",
              transform: scoreGesehen ? undefined : "scaleX(0)",
              "--bv-d": `${VERZOEGERUNG_SCORE}ms`,
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

export function SchrittKopf({ nr, titel, aktion, id }) {
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
            background: "transparent",
            color: "var(--ca)",
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
        <h2 id={id} style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ct)" }}>
          {titel}
        </h2>
      </div>
      {aktion}
    </div>
  );
}

// ── Schritt 1: Was dich das Objekt kostet ───────────────────────────────────
// Drei klar getrennte Bloecke (Nutzer-Vorgabe 2026-09-30): 1. einmalig (was
// muss ich auf den Tisch legen), 2. laufend (was kostet es pro Monat, als
// Rechnung von der Miete bis zum Cashflow), 3. was am Ende wirklich bleibt.
// Hauptzahl im laufenden Block ist der Cashflow VOR Steuer - die Steuerwirkung
// ist geschaetzt und steht deshalb als eigene, benannte Zeile darunter.
// Nur Anordnung: alle Werte stammen aus computeRendite() (briefing.R) bzw. dem
// Formular-State (data). Die Nettomietrendite steht in der Kennzahlenleiste.
const finanzZeile = { fontSize: 13, color: "var(--ch)" };
const finanzWert = { fontWeight: 700, color: "var(--ct)", fontVariantNumeric: "tabular-nums" };
const zeileZeile = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 };
const einzug = { paddingLeft: 14, fontSize: 12.5 };
// Punktlinie zwischen Label und Wert: bei breiten Zeilen fuehrt sie das Auge.
const fuehrung = { flex: 1, minWidth: 12, borderBottom: "1px dotted var(--cb)", transform: "translateY(-3px)" };

const vz = (n) => `${n < 0 ? "−" : "+"} ${fmtE(Math.round(Math.abs(n))).replace(/ /g, " ")}`;

function BlockKopf({ nr, titel }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        background: "var(--cro)",
        borderLeft: "3px solid var(--ca)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: "var(--ca)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12.5,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {nr}
      </span>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ct)", letterSpacing: "0.01em" }}>{titel}</h3>
    </div>
  );
}

function Zeile({ label, wert, style, linie, fett }) {
  return (
    <div
      style={{
        ...zeileZeile,
        ...finanzZeile,
        ...(style || {}),
        ...(linie ? { borderTop: "1px solid var(--cb)", paddingTop: 6 } : null),
      }}
    >
      <span style={fett ? { fontWeight: 700, color: "var(--ct)", minWidth: 0 } : { minWidth: 0 }}>{label}</span>
      <span aria-hidden="true" style={fuehrung} />
      <span style={{ ...finanzWert, whiteSpace: "nowrap" }}>{wert}</span>
    </div>
  );
}

export function SchrittKosten({ briefing, data, cashflowVorSteuer, onEintragen, t }) {
  const kennzahlen = briefing?.kernkennzahlen;
  const cash = kennzahlen?.find((k) => k.key === "cashflow");
  const R = briefing?.R;
  if (!cash || !R) return null;

  // ── Block 1: einmalig ──
  const kaufpreis = R.gKP > 0 ? R.gKP : null;
  const nebenkosten = R.nbk > 0 ? R.nbk : null;
  const renovierung = R.ren > 0 ? R.ren : 0;
  const sonderumlage = +data?.sonder > 0 ? +data.sonder : 0;
  const gesamtinvestition = kaufpreis != null ? kaufpreis + (nebenkosten || 0) + renovierung + sonderumlage : null;
  const zinssatz = +data?.zinssatz || 0;
  const tilgungssatz = +data?.tilgung || 0;
  const bankDarlehen = R.bankDa > 0 ? R.bankDa : null;
  const kfwDarlehen = R.kfwDa > 0 ? R.kfwDa : null;
  const eigenkapital = +data?.eigenkapital || 0;
  const rate = R.rateJ1 > 0 ? R.rateJ1 : null;
  const zeigtBlock1 = kaufpreis != null || bankDarlehen != null || eigenkapital > 0 || !!onEintragen;

  // ── Block 2: laufend ──
  const cfVor = cashflowVorSteuer ?? R.cf2OhneSt;
  const negativ = cfVor < 0;
  const farbe = negativ ? "var(--bad-tx)" : "var(--ok-tx)";
  const jahr = cockpitCashflowJahr(cfVor);
  const kaltmiete = +data?.kaltmiete || 0;
  const leerstand = kaltmiete > 0 && R.mieteEffMon != null ? kaltmiete - R.mieteEffMon : 0;
  const nichtUmlagbar = R.nuJ > 0 ? R.nuJ / 12 : 0;
  const steuerMon = (R.yearRows?.[0]?.steuer || 0) / 12;
  const zeigtSteuer = Math.abs(steuerMon) >= 1;

  // ── Block 3: was bleibt ──
  const tilgung = rate != null && R.t1 > 0 ? R.t1 : 0;
  const echterCf = cfVor + tilgung;
  const echtNegativ = echterCf < 0;
  const ekRendite = eigenkapital > 0 ? ((cfVor * 12) / eigenkapital) * 100 : null;
  const zeigtBlock3 = tilgung > 0 || ekRendite != null;

  const trenner = { marginTop: 18 };
  const zeilen = { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 };

  return (
    <section id="schritt-kosten" aria-labelledby="schritt-kosten-titel" className="bv bv-auf cockpit-s1" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf id="schritt-kosten-titel" nr={1} titel={L(t, "cockS1Titel", "Was dich das Objekt kostet")} />

      {zeigtBlock1 && (
        <div style={{ marginTop: 16 }}>
          <BlockKopf nr={1} titel={L(t, "cockBlock1", "Einmalig: Was du zahlst")} />
          {gesamtinvestition != null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ct)", fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
                {wertText(gesamtinvestition, "eurMonat")}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 2, color: "var(--ch)" }}>
                {L(t, "cockGesamtinvestition", "Gesamtinvestition")}
              </div>
            </div>
          )}
          <div style={zeilen}>
            {kaufpreis != null && <Zeile label={L(t, "cockKaufpreis", "Kaufpreis")} wert={wertText(kaufpreis, "eurMonat")} />}
            {nebenkosten != null && (
              <>
                <Zeile label={L(t, "cockNebenkosten", "Kaufnebenkosten")} wert={wertText(nebenkosten, "eurMonat")} />
                {[
                  ["cockNkGrest", "Grunderwerbsteuer", R.nbkGrest],
                  ["cockNkNotar", "Notar & Grundbuch", R.nbkNotar],
                  ["cockNkMakler", "Makler", R.nbkMakler],
                ]
                  .filter(([, , w]) => w > 0)
                  .map(([k, fb, w]) => (
                    <Zeile key={k} label={L(t, k, fb)} wert={wertText(w, "eurMonat")} style={einzug} />
                  ))}
              </>
            )}
            {renovierung > 0 && <Zeile label={L(t, "cockRenovierung", "Renovierung")} wert={wertText(renovierung, "eurMonat")} />}
            {sonderumlage > 0 && <Zeile label={L(t, "cockSonderumlage", "Sonderumlage")} wert={wertText(sonderumlage, "eurMonat")} />}
          </div>

          <div style={{ ...trenner, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--ch)" }}>
              {L(t, "cockFinanziertDurch", "Finanziert durch")}
            </div>
            <div style={zeilen}>
              {bankDarlehen != null && (
                <>
                  <Zeile label={L(t, "cockDarlehen", "Darlehen")} wert={wertText(bankDarlehen, "eurMonat")} />
                  {(zinssatz > 0 || tilgungssatz > 0) && (
                    <Zeile
                      label={L(t, "cockZinsTilgungssatz", "Zinssatz / Tilgung")}
                      wert={`${fmt(zinssatz, 2)} % / ${fmt(tilgungssatz, 2)} %`}
                      style={einzug}
                    />
                  )}
                </>
              )}
              {kfwDarlehen != null && <Zeile label={L(t, "cockDarlehenKfw", "davon KfW-Darlehen")} wert={wertText(kfwDarlehen, "eurMonat")} />}
              <div style={{ ...zeileZeile, ...finanzZeile }}>
                <span>{L(t, "cockEigenkapital", "Eigenkapital")}</span>
                {eigenkapital > 0 ? (
                  <span style={finanzWert}>{wertText(eigenkapital, "eurMonat")}</span>
                ) : onEintragen ? (
                  <button type="button" onClick={onEintragen} style={eintragenLink}>
                    {L(t, "cockEintragen", "Eintragen →")}
                  </button>
                ) : (
                  <span style={{ color: "var(--ch)" }}>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={trenner}>
        <BlockKopf nr={2} titel={L(t, "cockBlock2", "Laufend: Was es pro Monat kostet")} />
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12, background: negativ ? "var(--bad-bg)" : "var(--ok-bg)" }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", color: farbe, fontVariantNumeric: "tabular-nums" }}>
            {wertText(cfVor, "eurMonat")} <span style={{ fontSize: 13, fontWeight: 600 }}>{L(t, "cockProMonat", "/ Monat")}</span>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 2, color: farbe }}>
            {L(t, "cockCfVorSteuer", "Cashflow vor Steuer")}
            {jahr != null && (
              <>
                {" · = "}
                {wertText(jahr, "eurMonat")}{" "}
                {negativ ? L(t, "cockProJahrZuzahlung", "pro Jahr aus eigener Tasche") : L(t, "cockProJahrUeberschuss", "Überschuss pro Jahr")}
              </>
            )}
          </div>
        </div>
        <div style={zeilen}>
          {kaltmiete > 0 && <Zeile label={L(t, "cockKaltmiete", "Kaltmiete")} wert={wertText(kaltmiete, "eurMonat")} />}
          {leerstand >= 1 && <Zeile label={L(t, "cockLeerstand", "Leerstand")} wert={vz(-leerstand)} />}
          {nichtUmlagbar >= 1 && <Zeile label={L(t, "cockNichtUml", "Nicht umlagefähige Kosten")} wert={vz(-nichtUmlagbar)} />}
          {rate != null && (
            <>
              <Zeile label={L(t, "cockKreditrate", "Kreditrate")} wert={vz(-rate)} />
              {R.z1 != null && R.t1 != null && (
                <Zeile
                  label={L(t, "cockZinsTilgungAnteil", "davon Zins / Tilgung")}
                  wert={`${wertText(R.z1, "eurMonat")} / ${wertText(R.t1, "eurMonat")}`}
                  style={einzug}
                />
              )}
            </>
          )}
          <Zeile label={`= ${L(t, "cockCfVorSteuer", "Cashflow vor Steuer")}`} wert={wertText(cfVor, "eurMonat")} fett linie />
          {zeigtSteuer && (
            <>
              <Zeile label={L(t, "cockSteuerwirkung", "Steuerwirkung (geschätzt)")} wert={vz(steuerMon)} />
              <Zeile label={`= ${L(t, "cockCfNachSteuer", "Cashflow nach Steuer")}`} wert={wertText(R.cf2MitSt, "eurMonat")} fett linie />
            </>
          )}
        </div>
      </div>

      {zeigtBlock3 && (
        <div style={trenner}>
          <BlockKopf nr={3} titel={L(t, "cockBlock3", "Am Ende: Was wirklich bleibt")} />
          <div style={zeilen}>
            {tilgung > 0 && (
              <>
                <Zeile label={L(t, "cockTilgungVermoegen", "Tilgung – baut dein Vermögen auf")} wert={vz(tilgung)} />
                <Zeile
                  label={`= ${echtNegativ ? L(t, "cockEchtZuzahlung", "Wirkliche Zuzahlung vor Steuer") : L(t, "cockEchtUeberschuss", "Wirklicher Überschuss vor Steuer")}`}
                  wert={`${wertText(echterCf, "eurMonat")} ${L(t, "cockProMonat", "/ Monat")}`}
                  fett
                  linie
                />
              </>
            )}
            {ekRendite != null && (
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ch)", paddingTop: tilgung > 0 ? 6 : 0 }}>
                {L(t, "cockEkRendite", "Bezogen auf dein Eigenkapital: {p} % pro Jahr (vor Steuer)").replace("{p}", fmt(ekRendite, 1))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Schritt 2: Wie es zum Markt passt ───────────────────────────────────────
// Icon-Kreis (SVG) + Fliesssatz + Chip, darunter zwei beschriftete Balken-
// zeilen ("Du"/"Markt", Laenge ∝ Wert) - Nutzer-Vorgabe 2026-09-24
// (Vorlage-HTML "Variante E", genau nachgebaut statt frei interpretiert).
// Layout je Zeile (Nutzer-Vorgabe 2026-09-30): links die Abweichung als grosse
// Zahl, rechts Titel und zwei kurze Balken (max. 380 px, Wert direkt am
// Balkenende). Die Farbe kommt weiter aus v.status (vergleichStatus in
// briefing.js) - hier wird keine eigene Schwelle erfunden.
const MARKT_BALKEN_MIN = 8; // Prozent - sonst verschwindet der kleinere Balken bei sehr grossem Abstand
const MARKT_BALKEN_MAX_PX = 380;

function MarktZeile({ titel, v, formatWert, einheitLabel, extra, letzte, t }) {
  if (!v || v.abw == null || !isFinite(v.abw)) return null;
  const f = STATUS_FARBEN[v.status] || STATUS_FARBEN.neutral;
  // Im neutralen Fall normale Textfarbe (kein eigener Warn-/Erfolgs-Ton fuer
  // "im Rahmen").
  const farbe = v.status === "neutral" ? "var(--ct)" : f.tx;
  const skala = Math.max(v.eigen, v.markt, 0.0001);
  const breiteEigen = Math.max(MARKT_BALKEN_MIN, (v.eigen / skala) * 100);
  const breiteMarkt = Math.max(MARKT_BALKEN_MIN, (v.markt / skala) * 100);
  const richtung =
    v.status === "orange"
      ? L(t, "cockPotenzial", "Potenzial")
      : v.status === "neutral"
        ? L(t, "cockImRahmen", "im Rahmen")
        : v.abw > 0
          ? L(t, "cockUeberMarkt", "über Markt")
          : L(t, "cockUnterMarkt", "unter Markt");

  return (
    <div
      className="cockpit-cmp"
      style={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0,1fr)",
        gap: "6px 16px",
        alignItems: "center",
        padding: letzte ? "14px 0 4px" : "14px 0",
        borderBottom: letzte ? "none" : "1px solid var(--cb)",
      }}
    >
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: farbe, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {prozent(v.abw, 0)}
        </div>
        <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 2 }}>{richtung}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>{titel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: MARKT_BALKEN_MAX_PX }}>
          <BalkenZeile
            label={L(t, "cockDu", "Du")}
            wert={`${formatWert(v.eigen)}${einheitLabel ? `\u00A0${einheitLabel}` : ""}`}
            breite={breiteEigen}
            farbe={farbe}
            betont
            versatz={100}
          />
          <BalkenZeile
            label={L(t, "brfMarkt", "Markt")}
            wert={`${formatWert(v.markt)}${einheitLabel ? `\u00A0${einheitLabel}` : ""}`}
            breite={breiteMarkt}
            farbe="var(--ch)"
            versatz={350}
          />
        </div>
        {extra}
      </div>
    </div>
  );
}

function BalkenZeile({ label, wert, breite, farbe, betont, versatz = 0 }) {
  const [spurRef, gesehen] = useErstSichtbar();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 42, flexShrink: 0, fontSize: 12, color: "var(--ch)", fontWeight: 600 }}>{label}</span>
      <div ref={spurRef} style={{ flexGrow: 1, height: 8, borderRadius: 4, background: "var(--cro)" }}>
        <div
          className={gesehen ? "bv-wachsen" : undefined}
          style={{
            width: `${breite}%`,
            height: 8,
            borderRadius: 4,
            background: farbe,
            transformOrigin: "left center",
            transform: gesehen ? undefined : "scaleX(0)",
            "--bv-d": `${versatz}ms`,
          }}
        />
      </div>
      <span
        className="num"
        style={{
          minWidth: 92,
          flexShrink: 0,
          textAlign: "right",
          fontSize: 13,
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

// Reine Information (Kreis gegen Land, Preisentwicklung im Land): gleiche
// Zeilenform wie MarktZeile, aber ohne Balken und ohne Bewertungsfarbe - beide
// Werte sind Marktwerte, "dein" Wert kommt darin nicht vor.
function MarktInfoZeile({ gross, unter, titel, zeilen, letzte }) {
  return (
    <div
      className="cockpit-cmp"
      style={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0,1fr)",
        gap: "6px 16px",
        alignItems: "center",
        padding: letzte ? "14px 0 4px" : "14px 0",
        borderBottom: letzte ? "none" : "1px solid var(--cb)",
      }}
    >
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: "var(--ch)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {gross}
        </div>
        <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 2 }}>{unter}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>{titel}</div>
        {zeilen.map(([label, wert]) => (
          <div key={label} style={{ display: "flex", gap: 10, maxWidth: MARKT_BALKEN_MAX_PX, justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--ch)" }}>{label}</span>
            <span aria-hidden="true" style={fuehrung} />
            <span className="num" style={{ fontWeight: 700, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>{wert}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const fmtQm = (w) => fmt(w, w < 100 ? 2 : 0);
const fmtFaktor = (w) => `${fmt(w, 1)}×`;

export function SchrittMarkt({ briefing, t }) {
  const v1 = briefing?.vergleiche?.find((v) => v.id === "v1");
  const v2 = briefing?.vergleiche?.find((v) => v.id === "v2");
  const v5 = briefing?.vergleiche?.find((v) => v.id === "v5");
  const v6 = briefing?.vergleiche?.find((v) => v.id === "v6");
  const fb = briefing?.faktorBenchmark;
  if (!v1 && !v2 && !fb) return null;
  const marktName = (fb?.ebeneName || v1?.ebeneName || v2?.ebeneName || "").replace(
    /\s*\((Kreis|Bezirk)\)\s*$/i,
    "",
  );

  const mieteExtra =
    v2?.erreichbarQm > 0 ? (
      <div className="cockpit-cmp-note" style={klein}>
        {L(t, "brfErreichbar", "In 3 Jahren erreichbar")}:{" "}
        <strong style={{ color: "var(--ct)" }}>{fmtQm(v2.erreichbarQm)} €/m²</strong>
        {v2.kappungsgrenzeProzent != null &&
          ` (${L(t, "brfKappung", "Kappungsgrenze")} ${fmt(v2.kappungsgrenzeProzent, 0)} %)`}
      </div>
    ) : null;

  // V5: nur wenn der Ort einem Kreis zugeordnet ist (sonst gibt briefing.js
  // keine Kachel aus). V6: Landestrend, einzelne fehlende Werte entfallen.
  const kreisVsLand =
    v5 && v5.abw != null && isFinite(v5.abw)
      ? {
          gross: prozent(v5.abw, 0),
          unter: v5.abw >= 0 ? L(t, "cockKreisUeberLand", "Kreis über Land") : L(t, "cockKreisUnterLand", "Kreis unter Land"),
          zeilen: [
            [(v5.ebeneName || "").replace(/\s*\((Kreis|Bezirk)\)\s*$/i, ""), `${fmtQm(v5.eigen)} €/m²`],
            [L(t, "cockLand", "Bundesland"), `${fmtQm(v5.markt)} €/m²`],
          ],
        }
      : null;
  const trendZeilen = [];
  if (v6?.trendVorjahr != null) trendZeilen.push([L(t, "cockZumVorjahr", "Zum Vorjahr"), prozent(v6.trendVorjahr, 1)]);
  if (v6?.trend4J != null) trendZeilen.push([L(t, "cockSeit4J", "In 4 Jahren"), prozent(v6.trend4J, 1)]);
  const trendGross = v6?.trendVorjahr ?? v6?.trend4J ?? null;
  const trend =
    trendZeilen.length > 0
      ? {
          gross: prozent(trendGross, 1),
          unter: v6.trendVorjahr != null ? L(t, "cockZumVorjahr", "Zum Vorjahr") : L(t, "cockSeit4J", "In 4 Jahren"),
          zeilen: trendZeilen,
        }
      : null;

  return (
    <section id="schritt-markt" aria-labelledby="schritt-markt-titel" className="bv bv-auf cockpit-s2" style={{ ...karte, marginTop: 0, padding: "22px 24px 12px", scrollMarginTop: 78 }}>
      <SchrittKopf
        id="schritt-markt-titel"
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
      <div className="cockpit-markt-liste" style={{ marginTop: 4 }}>
        <div>
        {v1 && (
          <MarktZeile titel={L(t, "cockMarktKaufpreis", "Kaufpreis pro m²")} v={v1} formatWert={fmtQm} einheitLabel="€/m²" letzte={!v2 && !fb && !kreisVsLand && !trend} t={t} />
        )}
        {v2 && (
          <MarktZeile titel={L(t, "cockMarktMiete", "Miete pro m²")} v={v2} formatWert={fmtQm} einheitLabel="€/m²" extra={mieteExtra} letzte={!fb && !kreisVsLand && !trend} t={t} />
        )}
        {fb && (
          <MarktZeile titel={L(t, "cockMarktFaktor", "Kaufpreisfaktor")} v={fb} formatWert={fmtFaktor} einheitLabel="" letzte={!kreisVsLand && !trend} t={t} />
        )}
        </div>
        {(kreisVsLand || trend) && (
        <div>
        {kreisVsLand && (
          <MarktInfoZeile gross={kreisVsLand.gross} unter={kreisVsLand.unter} titel={L(t, "cockKreisVsLand", "Kreis gegen Land")} zeilen={kreisVsLand.zeilen} letzte={!trend} />
        )}
        {trend && (
          <MarktInfoZeile gross={trend.gross} unter={trend.unter} titel={L(t, "cockPreisentwicklung", "Preisentwicklung im Land")} zeilen={trend.zeilen} letzte />
        )}
        </div>
        )}
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

export function SchrittStellschrauben({ spannen, groessterHebel, onEintragen, ergebnis, t }) {
  const [aufgeklappt, setAufgeklappt] = useState(false);
  if (!spannen) return null;
  const zeilen = SPANNEN_METRIK.filter((m) => {
    const s = spannen[m.key];
    return s && (s.aktuell != null || s.realistisch != null || s.optimal != null);
  });
  if (zeilen.length === 0) return null;

  // Dieselbe Datenquelle wie der Aufklapp-Bereich in "Worauf achten"
  // (SchrittRisiken) - Hebel zuerst (Kartenthema "was sich ändern müsste"),
  // dann Stärken als das Positive ("was bereits gut ist", Nutzerwunsch
  // 2026-09-25). Kein eigener Start-Knopf: dieselbe Analyse wie Schritt 4,
  // hier nur sichtbar, wenn sie bereits gelaufen ist.
  const hebelTexte = ergebnis ? hebelTexteVon(ergebnis) : [];
  const staerkenTexte = ergebnis ? staerkenVon(ergebnis) : [];
  const ausfuehrlich = [...hebelTexte, ...staerkenTexte];

  return (
    <section id="schritt-stellschrauben" aria-labelledby="schritt-stellschrauben-titel" className="bv bv-auf cockpit-s3" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf id="schritt-stellschrauben-titel" nr={3} titel={L(t, "cockS3Titel", "Was sich ändern müsste")} />

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

      {ausfuehrlich.length > 0 && (
        <button type="button" onClick={() => setAufgeklappt((o) => !o)} aria-expanded={aufgeklappt} style={textLink}>
          {aufgeklappt
            ? L(t, "cockWenigerAnzeigen", "Weniger anzeigen")
            : L(t, "cockAusfuehrlich", "Ausführliche Begründung ansehen")}
        </button>
      )}

      {aufgeklappt && ausfuehrlich.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}>
          {ausfuehrlich.map((e) => (
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
  color: "var(--ca)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  // Trefferflaeche 44 px hoch, ohne die Zeile zu vergroessern
  padding: "12px 8px",
  margin: "-12px -8px",
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
    <section id="schritt-risiken" aria-labelledby="schritt-risiken-titel" className="bv bv-auf cockpit-s4" style={{ ...karte, marginTop: 0, scrollMarginTop: 78 }}>
      <SchrittKopf
        id="schritt-risiken-titel"
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

      <div className="cockpit-risiken-liste" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: hatAnalyse || modText ? 12 : 0 }}>
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
        <KiLadeeffekt ariaLabel={L(t, "brfStartKnopf", "Investment-Briefing erstellen")} />
      ) : (
        !zeigtConsent &&
        !bestaetigen && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginTop: 14 }}>
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
  width: 44,
  height: 44,
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
const LAGE_PHASEN = ["Standort einordnen …", "Mit Region vergleichen …", "Text formulieren …"];

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
            <button type="button" onClick={onStarten} aria-label="Lage-Analyse neu erstellen" style={neuBerechnenKnopf}>
              ↻
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
          <KiLadeeffekt
            ariaLabel={L(t, "brfLageStarten", "Lage-Analyse erstellen")}
            phasen={LAGE_PHASEN}
          />
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
