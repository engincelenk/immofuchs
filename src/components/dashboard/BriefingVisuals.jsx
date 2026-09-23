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
import { fmt, fmtE, tpl } from "../../utils/helpers.js";
import { berechneVollstaendigkeit } from "../../utils/objektKennzahlen.js";
import { hebelTexteVon, risikenVon, staerkenVon } from "../../utils/aiEngine.js";

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

// ScoreKopf (Baustein 1, Investment-Score-Ampel) und EmpfehlungsKopf
// (Baustein 7, Handlungsempfehlung) sind mit der Vereinfachung fuer
// unerfahrene Investoren entfernt (Nutzer-Entscheidungen 2026-09-23) - die
// Seite hat keinen Urteils-Kopf mehr, sie startet direkt mit den Kernzahlen.
// investmentScore.js/briefingEmpfehlung() bleiben als Rechenkern bestehen
// (Renditerechner nutzt den Score weiter), nur diese Anzeige entfaellt.
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
      {/* Direktvergleich Kaufpreis/m² gegen Miete/m² (Nutzer-Entscheidung
          2026-09-22): die beiden Balken darunter vergleichen jeweils gegen
          den Markt, aber nicht gegeneinander - diese Zeile stellt die zwei
          eigenen Werte direkt nebeneinander, ohne Umweg ueber die Bar. */}
      {v1 && v2 && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: eingebettet ? 0 : 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--ci)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--ch)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              {L(t, "brfKaufpreis", "Kaufpreis")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(v1.eigen, v1.eigen < 100 ? 2 : 0)} €/m²
            </div>
          </div>
          <div style={{ fontSize: 16, color: "var(--cl)", alignSelf: "center" }}>vs</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: "var(--ch)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              {L(t, "brfMiete", "Miete")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(v2.eigen, v2.eigen < 100 ? 2 : 0)} €/m²
            </div>
          </div>
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

// ZielKarte()/Weg() ("Sollte sein") sind mit dem Objektseiten-Neubau
// entfallen (Nutzer-Entscheidung 2026-09-22) - duplizierten die
// Handlungsempfehlung aus EmpfehlungsKopf (Baustein 7).

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

// ── Baustein 2: Hinweis zur Datengrundlage ──────────────────────────────────
// Nur sichtbar bei duenner Datenlage (objektseite-vereinfachung-2026-09-23.md
// Abschnitt 4) - dieselbe Vollstaendigkeits-Schwelle wie der Ring auf der
// Objektseite (berechneVollstaendigkeit() in objektKennzahlen.js), damit es
// nur EINE Definition von "genug Angaben" gibt.
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

// ── Baustein 3: Kernkennzahlen ──────────────────────────────────────────────
const KERN_LABEL = {
  faktor: "Kaufpreisfaktor",
  nettorendite: "Nettomietrendite",
  cashflow: "Cashflow / Monat",
  ekRendite: "EK-Rendite p. a.",
  breakEvenMiete: "Break-even-Miete",
};

