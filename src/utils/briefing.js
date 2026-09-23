// Rechenkern der Objektseite (Objektseiten-Neubau, docs/technical_specs/
// objektseite-neubau-2026-09-22.md, Bausteine 3/4/5/7). Reine Funktionen nach
// dem Muster von kennzahlen.js/investmentScore.js - kein React, kein fetch,
// kein Modul-State.
//
// Grundprinzip (Baustein 3/6): "Zahlen aus der Engine, Worte von der KI".
// Jede Zahl der Karte entsteht hier deterministisch aus dem Formular-State;
// die KI bekommt sie fertig formatiert und rechnet nichts nach. Die
// Funktionen liefern deshalb Struktur + Uebersetzungs-SCHLUESSEL, keine
// fertigen UI-Saetze - einzige Ausnahme ist briefingZahlen() am Dateiende,
// das den deutschen KI-Block baut (die Prompts sind ebenfalls deutsch, siehe
// hebelVarianten() in aiTools.js).
//
// Ein Scoring statt zwei (Nutzer-Entscheidung 2026-09-22): die EINE
// Ampel-Quelle ist berechneScore() aus investmentScore.js (Baustein 1) - sie
// wird hier importiert und unveraendert durchgereicht. Was frueher
// "briefingAmpel()" hiess, ist eine reine CASHFLOW-Einordnung (traegt sich/
// mit Zuzahlung/nicht/Hard-Stop) fuer die Begruendungs-Formulierung - sie
// erscheint nirgends mehr als eigenstaendiger Badge und heisst deshalb jetzt
// cashflowUrteil(), nicht mehr "Ampel". Das Feld `ampel` im Rueckgabewert von
// berechneBriefing() bleibt aus Kompatibilitaetsgruenden bestehen (Baustein-
// Umbau der Anzeige folgt in InvestmentBriefing.jsx/BriefingVisuals.jsx).
//
// Alle Schwellen stehen als benannte Konstanten hier oben, nicht in
// Komponenten - sie sind Fachurteil, nicht kalibriert und muessen sich an
// einer Stelle nachjustieren lassen.

import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import {
  berechneScore,
  berechneSzenarien,
  energieKlasse,
  RUECKLAGE_MINDEST,
} from "./investmentScore.js";
import { loeseFuerCashflowNull } from "./aiTools.js";
import { fmt } from "./helpers.js";

// Re-Export: energieKlasse()/RUECKLAGE_MINDEST leben jetzt fachlich in
// investmentScore.js (D4), briefingFlaggen() unten braucht dieselbe
// Tabelle/Funktion wie der Score - bestehende Importe aus "./briefing.js"
// (briefing.test.js, ggf. Komponenten) bleiben dadurch gueltig.
export { energieKlasse, RUECKLAGE_MINDEST };

// Zuzahlung bis 20 % der Kaltmiete gilt noch als "traegt sich mit Zuzahlung".
export const ZUZAHLUNG_GELB_QUOTE = 0.2;
// |Abweichung| <= 5 % ist "im Rahmen" - darunter ist der Unterschied zum
// Marktwert kleiner als die Streuung der Datenbasis selbst.
export const TOLERANZ_PROZENT = 5;
// Ein noetiger Nachlass ueber 15 % ist am Markt praktisch nicht verhandelbar.
export const NACHLASS_UNREALISTISCH_PROZENT = 15;
// Wertannahme des Nutzers liegt mehr als 2 Prozentpunkte p. a. ueber dem, was
// das Land in den letzten vier Jahren tatsaechlich gemacht hat = "optimistisch".
export const ANNAHME_OPTIMISTISCH_PP = 2;

// ── Schwellen der Objektseite (objektseite-neu.md §6.3, §6.5, §13) ──────────
// Alles hier ist Fachurteil und ausdruecklich nachjustierbar, OHNE dass sich
// die Struktur der Seite aendert. Herkunft sauber getrennt:
//   - aus hardStops() in investmentScore.js uebernommen, damit Score und Seite
//     dieselbe Grenze ziehen: Tilgung 0 %, Beleihung > 100 %, Cashflow < -800 €
//   - aus dieser Datei: Miete ueber ortsueblich nutzt TOLERANZ_PROZENT
//   - neu und unkalibriert: Faktor-Aufschlag und Restschuldquote

// Referenzsaetze fuer den Alternativanlagen-Vergleich. KEINE Prognose und kein
// Live-Kurs (Entscheidung E2) - historische Nominalwerte vor Steuer, die in
// der Anzeige als Annahme auszuweisen sind.
export const ALTERNATIV_ANLAGEN = [
  { key: "tagesgeld", prozent: 3.0 },
  { key: "staatsanleihe", prozent: 3.5 },
  { key: "etf", prozent: 7.0 },
];

// RUECKLAGE_MINDEST: jetzt in investmentScore.js (D4, dortiger Sub-Score
// "Ruecklagen-Deckung") - hier re-exportiert (siehe Import oben), damit
// Flaggen-Schwelle und Score-Formel garantiert dieselbe Tabelle lesen.

// Ab diesem Aufschlag auf den Kreisfaktor ist der Kaufpreisfaktor eine rote
// Flagge - nicht nur "ueber Markt" (das faengt TOLERANZ_PROZENT ab).
export const FAKTOR_FLAGGE_PROZENT = 20;
// Restschuld am Ende der Zinsbindung, gemessen am Gesamtkaufpreis.
export const RESTSCHULD_FLAGGE_QUOTE = 60;
// Deckt sich mit dem hardStopCf-Schwellenwert in investmentScore.js.
export const CASHFLOW_FLAGGE_EUR = -800;

// ── Cashflow-Urteil (fuer die Begruendungs-Formulierung, nicht als Badge) ───
// Regelbasiert, ohne DSCR und ohne Score - beantwortet ausschliesslich "traegt
// sich der Cashflow", nicht "wie gut ist das Investment insgesamt" (das ist
// berechneScore() aus investmentScore.js, Baustein 1). Die Hard-Stops werden
// bewusst NICHT aus investmentScore.js importiert, sondern hier ueber
// dieselben Groessen geprueft - sonst liefe der dortige DSCR-Stop mit, der
// hier nicht gebraucht wird (reine Cashflow-Frage, keine Finanzierungsfrage).
export function cashflowUrteil(d, R) {
  const kaltmiete = +d.kaltmiete || 0;
  const tilgung = +d.tilgung || 0;

  if ((tilgung === 0 && R.bankDa > 0) || R.bel > 100) {
    return { stufe: "rot", key: "brfAmpelHartStop" };
  }
  if (R.cf2MitSt >= 0) return { stufe: "gruen", key: "brfAmpelTraegtSich" };
  if (Math.abs(R.cf2MitSt) <= kaltmiete * ZUZAHLUNG_GELB_QUOTE) {
    return { stufe: "gelb", key: "brfAmpelMitZuzahlung" };
  }
  return { stufe: "rot", key: "brfAmpelTraegtSichNicht" };
}

// ── Ebene 2: Kernzahlen (5.2) ───────────────────────────────────────────────
// Leerstandspuffer <= 0 heisst: das Objekt traegt sich schon voll vermietet
// nicht - dann steht dort bewusst "keiner" statt einer negativen Prozentzahl,
// die wie ein Puffer aussaehe.
export function briefingKernzahlen(d, R, K) {
  const puffer = K.breakEvenLeerstand;
  return [
    {
      key: "monatlich",
      wert: R.cf2MitSt,
      art: R.cf2MitSt < 0 ? "zuzahlung" : "ueberschuss",
      vorSteuer: R.cf2OhneSt,
    },
    {
      key: "vermoegenszuwachs",
      wert: R.g,
      jahre: R.j,
      wertsteigerungProzent: +d.wertP || 0,
    },
    {
      key: "leerstandspuffer",
      wert: puffer != null && puffer > 0 ? puffer : null,
      ohnePuffer: !(puffer > 0),
    },
  ];
}

