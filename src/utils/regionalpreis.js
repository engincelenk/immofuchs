// Regionaler Kaufpreis-Richtwert je Bundesland/Kreis, fuer die Einordnung im
// Renditerechner. Gleiches Lade-Muster wie mietReferenz.js (statische Datei,
// einmalig per fetch geladen, kein Laufzeit-Request je Objekt).
//
// Matching-Strategie bewusst zweistufig statt einer erfundenen Genauigkeit:
// 1. Exakter Namensabgleich Ort <-> Kreis/Stadt (deckt kreisfreie Staedte
//    und Faelle ab, in denen der Ort selbst der Kreissitz ist).
// 2. Sonst Landesdurchschnitt - kein Rateversuch ueber Postleitzahlen-Naehe,
//    das waere Scheingenauigkeit ohne echte Kreisgrenzen-Kenntnis.
//
// Die Quelle der Zahlen wird hier bewusst NICHT mitgefuehrt oder angezeigt
// (Nutzerentscheidung 2026-09-09) - nur die Werte selbst und eine grobe
// Ebenen-Angabe ("kreis"/"bundesland") fuer die UI-Formulierung.

const DATEI = "/regionalpreise.json";

let daten = null;
let laufend = null;

export function ladeRegionalpreise() {
  if (daten) return Promise.resolve(daten);
  if (!laufend) {
    laufend = fetch(DATEI)
      .then((r) => {
        if (!r.ok) throw new Error(`regionalpreise_${r.status}`);
        return r.json();
      })
      .then((json) => {
        daten = json;
        return daten;
      })
      .catch((err) => {
        laufend = null;
        throw err;
      });
  }
  return laufend;
}

function normalisiere(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\(kreis\)\s*$/i, "")
    .replace(/\s*\(bezirk\)\s*$/i, "");
}

// Reine Matching-Logik, getrennt vom Modul-State exportiert - dasselbe
// Testmuster wie dekodiere() in mietReferenz.js: testbar ohne fetch/Laufzeit.
export function findRegionalPreis(quellDaten, bundeslandCode, ort) {
  if (!quellDaten || !bundeslandCode) return null;
  const bl = quellDaten.bundeslaender.find((b) => b.code === bundeslandCode);
  if (!bl) return null;

  const ortNorm = normalisiere(ort);
  const kreis = ortNorm
    ? bl.kreise.find((k) => normalisiere(k.name) === ortNorm) || null
    : null;

  if (kreis) {
    return {
      ebene: "kreis",
      name: kreis.name,
      kaufWohnung: kreis.kaufWohnung,
      kaufHaus: kreis.kaufHaus,
      mieteWohnung: kreis.mieteWohnung,
      mieteHaus: kreis.mieteHaus,
    };
  }

  const lw = bl.landeswerte;
  if (!lw) return null;
  return {
    ebene: "bundesland",
    name: null,
    kaufWohnung: lw.kaufWohnungAvg,
    kaufHaus: lw.kaufHausAvg,
    mieteWohnung: lw.mieteWohnungAvg,
    mieteHaus: lw.mieteHausAvg,
  };
}

// Synchron, sobald ladeRegionalpreise() aufgeloest ist - null davor oder bei
// unbekanntem Bundesland.
export function regionalPreis(bundeslandCode, ort) {
  return findRegionalPreis(daten, bundeslandCode, ort);
}

// Qualitative Standort-Fakten auf Bundeslandebene (Backlog C.8) - eigene
// formulierte, quellenfreie Saetze (siehe immodaten.json), NICHT aus dem
// Immoheld-Blogartikel uebernommen (siehe Recherche-Notiz dort). Bewusst nur
// Bundesland-Ebene, nicht Kreis: Bundesland wird bereits als kennzahlen.
// bundesland an die KI geschickt (siehe ObjektDetail.jsx), ist also keine
// zusaetzliche Preisgabe von Standortdaten - der Kreis-/Ortsname bleibt
// weiterhin aussen vor.
export function regionalFakten(bundeslandCode, max = 2) {
  if (!daten || !bundeslandCode) return [];
  const bl = daten.bundeslaender.find((b) => b.code === bundeslandCode);
  return Array.isArray(bl?.fakten) ? bl.fakten.slice(0, max) : [];
}

// Welcher Datenstand gerade geladen ist ("Q2 2026" etc.) - fuer den
// eingefrorenen Snapshot unten, damit spaetere Vergleiche wissen, aus
// welchem Quartal ein Snapshot stammt.
export function regionalpreiseStand() {
  return daten?.stand ?? null;
}

