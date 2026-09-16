// Investment Briefing - kompakter Einstieg oberhalb der drei KI-Analysen
// ("Objekt analysieren"/"Verbesserungshebel analysieren"/"Kaufpreis
// analysieren"). KEIN vierter KI-Aufruf: baut ausschliesslich aus bereits
// gespeicherten Ergebnissen (objekt.resultData.ai[...]) und den ohnehin
// vorhandenen Objekt-Kennzahlen zusammen - kostet also kein Kontingent.
//
// Zeigt sich selbst gar nicht, solange keine der drei Analysen gelaufen ist
// (return null) - eine leere Huelle mit Ueberschrift waere die gleiche
// Falle wie eine leere Accordion-Karte, siehe AiEngine.jsx/altesSchema.
import { ergebnisFuer } from "../../utils/aiEngine.js";
import { fmtE, fmtP } from "../../utils/helpers.js";

export function InvestmentBriefing({ objekt, data, kennzahlen, locale = "de-DE" }) {
  const analyse = ergebnisFuer(objekt, "analyse");
  const hebel = ergebnisFuer(objekt, "hebel");
  const preis = ergebnisFuer(objekt, "preis");
  if (!analyse && !hebel && !preis) return null;

  const insightsAnalyse = (analyse?.inhalt?.keyInsights || []).slice(0, 3);
  const groessterHebel =
    (hebel?.inhalt?.scenarios || [])[0] || (hebel?.inhalt?.opportunities || [])[0] || null;
  const risiken = [
    ...(analyse?.inhalt?.risks || []),
    ...(hebel?.inhalt?.risks || []),
    ...(preis?.inhalt?.risks || []),
  ].slice(0, 3);

  const ort = [data?.plz, data?.ort].filter(Boolean).join(" ");
  const kaufpreis = +data?.kaufpreis || 0;

  return (
    <div style={karte}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--ca)", textTransform: "uppercase" }}>
        ImmoFuchs Investment Briefing
      </div>

      <div style={{ marginTop: 10, fontSize: 13.5, color: "var(--ct)", lineHeight: 1.5 }}>
        {ort ? `Objekt in ${ort}` : "Dieses Objekt"}
        {kaufpreis > 0 ? ` · Angebotspreis ${fmtE(kaufpreis)}` : ""}
        {data?.flaeche ? ` · ${fmt0(data.flaeche, locale)} m²` : ""}
      </div>

      {(kennzahlen?.score != null || kennzahlen?.bruttoRendite != null || kennzahlen?.cashflowMon != null) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          {kennzahlen?.score != null && <KZ label="Score" wert={`${kennzahlen.score}/100`} />}
          {kennzahlen?.bruttoRendite != null && <KZ label="Bruttorendite" wert={fmtP(kennzahlen.bruttoRendite)} />}
          {kennzahlen?.nettoRendite != null && <KZ label="Nettorendite" wert={fmtP(kennzahlen.nettoRendite)} />}
          {kennzahlen?.cashflowMon != null && <KZ label="Cashflow" wert={fmtE(kennzahlen.cashflowMon) + "/Mon."} />}
        </div>
      )}

      {insightsAnalyse.length > 0 ? (
        <Abschnitt titel="ImmoFuchs erkennt">
          {insightsAnalyse.map((i) => (
            <div key={i.title} style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ct)" }}>{i.title}</span>
              {i.value && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ca)" }}> · {i.value}</span>}
            </div>
          ))}
        </Abschnitt>
      ) : (
        <NochNicht text="Objekt-Analyse noch nicht gestartet." />
      )}

      {groessterHebel ? (
        <Abschnitt titel="Größter Hebel">
          <div style={{ fontSize: 12.5, color: "var(--ct)" }}>
            {groessterHebel.label}
            {groessterHebel.nachher ? (
              <>
                : <span style={{ color: "var(--cl)" }}>{groessterHebel.vorher}</span> →{" "}
                <strong style={{ color: "var(--ok-tx)" }}>{groessterHebel.nachher}</strong>
              </>
            ) : (
              groessterHebel.value && (
                <>
                  : <strong style={{ color: "var(--ca)" }}>{groessterHebel.value}</strong>
                </>
              )
            )}
          </div>
        </Abschnitt>
      ) : (
        <NochNicht text="Verbesserungshebel noch nicht analysiert." />
      )}

      {preis ? (
        <Abschnitt titel="Kaufpreis">
          <div style={{ fontSize: 12.5, color: "var(--ct)" }}>{summaryOhneLabel(preis)}</div>
        </Abschnitt>
      ) : (
        <NochNicht text="Kaufpreis-Analyse noch nicht gestartet." />
      )}

      {risiken.length > 0 && (
        <Abschnitt titel="Risiken">
          {risiken.map((r) => (
            <div key={r.title} style={{ marginTop: 4, fontSize: 12.5, color: "var(--ct)" }}>
              {r.title}
            </div>
          ))}
        </Abschnitt>
      )}
    </div>
  );
}

function summaryOhneLabel(ergebnis) {
  const s = ergebnis?.inhalt?.summary || ergebnis?.inhalt?.kernaussage;
  return s || "Ergebnis liegt vor — Details unten aufklappen.";
}

function fmt0(v, locale) {
  const n = +v || 0;
  return n.toLocaleString(locale);
}

function KZ({ label, wert }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--cl)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>
        {wert}
      </div>
    </div>
  );
}

function Abschnitt({ titel, children }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cl)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {titel}
      </div>
      {children}
    </div>
  );
}

// Dezenter Platzhalter statt einer fehlenden Sektion ohne Erklaerung -
// gleiche Lektion wie bei AiEngine.jsx/SelbsttraegerCheck: keine leere
// Karte, aber auch kein stilles Weglassen ohne jeden Hinweis, WARUM hier
// nichts steht.
function NochNicht({ text }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--cb)", fontSize: 12, color: "var(--cl)" }}>
      {text}
    </div>
  );
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px",
  marginTop: 12,
};