// ── Block 3: Kernkennzahlen (objektseite-neu.md §6.1) ───────────────────────
// Die fuenf Zahlen, die oben auf der Objektseite stehen. Bewusst KEINE eigenen
// Formeln: jede Zahl ist ein vorhandener Wert aus computeRendite() bzw.
// berechneKennzahlen(), damit die Kachel nicht von der Detailebene abweichen
// kann.

// Eigenkapitalrendite p. a. nach Steuer. Stand bis zur Objektseiten-Spec nur
// im Renditerechner (Renditerechner.jsx) - sie wandert hierher, weil Block 3
// und der Rechner sonst zwei Formeln fuer dieselbe Zahl haetten.
// Ohne Eigenkapital gibt es keine Eigenkapitalrendite: null statt "unendlich".
export function ekRenditePa(R, d) {
  const ek = +d.eigenkapital || 0;
  if (!(ek > 0) || !(R.j > 0)) return null;
  return (R.g / ek / R.j) * 100;
}

// Reihenfolge wie objektseite-neu.md §16. Die Gruppierung 3 + 2 aus §21 D1 ist
// reine Anzeige und passiert in der Komponente - dieselbe Trennung wie bei der
// Sensitivitaet (§24.4) und beim Stresstest.
export function briefingKernkennzahlen(d, t, R, K, opt = {}) {
  const flaeche = +d.flaeche || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const eintraege = [];

  const faktorBenchmark = opt.faktorBenchmark ?? null;
  if (R.kpF > 0 && isFinite(R.kpF)) {
    eintraege.push({
      key: "faktor",
      wert: R.kpF,
      einheit: "faktor",
      // Der Kreisvergleich ist nur ein Zusatz an dieser Kachel. Ohne PLZ
      // (also ohne ref) steht die Zahl allein - sie ist auch ohne Markt
      // aussagekraeftig, anders als die Vergleichskacheln in Block 4.
      markt: faktorBenchmark?.markt ?? null,
      ebeneName: faktorBenchmark?.ebeneName ?? null,
      ueberMarkt: faktorBenchmark ? faktorBenchmark.abw > TOLERANZ_PROZENT : false,
    });
  }

  if (K.anfangsrendite != null) {
    eintraege.push({ key: "nettorendite", wert: K.anfangsrendite, einheit: "prozent" });
  }

  eintraege.push({
    key: "cashflow",
    wert: R.cf2MitSt,
    einheit: "eurMonat",
    art: R.cf2MitSt < 0 ? "zuzahlung" : "ueberschuss",
  });

  const ekR = ekRenditePa(R, d);
  if (ekR != null) {
    eintraege.push({ key: "ekRendite", wert: ekR, einheit: "prozent" });
  }

  // Break-even bewusst ueber loeseFuerCashflowNull() und nicht ueber
  // K.breakEvenMiete: letzteres rechnet VOR Steuer, der Rest der Seite nach
  // Steuer (gleiche Begruendung wie bei briefingTragfaehigkeit unten).
  const breakEven = flaeche > 0 || kaltmiete > 0 ? loeseFuerCashflowNull(d, t, "kaltmiete") : null;
  if (breakEven != null) {
    eintraege.push({
      key: "breakEvenMiete",
      wert: breakEven,
      einheit: "eurMonat",
      heute: kaltmiete > 0 ? kaltmiete : null,
      // Puffer nach unten in Prozent der heutigen Miete - nur sinnvoll, wenn
      // das Objekt sich ueberhaupt traegt.
      pufferProzent: kaltmiete > 0 && breakEven < kaltmiete ? (1 - breakEven / kaltmiete) * 100 : null,
    });
  }

  return eintraege;
}

// ── Ebene 3: Vergleiche (5.3) ───────────────────────────────────────────────
// Eine zentrale Statusfunktion fuer alle Kacheln, damit die Farblogik nicht
// je Kachel neu erfunden wird. `ueber`/`unter` sagen, welcher Status aus
// KAEUFERSICHT gilt, wenn der eigene Wert ueber bzw. unter dem Markt liegt -
// je nach Kennzahl ist das Gegenteil gut (hoher Preis schlecht, hohe Rendite
// gut).
export function vergleichStatus(abw, ueber, unter) {
  if (abw == null || !isFinite(abw)) return null;
  if (Math.abs(abw) <= TOLERANZ_PROZENT) return { status: "neutral", key: "brfStatusImRahmen" };
  return abw > 0 ? ueber : unter;
}

const abweichung = (eigen, markt) =>
  eigen > 0 && markt > 0 ? (eigen / markt - 1) * 100 : null;

/**
 * Die sechs Vergleichs-Kacheln. Kacheln ohne Datenbasis fehlen im Ergebnis
 * (Spec Abschnitt 4: ausblenden, nie mit "keine Angabe" fuellen).
 *
 * @param {object} d - Formular-State
 * @param {object} R - computeRendite(d, t)
 * @param {object} opt
 * @param {object|null} opt.ref - regionalPreis(bundesland, ort, plz)
 * @param {number|null} opt.landesKaufWohnungAvg - landeswerte.kaufWohnungAvg
 * @param {number|null} opt.trendVorjahr - regionalWertsteigerung(bundesland)
 * @param {number|null} opt.trend4J - regionalTrend(bundesland)
 * @param {number|null} opt.tragfaehigerKaufpreis - aus briefingTragfaehigkeit()
 */
