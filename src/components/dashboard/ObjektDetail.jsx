import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";
import { VollstaendigkeitsRing } from "./ObjektKPIs.jsx";
import { Ueberblick } from "./Ueberblick.jsx";
import { Stellschrauben } from "./Stellschrauben.jsx";
import {
  berechneObjektKennzahlen,
  berechneVollstaendigkeit,
} from "../../utils/objektKennzahlen.js";

// Schritt A4 und C des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md).
//
// Aus der frueheren schlanken Detailkarte mit einem "Im Rechner oeffnen"-Knopf
// wird der Objekt-Container mit Chip-Leiste. Von links nach rechts steigt die
// Detailtiefe: der Einsteiger bleibt beim Ueberblick, der Profi wischt weiter.
//
// Die Chip-Leiste uebernimmt bewusst das Scrollverhalten der bestehenden
// .tbar aus App.jsx (overflow-x:auto + scroll-snap) - kein neues Muster,
// nur eine Ebene tiefer.
//
// Rechner-Reiter erscheinen kontextabhaengig: Vorfaelligkeit erst bei
// vorhandenem Kredit, Sanierung erst bei gesetztem Baujahr. Wer nichts
// eingegeben hat, sieht auch keine leeren Reiter.
const CHIPS = [
  { id: "ueberblick", label: "Überblick" },
  { id: "stellschrauben", label: "Stellschrauben" },
  { id: "finanzierung", label: "Finanzierung", rechner: "kredit" },
  { id: "miete", label: "Miete & Recht", rechner: "miete" },
  { id: "sanierung", label: "Sanierung", rechner: "sanier" },
  { id: "steuer", label: "Steuer", rechner: "steuer6" },
  { id: "daten", label: "Alle Daten" },
];

// Welche Reiter fuer diesen Datenstand sinnvoll sind.
function sichtbareChips(data) {
  const hatKredit = (+data?.kaufpreis || 0) > (+data?.eigenkapital || 0);
  const hatBaujahr = !!(data?.baujahr || data?.sBJ);
  return CHIPS.filter((c) => {
    if (c.id === "sanierung") return hatBaujahr;
    if (c.id === "finanzierung") return hatKredit;
    return true;
  });
}

const FELD_GRUPPEN = [
  {
    titel: "Eckdaten",
    felder: [
      ["plz", "PLZ"],
      ["ort", "Ort"],
      ["bundesland", "Bundesland"],
      ["kaufpreis", "Kaufpreis", "€"],
      ["flaeche", "Wohnfläche", "m²"],
      ["baujahr", "Baujahr"],
    ],
  },
  {
    titel: "Einnahmen",
    felder: [
      ["kaltmiete", "Kaltmiete", "€/Monat"],
      ["mieteQm", "Miete je m²", "€/m²"],
      ["leerstand", "Leerstand", "Monate"],
    ],
  },
  {
    titel: "Finanzierung",
    felder: [
      ["eigenkapital", "Eigenkapital", "€"],
      ["zinssatz", "Zinssatz", "%"],
      ["tilgung", "Tilgung", "%"],
      ["zinsbindung", "Zinsbindung", "Jahre"],
    ],
  },
  {
    titel: "Laufende Kosten",
    felder: [
      ["nichtUml", "Nicht umlagefähige Kosten", "€/Monat"],
      ["sonder", "Sonderumlage", "€"],
      ["renovierung", "Renovierungskosten", "€"],
    ],
  },
];