// Genau die vier Kernzahlen, sonst nichts (Nutzer-Entscheidung 2026-09-23):
// Kaufpreisfaktor, Nettomietrendite, Cashflow, EK-Rendite. Break-even-Miete
// wird bewusst NICHT mehr gezeigt (verwirrt unerfahrene Investoren mehr, als
// es hilft) - die Kennzahl bleibt aber in briefing.js berechnet, sie wird in
// Baustein 4 (Vergleich, "optimale Kaltmiete") weiterverwendet.
export function Kernkennzahlen({ kennzahlen, t }) {
  if (!kennzahlen?.length) return null;
  const finde = (k) => kennzahlen.find((x) => x.key === k);
  const werte = ["faktor", "nettorendite", "cashflow", "ekRendite"].map(finde).filter(Boolean);
  if (werte.length === 0) return null;

  return (
    <div className="bv" style={karte}>
      <style>{CSS}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(werte.length, 2)}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {werte.map((k) => (
          <KernKachel key={k.key} k={k} t={t} span={1} />
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


// SzenarienKarte (Stresstest/Sensitivitaet) und FlaggenKarte (rote/orange
// Warnungen) sind mit der Vereinfachung fuer unerfahrene Investoren entfernt
// (Nutzer-Entscheidung 2026-09-23) - Risiko-Szenarien sollen auf dieser Seite
// nicht mehr erscheinen. briefingStresstest()/briefingSensitivitaet()/
// briefingFlaggen() bleiben in briefing.js bestehen.

// ── Block 4c: Realistisch/Optimal-Spannen (§6.2) ────────────────────────────
// Drei benannte Punkte auf EINER Skala je Groesse (Kaufpreis, Kaltmiete,
// Eigenkapital): realistisch (Markt), optimal (Cashflow-Nullpunkt), aktuell
// (eigener Wert). Bewusst NICHT der bestehende Balken (ein Markt-Mittelpunkt,
// ein Marker) - hier gibt es keine feste Reihenfolge der drei Punkte (optimal
// kann ueber oder unter realistisch liegen, aktuell kann ueberall liegen),
// die Grafik muss das ohne Annahme darstellen koennen.
const SPANNEN_PUNKT_FARBE = { realistisch: "var(--ch)", optimal: "var(--ok-tx)", aktuell: "var(--ca)" };
const SPANNEN_METRIK = [
  { key: "kaufpreis", titel: "Kaufpreis" },
  { key: "kaltmiete", titel: "Kaltmiete" },
  { key: "eigenkapital", titel: "Eigenkapital" },
];

export function SpannenKarte({ spannen, t }) {
  if (!spannen) return null;
  const zeilen = SPANNEN_METRIK.filter((m) => {
    const s = spannen[m.key];
    return s && (s.aktuell != null || s.realistisch != null || s.optimal != null);
  });
  if (zeilen.length === 0) return null;

  return (
    <div className="bv" style={karte}>
      <style>{CSS}</style>
      <div style={kartenTitel}>{L(t, "brfSpannenTitel", "Realistisch bis optimal")}</div>
      <div style={{ ...klein, marginTop: 4, lineHeight: 1.4 }}>
        {L(
          t,
          "brfSpannenUntertitel",
          "Realistisch = was der Markt hergibt · optimal = ab hier trägt sich das Objekt",
        )}
      </div>
      {zeilen.map((m, i) => (
        <SpannenZeile
          key={m.key}
          titel={L(t, `brfSpannen${m.key}`, m.titel)}
          monatlich={m.key === "kaltmiete"}
          werte={spannen[m.key]}
          verzoegerung={i * 90}
          t={t}
        />
      ))}
    </div>
  );
}

function SpannenZeile({ titel, monatlich, werte, verzoegerung, t }) {
  const punkte = [
    { key: "realistisch", wert: werte.realistisch, label: L(t, "brfSpannenRealistisch", "realistisch") },
    { key: "optimal", wert: werte.optimal, label: L(t, "brfSpannenOptimal", "optimal") },
    { key: "aktuell", wert: werte.aktuell, label: L(t, "brfSpannenAktuell", "dein Wert") },
  ].filter((p) => p.wert != null && isFinite(p.wert));

  if (punkte.length === 0) return null;

  const wertLabel = (w) => (
    <>
      {fmtE(Math.round(w))}
      {monatlich && <span style={{ fontWeight: 500, fontSize: 10, color: "var(--ch)" }}> /Monat</span>}
    </>
  );

  // Nur ein Punkt bekannt: keine Skala noetig, einfache Zeile.
  if (punkte.length === 1) {
    const p = punkte[0];
    return (
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>{titel}</span>
        <span style={{ fontSize: 13, color: "var(--ch)" }}>
          {p.label} <strong style={{ color: "var(--ct)" }}>{wertLabel(p.wert)}</strong>
        </span>
      </div>
    );
  }

  // Zwei/drei Punkte: nach Wert sortiert, der jeweils kleinste und groesste
  // Punkt liegen dank Skalen-Puffer immer am Rand und damit weit genug
  // auseinander, um Beschriftungen abwechselnd unter/ueber die Spur zu
  // setzen, ohne dass sie sich ueberlappen koennen.
  const sortiert = [...punkte].sort((a, b) => a.wert - b.wert);
  const minWert = sortiert[0].wert;
  const maxWert = sortiert[sortiert.length - 1].wert;
  const spanne = maxWert - minWert;
  const puffer = spanne > 0 ? spanne * 0.22 : Math.max(1, Math.abs(minWert) * 0.1);
  const untenGrenze = minWert - puffer;
  const gesamtSpanne = maxWert + puffer - untenGrenze || 1;
  const pos = (w) => ((w - untenGrenze) / gesamtSpanne) * 100;

  const realistisch = werte.realistisch != null ? pos(werte.realistisch) : null;
  const optimal = werte.optimal != null ? pos(werte.optimal) : null;
  const bandVon = realistisch != null && optimal != null ? Math.min(realistisch, optimal) : null;
  const bandBis = realistisch != null && optimal != null ? Math.max(realistisch, optimal) : null;

  const trackY = 46;
  const ariaText = sortiert.map((p) => `${p.label} ${fmt(p.wert, 0)}`).join(", ");

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>{titel}</div>
      <div
        role="img"
        aria-label={`${titel}: ${ariaText}`}
        style={{ position: "relative", height: 92, marginTop: 4 }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: trackY - 1,
            height: 2,
            borderRadius: 1,
            background: "var(--cro)",
          }}
        />
        {bandVon != null && (
          <div
            className="bv-wachsen"
            style={{
              "--bv-d": `${verzoegerung}ms`,
              position: "absolute",
              top: trackY - 2,
              height: 4,
              left: `${bandVon}%`,
              width: `${bandBis - bandVon}%`,
              borderRadius: 2,
              background: "var(--ok-tx)",
              opacity: 0.35,
              transformOrigin: "center",
            }}
          />
        )}
        {sortiert.map((p, i) => {
          const links = pos(p.wert);
          const unten = i % 2 === 0;
          const istAktuell = p.key === "aktuell";
          const farbe = SPANNEN_PUNKT_FARBE[p.key];
          return (
            <span key={p.key}>
              <span
                className="bv-punkt"
                style={{
                  "--bv-d": `${verzoegerung + 260}ms`,
                  position: "absolute",
                  left: `${links}%`,
                  top: trackY,
                  width: istAktuell ? 14 : 10,
                  height: istAktuell ? 14 : 10,
                  borderRadius: "50%",
                  background: farbe,
                  border: `${istAktuell ? 3 : 2}px solid var(--cc)`,
                  boxShadow: "0 0 0 1px var(--cb)",
                  boxSizing: "border-box",
                  zIndex: 2,
                  transform: "translate(-50%,-50%)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: `${links}%`,
                  top: unten ? trackY + 12 : trackY - 12,
                  transform: `translate(-50%, ${unten ? "0%" : "-100%"})`,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: "var(--ch)",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {p.label}
                </span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: istAktuell ? farbe : "var(--ct)" }}>
                  {wertLabel(p.wert)}
                </span>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Block 4d: Modernisierungsbedarf (§6.3) ──────────────────────────────────
// Regelbasiert (modernisierungsbedarf() in briefing.js), keine KI. Zeigt eine
// Stufe (gering/mittel/hoch) ueber STATUS_FARBEN plus die Gruende in Klartext
// - fehlen alle drei Eingaben, zeigt die Karte den Hinweis auf Baustein 2
// statt einer geratenen Einschaetzung.
const MODBEDARF_LABEL = { gering: "Gering", mittel: "Mittel", hoch: "Hoch" };
const MODBEDARF_FARBE = { gering: "gruen", mittel: "gelb", hoch: "rot" };

function modGrundText(key, m, t) {
  if (key === "baujahr") {
    return m.baujahr < 1979
      ? tpl(L(t, "brfModGrundBaujahrAlt", "Baujahr {jahr} (vor 1979)"), { jahr: m.baujahr })
      : tpl(L(t, "brfModGrundBaujahrMittel", "Baujahr {jahr} (1979–1994)"), { jahr: m.baujahr });
  }
  if (key === "heizungsalter") {
    return m.heizungsalter === "alt"
      ? L(t, "brfModGrundHeizungAlt", "Heizung ist alt")
      : L(t, "brfModGrundHeizungMittel", "Heizung mittleren Alters");
  }
  if (key === "energieklasse") {
    return ["F", "G", "H"].includes(m.energieklasse)
      ? tpl(L(t, "brfModGrundEnergieSchlecht", "Energieeffizienzklasse {klasse} (niedrig)"), {
          klasse: m.energieklasse,
        })
      : tpl(L(t, "brfModGrundEnergieMittel", "Energieeffizienzklasse {klasse}"), {
          klasse: m.energieklasse,
        });
  }
  return "";
}

export function ModernisierungsbedarfKarte({ modernisierungsbedarf: m, t }) {
  if (!m) return null;
  return (
    <div className="bv" style={karte}>
      <div style={kartenTitel}>{L(t, "brfModTitel", "Modernisierungsbedarf")}</div>
      {!m.verfuegbar ? (
        <div style={{ ...klein, marginTop: 10, lineHeight: 1.5, fontSize: 12.5 }}>
          {L(
            t,
            "brfModKeineDaten",
            "Für eine Einschätzung fehlen Angaben zu Baujahr, Heizung oder Energieklasse — ergänze sie beim Objekt (siehe Hinweis oben) oder im Renditerechner.",
          )}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 13,
                fontWeight: 700,
                color: STATUS_FARBEN[MODBEDARF_FARBE[m.stufe]].tx,
                background: STATUS_FARBEN[MODBEDARF_FARBE[m.stufe]].bg,
                border: `1px solid ${STATUS_FARBEN[MODBEDARF_FARBE[m.stufe]].bd}`,
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {L(t, `brfModStufe${m.stufe}`, MODBEDARF_LABEL[m.stufe] || m.stufe)}
            </span>
          </div>
          {m.gruende.length > 0 ? (
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--ct)" }}>
              {m.gruende.map((g) => (
                <li key={g}>{modGrundText(g, m, t)}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ct)", marginTop: 10 }}>
              {L(
                t,
                "brfModKeineGruende",
                "Baujahr, Heizung und Energieklasse geben keinen besonderen Anlass zur Sorge.",
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Baustein: Lage (KI mit Web-Grounding, §8) ───────────────────────────────
// Eigener Baustein zwischen Vergleich und Begruendung. Eigener kleiner
// Start-/Consent-/Fehler-Ablauf (siehe ObjektDetail.jsx starteLage() /
// einwilligenUndStartenLage()) nach demselben Muster wie die Begruendungs-
// Karte, aber unabhaengig davon - andere Route, anderes Caching.
export function LageKarte({ ergebnis, laufend, fehler, consent, onStarten, onConsentJa, onConsentAbbrechen, t }) {
  return (
    <div className="bv" style={karte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={kartenTitel}>{L(t, "brfLageTitel", "Lage: was du sonst nicht siehst")}</div>
        <div style={klein}>{L(t, "brfLageUntertitel", "KI mit Websuche")}</div>
      </div>

      {ergebnis ? (
        <>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ct)", marginTop: 10, whiteSpace: "pre-line" }}>
            {ergebnis.text}
          </div>
          {/* Deutlicherer Hinweis als bei den uebrigen KI-Texten (§8): hier
              werden reale Fakten behauptet, nicht nur Zahlen eingeordnet -
              das Risiko einer falschen Aussage ist hoeher. */}
          <div style={lageDisclaimer}>
            <span aria-hidden="true" style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
            <span>
              {L(
                t,
                "brfLageDisclaimer",
                "KI-generiert, ohne Gewähr — auch mit Websuche können einzelne Angaben falsch oder veraltet sein. Prüfe wichtige Fakten selbst nach.",
              )}
            </span>
          </div>
          {ergebnis.grounded === false && (
            <div style={{ ...klein, marginTop: 8 }}>
              {L(t, "brfLageNichtGrounded", "Antwort ohne Websuche erstellt, nicht web-geprüft.")}
            </div>
          )}
        </>
      ) : consent ? (
        <div style={lageConsentBand}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {L(
              t,
              "brfLageConsentText",
              "Für die Auswertung werden Ort, PLZ-Gebiet und Bundesland dieses Objekts an unseren KI-Dienstleister übertragen — ohne Adresse und ohne Namen. Einverstanden?",
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onConsentJa} style={lageConsentJa}>
              {L(t, "brfConsentJa", "Einverstanden, starten")}
            </button>
            <button type="button" onClick={onConsentAbbrechen} style={lageConsentNein}>
              {L(t, "brfConsentNein", "Abbrechen")}
            </button>
          </div>
        </div>
      ) : laufend ? (
        <div aria-busy="true" style={{ marginTop: 10, fontSize: 12.5, color: "var(--cl)" }}>
          {L(t, "brfLaeuft", "Wird berechnet …")}
        </div>
      ) : fehler ? (
        <>
          <div style={lageFehlerBand}>{fehler}</div>
          <button type="button" onClick={onStarten} style={lageKnopf}>
            {L(t, "brfLageWiederholen", "Erneut versuchen")}
          </button>
        </>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ch)" }}>
            {L(
              t,
              "brfLageErklaerung",
              "Standort-Insiderwissen, das eine Kaufentscheidung beeinflussen könnte — z. B. große Bauprojekte, die Wirtschaftsstruktur der Region oder aktuelle Nachrichten zum Ort.",
            )}
          </div>
          <button type="button" onClick={onStarten} style={lageKnopf}>
            <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
            {L(t, "brfLageStarten", "Lage-Analyse erstellen")}
          </button>
        </div>
      )}
    </div>
  );
}

const lageKnopf = {
  display: "inline-flex",
  alignItems: "center",
  height: 44,
  padding: "0 16px",
  marginTop: 10,
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const lageConsentBand = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
  marginTop: 12,
};

const lageConsentJa = { ...lageKnopf, marginTop: 0 };

const lageConsentNein = {
  ...lageConsentJa,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
};

const lageFehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginTop: 12,
};

// Deutlicher als die uebliche "KI-generiert"-Zeile (var(--cl), keine Kontur):
// eigener Rahmen in Warnfarbe, weil dieser Block reale Fakten behauptet.
const lageDisclaimer = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginTop: 12,
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--warn-bg)",
  border: "1px solid var(--warn-bd)",
  color: "var(--warn-tx)",
  fontSize: 11.5,
  lineHeight: 1.45,
};

// ── Analyse: Staerken/Risiken/Hebel (eigener Baustein) ──────────────────────
// War bis 2026-09-23 in die Begruendungs-Karte eingebettet (Kind-Element),
// steht jetzt als eigener, betitelter Block - "Analyse: Was spricht dafuer,
// was dagegen?" (Nutzer-Entscheidung 2026-09-23, Konzept-Punkt 4: "Positive
// und negative Punkte des Objekts, und warum"). Braucht ein KI-Ergebnis
// (staerkenVon/risikenVon/hebelTexteVon lesen aus dem gespeicherten
// "briefing"-Ergebnis) - der Ausloeser dafuer ist die Begruendungs-Karte
// weiter unten auf der Seite.
export function AnalyseKarte({ ergebnis, t }) {
  const bloecke = [
    { key: "staerken", titel: L(t, "brfStaerken", "Stärken"), farbe: "gruen", einträge: staerkenVon(ergebnis) },
    { key: "risiken", titel: L(t, "brfRisiken", "Risiken"), farbe: "rot", einträge: risikenVon(ergebnis) },
    { key: "hebel", titel: L(t, "brfHebel", "Hebel"), farbe: "orange", einträge: hebelTexteVon(ergebnis) },
  ].filter((b) => b.einträge.length > 0);
  if (bloecke.length === 0) return null;

  return (
    <div className="bv" style={karte}>
      <style>{CSS}</style>
      <div style={kartenTitel}>{L(t, "brfAnalyseTitel", "Analyse: Was spricht dafür, was dagegen?")}</div>
      {bloecke.map((b, i) => (
        <div
          key={b.key}
          style={{
            marginTop: i === 0 ? 12 : 14,
            paddingTop: i === 0 ? 0 : 12,
            borderTop: i === 0 ? "none" : "1px solid var(--cb)",
          }}
        >
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
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_FARBEN[b.farbe].tx }}
            />
            {b.titel}
          </div>
          {b.einträge.map((e) => (
            <div key={e.title} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>
                {e.title}
                {e.value && <span style={{ color: "var(--ca)" }}> · {e.value}</span>}
              </div>
              {/* Die Begruendung ("und warum") ist der eigentliche Zweck
                  dieses Bausteins (Konzept-Punkt 4) - immer sichtbar, kein
                  Aufklapper. */}
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ct)", marginTop: 2 }}>
                {e.text}
              </div>
            </div>
          ))}
        </div>
      ))}
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

// HerkunftChip()/AnnahmenListe() ("Block 10: Annahmen") sind mit dem
// Objektseiten-Neubau entfallen (Nutzer-Entscheidung 2026-09-22) - kein
// eigener Baustein, das Konzept sieht Feld-Confidence in Baustein 2 vor,
// nicht als eigenes Akkordeon auf der Objektseite.

// StickyUrteil ist mit dem Entfernen der Handlungsempfehlung (Baustein 7,
// Nutzer-Entscheidung 2026-09-23) entfallen - sie zeigte nur eine
// kondensierte Version von EmpfehlungsKopf beim Scrollen, es gibt jetzt
// nichts mehr, das sie zusammenfassen koennte.