export function briefingVergleiche(d, R, opt = {}) {
  const { ref, landesKaufWohnungAvg, trendVorjahr, trend4J, tragfaehigerKaufpreis } = opt;
  const kaufpreis = +d.kaufpreis || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const flaeche = +d.flaeche || 0;
  const cashflowNegativ = R.cf2MitSt < 0;
  const kacheln = [];

  // V1 Kaufpreis/m2 vs. Richtwert. "Unter Markt" ist bei negativem Cashflow
  // KEINE gute Nachricht (Problem 1 der Spec: guenstig gelesenes Schnaeppchen
  // bei -670 EUR/Monat) - dann bleibt die Kachel grau.
  if (flaeche > 0 && kaufpreis > 0 && ref?.kaufWohnung > 0) {
    const eigen = kaufpreis / flaeche;
    const abw = abweichung(eigen, ref.kaufWohnung);
    kacheln.push({
      id: "v1",
      titelKey: "brfV1Titel",
      eigen,
      markt: ref.kaufWohnung,
      einheit: "eurQm",
      abw,
      ebene: ref.ebene,
      ebeneName: ref.name,
      ...(cashflowNegativ && abw < -TOLERANZ_PROZENT
        ? { status: "neutral", key: "brfStatusUnterMarkt" }
        : vergleichStatus(
            abw,
            { status: "rot", key: "brfStatusUeberMarkt" },
            { status: "gruen", key: "brfStatusUnterMarkt" },
          )),
    });
  }

  // V2 Miete vs. ortsueblich. Die Kappungsgrenze (R.kP) begrenzt, was bei
  // BESTEHENDEM Mietvertrag in drei Jahren ueberhaupt erreichbar ist - ohne
  // diesen Zusatz war das Mietpotenzial bisher fachlich falsch dargestellt
  // (Problem 7 der Spec).
  if (flaeche > 0 && kaltmiete > 0 && ref?.mieteWohnung > 0) {
    const eigen = kaltmiete / flaeche;
    const abw = abweichung(eigen, ref.mieteWohnung);
    const status = vergleichStatus(
      abw,
      { status: "rot", key: "brfStatusUeberMarktMiete" },
      { status: "orange", key: "brfStatusPotenzial" },
    );
    kacheln.push({
      id: "v2",
      titelKey: "brfV2Titel",
      eigen,
      markt: ref.mieteWohnung,
      einheit: "eurQm",
      abw,
      ebene: ref.ebene,
      ebeneName: ref.name,
      ...status,
      ...(status?.status === "orange"
        ? {
            erreichbarQm: Math.min(ref.mieteWohnung, eigen * (1 + (R.kP || 0) / 100)),
            kappungsgrenzeProzent: R.kP,
          }
        : {}),
    });
  }

  // V3 Mietrendite vs. Markt. Bewusst brutto (ohne Nebenkosten), damit beide
  // Seiten auf derselben Basis stehen - der Marktwert kennt keine
  // Kaufnebenkosten.
  if (kaufpreis > 0 && kaltmiete > 0 && ref?.mieteWohnung > 0 && ref?.kaufWohnung > 0) {
    const eigen = ((kaltmiete * 12) / kaufpreis) * 100;
    const markt = ((ref.mieteWohnung * 12) / ref.kaufWohnung) * 100;
    kacheln.push({
      id: "v3",
      titelKey: "brfV3Titel",
      eigen,
      markt,
      einheit: "prozent",
      abw: abweichung(eigen, markt),
      ebene: ref.ebene,
      ebeneName: ref.name,
      ...vergleichStatus(
        abweichung(eigen, markt),
        { status: "gruen", key: "brfStatusUeberMarkt" },
        { status: "rot", key: "brfStatusUnterMarkt" },
      ),
    });
  }

  // V4 Angebotspreis vs. tragfaehiger Preis. Ersetzt den bisherigen
  // "Zielbereich" vollstaendig (der war zirkulaer, Problem 2 der Spec). Gruen
  // gibt es nie bei negativem Cashflow.
  if (kaufpreis > 0 && (tragfaehigerKaufpreis > 0 || !cashflowNegativ)) {
    kacheln.push({
      id: "v4",
      titelKey: "brfV4Titel",
      eigen: kaufpreis,
      markt: cashflowNegativ ? tragfaehigerKaufpreis : null,
      einheit: "eur",
      differenz: cashflowNegativ && tragfaehigerKaufpreis > 0 ? kaufpreis - tragfaehigerKaufpreis : null,
      status: cashflowNegativ ? "rot" : "gruen",
      key: cashflowNegativ ? "brfStatusNichtTragfaehig" : "brfStatusTraegtSichBereits",
    });
  }

  // V5 Preisniveau Kreis vs. Land - reine Information, nie eine Wertung: ein
  // teurer Kreis ist weder gut noch schlecht, er erklaert nur das Niveau.
  if (ref?.ebene === "kreis" && ref.kaufWohnung > 0 && landesKaufWohnungAvg > 0) {
    kacheln.push({
      id: "v5",
      titelKey: "brfV5Titel",
      eigen: ref.kaufWohnung,
      markt: landesKaufWohnungAvg,
      einheit: "eurQm",
      abw: abweichung(ref.kaufWohnung, landesKaufWohnungAvg),
      ebeneName: ref.name,
      status: "neutral",
      key: "brfStatusInformation",
    });
  }

  // V6 Preistrend - eigene Kachelform ohne "dein Wert vs. Markt": beide Werte
  // sind Marktwerte. Fehlender Einzelwert entfaellt, beide fehlend heisst
  // keine Kachel.
  const vorjahr = typeof trendVorjahr === "number" ? trendVorjahr : null;
  const vierJahre = typeof trend4J === "number" ? trend4J : null;
  if (vorjahr != null || vierJahre != null) {
    kacheln.push({
      id: "v6",
      titelKey: "brfV6Titel",
      trendVorjahr: vorjahr,
      trend4J: vierJahre,
      status: "neutral",
      key: "brfStatusInformation",
    });
  }

  return kacheln;
}

// ── Block 4a: Faktor-Benchmark (objektseite-neu.md §6.2) ────────────────────
// Beantwortet "Kaufpreisfaktor 35x - ueber oder unter Schnitt?" ohne neue
// Daten: der Kreisfaktor steckt bereits im ref-Objekt aus regionalpreis.js.
// Bewusst dieselbe Statusfunktion wie V1-V3, damit die Farblogik nicht ein
// zweites Mal erfunden wird.
export function briefingFaktorBenchmark(d, R, ref) {
  if (!(ref?.kaufWohnung > 0) || !(ref?.mieteWohnung > 0)) return null;
  const eigen = R.kpF;
  if (!(eigen > 0) || !isFinite(eigen)) return null;
  const markt = ref.kaufWohnung / (ref.mieteWohnung * 12);
  const abw = abweichung(eigen, markt);
  return {
    eigen,
    markt,
    abw,
    ebene: ref.ebene,
    ebeneName: ref.name,
    // Hoher Faktor = teuer eingekauft, also aus Kaeufersicht schlecht -
    // gleiche Richtung wie V1 (Kaufpreis/m2), gegenlaeufig zu V3 (Rendite).
    ...vergleichStatus(
      abw,
      { status: "rot", key: "brfStatusUeberMarkt" },
      { status: "gruen", key: "brfStatusUnterMarkt" },
    ),
  };
}

// ── Block 4b: Alternativanlage (objektseite-neu.md §6.3) ────────────────────
// Verglichen wird die EIGENKAPITALRENDITE, nicht die Mietrendite: nur sie
// misst, was das eingesetzte Kapital erwirtschaftet, und ist damit gegen eine
// Kapitalanlage stellbar. Mietrendite gegen ETF waere ein Aepfel-Birnen-
// Vergleich.
//
// Die drei Hinweise sind Pflicht und stehen in der Anzeige SICHTBAR (§16),
// nicht in einem Tooltip: ohne sie ist der Vergleich unredlich. Sie werden
// hier als Schluessel geliefert, der Text steht in translations.js.
export function briefingAlternativanlage(R, d) {
  const eigen = ekRenditePa(R, d);
  if (eigen == null) return null;
  return {
    eigen,
    referenzen: ALTERNATIV_ANLAGEN.map((a) => ({ ...a, geschlagen: eigen >= a.prozent })),
    hinweisKeys: ["brfAltHinweisAnnahme", "brfAltHinweisHebel", "brfAltHinweisLiquiditaet"],
  };
}

// ── Ebene 5: Tragfaehigkeit (5.4) ───────────────────────────────────────────
// Nur bei negativem Cashflow sinnvoll - bei positivem gibt es nichts
// "tragfaehig zu machen". K.breakEvenMiete wird bewusst NICHT verwendet: es
// rechnet vor Steuer, der Rest der Karte nach Steuer.
export function briefingTragfaehigkeit(d, t, R, opt = {}) {
  if (R.cf2MitSt >= 0) return null;
  // Marktmiete kommt entweder direkt oder aus derselben Referenz wie die
  // Vergleichskacheln - eine zweite Quelle waere eine zweite Wahrheit.
  const mieteMarktQm = opt.mieteMarktQm ?? opt.ref?.mieteWohnung ?? null;
  const kaufpreis = +d.kaufpreis || 0;
  const eigenkapital = +d.eigenkapital || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const flaeche = +d.flaeche || 0;

  const zielKaufpreis = loeseFuerCashflowNull(d, t, "kaufpreis");
  const zielEigenkapital = loeseFuerCashflowNull(d, t, "eigenkapital");
  const zielMiete = loeseFuerCashflowNull(d, t, "kaltmiete");

  const wege = [];

  if (zielKaufpreis != null && kaufpreis > 0) {
    const nachlassProzent = (1 - zielKaufpreis / kaufpreis) * 100;
    wege.push({
      key: "kaufpreis",
      wert: zielKaufpreis,
      nachlassProzent,
      flagKey:
        nachlassProzent > NACHLASS_UNREALISTISCH_PROZENT ? "brfFlagNachlassUnrealistisch" : null,
    });
  }

  if (zielEigenkapital != null) {
    wege.push({
      key: "eigenkapital",
      wert: zielEigenkapital,
      mehrbedarf: zielEigenkapital - eigenkapital,
      flagKey: null,
    });
  }

  if (zielMiete != null && flaeche > 0) {
    const zielQm = zielMiete / flaeche;
    const eigenQm = kaltmiete / flaeche;
    // Zwei getrennte Gruende, warum eine noetige Miete unrealistisch ist:
    // ueber Marktniveau (gar nicht vermietbar) oder zwar marktueblich, aber
    // bei bestehendem Mietvertrag durch die Kappungsgrenze nicht kurzfristig
    // erreichbar.
    const ueberMarkt = mieteMarktQm > 0 && zielQm > mieteMarktQm;
    const ueberKappung = R.kP > 0 && zielQm > eigenQm * (1 + R.kP / 100);
    wege.push({
      key: "kaltmiete",
      wert: zielMiete,
      proQm: zielQm,
      flagKey: ueberMarkt
        ? "brfFlagUeberMarktniveau"
        : ueberKappung
          ? "brfFlagNichtKurzfristig"
          : null,
    });
  }

  return { kaufpreis: zielKaufpreis, wege };
}

