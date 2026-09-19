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
import { fmt, fmtE } from "../../utils/helpers.js";

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

// ── Kopf: Empfehlung ────────────────────────────────────────────────────────
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
        <div style={{ minWidth: 0 }}>
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

export function MarktVergleich({ briefing, t }) {
  const v1 = briefing.vergleiche.find((v) => v.id === "v1");
  const v2 = briefing.vergleiche.find((v) => v.id === "v2");
  if (!v1 && !v2) return null;
  const ref = v1 || v2;
  const marktName = ref.ebeneName
    ? ref.ebeneName.replace(/\s*\((Kreis|Bezirk)\)\s*$/i, "")
    : L(t, "brfMarktLand", "Landesschnitt");

  return (
    <div className="bv" style={karte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={kartenTitel}>{L(t, "brfMarktTitel", "Im Vergleich zum Markt")}</div>
        <div style={klein}>{marktName}</div>
      </div>
      {v1 && (
        <Balken
          titel={L(t, "brfKaufpreis", "Kaufpreis")}
          v={v1}
          linkes={L(t, "brfGuenstiger", "günstiger")}
          rechtes={L(t, "brfTeurer", "teurer")}
          faktor={briefing.R.kpF}
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
