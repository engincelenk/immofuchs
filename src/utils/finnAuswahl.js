// Persistenz der Fragen-Auswahl im Handout.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 3.1.
//
// ABWEICHUNG ZUR SPEC (bewusst, 2026-07-30): dort sollte die Auswahl am
// gemerkten Objekt in der Merkliste haengen (`if_saved_v1`). Beim Verdrahten
// zeigte sich, dass es diese Verbindung nicht gibt: `saveObj()` speichert den
// Formular-State der Rechner, nicht das hochgeladene Expose - ein gemerktes
// Objekt weiss nichts von dem Expose, aus dem seine Werte stammen. Eine
// Verknuepfung nachzuruesten waere ein Eingriff in die Merkliste fuer einen
// Nutzen, den ein eigener Store einfacher liefert.
//
// Stattdessen: eigener Store, adressiert ueber einen Fingerabdruck des
// Exposes. Vorteil gegenueber der Spec-Fassung - die Auswahl ueberlebt auch
// dann, wenn der Nutzer das Objekt gar nicht gemerkt hat.

const KEY = "if_finn_auswahl_v1";
// Deckel gegen unbegrenztes Wachsen des localStorage. 20 Exposes sind
// deutlich mehr, als jemand parallel im Blick hat; das aelteste faellt raus.
const MAX_EINTRAEGE = 20;

// Fingerabdruck statt ID: das Expose hat keine. Adresse, Kaufpreis und
// Wohnflaeche zusammen identifizieren ein Objekt in der Praxis eindeutig
// genug. Zwei Uploads desselben Objekts sollen bewusst denselben Schluessel
// ergeben - dann findet der Nutzer seine Auswahl wieder.
export function exposeSchluessel(analyse) {
  if (!analyse) return null;
  const teile = [
    (analyse.adresse || "").toLowerCase().replace(/\s+/g, ""),
    analyse.realpreis?.kaufpreis ?? "",
    analyse.realpreis?.flaecheReal ?? "",
  ];
  const roh = teile.join("|");
  return roh === "||" ? null : roh;
}

function lies() {
  try {
    const roh = JSON.parse(localStorage.getItem(KEY) || "{}");
    return roh && typeof roh === "object" && !Array.isArray(roh) ? roh : {};
  } catch {
    // Defekter oder geblockter localStorage (Privatmodus): einfach ohne
    // Persistenz weiterlaufen, statt das Panel zu zerlegen.
    return {};
  }
}

export function ladeAuswahl(schluessel) {
  if (!schluessel) return null;
  const eintrag = lies()[schluessel];
  return Array.isArray(eintrag?.auswahl) ? eintrag.auswahl : null;
}

export function speichereAuswahl(schluessel, auswahl) {
  if (!schluessel) return;
  try {
    const alle = lies();
    alle[schluessel] = { auswahl: [...auswahl], ts: Date.now() };

    // Der gerade geschriebene Eintrag ist gesetzt und wird nie verdraengt.
    // Ohne diese Sonderbehandlung kann er selbst rausfliegen: mehrere
    // Schreibvorgaenge in derselben Millisekunde haben denselben ts, die
    // Sortierung ist dann stabil und behaelt die Einfuegereihenfolge - also
    // die aeltesten. Genau dieser Fall ist im Test aufgeschlagen.
    const uebrige = Object.keys(alle)
      .filter((k) => k !== schluessel)
      .sort((a, b) => (alle[b].ts ?? 0) - (alle[a].ts ?? 0))
      .slice(0, MAX_EINTRAEGE - 1);

    const behalten = { [schluessel]: alle[schluessel] };
    for (const k of uebrige) behalten[k] = alle[k];

    localStorage.setItem(KEY, JSON.stringify(behalten));
  } catch {
    /* Quota voll oder localStorage geblockt - Auswahl bleibt im State */
  }
}