// ── Ebene 6: {jahre}-Jahres-Bild (5.5) ──────────────────────────────────────
// Bewusst KEINE eigene Summenformel: alle Zeilen sind vorhandene Werte aus
// computeRendite(), die Summe ist R.g selbst. Sonst koennte die angezeigte
// Summe von der Kernzahl abweichen.
//
// Die Zeile "einsatz" steht nicht in der Spec-Tabelle (§5.5), ohne sie geht
// die Spalte aber nicht auf: R.g zieht den Kapitaleinsatz ab, die vier
// gelisteten Zeilen enthalten ihn nicht (Nutzerentscheidung 2026-09-18,
// Einsatz-Zeile statt umbenannter Summe). Sie ist keine Restgroesse, sondern
// exakt der nicht aus dem Darlehen gedeckte Teil der Investition:
// (Gesamtkaufpreis - Darlehen) - Eigenkapital deckt den Fall ab, dass mehr
// Eigenkapital eingesetzt wird als Finanzierungsbedarf besteht; dazu die bar
// gezahlten Nebenkosten, Sonderumlage und Renovierung. Damit stimmt die
// Summe in allen geprueften Konstellationen (nk finanziert/bar, Renovierung,
// Sonderumlage, Eigenkapital ueber Kaufpreis, Verkauf in der Spekulations-
// frist).
export function briefingZeitraum(d, R) {
  const nkCash = d.nkFinanzieren ? 0 : R.nbk;
  const einsatz =
    R.gKP - R.da - (+d.eigenkapital || 0) - nkCash - (+d.sonder || 0) - (+d.renovierung || 0);

  const zeilen = [
    { key: "zuzahlungen", wert: R.sCF },
    { key: "getilgt", wert: R.da - R.rsEnd },
    { key: "wertzuwachs", wert: R.w },
    { key: "einsatz", wert: einsatz },
  ];
  if (R.st23 > 0) zeilen.push({ key: "steuer23", wert: -R.st23 });
  return { jahre: R.j, zeilen, summe: R.g };
}

// ── Ebene 7: Stresstest (5.6) ───────────────────────────────────────────────
// Die Parameter spiegeln szenario() in investmentScore.js. Sie stehen hier
// als Daten, damit die Karte sie im Klartext nennen kann ("Miete -10 %, +8 %
// Leerstand, ...") statt den Nutzer raten zu lassen, was "Stress" bedeutet.
// Der Zinsaufschlag greift erst ab Zinsbindungsende - das gehoert in die
// Anzeige, sonst wirkt der Effekt zu klein.
export const STRESS_PARAMETER = {
  // "best" gespiegeltes "negativ", beim Zins halbiert (objektseite-neu.md
  // §6.4) - ein Zinsrueckgang um einen vollen Punkt bis zum Anschluss waere
  // keine serioese Basisannahme.
  best: { miete: 5, leerstand: 0, kosten: -5, zins: -0.5 },
  negativ: { miete: -5, leerstand: 3, kosten: 10, zins: 1 },
  stress: { miete: -10, leerstand: 8, kosten: 20, zins: 2 },
};

// Reihenfolge best · basis · negativ · stress wie objektseite-neu.md §6.4. Die
// Anzeige dreht sie auf Stress · Negativ · Basis · Best (§21 D2) - gleiche
// Trennung wie bei der Sensitivitaet (§24.4): die Engine liefert die
// fachliche Reihenfolge, die Komponente die visuelle.
export function briefingStresstest(d, t) {
  const { best, basis, negativ, stress } = berechneSzenarien(d, t);
  return [
    {
      key: "best",
      cashflow: best.R.cf2MitSt,
      vermoegen: best.R.g,
      parameter: STRESS_PARAMETER.best,
    },
    { key: "basis", cashflow: basis.R.cf2MitSt, vermoegen: basis.R.g, parameter: null },
    {
      key: "negativ",
      cashflow: negativ.R.cf2MitSt,
      vermoegen: negativ.R.g,
      parameter: STRESS_PARAMETER.negativ,
    },
    {
      key: "stress",
      cashflow: stress.R.cf2MitSt,
      vermoegen: stress.R.g,
      parameter: STRESS_PARAMETER.stress,
    },
  ];
}

// ── Block 5 unten: Sensitivitaet (objektseite-neu.md §6.6) ──────────────────
// Der Stresstest sagt "alles zusammen", die Sensitivitaet sagt "woran es
// liegt": je Zeile bewegt sich GENAU EIN Parameter, alles andere bleibt Basis.
//
// Bewusst NICHT ueber szenario() aus investmentScore.js (Entscheidung K1 zur
// Umsetzung): das ist modul-privat, kennt `sonder` fuer den Sanierungsstau
// nicht und nimmt Leerstand als Anteil der Analysemonate - §6.6 verlangt aber
// Monate. Der Helfer hier setzt Felder direkt und laesst die kalibrierte
// Score-Engine unberuehrt.
function variante(d, t, overrides) {
  const R = computeRendite({ ...d, ...overrides }, t);
  return { cashflow: R.cf2MitSt, saldo: R.g };
}

export const SENSITIVITAET_STUFEN = {
  zins: { mild: 1, hart: 2 },
  leerstand: { mild: 3, hart: 6 },
  mietausfall: { mild: -5, hart: -10 },
  sanierungsstau: { mild: 300, hart: 600 },
};

export function briefingSensitivitaet(d, t) {
  const R0 = computeRendite(d, t);
  const basis = { cashflow: R0.cf2MitSt, saldo: R0.g };
  const zinssatz = +d.zinssatz || 0;
  const leerstand = +d.leerstand || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const flaeche = +d.flaeche || 0;
  const sonder = +d.sonder || 0;

  const zeile = (key, feldMild, feldHart) => {
    const mild = variante(d, t, feldMild);
    const hart = variante(d, t, feldHart);
    const mitDelta = (v) => ({
      ...v,
      deltaCashflow: v.cashflow - basis.cashflow,
      deltaSaldo: v.saldo - basis.saldo,
    });
    return { key, stufen: SENSITIVITAET_STUFEN[key], mild: mitDelta(mild), hart: mitDelta(hart) };
  };

  const zeilen = [];

  // Zinsanstieg wirkt erst ab Zinsbindungsende - dasselbe Feld, das auch die
  // Stresstest-Szenarien setzen.
  zeilen.push(
    zeile(
      "zins",
      { anschlussZins: String(zinssatz + SENSITIVITAET_STUFEN.zins.mild) },
      { anschlussZins: String(zinssatz + SENSITIVITAET_STUFEN.zins.hart) },
    ),
  );

  // Leerstand in MONATEN ueber die gesamte Haltedauer, nicht in Prozent.
  zeilen.push(
    zeile(
      "leerstand",
      { leerstand: String(leerstand + SENSITIVITAET_STUFEN.leerstand.mild) },
      { leerstand: String(leerstand + SENSITIVITAET_STUFEN.leerstand.hart) },
    ),
  );

  if (kaltmiete > 0) {
    zeilen.push(
      zeile(
        "mietausfall",
        { kaltmiete: String(kaltmiete * 0.95) },
        { kaltmiete: String(kaltmiete * 0.9) },
      ),
    );
  }

  // Sanierungsstau als EINMALIGER Betrag auf die Sonderumlage - je m2, damit
  // die Zahl mit der Objektgroesse skaliert. Ohne Flaeche keine Zeile.
  if (flaeche > 0) {
    zeilen.push(
      zeile(
        "sanierungsstau",
        { sonder: String(sonder + SENSITIVITAET_STUFEN.sanierungsstau.mild * flaeche) },
        { sonder: String(sonder + SENSITIVITAET_STUFEN.sanierungsstau.hart * flaeche) },
      ),
    );
  }

  return { basis, zeilen };
}

