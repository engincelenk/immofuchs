// Schritt B1 des Umbauplans - Tiefenstufe 1 "Ueberblick".
//
// Beantwortet die eine Frage des Einsteigers: "Lohnt sich das?" Ampel,
// Balkenverhaeltnis und ein Satz Klartext, ohne einen einzigen Klick.
//
// Wichtig (Konzept 3.9): Das Urteil ist KEINE KI. Es kommt aus dem Regelwerk
// (investmentScore.js / rendite.js) und ist deshalb kostenlos, sofort und
// deterministisch - kein Sparkle-Icon, kein Farbverlauf, kein Knopf. Nur der
// Assistent darunter ist KI und traegt entsprechend Marineblau.
import { Tip } from "../ui/Tip.jsx";
import { fehlendeFelder } from "../../utils/objektKennzahlen.js";

// Phase D des Konzepts: jede Kennzahl bekommt eine Ein-Satz-Erklaerung hinter
// einem Fragezeichen. Die Analyse-Vorlage hat null Erklaerungen - das ist die
// Stelle, an der ImmoFuchs sie klar schlaegt, und Tip.jsx liegt dafuer laengst
// bereit.
const ERKLAERUNG = {
  cashflow:
    "Was nach Kreditrate und nicht umlagefähigen Kosten monatlich übrig bleibt. Negativ heißt: du zahlst aus eigener Tasche dazu.",
  nettorendite:
    "Die ehrlichere Renditezahl: Sie zieht die Kosten ab, die du nicht auf den Mieter umlegen kannst.",
  faktor:
    "Kaufpreis geteilt durch Jahresmiete. Je niedriger, desto schneller hat sich der Kauf über die Miete bezahlt gemacht.",
};

const TIER_FARBE = {
  green: "#2F6B4F",
  yellow: "#B8860B",
  orange: "#C2410C",
  red: "#B3402A",
};

const TIER_WORT = {
  green: "Trägt sich",
  yellow: "Knapp",
  orange: "Schwach",
  red: "Kritisch",
};

const FELD_NAME = {
  kaufpreis: "Kaufpreis",
  kaltmiete: "Kaltmiete pro Monat",
  flaeche: "Wohnfläche",
  eigenkapital: "Eigenkapital",
  zinssatz: "Zinssatz",
  tilgung: "Tilgung",
  nichtUml: "nicht umlagefähige Kosten",
  bundesland: "Bundesland",
  zinsbindung: "Zinsbindung",
  baujahr: "Baujahr",
  plz: "PLZ",
};

function eur(v, locale = "de-DE") {
  return Number.isFinite(v) ? `${Math.round(v).toLocaleString(locale)} €` : "–";
}

// Ein Satz Klartext statt einer Zahlenkolonne. Formuliert das Ergebnis so,
// wie ein Mensch es sagen wuerde - und nennt bei negativem Cashflow direkt
// den Hebel, statt den Nutzer damit allein zu lassen.
function urteilSatz(kz) {
  const cf = kz.cashflowMon;
  const fehlbetrag = Math.abs(Math.round(cf));
  if (cf >= 150) {
    return `Die Miete trägt die Finanzierung und wirft monatlich ${eur(cf)} ab.`;
  }
  if (cf >= 0) {
    return `Die Miete trägt die Finanzierung gerade eben — ${eur(cf)} bleiben im Monat übrig.`;
  }
  return `Die Miete deckt die Kosten nicht: Du zahlst monatlich ${fehlbetrag.toLocaleString("de-DE")} € aus eigener Tasche dazu.`;
}

