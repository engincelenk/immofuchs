import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { VollstaendigkeitsRing } from "./ObjektKPIs.jsx";
import { ObjektLage } from "./ObjektUnterlagen.jsx";
import { ObjektAnlegen } from "./ObjektAnlegen.jsx";
import { Sheet } from "../ui/Sheet.jsx";
import { InvestmentBriefing } from "./InvestmentBriefing.jsx";
import { AiEngine } from "./AiEngine.jsx";
import {
  ergebnisAnlegen,
  ergebnisFuer,
  mitErgebnis,
  produktFuer,
} from "../../utils/aiEngine.js";
import { apiFetch } from "../../utils/apiBase.js";
import { hebelVarianten } from "../../utils/aiTools.js";
import { computeRendite } from "../../utils/rendite.js";
import { berechneKennzahlen } from "../../utils/kennzahlen.js";
import { berechneBriefing, briefingZahlen } from "../../utils/briefing.js";
import { getSessionId } from "../../utils/assistantSession.js";
import { rufeAnalyseAuf, analyseFehlertext, erteileConsent } from "../../utils/aiAnalyse.js";
import { rufeLageAnalyseAuf } from "../../utils/lageAnalyse.js";
import {
  ladeRegionalpreise,
  regionalFakten,
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import { ladePlzKreis, kreisFuerPlz } from "../../utils/plzKreis.js";
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
// Hinweis 2026-09-11: ObjektAnlegen.jsx (Bearbeiten-Formular unten) fragt nur
// die sechs Kernfelder ab. Dieses Raster hier zeigt zusaetzlich an, was der
// Renditerechner an dem Objekt sonst noch gesetzt hat - beide duerfen
// auseinanderlaufen, ohne dass etwas bricht.
// Deutscher Klartext zu den Ampel-Schluesseln aus briefing.js - fuer die
// Kennzahlenzeile "ampel" im Prompt (Spec §7.2). Dieselben vier Schluessel
// stehen als Uebersetzungs-Keys in translations.js fuer die Anzeige in der
// Karte selbst; hier reicht Deutsch, weil ausschliesslich das Modell liest.
const AMPEL_TEXT = {
  brfAmpelHartStop: "Finanzierung nicht tragfähig",
  brfAmpelTraegtSich: "Trägt sich",
  brfAmpelMitZuzahlung: "Trägt sich mit Zuzahlung",
  brfAmpelTraegtSichNicht: "Trägt sich nicht",
};

export function ObjektDetail({ objekt, onBack }) {
  const { d, set, setTabExt, t, lang, updateObj } = useApp();
  const account = useAccountCtx();
  const locale = lang === "de" ? "de-DE" : "de-DE";
  const [bearbeiten, setBearbeiten] = useState(false);
  // AI-Engine: welches Produkt gerade laeuft, und ob der letzte Aufruf
  // gescheitert ist. Der fruehere "volltext"-State (welches Sheet offen ist)
  // ist mit dem UX-Review 2026-09-09 entfallen - Grundlage & Quellen klappen
  // jetzt in der Karte selbst auf, siehe AiEngine.jsx/GrundlageUndQuellen.
  const [laufend, setLaufend] = useState(null);
  // Fehler und Einwilligungs-Abfrage tragen seit 2026-09-16 die produktId
  // ({produktId, text} bzw. produktId) und werden IN der ausloesenden Karte
  // angezeigt, nicht mehr als gemeinsames Band ganz oben in der Sektion.
  //
  // Nutzer-Befund "Kaufpreis analysieren geht nicht" (dreimal gemeldet): der
  // Aufruf scheiterte und die App meldete das auch - nur stand die Meldung
  // ueber ALLEN Karten, auf dem Handy also ausserhalb des Bildes, waehrend
  // der Nutzer auf die dritte Karte schaute. Ein Fehlschlag, den niemand
  // sieht, ist von "es passiert nichts" nicht zu unterscheiden.
  const [aiFehler, setAiFehler] = useState(null);
  // Welches Produkt auf die KI-Einwilligung wartet (null = keines).
  const [aiConsent, setAiConsent] = useState(null);
  // Ortsuebliche Miete fuer die PLZ dieses Objekts. Die Tabelle (53 KB) wird
  // erst geladen, wenn eine PLZ vorliegt - sie soll das Haupt-Bundle nicht
  // belasten, genau wie plz-geo.txt. Bis 2026-09-07 erst beim Aufklappen der
  // (damals einklappbaren) AI-Sektion; die Sektion steht seither immer offen
  // im Ueberblick (UX-Review).
  const [regGeladen, setRegGeladen] = useState(false);
  // Baustein "Lage" (objektseite-vereinfachung-2026-09-23.md Abschnitt 8) -
  // eigener State statt Wiederverwendung von laufend/aiFehler/aiConsent:
  // die dortigen drei sind an eine produktId aus AI_PRODUKTE (aiEngine.js)
  // gekoppelt, Lage ist bewusst kein Eintrag dieser Registry (eigene Route,
  // eigenes Antwortschema - Fliesstext statt Erkenntnis-Struktur).
  const [lageErgebnis, setLageErgebnis] = useState(null);
  const [lageLaufend, setLageLaufend] = useState(false);
  const [lageFehler, setLageFehler] = useState(null);
  const [lageConsent, setLageConsent] = useState(false);
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

  // Einmalig laden, sobald ein Bundesland vorliegt. plzKreis.js parallel
  // dazu (Backlog Punkt 4, 2026-09-11) - beide muessen geladen sein, bevor
  // regionalPreis() die PLZ-Kreis-Stufe nutzen kann.
  useEffect(() => {
    if (!basis?.bundesland) return;
    let lebt = true;
    Promise.all([ladeRegionalpreise().catch(() => null), ladePlzKreis().catch(() => null)]).then(
      () => {
        if (lebt) setRegGeladen(true);
      },
    );
    return () => {
      lebt = false;
    };
  }, [basis?.bundesland]);

  // Ruft den Worker und legt das Ergebnis AM OBJEKT ab. Der Kern der
  // Umstellung: was Kontingent kostet, muss beim naechsten Oeffnen wieder da
  // sein - bis 2026-09 war jede Auswertung fluechtig.
  async function starteProdukt(produktId) {
    const produkt = produktFuer(produktId);
    if (!produkt || laufend) return;
    setAiFehler(null);
    setLaufend(produktId);
    // Das Briefing ersetzt analyse/hebel/preis (Spec docs/technical_specs/
    // investment-briefing.md) und braucht deshalb alles, was die drei frueher
    // einzeln brauchten: Varianten, Regionalreferenz und Standort-Fakten sind
    // jetzt unbedingt, nicht mehr produktbedingt.
    const brauchtBriefingGrundlage = produktId === "briefing";
    const varianten = brauchtBriefingGrundlage ? hebelVarianten(basis, t, locale) : [];
    // Regionaler Kaufpreis-/Mietrichtwert (2026-09-10, KI-Wow-Feature C.6-C.8):
    // Grundlage der Vergleichs-Kacheln V1-V3 (briefing.js).
    const regRef = brauchtBriefingGrundlage
      ? regionalPreis(basis.bundesland, basis.ort, basis.plz)
      : null;
    // Standort-Fakten (Backlog C.8): nur Bundesland-Ebene, siehe
    // regionalFakten()-Kommentar - keine zusaetzliche Preisgabe, da
    // "bundesland" ohnehin schon Teil der Kennzahlen unten ist.
    const standortFakten = brauchtBriefingGrundlage ? regionalFakten(basis.bundesland) : [];
    // Rechenkern des Briefings (Stufe 1, src/utils/briefing.js): Ampel,
    // Kernzahlen, sechs Vergleiche, Tragfaehigkeit, Jahres-Bild, Stresstest -
    // alles deterministisch, das Modell bekommt nur noch das Ergebnis als
    // fertigen Zahlenblock (briefingZahlen) und liefert Text dazu.
    const briefing = brauchtBriefingGrundlage
      ? berechneBriefing(basis, t, {
          ref: regRef,
          landesKaufWohnungAvg: regionalLandeswert(basis.bundesland),
          trendVorjahr: regionalWertsteigerung(basis.bundesland),
          trend4J: regionalTrend(basis.bundesland),
        })
      : null;
    const zahlen = briefing ? briefingZahlen(briefing) : [];
    // Das Handout ist das einzige Produkt, das auf dem Briefing aufsetzt: es
    // bekommt dessen Urteil sowie die TITEL der Risiken und Hebel mit (Spec
    // §9) und leitet daraus die Fragen fuer den Termin ab (Nutzer-Vorgabe
    // 2026-09-07, umgestellt auf das Briefing in Stufe 3). Nur Urteil und
    // Titel, nicht der volle Text - das Handout soll Fragen stellen, nicht
    // die Auswertung nacherzaehlen.
    const befunde =
      produktId === "handout"
        ? (() => {
            const e = ergebnisFuer(objektAnzeige, "briefing");
            const briefingTitel = produktFuer("briefing")?.titel || "Investment-Briefing";
            const urteil = e?.inhalt?.urteil;
            const risiken = Array.isArray(e?.inhalt?.risiken) ? e.inhalt.risiken : [];
            const hebelListe = Array.isArray(e?.inhalt?.hebel) ? e.inhalt.hebel : [];
            return [
              ...(urteil ? [{ produkt: briefingTitel, kernaussage: urteil }] : []),
              ...risiken
                .filter((r) => r?.title)
                .map((r) => ({ produkt: "Risiko", kernaussage: r.title })),
              ...hebelListe
                .filter((h) => h?.title)
                .map((h) => ({ produkt: "Hebel", kernaussage: h.title })),
            ];
          })()
        : [];
    try {
      // Vertiefende Kennzahlen aus berechneKennzahlen() (DSCR, Zinsdeckung,
      // Break-even-Leerstand, Anfangsrendite): berechneObjektKennzahlen() oben
      // (kennzahlenGespeichert) reicht sie bisher nicht durch, obwohl sie
      // laengst berechnet werden - siehe berechneScore()/berechneKennzahlen()
      // Nur fuer den Payload gebraucht, deshalb hier statt in einem useMemo.
      const R = computeRendite(basis, t);
      const K = berechneKennzahlen(basis, R);
      // Ort (Stadt/Kreis) darf namentlich genannt werden (Nutzer-Vorgabe
      // 2026-09-10) - nur Strasse und Hausnummer bleiben aussen vor, das
      // Modell braucht die private Adresse nicht.
      const kennzahlen = {
        kaufpreis: basis.kaufpreis,
        wohnflaeche: basis.flaeche,
        kaltmieteMonat: basis.kaltmiete,
        eigenkapital: basis.eigenkapital,
        zinssatz: basis.zinssatz,
        tilgung: basis.tilgung,
        bundesland: basis.bundesland,
        ort: basis.ort,
        baujahr: basis.baujahr,
        // Energiewert/Heizung (soweit bekannt - manuell erfasst oder aus dem
        // Expose-Scan uebernommen, siehe exposeMapping.js). Keine erfundene
        // Energieeffizienzklasse: die wird nicht auf den Rechner-Feldern
        // gespeichert, also fehlt sie hier einfach, statt geraten zu werden.
        energiewertKwhQm: basis.sanIstVerbrauch,
        heizungsart: basis.sanHt,
        heizungsalter: basis.sanHa,
        nettorendite: kennzahlenGespeichert?.nettoRendite,
        bruttorendite: kennzahlenGespeichert?.bruttoRendite,
        cashflowMonat: kennzahlenGespeichert?.cashflowMon,
        kaufpreisfaktor: kennzahlenGespeichert?.faktor,
        // Kein Score mehr im Prompt (Spec §7.2, Regel E3): die Ampel ist
        // regelbasiert ohne Score, und das Briefing-Schema verbietet dem
        // Modell, einen Score zu nennen (worker/src/analysePrompt.ts).
        ...(K.dscrIst != null ? { dscrIst: K.dscrIst } : {}),
        ...(K.icr != null ? { icr: K.icr } : {}),
        // Quelle bewusst R.ekQ (rendite.js), nicht K.ekQ - berechneKennzahlen()
        // fuehrt keine eigene EK-Quote, das waere sonst ein Verwechslungsrisiko.
        ...(R.ekQ != null ? { ekQuote: R.ekQ } : {}),
        ...(K.breakEvenLeerstand != null ? { breakEvenLeerstand: K.breakEvenLeerstand } : {}),
        ...(K.anfangsrendite != null ? { anfangsrendite: K.anfangsrendite } : {}),
        // Die vom Briefing bereits getroffene Ampel-Bewertung (Spec §7.2):
        // das Modell darf sie im Urteil weder abschwaechen noch verschaerfen
        // (worker/src/analysePrompt.ts, Prompt BRIEFING).
        ...(briefing
          ? {
              ampel: `${briefing.ampel.stufe} – ${AMPEL_TEXT[briefing.ampel.key] || briefing.ampel.key}`,
              jahre: briefing.zeitraum.jahre,
              vermoegenszuwachs: briefing.zeitraum.summe,
              zuzahlungenSumme: R.sCF,
              wertzuwachs: R.w,
              kappungsgrenzeProzent: R.kP,
            }
          : {}),
      };
      // Fetch, Consent-/Pro-/Login-/Rate-Limit-Erkennung liegen seit dem
      // Umbau in aiAnalyse.js - derselbe Kern, den jetzt auch RechnerAiKarte.jsx
      // an den 5 Nicht-Rendite-Rechnern nutzt (siehe dort).
      const res = await rufeAnalyseAuf({
        produkt: produktId,
        kennzahlen,
        zahlen,
        varianten,
        befunde,
        standortFakten,
      });
      if (!res.ok) {
        // 412 ist kein Fehler, sondern eine offene Frage: die Einwilligung in
        // die KI-Nutzung fehlt noch. Sie als "nicht erreichbar" auszugeben
        // war der Grund, warum der Zustand monatelang unerkannt blieb.
        if (res.art === "consent") {
          setAiConsent(produktId);
          return;
        }
        setAiFehler({ produktId, text: analyseFehlertext(res.art, t) });
        return;
      }
      const neu = ergebnisAnlegen(produktId, res.ergebnis, basis, {
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
      // Eigener catch fuer das Speichern: an dieser Stelle ist die Auswertung
      // fertig, angezeigt und bezahlt. Ein gescheitertes updateObj (Funkloch
      // auf dem Handy, abgelaufene Session, Objekt-Limit) darf deshalb nicht
      // im Sammel-catch unten landen und als "KI nicht erreichbar" erscheinen -
      // das Ergebnis bleibt sichtbar, nur der Hinweis ist ein anderer.
      try {
        await updateObj(objekt.id, objekt.title || "Objekt", basis, {
          resultData: neuResultData,
        });
      } catch (speicherErr) {
        console.error(`[AI-Produkt ${produktId}] Speichern fehlgeschlagen:`, speicherErr);
        setAiFehler({ produktId, text: analyseFehlertext("nichtGespeichert", t) });
      }
      // Kein Sheet mehr, das sich nach einem Lauf oeffnen muesste (UX-Review
      // 2026-09-09) - die Karte in AiEngine.jsx zeigt das frische Ergebnis
      // ueber lokaleAiErgebnisse sofort selbst an.
    } catch (err) {
      console.error(`[AI-Produkt ${produktId}] Unerwarteter Fehler:`, err);
      setAiFehler({
        produktId,
        text: analyseFehlertext("fehler", t),
      });
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
      setAiFehler({
        produktId,
        text: analyseFehlertext("fehler", t),
      });
      return;
    }
    if (produktId) starteProdukt(produktId);
  }

  // Baustein "Lage": eigener, kleiner Ablauf statt starteProdukt() - andere
  // Route (/api/v1/lage), andere Nutzlast (ort/bundesland/kreis statt
  // kennzahlen), keine produktId aus der AI_PRODUKTE-Registry.
  async function starteLage() {
    if (lageLaufend || !basis?.ort || !basis?.bundesland) return;
    setLageFehler(null);
    setLageLaufend(true);
    try {
      const res = await rufeLageAnalyseAuf({
        ort: basis.ort,
        bundesland: basis.bundesland,
        kreis: kreisFuerPlz(basis.plz),
      });
      if (!res.ok) {
        if (res.art === "consent") {
          setLageConsent(true);
          return;
        }
        setLageFehler(analyseFehlertext(res.art, t));
        return;
      }
      setLageErgebnis({ text: res.text, grounded: res.grounded, erstellt: Date.now() });
    } catch (err) {
      console.error("[Lage] Unerwarteter Fehler:", err);
      setLageFehler(analyseFehlertext("fehler", t));
    } finally {
      setLageLaufend(false);
    }
  }

  async function einwilligenUndStartenLage() {
    // Bug-Fix (Nutzer-Befund 2026-09-23): zwischen setLageConsent(false) und
    // dem Start von starteLage() lag ein await auf erteileConsent() (ein
    // eigener Netzwerk-Request), waehrend dessen KEIN Zustand einen
    // Ladehinweis zeigte - die Karte fiel fuer diese Zeitspanne auf den
    // Leerlauf-Knopf zurueck. Ohne sichtbare Reaktion auf den ersten Klick
    // hat der Nutzer mehrfach geklickt, das hat parallele Consent+Lage-Laeufe
    // ausgeloest und im Log wiederholte Aufrufe erzeugt. lageLaufend jetzt
    // SOFORT gesetzt, noch vor dem await - die Karte zeigt ab dem ersten
    // Klick durchgehend "Wird berechnet ...", kein Leerlauf-Fenster mehr.
    if (lageLaufend) return;
    setLageConsent(false);
    setLageLaufend(true);
    const ok = await erteileConsent();
    if (!ok) {
      setLageLaufend(false);
      setLageFehler(analyseFehlertext("fehler", t));
      return;
    }
    starteLage();
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
          // Bestehende Herkunftsvermerke mitgeben, sonst gaelte nach jedem
          // Bearbeiten alles wieder als Annahme (objektseite-neu.md §7.2).
          startHerkunft={objekt.kennzahlen?.herkunft || null}
          onAbbrechen={() => setBearbeiten(false)}
          onAnlegen={async (name, daten, herkunft) => {
            await updateObj(objekt.id, name, daten, { herkunft });
            setBearbeiten(false);
            // Zurueck zur Liste: das Objekt wird dort frisch aus dem
            // aktualisierten Stand gerendert. Ohne das zeigte die
            // Detailansicht weiter die Werte von vor der Bearbeitung.
            onBack();
          }}
        />
      </Sheet>

      {/* Seitenaufbau nach docs/technical_specs/objektseite-neu.md §22.
          Entfallen sind mit diesem Umbau:
            - `Ueberblick` als eigener Block: seine Kennzahlen stecken jetzt in
              Block 3, der Score 0-100 entfaellt am Objekt ganz (Entscheidung
              E1 - ein Urteil, keine zweite Skala; im Renditerechner bleibt er).
            - `RegionalSnapshot` als eigener Block: geht in Block 4a auf.
            - Die Sammelsektion `AiSektion`/`AiEngine`: aus der Karten-Etage
              werden zwei Knoepfe am Seitenende.
            - Die Klappsektion "Belege" und die Lage als eigene Ebenen: beide
              liegen jetzt unter "Alle Details" (Block 9).
          Die Dateien bleiben bestehen, nur ihre Einbindung hier aendert sich. */}
      <InvestmentBriefing
        objekt={objektAnzeige}
        data={basis}
        kennzahlen={kennzahlenGespeichert}
        locale={locale}
        t={t}
        regGeladen={regGeladen}
        laufend={laufend === "briefing"}
        fehlerText={aiFehler?.produktId === "briefing" ? aiFehler.text : null}
        zeigtConsent={aiConsent === "briefing"}
        onStarten={() => starteProdukt("briefing")}
        onConsentJa={einwilligenUndStarten}
        onConsentAbbrechen={() => setAiConsent(null)}
        onBearbeiten={() => setBearbeiten(true)}
        lageErgebnis={lageErgebnis}
        lageLaufend={lageLaufend}
        lageFehler={lageFehler}
        lageConsent={lageConsent}
        onLageStarten={starteLage}
        onLageConsentJa={einwilligenUndStartenLage}
        onLageConsentAbbrechen={() => setLageConsent(false)}
        detailsExtra={
          <div style={{ marginTop: 16 }}>
            <ObjektLage data={basis} titel={objekt.title} />
          </div>
        }
      />

      {/* Besichtigungshandout (Bug-Fix 2026-09-22: die Karte war seit dem
          UX-Review 2026-09-05 durch zwei bare Knoepfe ersetzt, die weder
          Laden/Fehler/Einwilligung noch das fertige Ergebnis anzeigten - ein
          Klick loeste den KI-Aufruf zwar korrekt aus, aber nichts davon war
          je sichtbar. AiEngine.jsx hatte das alles bereits fertig gebaut,
          war nur nirgends mehr eingebunden. "Exposé einlesen" steht hier
          nicht mehr: der Upload ist bereits bei Objekt anlegen/bearbeiten
          vorhanden, AiEngine fuehrt ohnehin nur "handout" (expose ist dort
          bewusst nicht mehr gelistet, siehe GRUPPEN in AiEngine.jsx). */}
      <div id="ai-sektion-vorbereiten" style={{ marginTop: 16 }}>
        <AiEngine
          objekt={objektAnzeige}
          data={basis}
          hasFullInput={hasFullInput}
          proAktiv={account?.zugang !== "keiner"}
          laufend={laufend}
          onStarten={starteProdukt}
          onExpose={oeffneExpose}
          locale={locale}
          fehler={aiFehler}
          consentFuer={aiConsent}
          onConsentJa={einwilligenUndStarten}
          onConsentAbbrechen={() => setAiConsent(null)}
        />
      </div>

      {/* Zurueck in den Renditerechner - der einzige verbliebene Weg dorthin,
          frueher der "Laden"-Knopf im Ueberblick. */}
      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={() => inRechner("haupt")} style={knopfSekundaer}>
          {t.objImRechner || "Im Renditerechner öffnen"}
        </button>
      </div>
    </div>
  );
}

const knopfSekundaer = {
  flex: "1 1 180px",
  width: "100%",
  minHeight: 44,
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid var(--cb)",
  background: "var(--cc)",
  color: "var(--ct)",
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

// Fehlerband, Einwilligungs-Band und dessen Knoepfe sind 2026-09-16 nach
// AiEngine.jsx gewandert - sie gehoeren in die ausloesende Produktkarte.

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