// ── Block 6: Rote Flaggen (objektseite-neu.md §6.5) ─────────────────────────
// Bis zur Objektseiten-Spec lagen Warnungen als `flagKey` verstreut in
// einzelnen Vergleichskacheln. Sie stehen jetzt ausschliesslich hier, und
// zwar MIT Schwelle: eine Warnung ohne ihre Regel ist genau das
// Vertrauensproblem, das die Seite loesen soll (§3).
//
// Die Reihenfolge der Pruefungen ist zugleich die Anzeigereihenfolge: erst
// alle roten, dann alle orangen (§21 D4).
//
// `_t` wird nicht gebraucht - keine Regel rechnet neu, alle lesen R/K. Der
// Parameter bleibt trotzdem an der in §6.5 festgelegten Position stehen,
// damit der Aufruf zu den uebrigen briefing*-Funktionen passt.
export function briefingFlaggen(d, _t, R, K, opt = {}) {
  const { faktorBenchmark = null, ref = null, energieklasse = null } = opt;
  const flaeche = +d.flaeche || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const baujahr = +d.baujahr || 0;
  const nichtUml = +d.nichtUml || 0;
  const jahre = +d.jahre || 10;
  const zinsbindung = +d.zinsbindung || 0;
  const flaggen = [];

  // ── rot ──
  if ((+d.tilgung || 0) === 0 && R.bankDa > 0) {
    flaggen.push({ key: "flgTilgungNull", stufe: "rot", wert: 0, schwelle: 0 });
  }
  if (R.bel > 100) {
    flaggen.push({ key: "flgBeleihung", stufe: "rot", wert: R.bel, schwelle: 100 });
  }
  if (R.cf2MitSt < CASHFLOW_FLAGGE_EUR) {
    flaggen.push({
      key: "flgCashflowTief",
      stufe: "rot",
      wert: R.cf2MitSt,
      schwelle: CASHFLOW_FLAGGE_EUR,
    });
  }
  if (faktorBenchmark && faktorBenchmark.abw > FAKTOR_FLAGGE_PROZENT) {
    flaggen.push({
      key: "flgFaktorUeberMarkt",
      stufe: "rot",
      wert: faktorBenchmark.eigen,
      markt: faktorBenchmark.markt,
      abw: faktorBenchmark.abw,
      schwelle: FAKTOR_FLAGGE_PROZENT,
      ebeneName: faktorBenchmark.ebeneName,
    });
  }
  // breakEvenLeerstand <= 0 heisst: traegt sich schon voll vermietet nicht.
  if (K.breakEvenLeerstand != null && K.breakEvenLeerstand <= 0) {
    flaggen.push({ key: "flgKeinPuffer", stufe: "rot", wert: K.breakEvenLeerstand, schwelle: 0 });
  }

  // ── orange ──
  // Anschlussrisiko nur, wenn die Zinsbindung VOR dem Betrachtungsende laeuft
  // und dann noch viel Restschuld offen ist. restschuldZBQuote ist null, wenn
  // die Zinsbindung ausserhalb des Zeitraums liegt - dann gibt es die Frage
  // nicht.
  if (
    zinsbindung > 0 &&
    zinsbindung < jahre &&
    K.restschuldZBQuote != null &&
    K.restschuldZBQuote > RESTSCHULD_FLAGGE_QUOTE
  ) {
    flaggen.push({
      key: "flgAnschlussrisiko",
      stufe: "orange",
      wert: K.restschuldZBQuote,
      schwelle: RESTSCHULD_FLAGGE_QUOTE,
      zinsbindung,
      restschuld: K.restschuldZB,
    });
  }
  // Ohne Baujahr KEINE Flagge - lieber keine Aussage als eine geratene
  // Schwelle (§6.5).
  if (baujahr > 0 && flaeche > 0) {
    const mindest = RUECKLAGE_MINDEST.find((s) => baujahr <= s.bisBaujahr)?.euroQmMonat ?? null;
    const istQm = nichtUml / flaeche;
    if (mindest != null && istQm < mindest) {
      flaggen.push({
        key: "flgRuecklageNiedrig",
        stufe: "orange",
        wert: istQm,
        schwelle: mindest,
        baujahr,
      });
    }
  }
  // Gleiche Grenze wie Vergleichskachel V2, damit nicht zwei Stellen
  // unterschiedlich definieren, was "ueber Markt" heisst.
  if (ref?.mieteWohnung > 0 && flaeche > 0 && kaltmiete > 0) {
    const eigenQm = kaltmiete / flaeche;
    const grenze = ref.mieteWohnung * (1 + TOLERANZ_PROZENT / 100);
    if (eigenQm > grenze) {
      flaggen.push({
        key: "flgMieteUeberMarkt",
        stufe: "orange",
        wert: eigenQm,
        schwelle: grenze,
        markt: ref.mieteWohnung,
        ebeneName: ref.name,
      });
    }
  }
  if (["F", "G", "H"].includes(energieklasse)) {
    flaggen.push({ key: "flgEnergie", stufe: "orange", wert: energieklasse, schwelle: "E" });
  }

  return flaggen;
}

// ── Empfehlung ("Investieren?") ─────────────────────────────────────────────
// Regelbasiert wie die Ampel, aber mit dem Preis im Blick: die Ampel sagt nur,
// ob es sich TRAEGT. "Investieren" braucht zusaetzlich einen Preis, der nicht
// ueber dem Markt liegt. Der Ausblick (Preisverlauf, Energie) aendert das Wort
// bewusst NICHT - er erscheint als Hinweis, nicht als Scheingenauigkeit.

// Marktpreis fuer die eigene Flaeche aus dem Kreis-/Landesrichtwert.
export function briefingMarktpreis(d, ref) {
  const flaeche = +d.flaeche || 0;
  if (!(flaeche > 0) || !(ref?.kaufWohnung > 0)) return null;
  return Math.round((flaeche * ref.kaufWohnung) / 500) * 500;
}

// ── Spannen: realistisch/optimal fuer Kaufpreis/Kaltmiete/Eigenkapital ──────
// Baustein 4 (Vergleich), Nutzer-Entscheidung 2026-09-23. Definition:
//   realistisch = was der regionale Markt hergibt (regionalpreis.js), bzw.
//                 bei Eigenkapital die marktuebliche Bankvorgabe (Faustregel).
//   optimal     = der Wert, ab dem sich das Objekt traegt (Cashflow = 0) -
//                 loeseFuerCashflowNull() rechnet das UNABHAENGIG vom
//                 heutigen Cashflow-Vorzeichen (anders als
//                 briefingTragfaehigkeit(), die nur bei negativem Cashflow
//                 rechnet - hier soll auch ein bereits tragfaehiges Objekt
//                 zeigen, "wie viel Luft nach oben/unten" besteht).
//
// Bewusst OHNE Kappungsgrenze bei der realistischen Miete (anders als
// Vergleichskachel V2): dieser Block soll einfach bleiben, die Kappungsgrenze
// ist Fachdetail fuer den Fall eines bestehenden Mietvertrags.
export const EK_FAUSTREGEL_QUOTE = 0.2; // 20 % des Kaufpreises, marktuebliche Bankvorgabe

