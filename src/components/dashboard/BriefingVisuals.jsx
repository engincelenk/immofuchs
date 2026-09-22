// Die sichtbare Kernantwort der Objektseite: Empfehlung, Markt-Vergleich von
// Kaufpreis und Miete, "Sollte sein" und Ausblick - als Bilder statt Text
// (Nutzer liest nicht gern). Alles Zahlen aus briefing.js, keine KI; nur der
// Kopf nimmt die KI-Zeile als children entgegen.
//
// Bewegung: nur beim ERSTEN Erscheinen der Karte (CSS-Animationen, kein
// State), transform/opacity/clip-path, ease-out 0.23,1,0.32,1, unter 700 ms.
// Zweck: die Groessenordnung eines Unterschieds sichtbar machen (Marker
// wandert vom Markt zum eigenen Wert, Balken wachsen, die Preislinie zeichnet
// sich) - keine Dauerschleifen, nichts, was Zahlen beim Lesen bewegt. Bei
// prefers-reduced-motion bleibt nur ein kurzes Einblenden.
//
// Farben ausschliesslich ueber bestehende Tokens (Dark Mode laeuft allein
// darueber) - keine neuen Tokens, keine Hex-Werte.
import { useEffect, useState } from "react";
import { fmt, fmtE, tpl } from "../../utils/helpers.js";

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

const EMPFEHLUNG = {
  investieren: { farbe: "gruen", key: "brfEmpfInvestieren", wort: "Investieren" },
  verhandeln: { farbe: "gelb", key: "brfEmpfVerhandeln", wort: "Nur mit Nachverhandlung" },
  nicht: { farbe: "rot", key: "brfEmpfNicht", wort: "Nicht investieren" },
};

const CSS = `
.bv{--bv-ease:var(--ease-out,cubic-bezier(0.23,1,0.32,1))}
@keyframes bv-auf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes bv-ring{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes bv-wachsen{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes bv-wandern{from{transform:translateX(var(--bv-von))}to{transform:none}}
@keyframes bv-zeichnen{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes bv-punkt{from{opacity:0;transform:translate(-50%,-50%) scale(.4)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.bv-auf{animation:bv-auf .32s var(--bv-ease) both;animation-delay:var(--bv-d,0ms)}
.bv-ring{stroke-dasharray:1;animation:bv-ring .55s var(--bv-ease) both}
.bv-wachsen{animation:bv-wachsen .5s var(--bv-ease) both;animation-delay:var(--bv-d,0ms)}
.bv-wandern{animation:bv-wandern .55s var(--bv-ease) both;animation-delay:var(--bv-d,0ms)}
.bv-zeichnen{animation:bv-zeichnen .7s var(--bv-ease) both}
.bv-punkt{animation:bv-punkt .3s var(--bv-ease) both;animation-delay:var(--bv-d,500ms)}
@media (prefers-reduced-motion: reduce){
  .bv-auf,.bv-wachsen,.bv-wandern,.bv-zeichnen,.bv-punkt{animation:bv-fade .2s ease both}
  .bv-ring{animation:none;stroke-dashoffset:0}
  @keyframes bv-fade{from{opacity:0}to{opacity:1}}
}
`;

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 12,
};
const kartenTitel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--ch)",
};
const klein = { fontSize: 11, color: "var(--cl)" };

// ── Kopf 1: Investment Score (Baustein 1) ───────────────────────────────────
// Die PRIMAERE Antwort der Seite (Objektseiten-Neubau-Spec, Abschnitt 9,
// Punkt 1): Ampel-Badge (0-100, 4 Stufen) + ein Satz, "Details anzeigen" fuer
// alle sieben Dimensionen. Ein Scoring statt zwei - dieselbe
// berechneScore()-Quelle wie der Renditerechner, kein zweites Urteil.
const DIM_LABEL = {
  d1: "Wirtschaftlichkeit",
  d2: "Cashflow & Schuldentragfähigkeit",
  d3: "Finanzierung",
  d4: "Objekt & Sanierung",
  d5: "Vermietung",
  d6: "Exit",
  d7: "Robustheit",
};
const TIER_FARBE = { green: "gruen", yellow: "gelb", orange: "orange", red: "rot" };

