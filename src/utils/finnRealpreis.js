// Realpreis-Rechner der Finn-Exposé-Analyse.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 5.
//
// Rechnet die Zahlen aus, die im Expose nie ausgerechnet werden: den All-in-
// Kaufpreis inkl. Stellplatz, den Quadratmeterpreis auf Basis der KLEINSTEN
// belegten Flaeche statt der beworbenen, und - falls vermietet - die Rendite
// auf denselben All-in-Preis.
//
// Bewusst eigenstaendig statt ueber computeRendite() aus rendite.js: die
// Funktion dort haengt am kompletten Formular-State des Renditerechners
// (Zinssatz, Tilgung, Bundesland, Leerstand, AfA). Hier liegt nur ein Expose
// vor. Die beiden Formeln, die wirklich gebraucht werden, sind zwei Zeilen -
// dafuer 30 Pflichtfelder zu erfinden waere die schlechtere Kopplung.
//
// Grundregel wie im Extraktions-Prompt: fehlt ein Eingangswert, entfaellt die
// Kennzahl (null). Niemals schaetzen, niemals interpolieren.

import { fmt, fmtE, fmtP } from "./helpers.js";

const zahlOderNull = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

// Die kleinste im Expose belegte Wohnflaeche. Das Extraktionsergebnis traegt in
// `objekt.wohnflaeche` bereits die kleinere Angabe (exposePrompt.ts), die
// beworbene steckt nur noch in `abweichungen` - von dort wird sie geholt,
// damit die Preistabelle beide Spalten fuellen kann.
export function ermittleFlaechen(ergebnis) {
  const extrahiert = zahlOderNull(ergebnis?.objekt?.wohnflaeche);
  const abw = (ergebnis?.abweichungen ?? []).find((a) => a.feld === "wohnflaeche");

  const kandidaten = [extrahiert];
  if (abw) {
    if (typeof abw.wert_a === "number") kandidaten.push(abw.wert_a);
    if (typeof abw.wert_b === "number") kandidaten.push(abw.wert_b);
  }
  const gueltige = kandidaten.filter((v) => zahlOderNull(v) !== null);
  if (gueltige.length === 0) return { beworben: null, real: null, abweichend: false };

  const real = Math.min(...gueltige);
  const beworben = Math.max(...gueltige);
  return { beworben, real, abweichend: beworben !== real };
}

export function berechneRealpreis(ergebnis) {
  const kaufpreis = zahlOderNull(ergebnis?.objekt?.kaufpreis);
  const stellplatz = zahlOderNull(ergebnis?.objekt?.stellplatz_kaufpreis);
  const flaechen = ermittleFlaechen(ergebnis);
  const kaltmiete = zahlOderNull(ergebnis?.kosten?.kaltmiete);
  const nichtUml = zahlOderNull(ergebnis?.kosten?.hausgeld_nicht_umlagefaehig);

  const allIn = kaufpreis === null ? null : kaufpreis + (stellplatz ?? 0);

  const proQm = (preis, flaeche) => (preis !== null && flaeche !== null ? preis / flaeche : null);

  const qmBeworben = proQm(kaufpreis, flaechen.beworben);
  const qmReal = proQm(kaufpreis, flaechen.real);
  const qmAllIn = proQm(allIn, flaechen.real);

  // Rendite immer auf den All-in-Preis: wer den Stellplatz mitkauft, hat ihn
  // auch bezahlt. Der Vergleichswert auf den blossen Kopfpreis wird zusaetzlich
  // ausgewiesen, damit die Differenz sichtbar wird statt nur behauptet.
  const jahresMiete = kaltmiete === null ? null : kaltmiete * 12;
  const rendite = (miete, preis) => (miete !== null && preis !== null ? (miete / preis) * 100 : null);

  const brutto = rendite(jahresMiete, allIn);
  const bruttoOhneStellplatz = stellplatz === null ? null : rendite(jahresMiete, kaufpreis);
  const netto =
    jahresMiete !== null && nichtUml !== null ? rendite(jahresMiete - nichtUml * 12, allIn) : null;

  return {
    kaufpreis,
    stellplatz,
    allIn,
    flaecheBeworben: flaechen.beworben,
    flaecheReal: flaechen.real,
    flaecheAbweichend: flaechen.abweichend,
    qmBeworben,
    qmReal,
    qmAllIn,
    kaltmiete,
    bruttoRendite: brutto,
    bruttoRenditeOhneStellplatz: bruttoOhneStellplatz,
    nettoRendite: netto,
  };
}

// Die Preistabelle des Handouts ("Der echte Preis"): Beworben gegen Real.
// Zeilen ohne Datenbasis entfallen komplett, statt "—" zu zeigen.
export function bauePreistabelle(realpreis) {
  const zeilen = [];
  const push = (label, beworben, real, abweichend) =>
    zeilen.push({ label, beworben, real, abweichend: Boolean(abweichend) });

  if (realpreis.flaecheReal !== null) {
    push(
      "Wohnfläche",
      realpreis.flaecheAbweichend ? `${fmt(realpreis.flaecheBeworben, 2)} m²` : null,
      `${fmt(realpreis.flaecheReal, 2)} m²`,
      realpreis.flaecheAbweichend,
    );
  }
  if (realpreis.qmReal !== null) {
    push(
      "Preis pro m²",
      realpreis.flaecheAbweichend ? `${fmtE(Math.round(realpreis.qmBeworben))}` : null,
      `${fmtE(Math.round(realpreis.qmReal))}`,
      realpreis.flaecheAbweichend,
    );
  }
  if (realpreis.allIn !== null && realpreis.stellplatz !== null) {
    push("Gesamtpreis inkl. Stellplatz", fmtE(realpreis.kaufpreis), fmtE(realpreis.allIn), true);
  }
  if (realpreis.qmAllIn !== null && realpreis.stellplatz !== null) {
    push("Preis pro m² all-in", null, fmtE(Math.round(realpreis.qmAllIn)), true);
  }
  if (realpreis.bruttoRendite !== null) {
    push(
      "Bruttomietrendite",
      realpreis.bruttoRenditeOhneStellplatz !== null
        ? fmtP(realpreis.bruttoRenditeOhneStellplatz, 2)
        : null,
      fmtP(realpreis.bruttoRendite, 2),
      realpreis.bruttoRenditeOhneStellplatz !== null,
    );
  }
  if (realpreis.nettoRendite !== null) {
    push("Nettomietrendite", null, fmtP(realpreis.nettoRendite, 2), false);
  }
  return zeilen;
}