export function briefingSpannen(d, t, ref) {
  const flaeche = +d.flaeche || 0;
  const kaufpreis = +d.kaufpreis || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const eigenkapital = +d.eigenkapital || 0;

  return {
    kaufpreis: {
      aktuell: kaufpreis > 0 ? kaufpreis : null,
      realistisch: briefingMarktpreis(d, ref),
      optimal: loeseFuerCashflowNull(d, t, "kaufpreis"),
    },
    kaltmiete: {
      aktuell: kaltmiete > 0 ? kaltmiete : null,
      realistisch:
        flaeche > 0 && ref?.mieteWohnung > 0
          ? Math.round((ref.mieteWohnung * flaeche) / 5) * 5
          : null,
      optimal: loeseFuerCashflowNull(d, t, "kaltmiete"),
    },
    eigenkapital: {
      aktuell: eigenkapital > 0 ? eigenkapital : null,
      realistisch: kaufpreis > 0 ? Math.round((kaufpreis * EK_FAUSTREGEL_QUOTE) / 500) * 500 : null,
      optimal: loeseFuerCashflowNull(d, t, "eigenkapital"),
    },
  };
}

// ── Modernisierungsbedarf ────────────────────────────────────────────────────
// Regelbasiert, keine KI (Baustein 4, Nutzer-Entscheidung 2026-09-23) -
// dieselbe Fachlogik wie D4 in investmentScore.js (Heizungsalter,
// Energieklasse), hier als Text-Stufe statt als Zahl. Drei Eingaben, alle
// optional: fehlt eine, zaehlt sie nicht mit; fehlen alle drei, gibt es keine
// Einschaetzung statt einer geratenen (§4, gleiches Prinzip wie ueberall
// sonst in dieser Datei).
const MODBEDARF_PUNKTE = {
  baujahr: (bj) => (bj > 0 && bj < 1979 ? 2 : bj > 0 && bj < 1995 ? 1 : 0),
  heizungsalter: (ha) => (ha === "alt" ? 2 : ha === "mittel" ? 1 : 0),
  energieklasse: (k) => (["F", "G", "H"].includes(k) ? 2 : ["D", "E"].includes(k) ? 1 : 0),
};

export function modernisierungsbedarf(d) {
  const baujahr = +d.baujahr || 0;
  const heizungsalter = d.sanHa || null;
  const klasse = d.energieeffizienzklasse || energieKlasse(d.sanIstVerbrauch);

  const teile = [];
  if (baujahr > 0) teile.push({ key: "baujahr", punkte: MODBEDARF_PUNKTE.baujahr(baujahr) });
  if (heizungsalter)
    teile.push({ key: "heizungsalter", punkte: MODBEDARF_PUNKTE.heizungsalter(heizungsalter) });
  if (klasse) teile.push({ key: "energieklasse", punkte: MODBEDARF_PUNKTE.energieklasse(klasse) });

  if (teile.length === 0) {
    return { verfuegbar: false, stufe: null, gruende: [] };
  }

  const quote = teile.reduce((a, x) => a + x.punkte, 0) / (teile.length * 2);
  const stufe = quote >= 0.66 ? "hoch" : quote >= 0.33 ? "mittel" : "gering";
  const gruende = teile.filter((x) => x.punkte > 0).map((x) => x.key);

  return {
    verfuegbar: true,
    stufe,
    gruende,
    baujahr: baujahr > 0 ? baujahr : null,
    heizungsalter,
    energieklasse: klasse || null,
  };
}

// Kombiweg: Miete auf das in drei Jahren Erreichbare (Kappungsgrenze) anheben
// UND den Preis so weit senken, dass es sich traegt. Nur sinnvoll, wenn V2
// ein Mietpotenzial zeigt.
export function briefingKombiweg(d, t, R, v2) {
  if (R.cf2MitSt >= 0) return null;
  if (!(v2?.erreichbarQm > 0)) return null;
  const flaeche = +d.flaeche || 0;
  const kaufpreis = +d.kaufpreis || 0;
  if (!(flaeche > 0) || !(kaufpreis > 0)) return null;
  const miete = Math.round((v2.erreichbarQm * flaeche) / 5) * 5;
  if (miete <= (+d.kaltmiete || 0)) return null;
  const ziel = loeseFuerCashflowNull({ ...d, kaltmiete: String(miete) }, t, "kaufpreis");
  if (ziel == null) return null;
  return {
    miete,
    proQm: v2.erreichbarQm,
    kaufpreis: ziel,
    nachlassProzent: Math.max(0, (1 - ziel / kaufpreis) * 100),
  };
}

export function briefingEmpfehlung(d, R, { ampel, vergleiche, tragfaehigkeit, kombiweg, marktpreis }) {
  const kaufpreis = +d.kaufpreis || 0;
  if (ampel.key === "brfAmpelHartStop") return { wort: "nicht", ziel: null };

  if (R.cf2MitSt >= 0) {
    const v1 = vergleiche.find((v) => v.id === "v1");
    if (v1 && v1.abw > TOLERANZ_PROZENT && marktpreis > 0 && marktpreis < kaufpreis) {
      return {
        wort: "verhandeln",
        ziel: {
          art: "markt",
          kaufpreis: marktpreis,
          nachlassProzent: (1 - marktpreis / kaufpreis) * 100,
        },
      };
    }
    return { wort: "investieren", ziel: null };
  }

  const kp = tragfaehigkeit?.wege.find((w) => w.key === "kaufpreis");
  if (kp && kp.nachlassProzent <= NACHLASS_UNREALISTISCH_PROZENT) {
    return {
      wort: "verhandeln",
      ziel: { art: "kaufpreis", kaufpreis: kp.wert, nachlassProzent: kp.nachlassProzent },
    };
  }
  if (kombiweg && kombiweg.nachlassProzent <= NACHLASS_UNREALISTISCH_PROZENT) {
    return { wort: "verhandeln", ziel: { art: "kombi", ...kombiweg } };
  }
  const miete = tragfaehigkeit?.wege.find((w) => w.key === "kaltmiete");
  if (miete && !miete.flagKey) {
    return { wort: "verhandeln", ziel: { art: "miete", miete: miete.wert, proQm: miete.proQm } };
  }
  return { wort: "nicht", ziel: null };
}

// ── Block 2 und 7: Regel-Begruendung (objektseite-neu.md §6.7) ──────────────
// Warum steht die Ampel so, und warum dieses Empfehlungswort? Regelbasiert,
// damit Block 7 auch OHNE KI-Aufruf nie leer ist und der Nutzer die Logik
// gegenpruefen kann, statt ihr zu vertrauen (§3).
//
// Rueckgabe sind Schluessel plus Zahlen, keine fertigen Saetze - die Texte
// stehen in translations.js. Der KI-Urteilssatz ERSETZT den Ampelsatz in
// Block 2, sobald ein Ergebnis vorliegt; in Block 7 stehen dann beide (§22).
const BEGR_VERHANDELN_KEY = {
  markt: "brfBegrVerhandelnMarkt",
  kaufpreis: "brfBegrVerhandelnKaufpreis",
  kombi: "brfBegrVerhandelnKombi",
  miete: "brfBegrVerhandelnMiete",
};

