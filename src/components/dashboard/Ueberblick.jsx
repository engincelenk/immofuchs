// Schritt B1 des Umbauplans - Tiefenstufe 1 "Ueberblick".
//
// Beantwortet die eine Frage des Einsteigers: "Lohnt sich das?" Ampel,
// Balkenverhaeltnis und ein Satz Klartext, ohne einen einzigen Klick.
//
// Wichtig (Konzept 3.9): Das Urteil ist KEINE KI. Es kommt aus dem Regelwerk
// (investmentScore.js / rendite.js) und ist deshalb kostenlos, sofort und
// deterministisch - kein Sparkle-Icon, kein Farbverlauf, kein Knopf.
//
// Seit 2026-09-05 haengt die AI-Engine als aufklappbare Sektion UNTER diesem
// Modul (gerendert von ObjektDetail.jsx, nicht von hier). Die Trennung ist
// Absicht: dieses Modul bleibt frei von KI, deshalb steht das ✦ ausschliesslich
// an der Sektion darunter. Der frueher hier stehende Finn-Knopf ist entfallen -
// seine Prop onFinnFrage wurde vom einzigen Aufrufer nie uebergeben.
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

// Wortwahl bewusst wie in investmentScore.js/staffel(): der Score bewertet
// die Gesamtqualitaet ueber mehrere Dimensionen (Rendite, Kapitaldienst,
// Robustheit), NICHT ob die Miete die Rate deckt. Ein frueherer Entwurf nannte
// green "Traegt sich" - dann stand ueber einem negativen Cashflow das Wort
// "Traegt sich" und darunter der Satz, dass zugezahlt werden muss. Genau der
// Selbstwiderspruch, den die Analyse-Vorlage vormacht (Befund 1.10).
const TIER_WORT = {
  green: "Solide",
  yellow: "Gemischt",
  orange: "Schwach",
  red: "Kritisch",
};

// Die Cashflow-Aussage ist eine eigene, kleinere Zeile neben dem Score - sie
// beantwortet die andere Frage: traegt sich das Objekt aus der Miete?
const CF_WORT = (cf) =>
  cf >= 150 ? "trägt sich" : cf >= 0 ? "trägt sich knapp" : "Zuzahlung nötig";

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

export function Ueberblick({ kennzahlen, data, onStellschrauben, locale = "de-DE" }) {
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
          padding: 16,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ampel + Urteil */}
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          borderTop: `3px solid ${farbe}`,
          padding: 16,
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
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              color: cf >= 0 ? "#2F6B4F" : "#B3402A",
              background: cf >= 0 ? "#2F6B4F1a" : "#B3402A1a",
            }}
          >
            {CF_WORT(cf)}
          </span>
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
            marginTop: 12,
            paddingTop: 12,
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

        {/* Verhaeltnis vor Zahl - seit dem UX-Review 2026-09-05 eine SEKTION
            dieser Karte, keine zweite Karte mehr. Zwei gleich schwere
            Vollbreiten-Bloecke direkt untereinander erzeugen keine Hierarchie,
            sondern eine Stapel-Liste: das Auge findet keinen Einstieg.
            Die frueher hier stehende Zeile "Ueberschuss" ist ersatzlos
            entfallen - sie zeigte exakt denselben Wert wie die KPI-Kachel
            "Cashflow / Monat" 130 px weiter oben. */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--cb)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--cl)",
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
    </div>
  );
}