// Eingefrorener Kaufpreis-Snapshot fuer ein Objekt, EINMALIG bei Anlage
// berechnet (Backlog B.5/D.12: Grundlage fuer Portfolio-Tracking ueber
// Zeit). Bewusst getrennt von regionalPreis()/regionalpreisZeilen(): die
// dort verwendeten Werte sind immer die AKTUELLEN (fuer die Preiseinordnung
// JETZT), ein Snapshot dagegen darf sich bei einer spaeteren
// Datenaktualisierung NICHT mehr veraendern - sonst wuesste man nie, wie
// sich eine Region seit dem Kauf wirklich entwickelt hat. Der Aufrufer
// (toServerPayload in Merkliste.jsx) ist dafuer verantwortlich, einen schon
// vorhandenen Snapshot NICHT durch einen neuen zu ersetzen.
export function regionalSnapshot(data) {
  const kaufpreis = +data?.kaufpreis || 0;
  const flaeche = +data?.flaeche || 0;
  if (!(kaufpreis > 0) || !(flaeche > 0)) return null;
  const ref = regionalPreis(data?.bundesland, data?.ort);
  if (!ref || !(ref.kaufWohnung > 0)) return null;
  return {
    stand: regionalpreiseStand(),
    kaufpreisQm: Math.round((kaufpreis / flaeche) * 100) / 100,
    regionalerRichtwertQm: ref.kaufWohnung,
    ebene: ref.ebene,
  };
}

// Fuer die KI-Produkte preis/analyse/hebel (2026-09-10): dieselbe
// "Gerechnete Werte"-Uebergabe wie preisZeilen() in preisSchaetzung.js -
// das Modell bekommt fertige Zahlen, rechnet nichts selbst und nennt keine
// Herkunft (Regel in systemPrompt.ts/analysePrompt.ts). Bewusst OHNE
// Ort/Kreis-Namen in den Zeilen - die App schickt laut ObjektDetail.jsx
// generell keine Adresse an das Modell, nur Kennzahlen.
//
// "ref" wird als Parameter uebergeben statt hier per regionalPreis()
// nachgeschlagen - dasselbe Trennungsmuster wie berechnePreisSchaetzung(d,
// t, referenzMieteQm): der Aufrufer laedt/matcht, diese Funktion rechnet nur
// noch, dadurch ohne fetch/Modul-State testbar.
export function regionalpreisZeilen(basis, ref, locale = "de-DE") {
  const kaufpreis = +basis?.kaufpreis || 0;
  const flaeche = +basis?.flaeche || 0;
  if (!(kaufpreis > 0) || !(flaeche > 0)) return [];
  if (!ref || !(ref.kaufWohnung > 0)) return [];

  const kaufpreisQm = kaufpreis / flaeche;
  const abweichung = (kaufpreisQm / ref.kaufWohnung - 1) * 100;
  const qm = (n) =>
    `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/m²`;

  return [
    { label: "Regionaler Kaufpreis-Richtwert", wert: qm(ref.kaufWohnung) },
    {
      label: "Abweichung vom Richtwert",
      wert: `${abweichung > 0 ? "+" : "−"}${Math.abs(abweichung).toFixed(0)} %`,
    },
  ];
}

// Standort-Ranking (Backlog D.13): Bruttomietrendite je Kreis/Stadt ueber
// ALLE Bundeslaender, absteigend sortiert. Bewusst brutto und ohne
// Nebenkosten/Steuern - eine echte Netto-Rendite braucht die individuellen
// Zahlen aus dem Renditerechner, das leistet dieses Ranking nicht und gibt
// auch nicht vor, es zu tun (siehe rankingDisclaim in translations.js).
//
// "quellDaten" als Parameter statt Modul-State - dasselbe Testmuster wie
// findRegionalPreis().
export function bruttoRenditeRanking(quellDaten, top = 10) {
  if (!quellDaten?.bundeslaender) return [];
  const alle = [];
  for (const bl of quellDaten.bundeslaender) {
    for (const k of bl.kreise || []) {
      if (!(k.kaufWohnung > 0) || !(k.mieteWohnung > 0)) continue;
      const renditeProzent = ((k.mieteWohnung * 12) / k.kaufWohnung) * 100;
      alle.push({
        name: k.name,
        bundeslandCode: bl.code,
        renditeProzent: Math.round(renditeProzent * 10) / 10,
      });
    }
  }
  alle.sort((a, b) => b.renditeProzent - a.renditeProzent);
  return alle.slice(0, top);
}