export function briefingBegruendung(d, R, { ampel, empfehlung } = {}) {
  const kaltmiete = +d.kaltmiete || 0;
  const zuzahlungsgrenze = kaltmiete * ZUZAHLUNG_GELB_QUOTE;

  let ampelTeil;
  if (ampel?.key === "brfAmpelHartStop") {
    // Zwei verschiedene Hard-Stops, zwei verschiedene Saetze - "Hard-Stop"
    // allein sagt dem Nutzer nichts.
    ampelTeil =
      (+d.tilgung || 0) === 0 && R.bankDa > 0
        ? { key: "brfBegrHartStopTilgung", werte: {} }
        : { key: "brfBegrHartStopBeleihung", werte: { beleihung: R.bel } };
  } else if (ampel?.key === "brfAmpelTraegtSich") {
    ampelTeil = { key: "brfBegrTraegtSich", werte: { ueberschuss: R.cf2MitSt } };
  } else if (ampel?.key === "brfAmpelMitZuzahlung") {
    ampelTeil = {
      key: "brfBegrMitZuzahlung",
      werte: {
        zuzahlung: Math.abs(R.cf2MitSt),
        grenze: zuzahlungsgrenze,
        quote: ZUZAHLUNG_GELB_QUOTE * 100,
      },
    };
  } else {
    ampelTeil = {
      key: "brfBegrTraegtSichNicht",
      werte: { zuzahlung: Math.abs(R.cf2MitSt), grenze: zuzahlungsgrenze },
    };
  }

  let empfehlungTeil = null;
  if (empfehlung?.wort === "investieren") {
    empfehlungTeil = { key: "brfBegrInvestieren", werte: { toleranz: TOLERANZ_PROZENT } };
  } else if (empfehlung?.wort === "verhandeln" && empfehlung.ziel) {
    const z = empfehlung.ziel;
    empfehlungTeil = {
      key: BEGR_VERHANDELN_KEY[z.art] ?? "brfBegrVerhandelnKaufpreis",
      werte: {
        kaufpreis: z.kaufpreis ?? null,
        nachlassProzent: z.nachlassProzent ?? null,
        miete: z.miete ?? null,
        proQm: z.proQm ?? null,
        grenze: NACHLASS_UNREALISTISCH_PROZENT,
      },
    };
  } else if (empfehlung?.wort === "nicht") {
    // "Nicht" hat zwei Ursachen: harter Ausschluss oder kein Weg unter 15 %
    // Nachlass. Der Unterschied ist fuer den Nutzer erheblich.
    empfehlungTeil =
      ampel?.key === "brfAmpelHartStop"
        ? { key: "brfBegrNichtHartStop", werte: {} }
        : { key: "brfBegrNichtUnerreichbar", werte: { grenze: NACHLASS_UNREALISTISCH_PROZENT } };
  }

  return { ampel: ampelTeil, empfehlung: empfehlungTeil };
}

// ── Ausblick ────────────────────────────────────────────────────────────────
// Der Verlauf ist der Landes-Kaufpreis Q2 2022..Q2 2026 (17 Quartalswerte, aus
// den Datenblaettern). Es gibt KEINE Prognose - der Ausblick zeigt nur, was
// war, und stellt die Wertannahme des Nutzers daneben.
const VERLAUF_START_QUARTAL = { jahr: 2022, quartal: 2 };

export function quartalLabel(index) {
  const gesamt = VERLAUF_START_QUARTAL.jahr * 4 + (VERLAUF_START_QUARTAL.quartal - 1) + index;
  return `Q${(gesamt % 4) + 1} ${Math.floor(gesamt / 4)}`;
}

export function briefingAusblick({ verlauf, trend4J, wertP, energieklasse } = {}) {
  const serie =
    Array.isArray(verlauf?.wohnung) && verlauf.wohnung.length >= 2 ? verlauf.wohnung : null;
  const seit2022 = serie
    ? (serie[serie.length - 1] / serie[0] - 1) * 100
    : typeof trend4J === "number"
      ? trend4J
      : null;
  const schlecht = ["F", "G", "H"].includes(energieklasse) ? energieklasse : null;
  if (!serie && seit2022 == null && !schlecht) return null;

  // Naeherung (naeherungNach im Verlauf): Anfang und Ende sind echt, die Form
  // dazwischen stammt vom Nachbarland - also nur die Werte, die an den
  // Endpunkten haengen (seit Beginn, Prozent p. a.), sind belastbar. Tiefpunkt
  // und "seit Tief" entfallen.
  const naeherung = serie && verlauf?.naeherungNach ? verlauf.naeherungNach : null;
  let tiefIdx = null;
  let seitTief = null;
  let proJahr = null;
  if (serie) {
    const letzter = serie.length - 1;
    if (!naeherung) {
      tiefIdx = serie.indexOf(Math.min(...serie));
      if (tiefIdx < letzter) seitTief = (serie[letzter] / serie[tiefIdx] - 1) * 100;
    }
    proJahr = (Math.pow(serie[letzter] / serie[0], 4 / letzter) - 1) * 100;
  }
  const annahme = wertP !== "" && wertP != null && Number.isFinite(+wertP) ? +wertP : null;
  return {
    serie,
    naeherung,
    von: serie ? quartalLabel(0) : null,
    bis: serie ? quartalLabel(serie.length - 1) : null,
    tiefIdx,
    tiefLabel: tiefIdx != null ? quartalLabel(tiefIdx) : null,
    seit2022Prozent: seit2022,
    seitTiefProzent: seitTief,
    proJahrProzent: proJahr,
    annahmeProzent: annahme,
    annahmeOptimistisch:
      annahme != null && proJahr != null && annahme > proJahr + ANNAHME_OPTIMISTISCH_PP,
    energieklasseSchlecht: schlecht,
  };
}

// ── Gesamt-Briefing ─────────────────────────────────────────────────────────
// Ein Aufruf fuer die Karte: rechnet R/K einmal und reicht sie an alle Ebenen
// weiter, statt computeRendite() je Ebene erneut laufen zu lassen.
export function berechneBriefing(d, t, opt = {}) {
  const R = computeRendite(d, t);
  const K = berechneKennzahlen(d, R);
  const energieklasse = energieKlasse(d.sanIstVerbrauch);
  // Ausblick VOR dem Score berechnet: liefert proJahrProzent (annualisierte
  // Referenz-Wertsteigerung aus der Landes-Zeitreihe), das D6 im Score fuer
  // die Wertsteigerungs-Plausibilitaet braucht (investmentScore.js
  // dimensionD6). Eine Berechnung der Jahresrate statt zwei.
  const ausblick = briefingAusblick({
    verlauf: opt.verlauf,
    trend4J: opt.trend4J,
    wertP: d.wertP,
    energieklasse,
  });
  // Baustein 1: die EINE Score-Quelle. opt.ref (D5) reicht direkt durch,
  // proJahrTrend (D6) kommt aus dem Ausblick oben.
  const score = berechneScore(d, t, { ...opt, proJahrTrend: ausblick?.proJahrProzent ?? null });
  const tragfaehigkeit = briefingTragfaehigkeit(d, t, R, opt);
  const ampel = cashflowUrteil(d, R);
  const vergleiche = briefingVergleiche(d, R, {
    ...opt,
    tragfaehigerKaufpreis: tragfaehigkeit?.kaufpreis ?? null,
  });
  const marktpreis = briefingMarktpreis(d, opt.ref);
  const kombiweg = briefingKombiweg(d, t, R, vergleiche.find((v) => v.id === "v2"));
  // Der Faktor-Benchmark wird zweimal gebraucht (Kernkennzahl-Zusatz und
  // Flagge) und deshalb einmal oben gerechnet, nicht je Verbraucher neu.
  const faktorBenchmark = briefingFaktorBenchmark(d, R, opt.ref);
  const empfehlung = briefingEmpfehlung(d, R, {
    ampel,
    vergleiche,
    tragfaehigkeit,
    kombiweg,
    marktpreis,
  });
  return {
    R,
    K,
    score,
    ampel,
    kernzahlen: briefingKernzahlen(d, R, K),
    kernkennzahlen: briefingKernkennzahlen(d, t, R, K, { faktorBenchmark }),
    faktorBenchmark,
    alternativanlage: briefingAlternativanlage(R, d),
    vergleiche,
    // Baustein 4 (Vergleich, Nutzer-Entscheidung 2026-09-23): realistisch/
    // optimal-Spannen und regelbasierte Modernisierungsbedarf-Einschaetzung.
    spannen: briefingSpannen(d, t, opt.ref),
    modernisierungsbedarf: modernisierungsbedarf(d),
    tragfaehigkeit,
    zeitraum: briefingZeitraum(d, R),
    stresstest: briefingStresstest(d, t),
    sensitivitaet: briefingSensitivitaet(d, t),
    flaggen: briefingFlaggen(d, t, R, K, { faktorBenchmark, ref: opt.ref, energieklasse }),
    energieklasse,
    marktpreis,
    kombiweg,
    empfehlung,
    begruendung: briefingBegruendung(d, R, { ampel, empfehlung }),
    ausblick,
  };
}

