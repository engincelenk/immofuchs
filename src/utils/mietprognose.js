import { MIET_P } from "../data.js";
import { addM, addY, fmt } from "./helpers.js";

// Mietsteigerungs-Prognose nach § 558 BGB (Vergleichsmiete + Kappungsgrenze).
// Verbatim aus Miete.jsx ausgelagert (2026-07-23, Clean-Code-Review), damit sowohl
// der Miet- als auch der Renditerechner dieselbe reine Funktion nutzen koennen,
// ohne dass ein Rechner das Komponenten-Modul des anderen importieren muss.
export function buildMP(miete, qm, vmQm, kappP, lD, lM, jahre, k15, tObj) {
  const vm = vmQm > 0 ? vmQm * qm : null,
    prog = k15 ? MIET_P.kapp15 : MIET_P.normal,
    vmPA = prog.pA / 100,
    heute = new Date(),
    ende = addY(heute, jahre);
  let akt = miete,
    lInc = lD ? new Date(lD) : new Date(heute.getFullYear() - 2, heute.getMonth(), 1);
  const hist = [];
  if (lD && lM > 0 && lM < miete) hist.push({ date: new Date(lD), fromM: lM, toM: miete });
  const rows = [];
  let sg = 0;
  while (sg++ < 20) {
    const n = addM(lInc, 15);
    if (n > ende) break;
    const f3 = addM(n, -36),
      used = hist
        .filter((h) => h.date >= f3 && h.date < n)
        .reduce((s, h) => s + (h.fromM > 0 ? ((h.toM - h.fromM) / h.fromM) * 100 : 0), 0),
      vK = Math.max(0, kappP - used),
      rentAtF3 = hist.filter((h) => h.date < f3).slice(-1)[0]?.toM ?? miete,
      mxK = rentAtF3 * (1 + kappP / 100),
      j2D = (n - heute) / (1e3 * 60 * 60 * 24 * 365.25),
      vP = vm ? vm * Math.pow(1 + vmPA, j2D) : null,
      mxM = vP ? Math.min(mxK, vP) : mxK,
      mE = Math.max(0, mxM - akt),
      mP = akt > 0 ? (mE / akt) * 100 : 0,
      neu = akt + mE;
    let st, sC;
    if (vP && akt >= vP - 0.5) {
      st = (tObj || { vgl: "Vgl." }).vgl;
      sC = "neg";
    } else if (vK <= 0.1) {
      st = (tObj || { kapp: "Kap." }).kapp;
      sC = "neg";
    } else {
      st = `+${fmt(mP, 1)}%`;
      sC = "pos";
    }
    rows.push({
      datum: n,
      aktMiete: akt,
      vm,
      vmProg: vP,
      mE,
      mP,
      neueMiete: neu,
      verfK: vK,
      status: st,
      sC,
    });
    if (mE > 0) {
      hist.push({ date: new Date(n), fromM: akt, toM: neu });
      akt = neu;
    }
    lInc = new Date(n);
  }
  return { rows, q: prog.q, vmPA: prog.pA };
}
