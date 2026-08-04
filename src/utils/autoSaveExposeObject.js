import { rate, scoreKpi, vrd } from "./bands.js";
import { apiFetch } from "./apiBase.js";

// Automatische Objekt-Anlage nach Exposé-Scan fuer Pro-Nutzer (Spec 4.17,
// S5b-3). Wiederverwendet den bestehenden /api/expose-extract-Endpunkt 1:1
// (keine neue Extraktionslogik, Stabilitätsregel) - neu ist ausschliesslich
// dieser Schritt danach. Fuer Free-Nutzer passiert hier nichts (kein Konto,
// an das gespeichert werden könnte).
//
// Score: ein vereinfachter Brutto-Rendite-BANDS-Wert
// (Kaltmiete×12 ÷ Kaufpreis), NICHT die volle Renditerechner-Kette - die
// braucht zusätzliche, im reinen Scan nicht vorhandene Annahmen (Finanzierung,
// Nebenkosten, Instandhaltung). Ein einfacher, ehrlicher Näherungswert ist
// hier bewusst besser als eine vorgetäuschte Vollrechnung mit erfundenen
// Annahmen.
export async function autoSaveExposeObject(ergebnis) {
  let isPro = false;
  try {
    isPro = localStorage.getItem("if_ispro_cache") === "1";
  } catch {
    isPro = false;
  }
  if (!isPro) return;

  const objekt = ergebnis?.objekt;
  const kaufpreis = Number(objekt?.kaufpreis);
  const kaltmiete = Number(ergebnis?.kosten?.kaltmiete);
  if (!Number.isFinite(kaufpreis) || kaufpreis <= 0) return;

  let score = null;
  let scoreLabel = null;
  if (Number.isFinite(kaltmiete) && kaltmiete > 0) {
    const bruttoR = ((kaltmiete * 12) / kaufpreis) * 100;
    score = Math.round(scoreKpi("bruttoR", bruttoR));
    scoreLabel = vrd(rate("bruttoR", bruttoR));
  }

  const adresse = [objekt?.strasse, objekt?.hausnummer].filter(Boolean).join(" ").trim();
  const title = adresse || objekt?.titel || objekt?.ort || "Objekt aus Exposé";
  const wohnflaeche = Number(objekt?.wohnflaeche);

  try {
    await apiFetch("/objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        title,
        plz: objekt?.plz || null,
        ort: objekt?.ort || null,
        kaufpreis,
        wohnflaeche: Number.isFinite(wohnflaeche) ? wohnflaeche : null,
        score,
        scoreLabel,
        inputData: { tab: "haupt", quelle: "expose-scan" },
        resultData: ergebnis,
        source: "expose-scan",
      }),
    });
  } catch (e) {
    // Kein Blocker fuer die Chat-/Expose-Anzeige selbst - der Nutzer sieht das
    // Extraktionsergebnis so oder so, nur die automatische Objekt-Anlage
    // scheitert still (analog zum bestehenden Fehlerbehandlungs-Stil).
    console.error("[expose] Automatische Objekt-Anlage fehlgeschlagen:", e);
  }
}