// ── KI-Nutzlast (7.2) ───────────────────────────────────────────────────────
// Fertig formatierte Label-Wert-Zeilen wie regionalpreisZeilen()/
// hebelVarianten(): das Modell sieht exakt die Zeichenfolge, die der Nutzer
// auf der Karte liest, und kann deshalb nicht davon abweichen. Deutsch fest
// verdrahtet - die Prompts sind es auch.
const EUR = (n) => `${fmt(Math.round(n))} €`;
const EUR_MON = (n) => `${fmt(Math.round(n))} €/Monat`;
const QM = (n) => `${fmt(n, 2)} €/m²`;
const PROZ = (n) => `${n > 0 ? "+" : "−"}${fmt(Math.abs(n), 1)} %`;

const STATUS_WORT = {
  brfStatusImRahmen: "im Rahmen",
  brfStatusUeberMarkt: "ueber Markt",
  brfStatusUnterMarkt: "unter Markt",
  brfStatusUeberMarktMiete: "ueber Markt, begruendungsbeduerftig",
  brfStatusPotenzial: "Potenzial",
  brfStatusTraegtSichBereits: "traegt sich bereits",
  brfStatusNichtTragfaehig: "nicht tragfaehig",
  brfStatusInformation: "Information",
};

const FLAG_WORT = {
  brfFlagNachlassUnrealistisch: "unrealistischer Nachlass",
  brfFlagUeberMarktniveau: "ueber Marktniveau",
  brfFlagNichtKurzfristig: "nicht kurzfristig erreichbar",
};

const VERGLEICH_LABEL = {
  v1: "Kaufpreis/m² gegen Richtwert",
  v2: "Miete/m² gegen ortsueblich",
  v3: "Mietrendite gegen Markt",
  v4: "Angebotspreis gegen tragfaehigen Preis",
  v5: "Preisniveau Kreis gegen Land",
  v6: "Preistrend",
};

const TRAGF_LABEL = {
  kaufpreis: "Tragfaehig ab Kaufpreis",
  eigenkapital: "Tragfaehig ab Eigenkapital",
  kaltmiete: "Tragfaehig ab Kaltmiete",
};

const ZEITRAUM_LABEL = {
  zuzahlungen: "Summe Zuzahlungen/Ueberschuesse",
  getilgt: "Getilgt",
  wertzuwachs: "Wertzuwachs",
  einsatz: "Eingesetztes Kapital (Nebenkosten, Renovierung, nicht finanzierter Anteil)",
  steuer23: "Steuer nach Paragraf 23",
};

const SZENARIO_LABEL = { basis: "Basis", negativ: "Negativ", stress: "Stress" };

// Baustein 6: alle sieben Dimensionen fliessen in die KI-Nutzlast, nicht mehr
// nur D1-D3/D7 - das Modell soll dieselbe Grundlage sehen, die auch die
// Ampel/den Score-Badge auf der Seite bestimmt (Neubau-Spec Abschnitt 7).
const DIMENSION_LABEL = {
  d1: "Wirtschaftlichkeit",
  d2: "Cashflow & Schuldentragfaehigkeit",
  d3: "Finanzierung",
  d4: "Objekt & Sanierung",
  d5: "Vermietung",
  d6: "Exit",
  d7: "Robustheit",
};

const wert = (v, einheit) =>
  einheit === "eurQm" ? QM(v) : einheit === "prozent" ? `${fmt(v, 1)} %` : EUR(v);

export function briefingZahlen(briefing) {
  const zeilen = [];

  // Investment Score zuerst - das Modell soll das Ergebnis kennen, das der
  // Nutzer bereits als Badge sieht, bevor es Details liest (Baustein 6).
  if (briefing.score?.verfuegbar) {
    zeilen.push({ label: "Investment Score", wert: `${briefing.score.score}/100` });
    for (const dim of briefing.score.dimensionen) {
      zeilen.push({
        label: `Dimension ${DIMENSION_LABEL[dim.key] || dim.key}`,
        wert: `${fmt(dim.score, 0)}/100`,
      });
    }
  }

  for (const k of briefing.vergleiche) {
    const label = VERGLEICH_LABEL[k.id];
    if (k.id === "v6") {
      const teile = [];
      if (k.trendVorjahr != null) teile.push(`Vorjahr ${PROZ(k.trendVorjahr)}`);
      if (k.trend4J != null) teile.push(`seit Q2 2022 ${PROZ(k.trend4J)}`);
      zeilen.push({ label, wert: teile.join(" · ") });
      continue;
    }
    const status = STATUS_WORT[k.key] || "";
    const marktTeil = k.markt != null ? ` gegen ${wert(k.markt, k.einheit)}` : "";
    zeilen.push({
      label,
      wert: `${wert(k.eigen, k.einheit)}${marktTeil}${status ? ` (${status})` : ""}`,
    });
    if (k.erreichbarQm != null) {
      zeilen.push({
        label: "Bei bestehendem Mietvertrag in 3 Jahren erreichbar",
        wert: `${QM(k.erreichbarQm)} (Kappungsgrenze ${fmt(k.kappungsgrenzeProzent, 0)} %)`,
      });
    }
    if (k.differenz != null) {
      zeilen.push({ label: "Differenz zum tragfaehigen Preis", wert: EUR(k.differenz) });
    }
  }

  for (const w of briefing.tragfaehigkeit?.wege || []) {
    const flag = w.flagKey ? ` (${FLAG_WORT[w.flagKey]})` : "";
    const zusatz =
      w.key === "kaufpreis"
        ? ` (−${fmt(w.nachlassProzent, 0)} % zum Angebot)`
        : w.key === "eigenkapital"
          ? ` (${w.mehrbedarf > 0 ? "+" : "−"}${EUR(Math.abs(w.mehrbedarf))})`
          : ` (${QM(w.proQm)})`;
    zeilen.push({
      label: TRAGF_LABEL[w.key],
      wert: `${w.key === "kaltmiete" ? EUR_MON(w.wert) : EUR(w.wert)}${zusatz}${flag}`,
    });
  }

  for (const z of briefing.zeitraum.zeilen) {
    zeilen.push({ label: ZEITRAUM_LABEL[z.key], wert: EUR(z.wert) });
  }
  zeilen.push({
    label: `Vermoegenszuwachs nach ${briefing.zeitraum.jahre} Jahren`,
    wert: EUR(briefing.zeitraum.summe),
  });

  for (const s of briefing.stresstest) {
    // Der Best-Case (seit objektseite-neu.md §6.4) bleibt AUSSEN VOR: §9 legt
    // fest, dass diese Spec Prompt und Nutzlast nicht anfasst. Er ist reine
    // Anzeige in Block 5 und wird vom Modell nicht kommentiert. Ohne diese
    // Zeile stuende hier "Szenario undefined" im Prompt, weil SZENARIO_LABEL
    // bewusst nur basis/negativ/stress kennt.
    if (s.key === "best") continue;
    const p = s.parameter;
    const params = p
      ? ` [Miete ${PROZ(p.miete)}, +${fmt(p.leerstand, 0)} % Leerstand, Kosten ${PROZ(p.kosten)}, Anschlusszins ${PROZ(p.zins)} ab Zinsbindungsende]`
      : "";
    zeilen.push({
      label: `Szenario ${SZENARIO_LABEL[s.key]}`,
      wert: `${EUR_MON(s.cashflow)} · ${EUR(s.vermoegen)}${params}`,
    });
  }

  if (briefing.energieklasse) {
    zeilen.push({ label: "Energieklasse (GEG)", wert: briefing.energieklasse });
  }

  return zeilen;
}
