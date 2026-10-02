// Vergleich "Immobilie vs. Alternativanlage" fuer die Karte Alternativ-
// Investment. Reine Rechenlogik, keine UI.
//
// Idee: Wer die Immobilie kauft, zahlt zum Start einen Betrag aus eigener
// Tasche (Eigenkapital, bar gezahlte Kaufnebenkosten, Sonderumlage,
// Renovierung) und legt in jedem Jahr mit negativem Cashflow Geld nach. Dieselbe
// Summe zu denselben Zeitpunkten koennte er stattdessen in eine Alternative
// stecken. Verglichen wird, was am Ende uebrig bleibt.
//
// Zur Immobilie: Gewinn = R.g aus computeRendite() - Verkaufswert minus
// Restschuld, plus Cashflows, minus Einsatz und Steuer. Dieselbe Zahl, die
// der Renditerechner ausweist; hier wird sie nicht neu erfunden. Positive
// Cashflows behaelt der Immobilienbesitzer als Bargeld (ohne Verzinsung, wie
// in R.g); negative sind Einzahlungen, die die Alternative ebenfalls erhaelt.
//
// Vereinfachungen (in der Karte ausgewiesen): Jahresendverzinsung, Steuer bei
// ETF/Gold am Ende statt Vorabpauschale, kein Sparer-Pauschbetrag, keine
// Inflation (alle Werte nominal), keine Verkaufskosten bei der Immobilie.

import { computeRendite } from "./rendite.js";
import {
  ABGELTUNGSTEUER,
  ALTERNATIV_ANLAGEN_DATEN,
  TEILFREISTELLUNG_AKTIENFONDS,
} from "../data/alternativAnlagen.js";

export const HORIZONTE = [10, 15, 20];

// Endwert einer Anlage nach Steuer. `einzahlungen[0]` ist der Betrag zu
// Beginn, `einzahlungen[y]` die Einzahlung am Ende von Jahr y.
export function endwertAnlage(einzahlungen, prozentPa, steuerArt) {
  const r = prozentPa / 100;
  const rNetto = steuerArt === "laufend" ? r * (1 - ABGELTUNGSTEUER) : r;
  let stand = einzahlungen[0] || 0;
  for (let y = 1; y < einzahlungen.length; y++) {
    stand = stand * (1 + rNetto) + (einzahlungen[y] || 0);
  }
  const summeEin = einzahlungen.reduce((a, b) => a + b, 0);
  const gewinn = stand - summeEin;
  let steuer = 0;
  if (gewinn > 0) {
    if (steuerArt === "etf") steuer = gewinn * ABGELTUNGSTEUER * (1 - TEILFREISTELLUNG_AKTIENFONDS);
    else if (steuerArt === "ende") steuer = gewinn * ABGELTUNGSTEUER;
  }
  return { endwert: stand - steuer, einzahlungen: summeEin, steuer };
}

// Vergleich fuer einen Zeithorizont. Gibt null zurueck, wenn die Immobilie
// noch nicht berechenbar ist (kein Kaufpreis) oder nichts eingesetzt wird.
export function berechneAlternativVergleich(d, t, jahre) {
  const kaufpreis = +d?.kaufpreis || 0;
  if (!(kaufpreis > 0)) return null;
  const R = computeRendite({ ...d, jahre: String(jahre) }, t);

  const nkBar = d.nkFinanzieren ? 0 : R.nbk;
  const start = (+d.eigenkapital || 0) + nkBar + (+d.sonder || 0) + (+d.renovierung || 0);
  if (!(start > 0)) return null;

  // Nachschuesse: Jahre mit negativem Cashflow nach Steuer.
  const einzahlungen = [start];
  let nachschuss = 0;
  let positivCf = 0;
  for (let y = 0; y < jahre; y++) {
    const cf = R.yearRows[y]?.cf || 0;
    einzahlungen.push(cf < 0 ? -cf : 0);
    if (cf < 0) nachschuss += -cf;
    else positivCf += cf;
  }
  const eingezahlt = start + nachschuss;

  const endvermoegen = eingezahlt + R.g;
  // Durchschnittliche Rendite p. a. auf das eingezahlte Kapital. Naeherung:
  // Nachschuesse werden wie der Startbetrag behandelt, daher eher
  // vorsichtig gerechnet.
  const vielfaches = eingezahlt > 0 ? endvermoegen / eingezahlt : null;
  const rendite = vielfaches && vielfaches > 0 ? (Math.pow(vielfaches, 1 / jahre) - 1) * 100 : null;

  const immobilie = {
    gewinn: R.g,
    endvermoegen,
    verkaufswert: R.vw,
    restschuld: R.rsEnd,
    steuerVerkauf: R.st23,
    cashflowPositiv: positivCf,
    rendite,
  };

  const anlagen = ALTERNATIV_ANLAGEN_DATEN.map((a) => {
    const szenarien = {};
    for (const [s, prozent] of Object.entries(a.szenarien)) {
      const e = endwertAnlage(einzahlungen, prozent, a.steuer);
      szenarien[s] = { prozent, endvermoegen: e.endwert, gewinn: e.endwert - eingezahlt };
    }
    return { key: a.key, name: a.name, szenarien };
  });

  return { jahre, start, nachschuss, eingezahlt, immobilie, anlagen };
}

export function berechneAlternativAlle(d, t) {
  const ergebnis = {};
  for (const j of HORIZONTE) ergebnis[j] = berechneAlternativVergleich(d, t, j);
  return ergebnis;
}

// Kompakte Zahlen fuer die KI: nur gerechnete Werte, die das Modell
// erlaeutert, aber nicht selbst neu berechnet.
export function alternativZahlenFuerKi(vergleich) {
  if (!vergleich) return null;
  const runde = (n) => Math.round(n);
  return {
    horizontJahre: vergleich.jahre,
    einsatzStart: runde(vergleich.start),
    nachschuesseGesamt: runde(vergleich.nachschuss),
    immobilie: {
      endvermoegenNachSteuer: runde(vergleich.immobilie.endvermoegen),
      gewinn: runde(vergleich.immobilie.gewinn),
      renditePa:
        vergleich.immobilie.rendite == null ? null : Math.round(vergleich.immobilie.rendite * 10) / 10,
    },
    anlagen: vergleich.anlagen.map((a) => ({
      name: a.name,
      szenarien: Object.fromEntries(
        Object.entries(a.szenarien).map(([s, v]) => [
          s,
          { annahmePa: v.prozent, endvermoegenNachSteuer: runde(v.endvermoegen) },
        ]),
      ),
    })),
  };
}
