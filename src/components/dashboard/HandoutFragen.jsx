// Das Besichtigungshandout der AI-Engine: auswaehlbare Fragen statt Fliesstext.
//
// Vorbild ist FinnHandoutPanel.jsx (Handout aus dem Exposé-Scan), das genau
// das schon konnte - Kaestchen je Frage, Auswahl ueberlebt den Reload, PDF
// hinter demselben Worker-Endpunkt /export/handout. Uebernommen ist das
// Verhalten, nicht die Optik: dort ist es ein aufklappbares Panel im
// Chatverlauf mit eigener CSS-Klasse, hier ein Block INNERHALB der
// Produktkarte der Engine - also Inline-Stile und die Tokens der Karten.
//
// Warum die Fragen in der Karte stehen und nicht im Sheet: Sie sind das
// Produkt. Was Kontingent gekostet hat, darf nicht hinter einem weiteren
// Klick liegen (dieselbe Begruendung wie beim vollen Modelltext der anderen
// Produkte, siehe AiEngine.jsx).
import { Suspense, useMemo, useState } from "react";
import { lazyWithReload } from "../../utils/lazyRetry.js";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { oeffneDruckdokument } from "../../utils/druckdokument.js";
import { EXPOSE_T } from "../../i18n/expose.js";
import {
  objektHandoutSchluessel,
  ladeAuswahl,
  speichereAuswahl,
} from "../../utils/handoutAuswahl.js";
import { katalogFuerObjekt, ergaenzeUmKatalog } from "../../utils/handoutEckdaten.js";

const CheckoutWizard = lazyWithReload(
  () => import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
  "CheckoutWizard",
);

// Beim ersten Oeffnen greift die Vorauswahl des Modells: alles mit kern=true.
// Danach gilt, was der Nutzer zuletzt angehakt hat - auch nach einem Reload.
function useAuswahl(fragen, schluessel) {
  const anfang = () =>
    new Set(ladeAuswahl(schluessel) ?? fragen.filter((f) => f.kern).map((f) => f.id));

  const [stand, setStand] = useState(() => ({ schluessel, auswahl: anfang() }));

  // Erstellt der Nutzer das Handout neu, aendert sich der Schluessel (er
  // enthaelt den Zeitstempel des Laufs). Die Auswahl wird dann WAEHREND des
  // Renderns zurueckgesetzt, nicht in einem Effekt: sonst zeigt die Liste
  // einen Frame lang die Haken des alten Handouts auf den neuen Fragen.
  if (stand.schluessel !== schluessel) {
    setStand({ schluessel, auswahl: anfang() });
  }

  const setzen = (naechste) => {
    setStand({ schluessel, auswahl: naechste });
    speichereAuswahl(schluessel, naechste);
  };
  return [stand.auswahl, setzen];
}