export function ScoreKopf({ score, t }) {
  const [offen, setOffen] = useState(false);

  if (!score?.verfuegbar) {
    return (
      <div className="bv" style={{ ...karte, marginTop: 0 }}>
        <style>{CSS}</style>
        <div style={kartenTitel}>{L(t, "brfScoreTitel", "Investment Score")}</div>
        <div style={{ marginTop: 6, fontSize: 14, color: "var(--ch)" }}>
          {L(t, "brfScoreNichtVerfuegbar", "Noch zu wenige Angaben für eine Bewertung.")}
        </div>
      </div>
    );
  }

  const f = STATUS_FARBEN[TIER_FARBE[score.tier]] || STATUS_FARBEN.neutral;

  return (
    <div
      className="bv"
      style={{
        ...karte,
        marginTop: 0,
        background: `linear-gradient(180deg, ${f.bg} 0%, var(--cc) 75%)`,
        borderColor: f.bd,
      }}
    >
      <style>{CSS}</style>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          className="bv-auf"
          style={{ fontSize: 40, fontWeight: 800, color: f.tx, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
        >
          {score.score}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={kartenTitel}>{L(t, "brfScoreTitel", "Investment Score")}</div>
          <div
            className="bv-auf"
            style={{ "--bv-d": "40ms", fontSize: 16, fontWeight: 700, color: f.tx, marginTop: 2 }}
          >
            {L(t, score.labelKey, score.labelKey)}
          </div>
        </div>
      </div>

      {score.hardStops.length > 0 && (
        <div
          className="bv-auf"
          style={{ "--bv-d": "70ms", marginTop: 10, fontSize: 13, fontWeight: 700, color: "var(--bad-tx)" }}
        >
          {score.hardStops.map((hs) => L(t, hs.key, hs.key)).join(" · ")}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        style={{
          marginTop: 10,
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--ca)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {offen
          ? L(t, "brfScoreDetailsZu", "Details ausblenden")
          : L(t, "brfScoreDetailsAuf", "Details anzeigen")}
      </button>

      {offen && (
        <div className="bv-auf" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {score.dimensionen.map((dim) => (
            <div key={dim.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--ch)" }}>{DIM_LABEL[dim.key] || dim.key}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {fmt(dim.score, 0)}/100
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kopf 2: Handlungsempfehlung (Baustein 7) ────────────────────────────────
// War bis zum Objektseiten-Neubau die PRIMAERE Karte der Seite; das ist jetzt
// ScoreKopf (Baustein 1, direkt darueber). EmpfehlungsKopf beantwortet eine
// andere, konkretere Frage ("investieren/verhandeln/nicht, zu welchem
// Preis") und bleibt deshalb als eigener Block bestehen - kein Score-Badge
// mehr hier, das waere dieselbe Zahl zweimal auf der Seite.
export function EmpfehlungsKopf({ briefing, data, t, children }) {
  const e = EMPFEHLUNG[briefing.empfehlung.wort];
  const f = STATUS_FARBEN[e.farbe];
  const cf = briefing.R.cf2MitSt;
  const kaufpreis = +data?.kaufpreis || 0;
  const ziel = briefing.empfehlung.ziel;

  const unterzeile =
    cf < 0
      ? L(t, "brfEmpfZuzahlung", "Bei {preis} zahlst du {betrag} im Monat zu.")
      : L(t, "brfEmpfUeberschuss", "Bei {preis} bleiben {betrag} im Monat übrig.");

  return (
    <div
      className="bv"
      style={{
        ...karte,
        marginTop: 0,
        background: `linear-gradient(180deg, ${f.bg} 0%, var(--cc) 75%)`,
        borderColor: f.bd,
      }}
    >
      <style>{CSS}</style>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <StatusIcon wort={briefing.empfehlung.wort} farbe={f.tx} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={kartenTitel}>{L(t, "brfEmpfTitel", "Empfehlung")}</div>
          <div
            className="bv-auf"
            style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, color: f.tx, marginTop: 2 }}
          >
            {L(t, e.key, e.wort)}
          </div>
        </div>
      </div>

      <div
        className="bv-auf"
        style={{ "--bv-d": "60ms", marginTop: 10, fontSize: 14, lineHeight: 1.45, color: "var(--ct)" }}
      >
        {unterzeile
          .replace("{preis}", fmtE(kaufpreis))
          .replace("{betrag}", fmtE(Math.abs(cf)))}
      </div>

      {ziel && (
        <div
          className="bv-auf"
          style={{
            "--bv-d": "120ms",
            marginTop: 10,
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            background: "var(--cc)",
            border: `1px solid ${f.bd}`,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ch)" }}>
            {L(t, "brfZielLabel", "Ziel")}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>
            {ziel.art === "miete" ? `${fmtE(ziel.miete)}/Mon.` : fmtE(ziel.kaufpreis)}
          </span>
          {ziel.art !== "miete" && ziel.nachlassProzent > 0.5 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: f.tx }}>
              −{fmt(ziel.nachlassProzent, 0)} %
            </span>
          )}
          {ziel.art === "kombi" && (
            <span style={{ fontSize: 12, color: "var(--ch)" }}>
              + {L(t, "brfZielMiete", "Miete")} {fmtE(ziel.miete)}
            </span>
          )}
          {ziel.art === "miete" && (
            <span style={{ fontSize: 12, color: "var(--ch)" }}>
              {L(t, "brfZielMieteOhne", "statt Preisnachlass")}
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

function StatusIcon({ wort, farbe }) {
  // Ring zeichnet sich, danach steht das Symbol - Zustand auf einen Blick.
  const symbol =
    wort === "investieren" ? (
      <path d="M13 21.5l5.5 5.5L28 15" />
    ) : wort === "nicht" ? (
      <path d="M14 14l12 12M26 14L14 26" />
    ) : (
      <path d="M20 12v14M14 21l6 6 6-6" />
    );
  return (
    <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle
        className="bv-ring"
        cx="20"
        cy="20"
        r="17"
        pathLength="1"
        fill="none"
        stroke={farbe}
        strokeWidth="2.5"
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
      <g
        className="bv-auf"
        style={{ "--bv-d": "180ms" }}
        fill="none"
        stroke={farbe}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {symbol}
      </g>
    </svg>
  );
}

// ── Vergleich mit dem Markt: Kaufpreis und Miete, immer beide ───────────────
const SPANNE = 30; // Balken zeigt +/-30 % um den Markt

// `eingebettet` (objektseite-neu.md §24.1): ohne eigene Kartenhuelle und ohne
// Titelzeile, damit die Balken in der Markt-Karte unter der Faktor-Kachel
// stehen koennen. Der Kaufpreis-Balken zeigt dort auch KEINEN Faktor mehr -
// der steht eine Zeile hoeher in der Kachel. Ohne die Prop bleibt alles wie
// bisher.
export function MarktVergleich({ briefing, t, eingebettet = false }) {
  const v1 = briefing.vergleiche.find((v) => v.id === "v1");
  const v2 = briefing.vergleiche.find((v) => v.id === "v2");
  if (!v1 && !v2) return null;
  const ref = v1 || v2;
  const marktName = ref.ebeneName
    ? ref.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "")
    : L(t, "brfMarktLand", "Landesschnitt");

  return (
    <div className="bv" style={eingebettet ? undefined : karte}>
      {!eingebettet && (
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}
        >
          <div style={kartenTitel}>{L(t, "brfMarktTitel", "Im Vergleich zum Markt")}</div>
          <div style={klein}>{marktName}</div>
        </div>
      )}
      {v1 && (
        <Balken
          titel={L(t, "brfKaufpreis", "Kaufpreis")}
          v={v1}
          linkes={L(t, "brfGuenstiger", "günstiger")}
          rechtes={L(t, "brfTeurer", "teurer")}
          faktor={eingebettet ? undefined : briefing.R.kpF}
          verzoegerung={0}
          t={t}
        />
      )}
      {v2 && (
        <Balken
          titel={L(t, "brfMiete", "Miete")}
          v={v2}
          linkes={L(t, "brfUnterMarkt", "unter Markt")}
          rechtes={L(t, "brfUeberMarkt", "über Markt")}
          verzoegerung={90}
          t={t}
        />
      )}
    </div>
  );
}

const NACHBAR_NAME = { BW: "Baden-Württemberg", BB: "Brandenburg" };

const STATUS_WORT = {
  brfStatusImRahmen: "im Rahmen",
  brfStatusUeberMarkt: "zu teuer",
  brfStatusUnterMarkt: "günstig",
  brfStatusUeberMarktMiete: "über Markt",
  brfStatusPotenzial: "Potenzial",
};

function Balken({ titel, v, linkes, rechtes, faktor, verzoegerung, t }) {
  const f = STATUS_FARBEN[v.status] || STATUS_FARBEN.neutral;
  const pos = (abw) => 50 + (Math.max(-SPANNE, Math.min(SPANNE, abw)) / (2 * SPANNE)) * 100;
  const p = pos(v.abw);
  const ghost = v.erreichbarQm > 0 ? pos((v.erreichbarQm / v.markt - 1) * 100) : null;
  const vonLinks = Math.min(50, p);
  const breite = Math.abs(p - 50);
  const einheit = "€/m²";
  const wort = L(t, v.key, STATUS_WORT[v.key] || "");

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>{titel}</span>
          {faktor > 0 && (
            <span style={{ fontSize: 11, color: "var(--ch)" }}>
              {L(t, "brfFaktor", "Faktor")} {fmt(faktor, 1)}
            </span>
          )}
        </div>
        <span
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: f.tx,
            background: f.bg,
            border: f.bd !== "transparent" ? `1px solid ${f.bd}` : "none",
            borderRadius: 999,
            padding: "3px 10px",
          }}
        >
          {v.abw != null ? prozent(v.abw) : ""}
          {wort && <span style={{ fontWeight: 600, fontSize: 11 }}>{wort}</span>}
        </span>
      </div>

      {/* Spur: Markt = Mittelstrich, eigener Wert = Marker, Strecke dazwischen gefaerbt */}
      <div
        style={{ position: "relative", height: 22, marginTop: 8 }}
        role="img"
        aria-label={`${titel}: ${fmt(v.eigen, 2)} ${einheit}, Markt ${fmt(v.markt, 2)} ${einheit}`}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 9,
            height: 4,
            borderRadius: 2,
            background: "var(--cro)",
          }}
        />
        <div
          className="bv-wachsen"
          style={{
            "--bv-d": `${verzoegerung + 120}ms`,
            position: "absolute",
            top: 9,
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
            top: 3,
            width: 2,
            height: 16,
            marginLeft: -1,
            borderRadius: 1,
            background: "var(--ch)",
          }}
        />
        {ghost != null && (
          <span
            title={L(t, "brfErreichbar", "In 3 Jahren erreichbar")}
            style={{
              position: "absolute",
              left: `${ghost}%`,
              top: 5,
              width: 12,
              height: 12,
              marginLeft: -6,
              borderRadius: "50%",
              border: `2px dashed ${f.tx}`,
              boxSizing: "border-box",
              background: "var(--cc)",
            }}
          />
        )}
        {/* Wrapper so breit wie die Spur: translateX in % bezieht sich auf die Spur */}
        <div
          className="bv-wandern"
          style={{
            "--bv-von": `${50 - p}%`,
            "--bv-d": `${verzoegerung}ms`,
            position: "absolute",
            inset: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: `${p}%`,
              top: 3,
              width: 16,
              height: 16,
              marginLeft: -8,
              borderRadius: "50%",
              background: f.tx,
              border: "3px solid var(--cc)",
              boxShadow: "0 0 0 1px var(--cb)",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", ...klein, marginTop: 2 }}>
        <span>{linkes}</span>
        <span>{rechtes}</span>
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
          <strong>{fmt(v.eigen, v.eigen < 100 ? 2 : 0)}</strong> {einheit}{" "}
          <span style={{ color: "var(--ch)" }}>{L(t, "brfDu", "du")}</span>
        </span>
        <span style={{ color: "var(--ch)" }}>
          {fmt(v.markt, v.markt < 100 ? 2 : 0)} {einheit} {L(t, "brfMarkt", "Markt")}
        </span>
      </div>
      {ghost != null && (
        <div style={{ ...klein, marginTop: 4 }}>
          <span style={{ color: f.tx, fontWeight: 700 }}>◌</span>{" "}
          {L(t, "brfErreichbar", "In 3 Jahren erreichbar")}: {fmt(v.erreichbarQm, 2)} {einheit}
          {v.kappungsgrenzeProzent != null &&
            ` (${L(t, "brfKappung", "Kappungsgrenze")} ${fmt(v.kappungsgrenzeProzent, 0)} %)`}
        </div>
      )}
    </div>
  );
}

// ── Sollte sein: Angebot gegen Markt gegen "traegt sich ab" ─────────────────
export function ZielKarte({ briefing, data, t }) {
  const kaufpreis = +data?.kaufpreis || 0;
  const { empfehlung, tragfaehigkeit, marktpreis, kombiweg } = briefing;
  const kpWeg = tragfaehigkeit?.wege.find((w) => w.key === "kaufpreis");
  const mieteWeg = tragfaehigkeit?.wege.find((w) => w.key === "kaltmiete");
  const zielPreis = kpWeg?.wert ?? (empfehlung.ziel?.art === "markt" ? marktpreis : null);
  if (!(kaufpreis > 0) || !(zielPreis > 0)) {
    if (!mieteWeg && !kombiweg) return null;
  }

  const zeilen = [
    { key: "angebot", label: L(t, "brfAngebot", "Angebot"), wert: kaufpreis, farbe: "var(--primary-tx)" },
    marktpreis > 0 && {
      key: "markt",
      label: L(t, "brfMarktpreis", "Marktpreis"),
      wert: marktpreis,
      farbe: "var(--ch)",
      blass: true,
    },
    zielPreis > 0 && {
      key: "ziel",
      label: kpWeg ? L(t, "brfTraegtSichAb", "Trägt sich ab") : L(t, "brfMarktpreis", "Marktpreis"),
      wert: zielPreis,
      farbe: "var(--ca)",
    },
  ].filter(Boolean);
  // Markt und Ziel sind bei art "markt" derselbe Wert - nur eine Zeile
  const sichtbar =
    empfehlung.ziel?.art === "markt" ? zeilen.filter((z) => z.key !== "markt") : zeilen;
  const max = Math.max(...sichtbar.map((z) => z.wert));
  const nachlass = kpWeg?.nachlassProzent ?? empfehlung.ziel?.nachlassProzent ?? null;
  const unrealistisch = kpWeg?.flagKey === "brfFlagNachlassUnrealistisch";

  return (
    <div className="bv" style={karte}>
      <div style={kartenTitel}>{L(t, "brfSollteSein", "Sollte sein")}</div>

      {zielPreis > 0 && sichtbar.length > 1 && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {sichtbar.map((z, i) => (
            <div
              key={z.key}
              style={{ display: "grid", gridTemplateColumns: "92px 1fr", alignItems: "center", gap: 10 }}
            >
              <span style={{ fontSize: 12, color: "var(--ch)" }}>{z.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ flex: `0 0 ${(z.wert / max) * 62}%`, minWidth: 0 }}>
                  <div
                    className="bv-wachsen"
                    style={{
                      "--bv-d": `${i * 80}ms`,
                      height: 10,
                      borderRadius: 5,
                      background: z.farbe,
                      opacity: z.blass ? 0.35 : 1,
                      transformOrigin: "left center",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ct)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtE(z.wert)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {nachlass != null && nachlass > 0.5 && zielPreis > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            color: unrealistisch ? "var(--bad-tx)" : "var(--warn-tx)",
            background: unrealistisch ? "var(--bad-bg)" : "var(--warn-bg)",
            border: `1px solid ${unrealistisch ? "var(--bad-bd)" : "var(--warn-bd)"}`,
          }}
        >
          −{fmt(nachlass, 0)} % {L(t, "brfNachlassNoetig", "Nachlass nötig")}
          {unrealistisch && ` · ${L(t, "brfUnrealistisch", "kaum verhandelbar")}`}
        </div>
      )}

      {(mieteWeg || kombiweg) && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {mieteWeg && (
            <Weg
              titel={L(t, "brfWegMiete", "Oder Miete")}
              wert={`${fmtE(mieteWeg.wert)}/Mon.`}
              zusatz={`${fmt(mieteWeg.proQm, 2)} €/m²`}
              warn={mieteWeg.flagKey ? L(t, "brfFlagUeberMarktniveau", "über Marktniveau") : null}
            />
          )}
          {kombiweg && (
            <Weg
              titel={L(t, "brfWegBeides", "Oder beides")}
              wert={fmtE(kombiweg.kaufpreis)}
              zusatz={`+ ${L(t, "brfZielMiete", "Miete")} ${fmtE(kombiweg.miete)}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Weg({ titel, wert, zusatz, warn }) {
  return (
    <div
      className="bv-auf"
      style={{
        "--bv-d": "200ms",
        flex: "1 1 150px",
        minWidth: 0,
        padding: "8px 12px",
        borderRadius: 10,
        background: "var(--ci)",
        border: "1px solid var(--cb)",
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ch)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {titel}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ct)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
        {wert}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ch)" }}>{zusatz}</div>
      {warn && <div style={{ fontSize: 10.5, color: "var(--warn-tx)", marginTop: 2 }}>{warn}</div>}
    </div>
  );
}

// ── Ausblick: Rueckblick des Landes, keine Prognose ─────────────────────────
export function AusblickKarte({ ausblick, t }) {
  if (!ausblick) return null;
  const a = ausblick;
  return (
    <div className="bv" style={karte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={kartenTitel}>{L(t, "brfAusblickTitel", "Ausblick")}</div>
        <div style={klein}>
          {a.serie ? L(t, "brfAusblickSub", "Preisverlauf im Land") : L(t, "brfAusblickSubTrend", "Trend im Land")}
        </div>
      </div>

      {a.serie && <Linie ausblick={a} />}
      {a.naeherung && (
        <div style={{ ...klein, marginTop: 6 }}>
          {L(t, "brfVerlaufGeschaetzt", "Verlauf geschätzt")}
          {" · "}
          {L(t, "brfFormNach", "Form nach")} {NACHBAR_NAME[a.naeherung] || a.naeherung},{" "}
          {L(t, "brfEndpunkteEcht", "Anfang und Ende echt")}
        </div>
      )}

      <div
        style={{
          marginTop: a.serie ? 12 : 10,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 8,
        }}
      >
        {a.seit2022Prozent != null && (
          <Kachel
            wert={prozent(a.seit2022Prozent, 1)}
            label={`${L(t, "brfSeit", "seit")} ${a.von || "Q2 2022"}`}
          />
        )}
        {a.seitTiefProzent != null && (
          <Kachel
            wert={prozent(a.seitTiefProzent, 1)}
            label={`${L(t, "brfSeitTief", "seit Tief")} ${a.tiefLabel}`}
            farbe={a.seitTiefProzent > 0 ? "var(--ok-tx)" : "var(--bad-tx)"}
          />
        )}
        {a.annahmeProzent != null && a.proJahrProzent != null && (
          <Kachel
            wert={prozent(a.annahmeProzent, 1)}
            label={L(t, "brfDeineAnnahme", "deine Annahme")}
            unter={`${L(t, "brfLandLetzte", "Land bisher")} ${prozent(a.proJahrProzent, 1)} p. a.`}
            farbe={a.annahmeOptimistisch ? "var(--warn-tx)" : "var(--ct)"}
            plakette={a.annahmeOptimistisch ? L(t, "brfOptimistisch", "optimistisch") : null}
          />
        )}
      </div>

      {a.energieklasseSchlecht && (
        <div
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 10,
            color: "var(--warn-tx)",
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-bd)",
          }}
        >
          <span style={{ fontWeight: 800 }}>{a.energieklasseSchlecht}</span>
          {L(t, "brfEnergieHinweis", "Energieklasse — Sanierung einplanen")}
        </div>
      )}

      <div style={{ ...klein, marginTop: 10 }}>
        {L(t, "brfKeinePrognose", "Rückblick, keine Prognose.")}
      </div>
    </div>
  );
}

function Kachel({ wert, label, unter, farbe = "var(--ct)", plakette }) {
  return (
    <div
      className="bv-auf"
      style={{
        "--bv-d": "300ms",
        minWidth: 0,
        padding: "8px 10px",
        borderRadius: 10,
        background: "var(--ci)",
        border: "1px solid var(--cb)",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, color: farbe, fontVariantNumeric: "tabular-nums" }}>{wert}</div>
      <div style={{ fontSize: 10.5, color: "var(--ct)", marginTop: 1 }}>{label}</div>
      {unter && <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>{unter}</div>}
      {plakette && (
        <div
          style={{
            display: "inline-block",
            marginTop: 4,
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 999,
            color: "var(--warn-tx)",
            background: "var(--warn-bg)",
            border: "1px solid var(--warn-bd)",
          }}
        >
          {plakette}
        </div>
      )}
    </div>
  );
}

// Preislinie: SVG mit preserveAspectRatio none (Linie fuellt die Breite), die
// Punkte sind HTML darueber, damit sie nicht mit verzerrt werden. Die Linie
// "zeichnet sich" ueber clip-path.
function Linie({ ausblick: a }) {
  const serie = a.serie;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const spanne = max - min || 1;
  const x = (i) => (i / (serie.length - 1)) * 100;
  const y = (v) => 10 + (1 - (v - min) / spanne) * 80; // 10..90 % der Hoehe
  const punkte = serie.map((v, i) => `${x(i)},${y(v)}`);
  const linie = `M${punkte.join("L")}`;
  const flaeche = `${linie}L100,100L0,100Z`;
  const letzter = serie.length - 1;
  const aufwaerts = serie[letzter] >= serie[0];
  const farbe = "var(--primary-tx)";

  return (
    <div style={{ marginTop: 10 }}>
      <div
        role="img"
        aria-label={`Preisverlauf ${a.von} bis ${a.bis}: von ${fmt(serie[0])} auf ${fmt(serie[letzter])} €/m²`}
        style={{ position: "relative", height: 76 }}
      >
        <div className="bv-zeichnen" style={{ position: "absolute", inset: 0 }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            style={{ display: "block", overflow: "visible" }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="bv-flaeche" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={farbe} stopOpacity="0.16" />
                <stop offset="1" stopColor={farbe} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={flaeche} fill="url(#bv-flaeche)" />
            <path
              d={linie}
              fill="none"
              stroke={farbe}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        {a.tiefIdx != null && a.tiefIdx > 0 && a.tiefIdx < letzter && (
          <Punkt links={x(a.tiefIdx)} oben={y(serie[a.tiefIdx])} farbe="var(--ch)" klein />
        )}
        <Punkt links={x(letzter)} oben={y(serie[letzter])} farbe={aufwaerts ? "var(--ok-tx)" : "var(--primary-tx)"} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", ...klein, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        <span>
          {a.von} · {fmt(serie[0])} €/m²
        </span>
        <span>
          {a.bis} · {fmt(serie[letzter])} €/m²
        </span>
      </div>
    </div>
  );
}

function Punkt({ links, oben, farbe, klein: kleinerPunkt }) {
  const d = kleinerPunkt ? 8 : 12;
  return (
    <span
      className="bv-punkt"
      style={{
        position: "absolute",
        left: `${links}%`,
        top: `${oben}%`,
        width: d,
        height: d,
        borderRadius: "50%",
        background: farbe,
        border: "2px solid var(--cc)",
        boxShadow: "0 0 0 1px var(--cb)",
        boxSizing: "border-box",
        transform: "translate(-50%,-50%)",
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Objektseite neu — docs/technical_specs/objektseite-neu.md Teil III
// Alle Bausteine der Bloecke 3 bis 7 und 10. Zahlen kommen fertig aus
// briefing.js; hier wird ausschliesslich dargestellt.
// ════════════════════════════════════════════════════════════════════════════

// Zahl je Einheit. `nowrap` ueberall: eine umbrechende Zahl ist unlesbar,
// Labels duerfen dagegen zweizeilig werden (§21 D1).
function wertText(wert, einheit) {
  if (wert == null || !isFinite(wert)) return "—";
  if (einheit === "faktor") return `${fmt(wert, 1)}×`;
  if (einheit === "prozent") return `${fmt(wert, 1)} %`;
  return fmtE(Math.round(wert));
}

// ── Block 3: Kernkennzahlen (§21 D1) ────────────────────────────────────────
// 6-Spalten-Raster. Oben Faktor, Nettomietrendite, EK-Rendite (je 2 Spalten),
// unten Cashflow und Break-even (je 3). Faellt die EK-Rendite weg (kein
// Eigenkapital), stehen oben zwei Kacheln à 3 Spalten - das Raster bleibt
// gefuellt, statt eine Luecke zu lassen.
const KERN_LABEL = {
  faktor: "Kaufpreisfaktor",
  nettorendite: "Nettomietrendite",
  cashflow: "Cashflow / Monat",
  ekRendite: "EK-Rendite p. a.",
  breakEvenMiete: "Break-even-Miete",
};

export function Kernkennzahlen({ kennzahlen, t }) {
  if (!kennzahlen?.length) return null;
  const finde = (k) => kennzahlen.find((x) => x.key === k);
  const oben = ["faktor", "nettorendite", "ekRendite"].map(finde).filter(Boolean);
  const unten = ["cashflow", "breakEvenMiete"].map(finde).filter(Boolean);
  const spanne = (n) => (n >= 3 ? 2 : n === 2 ? 3 : 6);

  return (
    <div className="bv" style={karte}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }}>
        {oben.map((k) => (
          <KernKachel key={k.key} k={k} t={t} span={spanne(oben.length)} />
        ))}
        {unten.map((k) => (
          <KernKachel key={k.key} k={k} t={t} span={spanne(unten.length)} />
        ))}
      </div>
    </div>
  );
}

function KernKachel({ k, t, span }) {
  const negativ = k.key === "cashflow" && k.wert < 0;
  const zusatz =
    k.key === "faktor" && k.markt != null
      ? `${k.ebeneName ? k.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "") : L(t, "brfMarktLand", "Land")} ${fmt(k.markt, 1)}×`
      : k.key === "breakEvenMiete" && k.heute != null
        ? `${L(t, "brfKernHeute", "heute")} ${fmtE(Math.round(k.heute))}`
        : k.key === "cashflow" || k.key === "ekRendite"
          ? L(t, "brfKernNachSteuer", "nach Steuer")
          : null;

  return (
    <div
      style={{
        gridColumn: `span ${span}`,
        background: "var(--ci)",
        border: "1px solid var(--cb)",
        borderRadius: 10,
        padding: "10px 8px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          whiteSpace: "nowrap",
          color: negativ ? "var(--bad-tx)" : "var(--ct)",
        }}
      >
        {wertText(k.wert, k.einheit)}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 2, lineHeight: 1.25 }}>
        {L(t, `brfKern${k.key}`, KERN_LABEL[k.key] || k.key)}
      </div>
      {zusatz && (
        <div
          style={{
            fontSize: 10.5,
            marginTop: 2,
            whiteSpace: "nowrap",
            color: k.ueberMarkt ? "var(--bad-tx)" : "var(--ch)",
          }}
        >
          {zusatz}
        </div>
      )}
    </div>
  );
}

// ── Block 4a: Markt-Karte (§22) ─────────────────────────────────────────────
// Faktor-Kachel oben, darunter die beiden bestehenden Balken. Ohne PLZ gibt es
// weder Faktor-Benchmark noch Vergleichskacheln - dann entfaellt die ganze
// Karte (§25), nicht nur ihr Inhalt.
export function MarktKarte({ briefing, t }) {
  const fb = briefing.faktorBenchmark;
  const hatBalken = briefing.vergleiche.some((v) => v.id === "v1" || v.id === "v2");
  if (!fb && !hatBalken) return null;
  const ebene = fb?.ebeneName
    ? fb.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "")
    : L(t, "brfMarktLand", "Landesschnitt");

  return (
    <div className="bv" style={karte}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}
      >
        <div style={kartenTitel}>{L(t, "brfMarktTitel", "Im Vergleich zum Markt")}</div>
        <div style={klein}>{ebene}</div>
      </div>
      {fb && <FaktorKachel fb={fb} t={t} ebene={ebene} />}
      {hatBalken && <MarktVergleich briefing={briefing} t={t} eingebettet />}
    </div>
  );
}

function FaktorKachel({ fb, t, ebene }) {
  const f = STATUS_FARBEN[fb.status] || STATUS_FARBEN.neutral;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 10,
        paddingBottom: 12,
        borderBottom: "1px solid var(--cb)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: "var(--ch)" }}>
          {L(t, "brfKernfaktor", "Kaufpreisfaktor")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, whiteSpace: "nowrap" }}>
            {fmt(fb.eigen, 1)}×
          </span>
          <span style={{ fontSize: 12, color: "var(--ch)", whiteSpace: "nowrap" }}>
            {ebene} {fmt(fb.markt, 1)}×
          </span>
        </div>
      </div>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          fontWeight: 700,
          color: f.tx,
          background: f.bg,
          border: `1px solid ${f.bd}`,
          borderRadius: 999,
          padding: "3px 8px",
          whiteSpace: "nowrap",
        }}
      >
        {prozent(fb.abw, 0)} {L(t, "brfFaktorGegen", "gegen")} {ebene}
      </span>
    </div>
  );
}

// ── Block 4b: Benchmark gegen Alternativanlagen (§21 D5) ────────────────────
// Durchgehend --info-*: das ist eine EINORDNUNG, kein Urteil. In Ampelfarben
// stuende hier ein zweites Urteil neben der Ampel (§19).
const ALT_LABEL = { tagesgeld: "Tagesgeld", staatsanleihe: "Staatsanleihe", etf: "ETF (historisch)" };
const ALT_HINWEIS = {
  brfAltHinweisAnnahme: "Die Vergleichssätze sind Annahmen, keine Prognose — historische Nominalwerte vor Steuer.",
  brfAltHinweisHebel: "Deine Immobilie ist finanziert, die Alternativanlage nicht: mehr Rendite heißt hier auch mehr Risiko.",
  brfAltHinweisLiquiditaet: "ETF-Anteile sind tagesgleich verkäuflich, eine Wohnung nicht.",
};
const ALT_SKALA_MAX = 8;

export function BenchmarkKarte({ alternativanlage, t }) {
  const a = alternativanlage;
  if (!a) return null;
  const pos = (v) => Math.max(0, Math.min(100, (v / ALT_SKALA_MAX) * 100));

  return (
    <div
      className="bv"
      style={{
        ...karte,
        background: "var(--info-bg)",
        border: "1px solid var(--info-bd)",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}
      >
        <div style={{ ...kartenTitel, color: "var(--info-tx)" }}>
          {L(t, "brfAltTitel", "Gegen andere Anlagen")}
        </div>
        <div style={{ fontSize: 11, color: "var(--info-tx)" }}>
          {L(t, "brfAltUntertitel", "Einordnung, kein Urteil")}
        </div>
      </div>

      <div style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5, color: "var(--ct)" }}>
        {tpl(
          L(
            t,
            "brfAltSatz",
            "Dein Eigenkapital verdient hier {wert} p. a. nach Steuer.",
          ),
          { wert: `${fmt(a.eigen, 1)} %` },
        )}
      </div>

      <div style={{ position: "relative", height: 46, marginTop: 14 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 22,
            height: 2,
            background: "var(--info-bd)",
          }}
        />
        {a.referenzen.map((r) => (
          <span key={r.key} style={{ position: "absolute", left: `${pos(r.prozent)}%`, top: 0 }}>
            <span
              style={{
                display: "block",
                width: 1,
                height: 22,
                background: "var(--info-bd)",
                margin: "0 auto",
              }}
            />
            <span
              style={{
                display: "block",
                fontSize: 9.5,
                color: "var(--info-tx)",
                whiteSpace: "nowrap",
                transform: "translateX(-50%)",
                marginTop: 3,
              }}
            >
              {L(t, `brfAlt${r.key}`, ALT_LABEL[r.key] || r.key)} {fmt(r.prozent, 1)} %
            </span>
          </span>
        ))}
        <span
          className="bv-punkt"
          style={{
            position: "absolute",
            left: `${pos(a.eigen)}%`,
            top: 23,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--info-tx)",
            border: "2px solid var(--cc)",
            boxSizing: "border-box",
            transform: "translate(-50%,-50%)",
          }}
        />
      </div>

      <ul
        style={{
          margin: "10px 0 0",
          paddingLeft: 18,
          fontSize: 11,
          lineHeight: 1.5,
          color: "var(--info-tx)",
        }}
      >
        {a.hinweisKeys.map((k) => (
          <li key={k}>{L(t, k, ALT_HINWEIS[k] || "")}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Block 5: Szenarien (§21 D2) ─────────────────────────────────────────────
// Die Engine liefert best · basis · negativ · stress (briefing.js §6.4), die
// Achse laeuft von links nach rechts von schlecht nach gut - deshalb wird hier
// gedreht. Gleiche Trennung wie bei der Sensitivitaet (§24.4).
const SZENARIO_LABEL = { best: "Best", basis: "Basis", negativ: "Negativ", stress: "Stress" };
const SENS_LABEL = {
  zins: "Zinsanstieg",
  leerstand: "Leerstand",
  mietausfall: "Mietausfall",
  sanierungsstau: "Sanierungsstau",
};
const SENS_EINHEIT = {
  zins: (v) => `${prozent(v, 1).replace(" %", "")} pp`,
  leerstand: (v) => `+${fmt(v, 0)} Mon.`,
  mietausfall: (v) => prozent(v, 0),
  sanierungsstau: (v) => `${fmt(v, 0)} €/m²`,
};

export function SzenarienKarte({ stresstest, sensitivitaet, jahre, t, children }) {
  if (!stresstest?.length) return null;
  const reihen = [...stresstest].reverse(); // Stress · Negativ · Basis · Best
  const werte = reihen.map((s) => s.cashflow);
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const breite = max - min || 1;
  const pos = (v) => ((v - min) / breite) * 100;
  const nullPos = min <= 0 && max >= 0 ? pos(0) : null;

  const ariaText = reihen
    .map((s) => `${SZENARIO_LABEL[s.key]} ${fmtE(Math.round(s.cashflow))} pro Monat`)
    .join(", ");

  return (
    <div className="bv" style={karte}>
      <div style={kartenTitel}>{L(t, "brfSzenTitel", "Wenn es anders läuft")}</div>

      {/* Spannweite: Stress links, Best rechts */}
      <div
        role="img"
        aria-label={`${L(t, "brfSzenSpanne", "Spannweite Cashflow")}: ${ariaText}`}
        style={{ position: "relative", height: 34, marginTop: 14 }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 14,
            height: 3,
            borderRadius: 2,
            background: "var(--cro)",
          }}
        />
        {nullPos != null && (
          <div
            style={{
              position: "absolute",
              left: `${nullPos}%`,
              top: 6,
              width: 1,
              height: 19,
              background: "var(--cb)",
            }}
          />
        )}
        {reihen.map((s) => (
          <Punkt
            key={s.key}
            links={pos(s.cashflow)}
            oben={46}
            klein={s.key !== "basis"}
            farbe={
              s.key === "basis" ? "var(--ct)" : s.cashflow < 0 ? "var(--bad-tx)" : "var(--ok-tx)"
            }
          />
        ))}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11.5,
          tableLayout: "fixed",
          marginTop: 6,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...zellKopf, textAlign: "left", width: "28%" }} />
            {reihen.map((s) => (
              <th
                key={s.key}
                style={{ ...zellKopf, fontWeight: s.key === "basis" ? 800 : 600 }}
                scope="col"
              >
                {L(t, `brfStress${s.key}`, SZENARIO_LABEL[s.key])}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={{ ...zelle, textAlign: "left", color: "var(--ch)", fontWeight: 600 }} scope="row">
              {L(t, "brfSzenCashflow", "Cashflow / Mon.")}
            </th>
            {reihen.map((s) => (
              <td
                key={s.key}
                style={{
                  ...zelle,
                  fontWeight: s.key === "basis" ? 800 : 600,
                  color: s.cashflow < 0 ? "var(--bad-tx)" : "var(--ct)",
                }}
              >
                {fmtE(Math.round(s.cashflow))}
              </td>
            ))}
          </tr>
          <tr>
            <th style={{ ...zelle, textAlign: "left", color: "var(--ch)", fontWeight: 600 }} scope="row">
              {tpl(L(t, "brfSzenSaldo", "Saldo {jahre} J."), { jahre: jahre ?? "—" })}
            </th>
            {reihen.map((s) => (
              <td
                key={s.key}
                style={{
                  ...zelle,
                  fontWeight: s.key === "basis" ? 800 : 600,
                  color: s.vermoegen < 0 ? "var(--bad-tx)" : "var(--ct)",
                }}
              >
                {fmtE(Math.round(s.vermoegen))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Parameter im Klartext, nicht eingeklappt (§16) */}
      <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--ch)", lineHeight: 1.5 }}>
        {reihen
          .filter((s) => s.parameter)
          .map((s) => (
            <div key={s.key}>
              <b style={{ fontWeight: 700 }}>{L(t, `brfStress${s.key}`, SZENARIO_LABEL[s.key])}:</b>{" "}
              {tpl(
                L(
                  t,
                  "brfSzenParameter",
                  "Miete {miete}, {leerstand} Leerstand, Kosten {kosten}, Anschlusszins {zins}",
                ),
                {
                  miete: prozent(s.parameter.miete, 0),
                  leerstand: `${prozent(s.parameter.leerstand, 0)}`,
                  kosten: prozent(s.parameter.kosten, 0),
                  zins: `${prozent(s.parameter.zins, 1).replace(" %", "")} pp`,
                },
              )}
            </div>
          ))}
      </div>

      {sensitivitaet?.zeilen?.length > 0 && (
        <Sensitivitaet sensitivitaet={sensitivitaet} t={t} />
      )}
      {children}
    </div>
  );
}

const zellKopf = {
  fontSize: 10.5,
  color: "var(--ch)",
  textAlign: "right",
  padding: "6px 2px",
  borderBottom: "1px solid var(--cb)",
  fontWeight: 600,
};
const zelle = {
  textAlign: "right",
  padding: "7px 2px",
  borderBottom: "1px solid var(--cb)",
  whiteSpace: "nowrap",
};

// "Woran es liegt": nach Wirkung sortiert, groesster harter Saldo-Effekt
// zuerst (§22). Die Engine liefert die Zeilen in Spec-Reihenfolge (§24.4).
function Sensitivitaet({ sensitivitaet, t }) {
  const zeilen = [...sensitivitaet.zeilen].sort(
    (a, b) => a.hart.deltaSaldo - b.hart.deltaSaldo,
  );
  const groesster = Math.min(...zeilen.map((z) => z.hart.deltaSaldo));
  const anteil = (v) => (groesster < 0 ? Math.max(0, Math.min(100, (v / groesster) * 100)) : 0);

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--cb)", paddingTop: 12 }}>
      <div style={kartenTitel}>{L(t, "brfSensTitel", "Woran es liegt")}</div>
      {zeilen.map((z) => (
        <div key={z.key} style={{ marginTop: 10 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
          >
            <span style={{ fontSize: 12.5, color: "var(--ct)", minWidth: 0 }}>
              {L(t, `brfSens${z.key}`, SENS_LABEL[z.key])}{" "}
              <span style={{ color: "var(--ch)" }}>
                {SENS_EINHEIT[z.key]?.(z.stufen.hart)}
              </span>
            </span>
            <span
              style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", color: "var(--bad-tx)" }}
            >
              {fmtE(Math.round(z.hart.deltaSaldo))}
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 6,
              borderRadius: 3,
              background: "var(--cro)",
              marginTop: 5,
              overflow: "hidden",
            }}
          >
            <span
              className="bv-wachsen"
              style={{
                position: "absolute",
                inset: 0,
                width: `${anteil(z.hart.deltaSaldo)}%`,
                background: "var(--bad-bd)",
                transformOrigin: "left",
              }}
            />
            <span
              className="bv-wachsen"
              style={{
                position: "absolute",
                inset: 0,
                width: `${anteil(z.mild.deltaSaldo)}%`,
                background: "var(--bad-tx)",
                transformOrigin: "left",
              }}
            />
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 3 }}>
            {SENS_EINHEIT[z.key]?.(z.stufen.mild)} {fmtE(Math.round(z.mild.deltaSaldo))} ·{" "}
            {L(t, "brfSensCashflow", "Cashflow")} {fmtE(Math.round(z.hart.deltaCashflow))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Block 6: Rote Flaggen (§21 D4) ──────────────────────────────────────────
// Jede Flagge nennt ihre SCHWELLE. Eine Warnung ohne Regel ist genau das
// Vertrauensproblem, das die Seite loesen soll (§3). Ab der vierten Flagge
// werden die ersten drei gezeigt, der Rest auf Knopfdruck.
const FLAGGE_TITEL = {
  flgTilgungNull: "Tilgung 0 %",
  flgBeleihung: "Beleihung über 100 %",
  flgCashflowTief: "Sehr hohe Zuzahlung",
  flgFaktorUeberMarkt: "Kaufpreisfaktor über Marktschnitt",
  flgKeinPuffer: "Kein Leerstandspuffer",
  flgAnschlussrisiko: "Anschlussrisiko",
  flgRuecklageNiedrig: "Instandhaltung niedrig für das Baujahr",
  flgMieteUeberMarkt: "Miete über ortsüblich",
  flgEnergie: "Schlechte Energieklasse",
};

function flaggenRegel(f, t) {
  const p = (v, d = 1) => fmt(v, d);
  switch (f.key) {
    case "flgTilgungNull":
      return L(t, "flgTilgungNullRegel", "Bankdarlehen ohne Tilgung — die Schuld wird nie kleiner.");
    case "flgBeleihung":
      return tpl(L(t, "flgBeleihungRegel", "Beleihung {wert} % — Schwelle 100 %."), {
        wert: p(f.wert, 0),
      });
    case "flgCashflowTief":
      return tpl(L(t, "flgCashflowTiefRegel", "{wert} pro Monat — Schwelle {schwelle}."), {
        wert: fmtE(Math.round(f.wert)),
        schwelle: fmtE(f.schwelle),
      });
    case "flgFaktorUeberMarkt":
      return tpl(
        L(t, "flgFaktorRegel", "Faktor {wert}× gegen {ebene} {markt}× — Schwelle +{schwelle} %."),
        {
          wert: p(f.wert),
          markt: p(f.markt),
          ebene: f.ebeneName ? f.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "") : "Markt",
          schwelle: p(f.schwelle, 0),
        },
      );
    case "flgKeinPuffer":
      return L(
        t,
        "flgKeinPufferRegel",
        "Das Objekt trägt sich schon voll vermietet nicht — jeder Leerstandsmonat kommt obendrauf.",
      );
    case "flgAnschlussrisiko":
      return tpl(
        L(
          t,
          "flgAnschlussRegel",
          "Nach {jahre} Jahren Zinsbindung stehen noch {wert} % der Investition offen — Schwelle {schwelle} %.",
        ),
        { jahre: p(f.zinsbindung, 0), wert: p(f.wert, 0), schwelle: p(f.schwelle, 0) },
      );
    case "flgRuecklageNiedrig":
      return tpl(
        L(
          t,
          "flgRuecklageRegel",
          "{wert} €/m² im Monat bei Baujahr {baujahr} — als Mindestwert gelten {schwelle} €/m².",
        ),
        { wert: p(f.wert, 2), baujahr: p(f.baujahr, 0), schwelle: p(f.schwelle, 2) },
      );
    case "flgMieteUeberMarkt":
      return tpl(
        L(t, "flgMieteRegel", "{wert} €/m² gegen ortsüblich {markt} €/m² — Toleranz 5 %."),
        { wert: p(f.wert, 2), markt: p(f.markt, 2) },
      );
    case "flgEnergie":
      return tpl(
        L(t, "flgEnergieRegel", "Energieklasse {wert} — ab Klasse F ist Sanierungsbedarf üblich."),
        { wert: f.wert },
      );
    default:
      return "";
  }
}

export function FlaggenKarte({ flaggen, t, maxOffen = 3 }) {
  const [alleZeigen, setAlleZeigen] = useState(false);
  if (!flaggen?.length) return null; // §25: kein Leerzustand, kein "alles gut"
  const sichtbar = alleZeigen ? flaggen : flaggen.slice(0, maxOffen);

  return (
    <div className="bv" style={karte}>
      <div style={kartenTitel}>{L(t, "brfFlaggenTitel", "Rote Flaggen")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {sichtbar.map((f) => {
          const farbe = f.stufe === "rot" ? STATUS_FARBEN.rot : STATUS_FARBEN.gelb;
          return (
            <div
              key={f.key}
              style={{
                background: farbe.bg,
                border: `1px solid ${farbe.bd}`,
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: farbe.tx,
                    textTransform: "lowercase",
                  }}
                >
                  {L(t, `brfStufe${f.stufe}`, f.stufe)}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ct)", marginTop: 2 }}>
                {L(t, `${f.key}Titel`, FLAGGE_TITEL[f.key] || f.key)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--cl)", marginTop: 3, lineHeight: 1.5 }}>
                {flaggenRegel(f, t)}
              </div>
            </div>
          );
        })}
      </div>
      {!alleZeigen && flaggen.length > maxOffen && (
        <button
          type="button"
          onClick={() => setAlleZeigen(true)}
          style={{
            marginTop: 10,
            width: "100%",
            minHeight: 40,
            borderRadius: 10,
            border: "1px solid var(--cb)",
            background: "var(--cc)",
            color: "var(--ct)",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {tpl(L(t, "brfFlaggenAlle", "Alle {n} Flaggen zeigen"), { n: flaggen.length })}
        </button>
      )}
    </div>
  );
}

// ── Block 7: Warum diese Ampel ──────────────────────────────────────────────
// Die Regel-Begruendung steht IMMER da, auch ohne KI-Aufruf (§3) - sie ist
// der Teil, an dem der Nutzer die Logik gegenpruefen kann.
const BEGR_TEXT = {
  brfBegrHartStopTilgung: "Bankdarlehen ohne Tilgung: die Finanzierung baut keine Schuld ab.",
  brfBegrHartStopBeleihung: "Die Beleihung liegt bei {beleihung} % — über dem Wert der Immobilie.",
  brfBegrTraegtSich: "Das Objekt trägt sich: {ueberschuss} Überschuss pro Monat nach Steuer.",
  brfBegrMitZuzahlung:
    "Die Zuzahlung von {zuzahlung} pro Monat liegt unter {quote} % der Kaltmiete ({grenze}).",
  brfBegrTraegtSichNicht:
    "Die Zuzahlung von {zuzahlung} pro Monat übersteigt die Grenze von {grenze}.",
  brfBegrInvestieren: "Der Preis liegt höchstens {toleranz} % über dem Marktwert.",
  brfBegrVerhandelnMarkt: "Zum Marktpreis von {kaufpreis} wären es {nachlassProzent} % weniger.",
  brfBegrVerhandelnKaufpreis:
    "Ab {kaufpreis} trägt es sich — {nachlassProzent} % Nachlass, bis {grenze} % gilt als verhandelbar.",
  brfBegrVerhandelnKombi:
    "Mit höherer Miete und {kaufpreis} trägt es sich — {nachlassProzent} % Nachlass.",
  brfBegrVerhandelnMiete: "Ab einer Kaltmiete von {miete} trägt es sich, und das ist marktüblich.",
  brfBegrNichtHartStop: "Daran ändert auch ein niedrigerer Preis nichts.",
  brfBegrNichtUnerreichbar:
    "Kein Weg führt unter {grenze} % Nachlass zum Ziel — das ist am Markt nicht verhandelbar.",
};

function begruendungsSatz(teil, t) {
  if (!teil) return null;
  const werte = {};
  for (const [k, v] of Object.entries(teil.werte || {})) {
    werte[k] =
      v == null
        ? "—"
        : k === "kaufpreis" || k === "miete" || k === "grenze" || k === "zuzahlung" || k === "ueberschuss"
          ? fmtE(Math.round(v))
          : typeof v === "number"
            ? fmt(v, k === "nachlassProzent" ? 1 : 0)
            : String(v);
  }
  // "grenze" ist bei den Verhandlungs-Schluesseln eine Prozentzahl, kein Betrag.
  if (teil.key?.startsWith("brfBegrVerhandeln") || teil.key === "brfBegrNichtUnerreichbar") {
    werte.grenze = fmt(teil.werte?.grenze, 0);
  }
  return tpl(L(t, teil.key, BEGR_TEXT[teil.key] || ""), werte);
}

// Die Regel steht oben und immer; Staerken/Risiken/Hebel aus der KI kommen
// als children darunter, ebenso die KI-Steuerung (Start, Laden, Fehler) -
// der Start-Knopf sitzt seit §24.2 hier und nicht mehr in Block 2.
export function BegruendungsKarte({ begruendung, t, children }) {
  const ampelSatz = begruendungsSatz(begruendung?.ampel, t);
  const empfSatz = begruendungsSatz(begruendung?.empfehlung, t);

  return (
    <div className="bv" style={karte}>
      <div style={kartenTitel}>{L(t, "brfBegrTitel", "Warum diese Ampel")}</div>
      {(ampelSatz || empfSatz) && (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ct)", marginTop: 8 }}>
          {[ampelSatz, empfSatz].filter(Boolean).join(" ")}
        </div>
      )}
      {children}
    </div>
  );
}

// Kleine Pille vor dem Regel-Satz in Block 2, wenn (noch) kein KI-Ergebnis
// vorliegt (§22). Macht sichtbar, dass der Satz gerechnet und nicht
// geschrieben wurde.
export function RegelZeile({ begruendung, t }) {
  const satz = begruendungsSatz(begruendung?.ampel, t);
  if (!satz) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 10 }}>
      <span
        style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          color: "var(--ch)",
          background: "var(--cro)",
          borderRadius: 999,
          padding: "2px 7px",
        }}
      >
        {L(t, "brfRegel", "Regel")}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ct)", minWidth: 0 }}>
        {satz}
      </span>
    </div>
  );
}

// ── Block 10: Herkunfts-Chip (§21 D6) ───────────────────────────────────────
// Vier Zustaende, auch einfarbig unterscheidbar - die Form traegt die
// Information, nicht die Farbe. Reine CSS-Formen, keine Bilder.
const HERKUNFT_TEXT = {
  nutzer: "von dir",
  expose: "aus Exposé",
  plz: "aus PLZ",
  annahme: "Annahme",
};

export function HerkunftChip({ quelle = "annahme", t }) {
  const nutzer = quelle === "nutzer";
  const form =
    quelle === "nutzer"
      ? { borderRadius: "50%", background: "currentColor" }
      : quelle === "expose"
        ? { borderRadius: 2, background: "currentColor" }
        : quelle === "plz"
          ? { borderRadius: 1, background: "currentColor", transform: "rotate(45deg)" }
          : { borderRadius: "50%", border: "1px dashed currentColor" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        fontWeight: nutzer ? 700 : 600,
        lineHeight: 1,
        padding: "3px 7px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        color: nutzer ? "var(--cc)" : "var(--ch)",
        background: nutzer ? "var(--ca)" : quelle === "annahme" ? "transparent" : "var(--cro)",
        border: quelle === "annahme" ? "1px dashed var(--ch)" : "1px solid transparent",
      }}
    >
      <span style={{ width: 6, height: 6, flexShrink: 0, ...form }} aria-hidden="true" />
      {L(t, `brfHerkunft${quelle}`, HERKUNFT_TEXT[quelle] || quelle)}
    </span>
  );
}

// ── Block 10: Annahmen (§7.3, §22) ──────────────────────────────────────────
// Jede Zeile nennt ihre Herkunft und laesst sich einzeln ueberschreiben. Eine
// Aenderung macht den Wert sofort zu "von dir" - der Aufrufer schreibt das in
// die Herkunft (siehe ObjektDetail).
const ANNAHMEN_LABEL = {
  eigenkapital: "Eigenkapital",
  zinssatz: "Zinssatz",
  tilgung: "Tilgung",
  zinsbindung: "Zinsbindung",
  nichtUml: "Nicht umlagefähige Kosten",
  baujahr: "Baujahr",
  leerstand: "Leerstand",
  grEst: "Grunderwerbsteuer",
  notar: "Notar",
  makler: "Makler",
  steuersatz: "Steuersatz",
  afaSatz: "AfA-Satz",
  wertP: "Wertsteigerung p. a.",
  jahre: "Betrachtungszeitraum",
};

export function AnnahmenListe({ felder, data, herkunft, onAendern, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {felder.map((f) => {
        const quelle = herkunft?.[f.key] || "annahme";
        const vomNutzer = quelle === "nutzer";
        return (
          <label
            key={f.key}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <span style={{ flex: "1 1 150px", minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ct)", lineHeight: 1.3 }}>
                {L(t, f.labelKey, ANNAHMEN_LABEL[f.key] || f.key)}
              </span>
              <span style={{ display: "inline-block", marginTop: 4 }}>
                <HerkunftChip quelle={quelle} t={t} />
              </span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <input
                type="number"
                inputMode="decimal"
                value={data?.[f.key] ?? ""}
                onChange={(e) => onAendern(f.key, e.target.value)}
                style={{
                  width: 104,
                  // 16 px sind Pflicht: darunter zoomt iOS beim Fokus (§15.3).
                  fontSize: 16,
                  fontFamily: "inherit",
                  padding: "8px 10px",
                  minHeight: 40,
                  borderRadius: 8,
                  background: "var(--ci)",
                  color: "var(--ct)",
                  border: `1px solid ${vomNutzer ? "var(--ca-bd)" : "var(--cb)"}`,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--ch)", width: 46 }}>{f.einheit}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Sticky-Leiste (§23) ─────────────────────────────────────────────────────
// Erscheint, sobald Block 2 den Viewport verlassen hat. IntersectionObserver,
// kein scroll-Listener. Inhalt bewusst minimal: Punkt, Wort, Betrag - kein
// Satz, keine Ziel-Pille.
export function StickyUrteil({ zielRef, briefing, t }) {
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const el = zielRef?.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const beobachter = new IntersectionObserver(
      ([eintrag]) => {
        // Nur unterhalb von Block 2 einblenden - beim Hochscrollen ueber die
        // Karte hinaus soll die Leiste nicht erscheinen.
        setSichtbar(!eintrag.isIntersecting && eintrag.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [zielRef]);

  if (!sichtbar || !briefing?.empfehlung) return null;
  const e = EMPFEHLUNG[briefing.empfehlung.wort];
  const f = STATUS_FARBEN[e.farbe];
  const cf = briefing.R.cf2MitSt;
  const betrag = `${fmtE(Math.round(cf))}/Mon.`;

  return (
    <button
      type="button"
      onClick={() => zielRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      aria-label={tpl(
        L(t, "brfStickyAria", "Empfehlung: {wort}, {betrag} im Monat — zur Empfehlung springen"),
        { wort: L(t, e.key, e.wort), betrag: fmtE(Math.round(cf)) },
      )}
      className="bv-auf"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: "calc(78px + env(safe-area-inset-top))",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minHeight: 44,
        padding: "10px 16px",
        background: "var(--cc)",
        border: "none",
        borderBottom: `1px solid ${f.bd}`,
        fontFamily: "inherit",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 12, height: 12, borderRadius: "50%", background: f.tx, flexShrink: 0 }}
      />
      <span style={{ fontSize: 14, fontWeight: 800, color: f.tx, minWidth: 0 }}>
        {L(t, e.key, e.wort)}
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          color: cf < 0 ? "var(--bad-tx)" : "var(--ok-tx)",
        }}
      >
        {betrag}
      </span>
    </button>
  );
}
