// BEG-Foerderung fuer den Sanierungsrechner (Stand der Regeln 2026-10-01,
// gegengeprueft auf bafa.de und kfw.de):
//   - Gebaeudehuelle + Lueftung (BAFA): 15 %, eine gemeinsame Hoechstgrenze
//     je Wohneinheit; iSFP +5 % nur auf den Betrag ueber der Mindestinvestition
//     (= Hoechstgrenze ohne iSFP) und doppelte Hoechstgrenze.
//   - Heizung (KfW 458): 30 % Grundfoerderung; Klima- und Einkommensbonus nur
//     fuer die selbstgenutzte Wohneinheit (deren Anteil an den Kosten), max 80 %.
import { BAFA, KFW_HEIZUNG } from "../data.js";

export function staffelGrenze(g, we, erste = g.erste) {
  const n = Math.max(1, Math.floor(+we || 1));
  return erste + Math.min(n - 1, 5) * g.zweiBisSechs + Math.max(0, n - 6) * g.abSieben;
}

// Anzahl der halbjaehrlichen Absenkungsschritte (01.02./01.08.) ab 01.02.2027.
export function absenkSchritte(datum = new Date()) {
  const j = datum.getFullYear(),
    m = datum.getMonth() + 1;
  if (j < 2027 || (j === 2027 && m < 2)) return 0;
  return (j - 2027) * 2 + (m >= 8 ? 2 : 1);
}

export function klimabonusAktuell(datum) {
  return Math.max(0, KFW_HEIZUNG.klimabonusStart - 4 * absenkSchritte(datum));
}

export function heizungGrenzeErste(datum) {
  return KFW_HEIZUNG.hoechstgrenze.erste - 750 * absenkSchritte(datum);
}

// Klimabonus-Anspruch: Oel/Kohle/Nachtspeicher immer, Gas/Biomasse ab 20 J.
export function klimabonusBerechtigt(heizTyp, heizAlter) {
  if (["heizoel", "kohle", "strom"].includes(heizTyp)) return true;
  return ["gas", "pellets"].includes(heizTyp) && heizAlter === "alt";
}

export function huelleFoerderung(kosten, { we = 1, isfp = false } = {}) {
  const grenzeOhne = staffelGrenze(BAFA.hoechstgrenze, we);
  const ff = Math.min(kosten, isfp ? staffelGrenze(BAFA.hoechstgrenzeIsfp, we) : grenzeOhne);
  const grund = ff * (BAFA.basisfoerderung / 100);
  const bonus = isfp ? Math.max(0, ff - grenzeOhne) * (BAFA.isfpBonus / 100) : 0;
  return { foerderfaehig: ff, betrag: Math.round(grund + bonus) };
}

export function heizungFoerderung(
  kosten,
  { we = 1, selbst = false, klima = false, einkommensStufe = 0, datum } = {},
) {
  const n = Math.max(1, Math.floor(+we || 1));
  const ff = Math.min(
    kosten,
    staffelGrenze(KFW_HEIZUNG.hoechstgrenze, n, heizungGrenzeErste(datum)),
  );
  const grund = KFW_HEIZUNG.grundfoerderung / 100;
  let bonus = 0;
  if (selbst) {
    const roh =
      (klima ? klimabonusAktuell(datum) : 0) + (KFW_HEIZUNG.einkommensbonus[einkommensStufe] || 0);
    bonus = Math.min(roh, KFW_HEIZUNG.maxFoerderung - KFW_HEIZUNG.grundfoerderung) / 100;
  }
  return { foerderfaehig: ff, betrag: Math.round(ff * grund + (ff / n) * bonus) };
}
