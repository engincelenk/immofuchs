// Schritt B2 des Umbauplans - Tiefenstufe 2 "Stellschrauben".
//
// Rechnen ohne Formular: vier Reglerkarten, darunter ein mitlaufendes
// Ergebnis. Kein Feld, kein Tastatur-Popup, kein Scrollen durch 40 Eingaben.
//
// Baut auf dem vorhandenen LiveSlider aus ui/atoms.jsx auf - ergaenzt wird
// nur, was am Telefon fehlt: Schrittknoepfe fuer die Feinjustierung (reine
// Slider treffen auf 375 px zu ungenau) und Presets fuer den
// Beleihungsauslauf.
//
// Hierher wandert auch die Rueckwaertsrechnung (Konzept 3.9): "Welcher
// Kaufpreis bringt mir X %?" ist exakt das, was ein Regler tut, nur
// andersherum - und gehoert deshalb neben den Kaufpreis-Regler statt in eine
// eigene KI-Sektion. Sie ist reine Mathematik, kostenlos und heisst nicht KI.
import { useState, useMemo } from "react";
import { LiveSlider } from "../ui/atoms.jsx";
import { loeseMaximalenKaufpreis } from "../../utils/aiTools.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";

function eur(v, locale = "de-DE") {
  return Number.isFinite(v) ? `${Math.round(v).toLocaleString(locale)} €` : "–";
}

// Regler mit Schrittknoepfen. Der Slider allein ist am Telefon zu grob -
// die Knoepfe liefern die letzte Genauigkeit, ohne die Tastatur zu oeffnen.
function ReglerZeile({ label, unit, value, onChange, min, max, step }) {
  const num = +value || 0;
  const schritt = (richtung) => {
    const next = Math.max(min, Math.min(max, num + richtung * step));
    onChange(String(+next.toFixed(4)));
  };
  const knopf = {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 10,
    border: "1px solid var(--cb)",
    background: "var(--ci)",
    color: "var(--ct)",
    fontSize: 19,
    lineHeight: 1,
    cursor: "pointer",
    fontFamily: "inherit",
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      <button type="button" style={knopf} onClick={() => schritt(-1)} aria-label={`${label} verringern`}>
        −
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <LiveSlider
          label={label}
          unit={unit}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
        />
      </div>
      <button type="button" style={knopf} onClick={() => schritt(1)} aria-label={`${label} erhöhen`}>
        +
      </button>
    </div>
  );
}

// Karte, die ihren aktuellen Wert auch zugeklappt zeigt - das Muster, das die
// Analyse-Vorlage richtig macht: ein zugeklapptes Akkordeon bleibt informativ.
function Karte({ titel, wert, offen, onToggle, children }) {
  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
            {titel}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 13,
              color: "var(--ca)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              marginTop: 1,
            }}
          >
            {wert}
          </span>
        </span>
        <span style={{ color: "var(--ch)", fontSize: 13 }}>{offen ? "▲" : "▼"}</span>
      </button>
      {offen && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid var(--cb)" }}>{children}</div>
      )}
    </div>
  );
}

