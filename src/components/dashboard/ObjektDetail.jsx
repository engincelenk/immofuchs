import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";
import { VollstaendigkeitsRing } from "./ObjektKPIs.jsx";
import { Ueberblick } from "./Ueberblick.jsx";
import { ObjektLage } from "./ObjektUnterlagen.jsx";
import { ObjektAnlegen } from "./ObjektAnlegen.jsx";
import { Sheet } from "../ui/Sheet.jsx";
import { AiEngine } from "./AiEngine.jsx";
import {
  AI_PRODUKTE,
  ergebnisAnlegen,
  ergebnisFuer,
  ergebnisseLesen,
  mitErgebnis,
  produktFuer,
} from "../../utils/aiEngine.js";
import { apiFetch } from "../../utils/apiBase.js";
import { hebelVarianten } from "../../utils/aiTools.js";
import { getSessionId } from "../../utils/assistantSession.js";
import { ladeMietReferenz, referenzMiete } from "../../utils/mietReferenz.js";
import {
  fortschreibungsfaktor,
  ladeMietenFortschreibung,
} from "../../utils/mietenFortschreibung.js";
import { berechnePreisSchaetzung, preisZeilen } from "../../utils/preisSchaetzung.js";
import {
  berechneObjektKennzahlen,
  berechneVollstaendigkeit,
} from "../../utils/objektKennzahlen.js";