export function HandoutFragen({ objekt, data, fragen, kernaussage, erstellt }) {
  const { lang } = useApp();
  const account = useAccountCtx();
  const schluessel = useMemo(
    () => objektHandoutSchluessel(objekt?.id, erstellt),
    [objekt?.id, erstellt],
  );

  // Eckdaten und der volle 44-Fragen-Katalog kommen aus derselben Quelle wie
  // beim Handout aus dem Expose-Scan (finnAbgleich.js/finnFragenkatalog.js,
  // siehe handoutEckdaten.js fuer den Adapter auf die Objektfelder).
  // Die zwoelf Fragen des Modells bleiben unberuehrt - sie werden nur um die
  // noch offenen Katalogfragen ERGAENZT (Nutzerfeedback: "Eckdaten fehlen ...
  // es waren auch mehr Checkboxen integriert"), abzueglich Dopplungen.
  const katalog = useMemo(() => katalogFuerObjekt(objekt, data), [objekt, data]);
  const alleFragen = useMemo(
    () => ergaenzeUmKatalog(fragen, katalog),
    [fragen, katalog],
  );

  const [auswahl, setAuswahl] = useAuswahl(alleFragen, schluessel);
  const [zeigeUpgrade, setZeigeUpgrade] = useState(false);
  const [fehler, setFehler] = useState(null);

  // Vor-Ort-Fragen stehen unten als eigener Block: sie sind beim Termin selbst
  // anzuschauen, nicht dem Makler zu stellen. Dieselbe Trennung wie im
  // gedruckten Dokument (quelle === "vor_ort").
  const { anMakler, vorOrt } = useMemo(
    () => ({
      anMakler: alleFragen.filter((f) => !f.vorOrt),
      vorOrt: alleFragen.filter((f) => f.vorOrt),
    }),
    [alleFragen],
  );

  const alleIds = alleFragen.map((f) => f.id);
  const alleGewaehlt = alleIds.length > 0 && alleIds.every((id) => auswahl.has(id));

  const toggle = (id) => {
    const neu = new Set(auswahl);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    setAuswahl(neu);
  };

  const toggleAlle = () => setAuswahl(alleGewaehlt ? new Set() : new Set(alleIds));

  // Das Dokument baut der Worker hinter requirePro (worker/src/routes/export.ts).
  // Ohne Abo kommt eine 402 zurueck - der Knopf fuehrt dann in den
  // Kauf-Assistenten statt in eine Fehlermeldung, genau wie im Finn-Handout.
  const pdfOeffnen = async () => {
    if (!account?.isPro) {
      setZeigeUpgrade(true);
      return;
    }
    setFehler(null);
    const labels = EXPOSE_T[lang]?.handout || EXPOSE_T.de.handout;
    const ergebnis = await oeffneDruckdokument(
      "/export/handout",
      {
        // Die Form, die /export/handout schon versteht (HandoutAnfrage).
        // Findings, Preistabelle und Verdict stammen aus dem Exposé-Kontext
        // und fehlen hier bewusst - der Worker laesst diese Bloecke seit
        // 2026-09-08 weg, statt leere Ueberschriften zu drucken.
        // `bekannt` und `objekttyp` kommen aus demselben Katalogabgleich wie
        // die zusaetzlichen Fragen oben (handoutEckdaten.js) - erst damit
        // zeigt das PDF die Eckdaten-Spalte, die im Expose-Weg schon immer da war.
        analyse: {
          titel: objekt?.title || "Objekt",
          adresse: [data?.plz || objekt?.plz, data?.ort || objekt?.ort]
            .filter(Boolean)
            .join(" "),
          kernaussage,
          objekttyp: katalog.objekttyp,
          bekannt: katalog.bekannt,
          checkliste: alleFragen.map((f) => ({
            id: f.id,
            frage: f.frage,
            kategorie: f.kategorie,
            quelle: f.vorOrt ? "vor_ort" : "makler",
          })),
        },
        auswahl: [...auswahl],
        labels,
        lang,
      },
      "Besichtigungshandout",
    );
    if (!ergebnis.ok) {
      if (
        ergebnis.fehler === "pro_noetig" ||
        ergebnis.fehler === "login_noetig" ||
        ergebnis.fehler === "kontingent"
      ) {
        setZeigeUpgrade(true);
        return;
      }
      setFehler("Das Handout ist gerade nicht erreichbar. Versuch es später noch einmal.");
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={kopfZeile}>
        <span style={gruppenTitel}>
          Fragen für den Termin · {auswahl.size} von {alleIds.length} gewählt
        </span>
        {alleIds.length > 0 && (
          <button type="button" onClick={toggleAlle} style={textLink}>
            {alleGewaehlt ? "Auswahl aufheben" : "Alle wählen"}
          </button>
        )}
      </div>

      <Block titel="An den Makler" fragen={anMakler} auswahl={auswahl} onToggle={toggle} />
      <Block titel="Vor Ort prüfen" fragen={vorOrt} auswahl={auswahl} onToggle={toggle} />

      {/* Kein gefuellter Knopf: in der Engine gibt es keinen (siehe AiEngine.jsx).
          Ein oranger Vollflaechen-Knopf mitten in fuenf gleichrangigen Produkten
          lenkt nicht, er verwirrt. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button
          type="button"
          onClick={pdfOeffnen}
          disabled={auswahl.size === 0}
          style={{
            ...knopf,
            opacity: auswahl.size === 0 ? 0.5 : 1,
            cursor: auswahl.size === 0 ? "default" : "pointer",
          }}
        >
          {/* Kein Kronen-Symbol wie im Finn-Handout: die Produktkarte traegt
              fuer Nutzer ohne Abo bereits den "Pro"-Chip in der Kopfzeile. */}
          PDF für die Besichtigung
        </button>
        {auswahl.size === 0 && (
          <span style={{ fontSize: 12.5, color: "var(--cl)" }}>
            Mindestens eine Frage auswählen.
          </span>
        )}
      </div>

      {fehler && <div style={fehlerZeile}>{fehler}</div>}

      {zeigeUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setZeigeUpgrade(false)} />
        </Suspense>
      )}
    </div>
  );
}

function Block({ titel, fragen, auswahl, onToggle }) {
  if (fragen.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ ...gruppenTitel, marginBottom: 4 }}>{titel}</div>
      {fragen.map((f) => (
        <label key={f.id} style={zeile}>
          <input
            type="checkbox"
            checked={auswahl.has(f.id)}
            onChange={() => onToggle(f.id)}
            style={kaestchen}
          />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, lineHeight: 1.5, color: "var(--ct)" }}>
              {f.frage}
            </span>
            {(f.kategorie || f.kern) && (
              <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 2 }}>
                {f.kategorie}
                {f.kern && (f.kategorie ? " · wichtig" : "wichtig")}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Stile ───────────────────────────────────────────────────────────────────
const gruppenTitel = {
  fontSize: 11,
  color: "var(--cl)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  fontWeight: 600,
};

const kopfZeile = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
};

// Die ganze Zeile ist die Trefferflaeche, nicht nur das Kaestchen: 11 px
// Kantenlaenge trifft am Telefon niemand zuverlaessig. Deshalb <label> mit
// 44 px Mindesthoehe und Haarlinie als Trenner.
const zeile = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "9px 0",
  minHeight: 44,
  borderTop: "1px solid var(--cb)",
  cursor: "pointer",
};

const kaestchen = {
  flexShrink: 0,
  width: 18,
  height: 18,
  marginTop: 2,
  accentColor: "var(--ca)",
  // iOS zoomt bei Inputs unter 16 px in das Feld hinein (CLAUDE.md).
  fontSize: 16,
};

const textLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};

const knopf = {
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "1.5px solid var(--cb)",
  background: "var(--cc)",
  color: "var(--ct)",
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
  fontFamily: "inherit",
};

const fehlerZeile = {
  marginTop: 8,
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "var(--warn-tx)",
};