export function ObjektDetail({ objekt, onBack }) {
  const { d, set, setTabExt, t, lang } = useApp();
  const locale = lang === "de" ? "de-DE" : "de-DE";
  const [chip, setChip] = useState("ueberblick");

  // A1: Die Ansicht steckt nicht mehr in inputData, sondern liegt daneben.
  const gespeichert = useMemo(
    () => objekt?.inputData || objekt?.data || {},
    [objekt],
  );
  const hasFullInput = Object.keys(gespeichert).length > 2;

  // Ueberblick und Stellschrauben arbeiten auf den Daten DIESES Objekts,
  // nicht auf dem globalen Rechner-State - sonst zeigte das Objekt die Zahlen
  // eines fremden Rechnerstands.
  const basis = hasFullInput ? gespeichert : d;
  const kennzahlenGespeichert = useMemo(
    () => berechneObjektKennzahlen(basis, t),
    [basis, t],
  );
  const vollstaendigkeit = berechneVollstaendigkeit(basis);
  const chips = sichtbareChips(basis);

  function inRechner(rechnerTab) {
    const { tab: _legacy, ...data } = gespeichert;
    Object.entries(data).forEach(([k, v]) => set(k, v));
    setTabExt(rechnerTab);
  }

  const aktiv = chips.find((c) => c.id === chip) ? chip : "ueberblick";

  return (
    <div style={{ padding: "12px 14px 100px" }}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Zurück
      </button>

      {/* Kopf */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "4px 2px 14px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
            {objekt.title || "Objekt"}
          </div>
          <div style={{ fontSize: 13, color: "var(--ch)", marginTop: 3 }}>
            {[objekt.plz, objekt.ort].filter(Boolean).join(" ") || "Ohne Adresse"}
            {objekt.source === "expose-scan" && " · aus Exposé"}
          </div>
        </div>
        <VollstaendigkeitsRing prozent={vollstaendigkeit} groesse={46} />
      </div>

      {/* Chip-Leiste - Scrollverhalten wie .tbar in App.jsx */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "2px 0 10px",
          margin: "0 -14px 12px",
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        {chips.map((c) => {
          const on = c.id === aktiv;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setChip(c.id)}
              style={{
                flexShrink: 0,
                scrollSnapAlign: "start",
                height: 38,
                padding: "0 15px",
                borderRadius: 999,
                border: `1.5px solid ${on ? "var(--ca)" : "var(--cb)"}`,
                background: on ? "var(--ca)" : "var(--cc)",
                color: on ? "#fff" : "var(--ct)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {aktiv === "ueberblick" && (
        <Ueberblick
          kennzahlen={kennzahlenGespeichert}
          data={basis}
          locale={locale}
          onStellschrauben={() => setChip("stellschrauben")}
        />
      )}

      {aktiv === "stellschrauben" && (
        <Stellschrauben
          startwerte={basis}
          t={t}
          locale={locale}
          onUebernehmen={(werte) => {
            // Uebernehmen schreibt die Reglerwerte in den Rechner-State und
            // oeffnet den Renditerechner - dort wird gespeichert.
            Object.entries(werte).forEach(([k, v]) => set(k, v));
            setTabExt("haupt");
          }}
        />
      )}

      {["finanzierung", "miete", "sanierung", "steuer"].includes(aktiv) && (
        <RechnerReiter
          chip={chips.find((c) => c.id === aktiv)}
          onOeffnen={inRechner}
          moeglich={hasFullInput}
        />
      )}

      {aktiv === "daten" && (
        <AlleDaten
          data={basis}
          objekt={objekt}
          locale={locale}
          onOeffnen={hasFullInput ? () => inRechner(objekt.letzteAnsicht || "haupt") : null}
        />
      )}
    </div>
  );
}

// Phase C: Der Rechner bleibt der Rechner - der Reiter fuehrt hin und nimmt
// die Objektdaten mit, statt die Rechnerlogik zu duplizieren.
function RechnerReiter({ chip, onOeffnen, moeglich }) {
  if (!chip) return null;
  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{chip.label}</div>
      <div style={{ fontSize: 14, color: "var(--ch)", lineHeight: 1.55, marginBottom: 16 }}>
        {moeglich
          ? "Öffnet den Rechner mit den Werten dieses Objekts. Änderungen dort gelten für dieses Objekt."
          : "Für diesen Rechner fehlen noch Objektdaten. Lege zuerst Kaufpreis, Wohnfläche und Kaltmiete an."}
      </div>
      <button
        type="button"
        disabled={!moeglich}
        onClick={() => onOeffnen(chip.rechner)}
        style={{
          ...primaryBtnStyle,
          marginTop: 0,
          opacity: moeglich ? 1 : 0.5,
          cursor: moeglich ? "pointer" : "not-allowed",
        }}
      >
        {chip.label} öffnen →
      </button>
    </div>
  );
}

// Tiefenstufe 3: alle Felder als Label-Wert-Zeilen, gruppiert. Zeilen-Grammatik
// durchgaengig gleich - Label links, Wert rechts, Einheit im Label.
function AlleDaten({ data, objekt, locale, onOeffnen }) {
  const gesetzt = (v) => v != null && String(v).trim() !== "" && String(v) !== "0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FELD_GRUPPEN.map((g) => {
        const zeilen = g.felder.filter(([k]) => gesetzt(data[k]));
        if (zeilen.length === 0) return null;
        return (
          <div
            key={g.titel}
            style={{
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ch)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {g.titel}
            </div>
            {zeilen.map(([k, label, einheit]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: "6px 0",
                  fontSize: 13.5,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {label}
                  {einheit ? ` (${einheit})` : ""}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                  {formatWert(data[k], einheit, locale)}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {/* Metadaten - Orientierung bei mehreren Objekten */}
      <div style={{ fontSize: 12, color: "var(--ch)", padding: "2px 4px", lineHeight: 1.6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Quelle</span>
          <span>{objekt.source === "expose-scan" ? "Exposé-Scan" : "Manuell"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Zuletzt bearbeitet</span>
          <span>
            {objekt.updatedAt
              ? new Date(objekt.updatedAt).toLocaleDateString(locale)
              : objekt.date || "—"}
          </span>
        </div>
      </div>

      {objekt.score != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
          <span
            style={{
              background: scoreBadgeColor(objekt.scoreLabel),
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            {scoreBadgeText(objekt.scoreLabel)} ({objekt.score})
          </span>
        </div>
      )}

      {onOeffnen && (
        <button onClick={onOeffnen} style={primaryBtnStyle}>
          Im Rechner öffnen →
        </button>
      )}
    </div>
  );
}

// Rohwerte lesbar machen: Tausenderpunkte bei Betraegen, Komma statt Punkt
// bei Prozentsaetzen - der Formular-State haelt sie als englische Strings.
function formatWert(wert, einheit, locale) {
  const s = String(wert ?? "");
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return s;
  if (einheit === "€" || einheit === "€/Monat") return n.toLocaleString(locale);
  if (einheit === "%" || einheit === "€/m²") return s.replace(".", ",");
  return s;
}

const backBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--ca)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 0",
  marginBottom: 4,
  fontFamily: "inherit",
};


const primaryBtnStyle = {
  marginTop: 4,
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