// Schritt A4 und C des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md).
//
// Aus der frueheren schlanken Detailkarte mit einem "Im Rechner oeffnen"-Knopf
// wird der Objekt-Container. Die frueher hier stehende Chip-Leiste ist mit
// dem UX-Review 2026-09-07 entfallen (siehe Kommentar unten) - die einzige
// verbliebene Verlinkung zu einem Rechner ist der "Laden"-Knopf im
// Ueberblick, der in den Renditerechner fuehrt.
//
// UX-Review 2026-09-07: die Chip-Leiste (Ueberblick/Stellschrauben/Belege/
// Unterlagen) ist entfallen. Stellschrauben gehoert inhaltlich zum
// Renditerechner (dort bereits editierbar) und wurde hier nie zu Ende
// gepflegt; Belege und Unterlagen beantworten dieselbe Frage wie der
// Ueberblick ("wie kommen die Zahlen zustande, was liegt vor") und stehen
// jetzt als aufklappbare Sektionen direkt darunter - eine Seite statt vier
// Reiter mit je einem Klick Umweg.
// Hinweis 2026-09-08: ObjektAnlegenWizard.jsx (Schritt-fuer-Schritt-Anlage)
// gruppiert dieselben Felder in eigene Schritte. Bewusst NICHT von hier
// importiert - ObjektAnlegen.jsx wird auch von DIESER Datei importiert
// (Bearbeiten-Sheet unten), ein Import in Gegenrichtung waere ein
// Zirkelbezug. Dieses Raster hier zeigt nur an, was gespeichert IST; der
// Wizard fragt ab, was gespeichert WERDEN soll. Beide duerfen deshalb
// auseinanderlaufen, ohne dass etwas bricht.
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
  const { d, set, setTabExt, t, lang, updateObj, isProSavedObjects } = useApp();
  const istPro = Boolean(isProSavedObjects);
  const locale = lang === "de" ? "de-DE" : "de-DE";
  const [bearbeiten, setBearbeiten] = useState(false);
  // AI-Engine: welches Produkt gerade laeuft, und ob der letzte Aufruf
  // gescheitert ist. Der fruehere "volltext"-State (welches Sheet offen ist)
  // ist mit dem UX-Review 2026-09-09 entfallen - Grundlage & Quellen klappen
  // jetzt in der Karte selbst auf, siehe AiEngine.jsx/GrundlageUndQuellen.
  const [laufend, setLaufend] = useState(null);
  const [aiFehler, setAiFehler] = useState(null);
  // Welches Produkt auf die KI-Einwilligung wartet (null = keines).
  const [aiConsent, setAiConsent] = useState(null);
  // Ortsuebliche Miete fuer die PLZ dieses Objekts. Die Tabelle (53 KB) wird
  // erst geladen, wenn eine PLZ vorliegt - sie soll das Haupt-Bundle nicht
  // belasten, genau wie plz-geo.txt. Bis 2026-09-07 erst beim Aufklappen der
  // (damals einklappbaren) AI-Sektion; die Sektion steht seither immer offen
  // im Ueberblick (UX-Review), das Laden haengt deshalb nur noch an der PLZ.
  // undefined = noch nicht geladen, null = fuer diese PLZ keine Referenz,
  // Zahl = EUR/m2. Die drei Zustaende sind unterscheidbar, weil "laedt noch"
  // und "gibt es nicht" dem Nutzer Verschiedenes sagen muessen.
  const [ortsMiete, setOrtsMiete] = useState(undefined);
  // Sofort sichtbarer Stand nach "Fuer dieses Objekt uebernehmen"
  // (Stellschrauben, UX-Review 2026-09-06): updateObj() persistiert, aber der
  // Prop `objekt` selbst aendert sich dadurch nicht - Merkliste haelt
  // detailObj unabhaengig davon. Ohne diese lokale Ueberlagerung zeigte der
  // Ueberblick nach dem Uebernehmen weiter die ALTEN Zahlen, bis der Nutzer
  // das Objekt verlaesst und neu oeffnet. Bezieht sich immer auf dasselbe
  // objekt.id: ein echter Objektwechsel geht immer ueber onBack() und damit
  // ueber ein Neu-Mounten dieser Komponente (siehe Merkliste.jsx - solange
  // detailObj gesetzt ist, kann kein zweiter openDetail()-Aufruf dazwischen).
  // Bug-Fix 2026-09-07, gleiches Muster wie lokaleAenderung oben: updateObj()
  // persistiert eine neue KI-Auswertung nur am Server, der Prop `objekt`
  // aendert sich dadurch nicht. Ohne diese Ueberlagerung las AiVolltext das
  // ALTE objekt, fand kein Ergebnis und das Sheet oeffnete sich nie - obwohl
  // die Antwort laengst da war und Kontingent verbraucht wurde.
  const [lokaleAiErgebnisse, setLokaleAiErgebnisse] = useState(null);
  const objektAnzeige = lokaleAiErgebnisse
    ? { ...objekt, kennzahlen: lokaleAiErgebnisse }
    : objekt;

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

  // Erst beim Aufklappen laden, und nur einmal je Objekt. Ein Fehlschlag
  // bleibt still: die Preiseinordnung zeigt dann "keine Mietreferenz", alle
  // anderen Produkte laufen unveraendert weiter.
  useEffect(() => {
    if (!basis?.plz) return;
    let lebt = true;
    // Zwei unabhaengige Tabellen, parallel geladen: die Zensus-Ortsmiete
    // (PLZ-genau) und der Destatis-Fortschreibungsfaktor (bundeslandweit),
    // der sie auf das aktuelle Jahr hochrechnet. Faellt die Fortschreibung
    // aus, bleibt der Faktor bei 1 (siehe mietenFortschreibung.js) - die
    // Zensuszahl zeigt dann unveraendert weiter an, statt ganz zu fehlen.
    Promise.all([
      ladeMietReferenz().catch(() => null),
      ladeMietenFortschreibung().catch(() => null),
    ]).then(() => {
      if (!lebt) return;
      const basisMiete = referenzMiete(basis.plz);
      if (basisMiete == null) {
        setOrtsMiete(null);
        return;
      }
      const faktor = fortschreibungsfaktor(basis.bundesland);
      setOrtsMiete(Math.round(basisMiete * faktor * 100) / 100);
    });
    return () => {
      lebt = false;
    };
  }, [basis?.plz, basis?.bundesland]);

  // Ruft den Worker und legt das Ergebnis AM OBJEKT ab. Der Kern der
  // Umstellung: was Kontingent kostet, muss beim naechsten Oeffnen wieder da
  // sein - bis 2026-09 war jede Auswertung fluechtig.
  async function starteProdukt(produktId) {
    const produkt = produktFuer(produktId);
    if (!produkt || laufend) return;
    setAiFehler(null);
    setLaufend(produktId);
    // Nur "hebel" braucht Varianten - fuer die Einordnung eines Objekts
    // ("analyse") sind Was-waere-wenn-Rechnungen kein Eingangswert.
    const varianten = produktId === "hebel" ? hebelVarianten(basis, t, locale) : [];
    // Die Preiseinordnung wird VOR dem Modellaufruf gerechnet und mitgesendet.
    // Das Modell schaetzt hier nichts - es ordnet fertige Zahlen ein.
    //
    // Seit 2026-09-07 bekommt auch "analyse" diese Zahlen: Der Prompt dort
    // verlangte eine Einordnung des Preisniveaus, lieferte dem Modell aber
    // keine einzige Vergleichszahl - es hat daraufhin Verkehrswerte erfunden.
    // Der Anker gehoert zum Prompt-Fix (siehe worker/src/analysePrompt.ts).
    const brauchtOrtsmiete = produktId === "preis" || produktId === "analyse";
    const schaetzung = brauchtOrtsmiete ? berechnePreisSchaetzung(basis, t, ortsMiete) : null;
    const zahlen = schaetzung?.verfuegbar ? preisZeilen(schaetzung, locale) : [];
    // Das Handout ist das einzige Produkt, das auf den anderen aufsetzt: es
    // bekommt die Kernaussagen der bereits erstellten Auswertungen mit und
    // leitet daraus die Fragen fuer den Termin ab (Nutzer-Vorgabe 2026-09-07).
    // Nur die Kernaussage, nicht der ganze Text - das Handout soll Fragen
    // stellen, nicht die Analysen nacherzaehlen.
    const befunde =
      produktId === "handout"
        ? ["analyse", "hebel", "preis"]
            .map((id) => {
              const e = ergebnisFuer(objektAnzeige, id);
              const kern = e?.inhalt?.kernaussage;
              return kern ? { produkt: produktFuer(id)?.titel || id, kernaussage: kern } : null;
            })
            .filter(Boolean)
        : [];
    try {
      const res = await apiFetch("/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkt: produktId,
          ...(varianten.length > 0 ? { varianten } : {}),
          ...(zahlen.length > 0 ? { zahlen } : {}),
          ...(befunde.length > 0 ? { befunde } : {}),
          // Nur Kennzahlen, keine Adresse und kein Name - das Modell braucht
          // sie nicht, also gehen sie auch nicht raus.
          kennzahlen: {
            kaufpreis: basis.kaufpreis,
            wohnflaeche: basis.flaeche,
            kaltmieteMonat: basis.kaltmiete,
            eigenkapital: basis.eigenkapital,
            zinssatz: basis.zinssatz,
            tilgung: basis.tilgung,
            bundesland: basis.bundesland,
            baujahr: basis.baujahr,
            nettorendite: kennzahlenGespeichert?.nettoRendite,
            bruttorendite: kennzahlenGespeichert?.bruttoRendite,
            cashflowMonat: kennzahlenGespeichert?.cashflowMon,
            kaufpreisfaktor: kennzahlenGespeichert?.faktor,
            score: kennzahlenGespeichert?.score,
          },
          // Die KI-Session des Geraets, NICHT die Objekt-ID. Der Worker
          // prueft daran die Einwilligung; mit der Objekt-ID gab es die
          // naturgemaess nie und jeder Aufruf endete in 412.
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) {
        const daten = await res.json().catch(() => ({}));
        // 412 ist kein Fehler, sondern eine offene Frage: die Einwilligung in
        // die KI-Nutzung fehlt noch. Sie als "nicht erreichbar" auszugeben
        // war der Grund, warum der Zustand monatelang unerkannt blieb.
        if (res.status === 412 || daten.error === "consent_required") {
          setAiConsent(produktId);
          return;
        }
        setAiFehler(
          res.status === 402
            ? "Diese Auswertung gehört zu ImmoFuchs Pro."
            : res.status === 401
              ? "Bitte melde dich an, um die Auswertung zu starten."
              : daten.error === "rate_limit_exceeded"
                ? "Tageslimit erreicht — morgen wieder verfügbar."
                : "Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.",
        );
        return;
      }
      const { ergebnis } = await res.json();
      const neu = ergebnisAnlegen(produktId, ergebnis, basis, {
        ...(varianten.length > 0 ? { varianten } : {}),
        ...(zahlen.length > 0 ? { zahlen } : {}),
      });
      // Basis fuer den Merge ist die bereits ueberlagerte Ansicht, nicht das
      // stale objekt - sonst wuerde ein zweiter Produktaufruf im selben
      // Besuch das Ergebnis des ersten wieder verlieren (Bug B, siehe oben).
      const neuResultData = mitErgebnis(
        lokaleAiErgebnisse || objekt.kennzahlen || objekt.resultData,
        neu,
      );
      setLokaleAiErgebnisse(neuResultData);
      await updateObj(objekt.id, objekt.title || "Objekt", basis, {
        resultData: neuResultData,
      });
      // Kein Sheet mehr, das sich nach einem Lauf oeffnen muesste (UX-Review
      // 2026-09-09) - die Karte in AiEngine.jsx zeigt das frische Ergebnis
      // ueber lokaleAiErgebnisse sofort selbst an.
    } catch {
      setAiFehler("Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.");
    } finally {
      setLaufend(null);
    }
  }

  // Einwilligung erteilen und den blockierten Lauf sofort wiederholen -
  // dasselbe Muster wie giveConsentAndRetry() im Assistenten.
  async function einwilligenUndStarten() {
    const produktId = aiConsent;
    setAiConsent(null);
    try {
      await apiFetch("/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId() }),
      });
    } catch {
      setAiFehler("Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.");
      return;
    }
    if (produktId) starteProdukt(produktId);
  }

  // Der Exposé-Scan lebt weiterhin im Assistenten-Sheet (dort haengen Upload,
  // Feld-Uebernahme und Handout). Von hier fuehrt der Weg dorthin.
  function oeffneExpose() {
    window.dispatchEvent(new CustomEvent("if:expose-oeffnen", { detail: { objektId: objekt.id } }));
  }

  function inRechner(rechnerTab) {
    const { tab: _legacy, ...data } = gespeichert;
    Object.entries(data).forEach(([k, v]) => set(k, v));
    // Zweites Argument = Rundweg-Zustand in App.jsx (aktivesObjekt): traegt
    // die Ruecksprungleiste "<- Objekt: {Name}" UND sorgt dafuer, dass
    // "Speichern" im Rechner dieses Objekt aktualisiert statt ein neues
    // anzulegen (UX-Review 2026-09-06).
    setTabExt(rechnerTab, { id: objekt.id, name: objekt.title || "Objekt" });
  }

  return (
    <div className="objekt-detail">
      <button onClick={onBack} style={backBtnStyle}>
        ← Zurück
      </button>

      {/* Kopf */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "4px 2px 14px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
            {objekt.title || "Objekt"}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--ch)", marginTop: 4 }}>
            {[objekt.plz, objekt.ort].filter(Boolean).join(" ") || "Ohne Adresse"}
            {objekt.source === "expose-scan" && " · aus Exposé"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBearbeiten(true)}
          aria-label="Objekt bearbeiten"
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 10,
            border: "1px solid var(--cb)",
            background: "var(--cc)",
            color: "var(--ct)",
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✎
        </button>
        <VollstaendigkeitsRing prozent={vollstaendigkeit} groesse={46} />
      </div>

      <Sheet
        open={bearbeiten}
        onClose={() => setBearbeiten(false)}
        label="Objekt bearbeiten"
        size="min(720px, 100vw)"
      >
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Objekt bearbeiten</div>
        <ObjektAnlegen
          t={t}
          bearbeiten
          startwerte={basis}
          startName={objekt.title || ""}
          onAbbrechen={() => setBearbeiten(false)}
          onAnlegen={async (name, daten) => {
            await updateObj(objekt.id, name, daten);
            setBearbeiten(false);
            // Zurueck zur Liste: das Objekt wird dort frisch aus dem
            // aktualisierten Stand gerendert. Ohne das zeigte die
            // Detailansicht weiter die Werte von vor der Bearbeitung.
            onBack();
          }}
        />
      </Sheet>

      <Ueberblick
        kennzahlen={kennzahlenGespeichert}
        data={basis}
        locale={locale}
        onRechnerLaden={() => inRechner("haupt")}
        onBearbeiten={() => setBearbeiten(true)}
      />

      <AiSektion zusammenfassung={aiZusammenfassung(objektAnzeige, locale)}>
        {/* Das Fehlerband gehoert IN die Sektion, direkt bei den Knoepfen,
            auf die es sich bezieht. */}
        {aiFehler && <div style={fehlerBand}>{aiFehler}</div>}
        {aiConsent && (
          <div style={consentBand}>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              Für die Auswertung werden die Kennzahlen dieses Objekts an unseren
              KI-Dienstleister übertragen — ohne Adresse und ohne Namen. Einverstanden?
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={einwilligenUndStarten} style={consentJa}>
                Einverstanden, starten
              </button>
              <button type="button" onClick={() => setAiConsent(null)} style={consentNein}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
        <AiEngine
          objekt={objektAnzeige}
          data={basis}
          hasFullInput={hasFullInput}
          proAktiv={istPro}
          laufend={laufend}
          locale={locale}
          onStarten={starteProdukt}
          onExpose={oeffneExpose}
          referenzMiete={ortsMiete}
        />
      </AiSektion>

      {/* Ehemals eigene Reiter "Belege"/"Unterlagen" (UX-Review 2026-09-07):
          beide beantworten dieselbe Frage wie der Ueberblick ("wie kommen die
          Zahlen zustande, was liegt vor") und stehen deshalb als aufklappbare
          Sektionen direkt darunter, aufgeklappt untereinander statt in einem
          eigenen Reiter. Direkte Rechner-Verlinkungen (ehem. RechnerListe)
          sind entfallen - der einzige Weg zu den Rechnern ist jetzt der
          "Laden"-Knopf im Ueberblick oben, der in den Renditerechner fuehrt. */}
      <Klappsektion titel="Belege" untertitel="Wie kommen die Zahlen zustande?">
        <AlleDaten data={basis} objekt={objekt} locale={locale} />
      </Klappsektion>

      {/* Die Sektion "Unterlagen" (lokale Dateiablage) ist am 2026-09-08
          entfallen. Sie lag rein im Browser des jeweiligen Geraets, war damit
          auf keinem zweiten Geraet sichtbar und hat als Ablage mehr
          versprochen, als sie halten konnte. ObjektUnterlagen.jsx bleibt
          vorerst im Code, wird aber nirgends mehr gerendert. */}

      {/* Lage ganz unten, nicht mehr in einem eigenen Reiter, ohne
          eingebettete Karte (UX-Review 2026-09-07) - siehe ObjektLage. */}
      <div style={{ marginTop: 16 }}>
        <ObjektLage data={basis} titel={objekt.title} />
      </div>
    </div>
  );
}

// Marineblau ist in der App die "Denk-Farbe" fuer KI. Sie steht hier an genau
// einer Stelle: der Glyphe der Sektion. Das Urteil im Ueberblick darueber ist
// Regelwerk, kein Modell - und traegt deshalb bewusst kein Sparkle.
const KI_FARBE = "#1E3A5F";

// Die AI-Engine als Sektion am Ende des Ueberblicks (UX-Review 2026-09-05).
// Vorher ein eigener Chip - dort lag sie aber getrennt von den Kennzahlen,
// auf die sie sich bezieht.
//
// Bis 2026-09-07 aufklappbar und standardmaessig zu: Nutzer, fuer die genau
// diese drei Auswertungen der Kern des Objekt-Screens sind, mussten dafuer
// erst einen Pfeil treffen, und ein bereits fertiges Ergebnis blieb hinter
// dem Klapptext verborgen. Die Sektion steht deshalb jetzt immer offen -
// anders als Belege/Unterlagen (Klappsektion unten), die Zusatzbelege statt
// des Kerngeschehens sind.
function AiSektion({ zusammenfassung, children }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          padding: "8px 2px",
        }}
      >
        <span aria-hidden="true" style={{ flexShrink: 0, color: KI_FARBE, fontSize: 13.5 }}>
          ✦
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>
            KI-Auswertung
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 4 }}>
            {zusammenfassung}
          </span>
        </span>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