// startwerte = die Daten DIESES Objekts. Die Regler arbeiten auf einer
// lokalen Kopie davon, nicht auf dem globalen Rechner-State: sonst zeigte das
// Objekt "Murrstrasse 2" die Zahlen eines ganz anderen Rechnerstands, und ein
// Reiterwechsel wuerde ungefragt die Eingaben im Rechner ueberschreiben.
// Uebernommen wird erst auf Knopfdruck.
export function Stellschrauben({ startwerte, onUebernehmen, t, locale = "de-DE" }) {
  const [werte, setWerte] = useState(() => ({ ...startwerte }));
  const [offen, setOffen] = useState("kaufpreis");
  const [ziel, setZiel] = useState("");
  const [maxKp, setMaxKp] = useState(undefined);

  const d = werte;
  const set = (k, v) => setWerte((p) => ({ ...p, [k]: v }));
  const kennzahlen = useMemo(() => berechneObjektKennzahlen(werte, t), [werte, t]);
  const veraendert = useMemo(
    () =>
      ["kaufpreis", "eigenkapital", "zinssatz", "tilgung", "kaltmiete"].some(
        (k) => String(werte[k] ?? "") !== String(startwerte?.[k] ?? ""),
      ),
    [werte, startwerte],
  );

  const toggle = (id) => setOffen((v) => (v === id ? null : id));
  const kaufpreis = +d.kaufpreis || 0;
  const ek = +d.eigenkapital || 0;
  const nbk = kennzahlen?.gesamtKaufpreis ? kennzahlen.gesamtKaufpreis - kaufpreis : 0;

  // Presets fuer den Beleihungsauslauf - setzen das Eigenkapital so, dass die
  // gewuenschte Quote herauskommt. "Alles" = vollstaendig aus Eigenkapital.
  const presets = [
    { l: "80 %", ek: kaufpreis * 0.2 },
    { l: "90 %", ek: kaufpreis * 0.1 },
    { l: "100 %", ek: 0 },
    { l: "100 %+NK", ek: -nbk },
    { l: "Alles", ek: kaufpreis + nbk },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Karte
        titel="Kaufpreis"
        wert={eur(kaufpreis, locale)}
        offen={offen === "kaufpreis"}
        onToggle={() => toggle("kaufpreis")}
      >
        <ReglerZeile
          label={t?.kaufpreis || "Kaufpreis"}
          unit="€"
          value={d.kaufpreis}
          onChange={(v) => set("kaufpreis", v)}
          min={20000}
          max={2000000}
          step={5000}
        />

        {/* Rueckwaertsrechnung - reine Mathematik, kein LLM, kein Kontingent */}
        <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
          <div style={{ fontSize: 13, color: "var(--ct)", marginBottom: 8, fontWeight: 600 }}>
            Welcher Kaufpreis bringt mir …
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={ziel}
              onChange={(e) => {
                setZiel(e.target.value);
                setMaxKp(undefined);
              }}
              placeholder="3,5"
              aria-label="Ziel-Nettorendite in Prozent"
              style={{
                width: 84,
                height: 38,
                borderRadius: 10,
                border: "1px solid var(--cb)",
                background: "var(--ci)",
                color: "var(--ct)",
                fontSize: 16,
                padding: "0 10px",
                fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--ch)" }}>% Nettorendite</span>
            <button
              type="button"
              onClick={() => setMaxKp(loeseMaximalenKaufpreis(d, t || {}, ziel))}
              disabled={!ziel}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 10,
                border: "1.5px solid var(--ca)",
                background: "transparent",
                color: "var(--ca)",
                fontSize: 14,
                fontWeight: 600,
                cursor: ziel ? "pointer" : "not-allowed",
                opacity: ziel ? 1 : 0.5,
                fontFamily: "inherit",
              }}
            >
              Berechnen
            </button>
          </div>
          {maxKp !== undefined && (
            <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.5 }}>
              {maxKp == null ? (
                <span style={{ color: "var(--ch)" }}>
                  Diese Zielrendite ist mit den aktuellen Werten nicht erreichbar.
                </span>
              ) : (
                <>
                  <span style={{ color: "var(--ch)" }}>Höchstens </span>
                  <strong style={{ color: "var(--ct)" }}>{eur(maxKp, locale)}</strong>
                  <button
                    type="button"
                    onClick={() => set("kaufpreis", String(maxKp))}
                    style={{
                      marginLeft: 10,
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--ca)",
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    übernehmen
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Karte>

      <Karte
        titel="Eigenkapital"
        wert={eur(ek, locale)}
        offen={offen === "ek"}
        onToggle={() => toggle("ek")}
      >
        <ReglerZeile
          label={t?.eigenkapital || "Eigenkapital"}
          unit="€"
          value={d.eigenkapital}
          onChange={(v) => set("eigenkapital", v)}
          min={0}
          max={Math.max(50000, Math.round((kaufpreis + nbk) * 1.1))}
          step={1000}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {presets.map((p) => (
            <button
              key={p.l}
              type="button"
              onClick={() => set("eigenkapital", String(Math.max(0, Math.round(p.ek))))}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid var(--cb)",
                background: "var(--ci)",
                color: "var(--ct)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 8, lineHeight: 1.45 }}>
          Beleihungsauslauf — wie viel des Kaufpreises die Bank finanziert.
        </div>
      </Karte>

      <Karte
        titel="Zins und Tilgung"
        wert={`${String(d.zinssatz).replace(".", ",")} % / ${String(d.tilgung).replace(".", ",")} %`}
        offen={offen === "fin"}
        onToggle={() => toggle("fin")}
      >
        <ReglerZeile
          label={t?.zinssatz || "Zinssatz"}
          unit="%"
          value={d.zinssatz}
          onChange={(v) => set("zinssatz", v)}
          min={0.5}
          max={10}
          step={0.1}
        />
        <ReglerZeile
          label={t?.tilgung || "Tilgung"}
          unit="%"
          value={d.tilgung}
          onChange={(v) => set("tilgung", v)}
          min={0}
          max={10}
          step={0.1}
        />
      </Karte>

      <Karte
        titel="Kaltmiete"
        wert={`${eur(+d.kaltmiete || 0, locale)} / Monat`}
        offen={offen === "miete"}
        onToggle={() => toggle("miete")}
      >
        <ReglerZeile
          label="Kaltmiete / Monat"
          unit="€"
          value={d.kaltmiete}
          onChange={(v) => set("kaltmiete", v)}
          min={0}
          max={5000}
          step={25}
        />
      </Karte>

      {/* Mitlaufendes Ergebnis - fix unter den Reglern */}
      {kennzahlen?.verfuegbar && (
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "sticky",
            bottom: 8,
          }}
        >
          {[
            { l: "Einnahmen / Monat", v: eur(kennzahlen.einnahmenMon, locale) },
            { l: "Ausgaben / Monat", v: eur(kennzahlen.ausgabenMon, locale) },
          ].map((r) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--ch)" }}>{r.l}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 8,
              borderTop: "1px solid var(--cb)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <span>Cashflow</span>
            <span
              style={{
                color: kennzahlen.cashflowMon >= 0 ? "#2F6B4F" : "#B3402A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {kennzahlen.cashflowMon >= 0 ? "+" : ""}
              {eur(kennzahlen.cashflowMon, locale)}
            </span>
          </div>
          {veraendert && onUebernehmen && (
            <button
              type="button"
              onClick={() => onUebernehmen(werte)}
              style={{
                marginTop: 4,
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "var(--ca)",
                color: "#fff",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Für dieses Objekt übernehmen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
