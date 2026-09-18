// Rechenkern des Investment-Briefings (Spec docs/technical_specs/
// investment-briefing.md, Abschnitt 5). Reine Funktionen nach dem Muster von
// kennzahlen.js/investmentScore.js - kein React, kein fetch, kein Modul-State.
//
// Grundprinzip der Spec (Abschnitt 3): "Zahlen aus der Engine, Worte von der
// KI". Jede Zahl der Karte entsteht hier deterministisch aus dem Formular-
// State; die KI bekommt sie fertig formatiert und rechnet nichts nach. Die
// Funktionen liefern deshalb Struktur + Uebersetzungs-SCHLUESSEL, keine
// fertigen UI-Saetze - einzige Ausnahme ist briefingZahlen() am Dateiende,
// das den deutschen KI-Block baut (die Prompts sind ebenfalls deutsch, siehe
// hebelVarianten() in aiTools.js).
//
// Alle Schwellen stehen als benannte Konstanten hier oben, nicht in
// Komponenten - sie sind Fachurteil, nicht kalibriert (Spec Abschnitt 14) und
// muessen sich an einer Stelle nachjustieren lassen.

import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import { berechneSzenarien } from "./investmentScore.js";
import { loeseFuerCashflowNull } from "./aiTools.js";
import { fmt } from "./helpers.js";

// Zuzahlung bis 20 % der Kaltmiete gilt noch als "traegt sich mit Zuzahlung".
export const ZUZAHLUNG_GELB_QUOTE = 0.2;
// |Abweichung| <= 5 % ist "im Rahmen" - darunter ist der Unterschied zum
// Marktwert kleiner als die Streuung der Datenbasis selbst.
export const TOLERANZ_PROZENT = 5;
// Ein noetiger Nachlass ueber 15 % ist am Markt praktisch nicht verhandelbar.
export const NACHLASS_UNREALISTISCH_PROZENT = 15;

// ── Ebene 1: Ampel (5.1) ────────────────────────────────────────────────────
// Regelbasiert, ohne DSCR und ohne Score (Entscheidung E3). Die Hard-Stops
// werden bewusst NICHT aus investmentScore.js importiert, sondern hier ueber
// dieselben Groessen geprueft - sonst liefe der dortige DSCR-Stop mit, der
// laut E3 ausschliesslich in den Profi-Block gehoert.
export function briefingAmpel(d, R) {
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
        ? { status: "neutral", key: "brfStatusImRahmen" }
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
export function briefingZeitraum(R) {
  const zeilen = [
    { key: "zuzahlungen", wert: R.sCF },
    { key: "getilgt", wert: R.da - R.rsEnd },
    { key: "wertzuwachs", wert: R.w },
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
  negativ: { miete: -5, leerstand: 3, kosten: 10, zins: 1 },
  stress: { miete: -10, leerstand: 8, kosten: 20, zins: 2 },
};

export function briefingStresstest(d, t) {
  const { basis, negativ, stress } = berechneSzenarien(d, t);
  return [
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

// ── Energie-Einordnung (5.8) ────────────────────────────────────────────────
// GEG-Skala auf den Verbrauchskennwert. Behebt den Widerspruch "unauffaellig"
// vs. "Investitionsbedarf" (Problem 1 der Spec), indem die Klasse gerechnet
// statt vom Modell geschaetzt wird. Anzeige nur im Profi-Block.
const GEG_SKALA = [
  { bis: 30, klasse: "A+" },
  { bis: 50, klasse: "A" },
  { bis: 75, klasse: "B" },
  { bis: 100, klasse: "C" },
  { bis: 130, klasse: "D" },
  { bis: 160, klasse: "E" },
  { bis: 200, klasse: "F" },
  { bis: 250, klasse: "G" },
];

export function energieKlasse(kennwert) {
  const v = +kennwert;
  if (!(v > 0)) return null;
  return GEG_SKALA.find((s) => v < s.bis)?.klasse ?? "H";
}

// ── Gesamt-Briefing ─────────────────────────────────────────────────────────
// Ein Aufruf fuer die Karte: rechnet R/K einmal und reicht sie an alle Ebenen
// weiter, statt computeRendite() je Ebene erneut laufen zu lassen.
export function berechneBriefing(d, t, opt = {}) {
  const R = computeRendite(d, t);
  const K = berechneKennzahlen(d, R);
  const tragfaehigkeit = briefingTragfaehigkeit(d, t, R, opt);
  return {
    R,
    K,
    ampel: briefingAmpel(d, R),
    kernzahlen: briefingKernzahlen(d, R, K),
    vergleiche: briefingVergleiche(d, R, {
      ...opt,
      tragfaehigerKaufpreis: tragfaehigkeit?.kaufpreis ?? null,
    }),
    tragfaehigkeit,
    zeitraum: briefingZeitraum(R),
    stresstest: briefingStresstest(d, t),
    energieklasse: energieKlasse(d.sanIstVerbrauch),
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
  steuer23: "Steuer nach Paragraf 23",
};

const SZENARIO_LABEL = { basis: "Basis", negativ: "Negativ", stress: "Stress" };

const wert = (v, einheit) =>
  einheit === "eurQm" ? QM(v) : einheit === "prozent" ? `${fmt(v, 1)} %` : EUR(v);

export function briefingZahlen(briefing) {
  const zeilen = [];

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