// Generische aufklappbare Sektion fuer Belege/Unterlagen (UX-Review
// 2026-09-07): beide waren eigene Reiter, beantworten aber dieselbe Frage wie
// der Ueberblick darueber - deshalb hier als Sektion statt als Wechsel der
// ganzen Seite. Standardmaessig zu, anders als die AI-Sektion: das sind
// Zusatzbelege, die man bei Bedarf nachschlaegt, nicht der Kern des Screens.
function Klappsektion({ titel, untertitel, children }) {
  const [offen, setOffen] = useState(false);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minHeight: 44,
          padding: "8px 2px",
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>
            {titel}
          </span>
          {untertitel && (
            <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 4 }}>
              {untertitel}
            </span>
          )}
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 13.5, color: "var(--ch)" }}>
          {offen ? "▲" : "▼"}
        </span>
      </button>
      {offen && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// Zustand statt Werbung in der Kopfzeile: "2 von 4 erstellt" beantwortet die
// Frage, wegen der man aufklappt. Ein Nutzenversprechen an dieser Stelle
// waere eine Anzeige, die bei jedem Objektaufruf mitscrollt.
function aiZusammenfassung(objekt, locale) {
  const ergebnisse = ergebnisseLesen(objekt);
  const vorhanden = AI_PRODUKTE.filter((p) => ergebnisse[p.id]);
  if (vorhanden.length === 0) return "Noch keine Auswertung";

  const neuestes = vorhanden
    .map((p) => ergebnisse[p.id]?.erstellt)
    .filter(Boolean)
    .sort()
    .pop();
  const d = neuestes ? new Date(neuestes) : null;
  const datum =
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
      : null;

  return `${vorhanden.length} von ${AI_PRODUKTE.length} erstellt${datum ? ` · zuletzt ${datum}` : ""}`;
}

// Tiefenstufe 3: alle Felder, gruppiert. Seit dem UX-Review 2026-09-05 in EINER
// Karte mit Haarlinien statt in vier Karten, und zweispaltig statt als
// Label-links/Wert-rechts-Zeilen.
//
// Der Grund: "PLZ ......... 70190" verbrauchte 347 px fuer neun Zeichen. Vier
// Karten kosteten zusaetzlich viermal Innenabstand und acht Rahmenlinien fuer
// dieselbe Informationsart. Der Reiter war mit 828 px der laengste der App.
//
// Die Einheit ist vom Label an den Wert gewandert ("Kaufpreis (€) / 285.000"
// wurde zu "Kaufpreis / 285.000 €"). Das verkuerzt genau die Labels, die in
// einer 151-px-Spalte kurz sein muessen, und macht die Werte selbsterklaerend.
//
// auto-fit minmax() statt fester Spaltenzahl: bei 319 px Inhaltsbreite ergeben
// sich zwei Spalten, auf sehr schmalen Geraeten faellt das Raster von selbst
// auf eine zurueck. Dasselbe Muster wie in ObjektKPIs.jsx - kein neues.
// Der Reiter "Belege" (bis 2026-09-06 zwei getrennte Reiter "Rechner" und
// "Daten") beantwortet "wie kommen die Zahlen zustande?" - dieses Feldraster
// zeigt die Rohwerte, RechnerListe darunter die Wege zu den vollen
// Berechnungen. Der fruehere Trittstein-Knopf "Im Rechner oeffnen" ist
// entfallen: Rendite steht jetzt als erste Zeile in RechnerListe, ein
// zweiter Weg zum selben Ziel waere Redundanz.
function AlleDaten({ data, objekt, locale }) {
  const gesetzt = (v) => v != null && String(v).trim() !== "" && String(v) !== "0";
  const gruppen = FELD_GRUPPEN.map((g) => ({
    titel: g.titel,
    zeilen: g.felder.filter(([k]) => gesetzt(data[k])),
  })).filter((g) => g.zeilen.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{felderRasterCss}</style>
      {gruppen.length > 0 && (
        <div style={datenKarte}>
          {gruppen.map((g, i) => (
            <div key={g.titel} style={i === 0 ? undefined : gruppenTrenner}>
              <div style={gruppenTitel}>{g.titel}</div>
              <div className="objekt-felder">
                {g.zeilen.map(([k, label, einheit]) => (
                  <div key={k}>
                    <div style={feldLabel}>{label}</div>
                    <div style={feldWert}>{formatWert(data[k], einheit, locale)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metadaten - Orientierung bei mehreren Objekten */}
      <div style={{ fontSize: 12.5, color: "var(--cl)", padding: "2px 4px", lineHeight: 1.6 }}>
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
        {/* Die Bewertung ist eine Metazeile wie die beiden darueber, keine
            eigene Sektion: als alleinstehender Chip belegte sie eine ganze
            Zeile von 347 px fuer rund 110 px Inhalt. */}
        {objekt.score != null && (
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>Bewertung</span>
            <span
              style={{
                background: scoreBadgeColor(objekt.scoreLabel),
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              {scoreBadgeText(objekt.scoreLabel)} ({objekt.score})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Rohwerte lesbar machen: Tausenderpunkte bei Betraegen, Komma statt Punkt
// bei Prozentsaetzen - der Formular-State haelt sie als englische Strings.
//
// Die Einheit haengt seit 2026-09-05 am Wert statt am Label (siehe AlleDaten).
// Einheitenlose Zahlen bleiben unformatiert: ein Tausenderpunkt im Baujahr
// ("1.996") oder in der PLZ waere schlicht falsch.
// Zaehlbare Einheiten brauchen einen Singular, sobald die Einheit am Wert
// haengt: "1 Monate" las sich vorher nie, weil die Einheit im Label stand
// ("Leerstand (Monate) ... 1").
const SINGULAR = { Monate: "Monat", Jahre: "Jahr" };

function formatWert(wert, einheit, locale) {
  const s = String(wert ?? "");
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return s;
  if (!einheit) return s;
  const zahl =
    einheit === "€" || einheit === "€/Monat" ? n.toLocaleString(locale) : s.replace(".", ",");
  const wortform = n === 1 && SINGULAR[einheit] ? SINGULAR[einheit] : einheit;
  return `${zahl} ${wortform}`;
}

const datenKarte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "12px 14px",
};

const gruppenTrenner = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid var(--cb)",
};

const gruppenTitel = {
  fontSize: 11,
  color: "var(--cl)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  fontWeight: 600,
  marginBottom: 8,
};

// Raster der Feldpaare (Bugreport 2026-09-08: "sieht aus als ob random Text
// irgendwo steht").
//
// Vorher: repeat(auto-fit, minmax(148px, 1fr)). Auf Mobil ergab das die
// gewollten zwei Spalten - auf einer 1116px breiten Desktop-Karte aber
// SIEBEN. Eine Gruppe mit drei Feldern verteilte sich dann ueber die ganze
// Breite, mit vier leeren Spalten dahinter: Label und Wert standen weit
// voneinander entfernt im Nichts, ohne erkennbare Zeilenstruktur.
//
// auto-fit ist genau dafuer das falsche Werkzeug - es fuellt die Breite, statt
// eine Lesestruktur zu halten. Feste Spaltenzahl je Stufe, gedeckelt bei vier:
// darueber wird die Zuordnung Label->Wert ueber die Distanz unlesbar, egal wie
// viel Platz da ist. Der Rest der Breite bleibt bewusst leer.
// Die Spaltenzahl steht KOMPLETT im Stylesheet, nicht teilweise inline:
// ein Inline-Style gewinnt gegen jede Klassenregel (ausser !important), die
// Media Queries unten waeren sonst wirkungslos.
const felderRasterCss = `
.objekt-felder{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  column-gap:24px;row-gap:14px;max-width:900px}
@media(min-width:700px){ .objekt-felder{grid-template-columns:repeat(3,minmax(0,1fr))} }
@media(min-width:1000px){ .objekt-felder{grid-template-columns:repeat(4,minmax(0,1fr))} }
`;

const feldLabel = {
  fontSize: 11,
  color: "var(--cl)",
  lineHeight: 1.3,
};

// Wert direkt unter dem Label, gleiche Spalte, enger Abstand: das Paar muss
// als EINE Einheit lesbar sein, sonst sucht das Auge bei jedem Feld neu.
const feldWert = {
  fontSize: 13.5,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  marginTop: 2,
};

// Die Einwilligung traegt bewusst NICHT die Fehlerfarbe: es ist kein Fehler,
// sondern eine Frage, die der Nutzer im selben Zug beantworten kann.
const consentBand = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 12,
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
  marginBottom: 12,
};

const backBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--ca)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  // 6px Polsterung ergab 28 px Trefferflaeche - unter jedem Richtwert.
  // Der negative Rand haelt den Text trotzdem buendig zur Spalte.
  minHeight: 44,
  padding: "0 4px",
  marginLeft: -4,
  fontFamily: "inherit",
};

