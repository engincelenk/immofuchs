// Preiseinordnung aus der ortsueblichen Miete.
//
// Die Vorlage-App laesst ein Sprachmodell "190.000 €" auf den Euro genau
// schaetzen. Das ist Scheingenauigkeit: das Modell kennt weder Lage noch
// Zustand noch Vergleichsfaelle, es mustert Sprache. Diese Datei macht
// bewusst etwas anderes und Kleineres, das dafuer belegbar ist.
//
// Die Idee: Nicht den Wert der Immobilie schaetzen, sondern die MIETANNAHME
// pruefen, auf der die ganze Rendite steht - und zeigen, was der Preis waere,
// wenn die Miete dem Ortsniveau entspraeche.
//
// Warum das die haerteste verfuegbare Aussage ist: Der Kaufpreis steht im
// Expose, die Miete ist die Annahme. Faellt sie, faellt alles. Ein Kaeufer,
// der 14,40 EUR/m² ansetzt, wo der Ort bei 9,30 liegt, hat kein
// Bewertungsproblem, sondern ein Annahmeproblem - und das laesst sich mit
// amtlichen Daten belegen statt behaupten.
//
// Die Spanne wird NICHT als Prozentband um einen Mittelwert erfunden. Sie
// liegt zwischen zwei gerechneten Ankern:
//   - dem Preis, der bei ORTSUEBLICHER Miete dieselbe Nettorendite braechte
//   - dem heute hinterlegten Kaufpreis (der die eigene Mietannahme abbildet)
// Beide Enden sind damit Rechenergebnisse, keine Schaetzungen.

import { computeRendite } from "./rendite.js";
import { loeseMaximalenKaufpreis } from "./aiTools.js";

// Unterhalb dieser Abweichung ist die Mietannahme nicht auffaellig - der
// Zensuswert ist ein 3-km-Mittel ueber alle Vertragsalter, auf zwei Prozent
// genau ist er ohnehin nicht. Kein Alarm, wo keiner hingehoert.
const TOLERANZ_PROZENT = 8;

export function berechnePreisSchaetzung(d, t, referenzMieteQm) {
  const kaufpreis = +d?.kaufpreis || 0;
  const flaeche = +d?.flaeche || 0;
  const kaltmiete = +d?.kaltmiete || 0;

  if (!(kaufpreis > 0) || !(flaeche > 0) || !(kaltmiete > 0) || !(referenzMieteQm > 0)) {
    return { verfuegbar: false };
  }

  const eigeneMieteQm = kaltmiete / flaeche;
  const abweichungProzent = (eigeneMieteQm / referenzMieteQm - 1) * 100;

  const R = computeRendite(d, t);
  const nettoRendite = Number.isFinite(R?.nR) ? R.nR : null;

  // Der Preis, der bei ortsueblicher Miete dieselbe Nettorendite braechte.
  // Bewusst ueber loeseMaximalenKaufpreis(): dieselbe getestete Bisektion auf
  // derselben Rendite-Engine, mit der auch die Stellschrauben rechnen - keine
  // zweite, abweichende Formel fuer dieselbe Frage.
  let preisBeiReferenz = null;
  if (nettoRendite > 0) {
    preisBeiReferenz = loeseMaximalenKaufpreis(
      { ...d, kaltmiete: String(Math.round(referenzMieteQm * flaeche)) },
      t,
      nettoRendite,
    );
  }

  const anker = [kaufpreis, preisBeiReferenz].filter((v) => Number.isFinite(v) && v > 0);

  return {
    verfuegbar: true,
    referenzMieteQm,
    eigeneMieteQm,
    abweichungProzent,
    // "auffaellig" heisst: die Rendite haengt spuerbar an einer Mietannahme,
    // die vom Ortsniveau abweicht. Nicht "falsch" - eine frisch sanierte
    // Wohnung DARF ueber dem Schnitt liegen. Nur nicht unbemerkt.
    auffaellig: Math.abs(abweichungProzent) > TOLERANZ_PROZENT,
    ueberOrtsniveau: abweichungProzent > 0,
    nettoRendite,
    kaufpreis,
    preisBeiReferenz,
    kaufpreisQm: kaufpreis / flaeche,
    spanneVon: anker.length ? Math.min(...anker) : null,
    spanneBis: anker.length ? Math.max(...anker) : null,
  };
}

// Die Zeilen, die der Zahlenblock zeigt und die das Modell als bereits
// gerechnet mitgeliefert bekommt. Fertig formatierte Strings aus demselben
// Grund wie bei hebelVarianten(): das Modell sieht exakt die Zeichenfolge,
// die der Nutzer liest, und kann ihr nicht widersprechen.
export function preisZeilen(s, locale = "de-DE") {
  if (!s?.verfuegbar) return [];
  const eur = (n) => `${Math.round(n).toLocaleString(locale)} €`;
  // toLocaleString statt toFixed: der Kaufpreis je m² liegt vierstellig, und
  // "5000,00" ohne Tausenderpunkt liest sich im Zahlenblock wie ein Tippfehler.
  const qm = (n) =>
    `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m²`;

  const zeilen = [
    { label: "Ortsübliche Miete", wert: qm(s.referenzMieteQm) },
    { label: "Deine Mietannahme", wert: qm(s.eigeneMieteQm) },
    {
      label: "Abweichung",
      wert: `${s.abweichungProzent > 0 ? "+" : "−"}${Math.abs(s.abweichungProzent).toFixed(0)} %`,
    },
    { label: "Kaufpreis je m²", wert: qm(s.kaufpreisQm) },
  ];

  if (Number.isFinite(s.preisBeiReferenz)) {
    zeilen.push({
      label: "Preis bei ortsüblicher Miete",
      wert: eur(s.preisBeiReferenz),
    });
  }
  return zeilen;
}