function Balken({ label, wert, anteil, farbe, locale }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 5,
        }}
      >
        <span style={{ color: "var(--ch)" }}>{label}</span>
        <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {eur(wert, locale)}
        </span>
      </div>
      <div
        style={{
          height: 7,
          borderRadius: 4,
          background: "var(--cb)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(2, Math.min(100, anteil * 100))}%`,
            background: farbe,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

export function Ueberblick({ kennzahlen, data, onFinnFrage, onStellschrauben, locale = "de-DE" }) {
  if (!kennzahlen?.verfuegbar) {
    // Lehrender Empty-State (Konzept 3.6): nennt die fehlenden Felder, statt
    // nur zu melden, dass nichts da ist.
    const fehlt = fehlendeFelder(data).slice(0, 3).map((k) => FELD_NAME[k] || k);
    return (
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 20,
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ch)",
        }}
      >
        Für eine Einschätzung fehlen noch{" "}
        <strong style={{ color: "var(--ct)" }}>{fehlt.join(", ")}</strong>. Trage sie ein, dann
        erscheinen Rendite, Cashflow und die Bewertung hier.
      </div>
    );
  }

  const cf = kennzahlen.cashflowMon;
  const ein = kennzahlen.einnahmenMon || 0;
  const aus = kennzahlen.ausgabenMon || 0;
  const max = Math.max(ein, aus, 1);
  const tier = kennzahlen.tier || (cf >= 0 ? "yellow" : "red");
  const farbe = TIER_FARBE[tier] || "var(--ch)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Ampel + Urteil */}
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          borderTop: `3px solid ${farbe}`,
          padding: "18px 18px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: farbe }}>
            {TIER_WORT[tier] || "Einschätzung"}
          </span>
          {kennzahlen.score != null && (
            <span
              style={{ fontSize: 13, color: "var(--ch)", fontVariantNumeric: "tabular-nums" }}
            >
              {kennzahlen.score}/100
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ct)" }}>
          {urteilSatz(kennzahlen)}
        </div>

        {/* Drei Kennzahlen */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
            gap: 12,
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--cb)",
          }}
        >
          {[
            {
              l: "Cashflow / Monat",
              tip: ERKLAERUNG.cashflow,
              v: `${cf >= 0 ? "+" : ""}${eur(cf, locale)}`,
              c: cf >= 0 ? "#2F6B4F" : "#B3402A",
            },
            {
              l: "Nettorendite",
              tip: ERKLAERUNG.nettorendite,
              v: `${(+kennzahlen.nettoRendite).toFixed(1).replace(".", ",")} %`,
            },
            {
              l: "Faktor",
              tip: ERKLAERUNG.faktor,
              v: Number.isFinite(kennzahlen.faktor)
                ? `${kennzahlen.faktor.toFixed(1).replace(".", ",")} x`
                : "–",
            },
          ].map((k) => (
            <div key={k.l}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ch)",
                  marginBottom: 2,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {k.l}
                <Tip text={k.tip} label={k.l} />
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: k.c || "var(--ct)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {k.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verhaeltnis vor Zahl */}
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--ch)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            fontWeight: 600,
          }}
        >
          Pro Monat
        </div>
        <Balken
          label="Einnahmen"
          wert={ein}
          anteil={ein / max}
          farbe="#2F6B4F"
          locale={locale}
        />
        <Balken
          label="Ausgaben"
          wert={aus}
          anteil={aus / max}
          farbe="#B3402A"
          locale={locale}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: "1px solid var(--cb)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span>Überschuss</span>
          <span
            style={{
              color: cf >= 0 ? "#2F6B4F" : "#B3402A",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {cf >= 0 ? "+" : ""}
            {eur(cf, locale)}
          </span>
        </div>
      </div>

      {/* Annahmen offenlegen (Konzept 3.7, Punkt 5) */}
      <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5, padding: "0 2px" }}>
        Gerechnet mit {(+data?.zinssatz || 0).toString().replace(".", ",")} % Zins,{" "}
        {(+data?.tilgung || 0).toString().replace(".", ",")} % Tilgung.{" "}
        {onStellschrauben && (
          <button
            type="button"
            onClick={onStellschrauben}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--ca)",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Annahmen anpassen →
          </button>
        )}
      </div>

      {/* Nur DAS ist KI - kontextuell, mit vorformulierter Frage */}
      {onFinnFrage && (
        <button
          type="button"
          onClick={() => onFinnFrage("Warum ist das so?")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            padding: "13px 16px",
            borderRadius: 12,
            border: "1px solid #1E3A5F33",
            background: "#1E3A5F0d",
            color: "#1E3A5F",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span aria-hidden="true">✦</span> Warum ist das so? — Finn fragen
        </button>
      )}
    </div>
  );
}
