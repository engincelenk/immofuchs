// Permanente Seitennavigation ab dem Desktop-Breakpoint (UX-Review 2026-09-06).
//
// Warum ueberhaupt: Bis hierher war die Navigation auf JEDER Fenstergroesse
// eine Handy-Tableiste am unteren Rand - auf 1900 px eine 640 px breite Insel
// unten in der Mitte. Bottom-Tabs sind fuer die Daumenzone gebaut; auf dem
// Desktop gibt es keine, dafuer kostet die Leiste dauerhaft 72 px Hoehe und
// laesst den linken Bildschirmrand leer.
//
// Warum links: Die Aufmerksamkeit liegt auf der linken Bildschirmhaelfte
// deutlich hoeher. Und sieben gleichzeitig sichtbare Ziele ersparen den
// Umweg ueber den "Alle"-Knopf, der nur existiert, weil die Tableiste
// horizontal ueberlaeuft.
//
// Warum NICHT einklappbar: Eine Navigation aus reinen Symbolen senkt die
// Auffindbarkeit messbar - und genau dieses Problem hatte die App schon
// einmal (Bugreport 2026-08-12, daher der "Alle"-Knopf). Ein Einklappen
// waere das Wiedereinfuehren derselben Schwaeche.
//
// Warum reines CSS fuer die Sichtbarkeit (Media Query in App.jsx) und kein
// useIsDesktop(): Ein JS-Breakpoint entscheidet erst nach dem ersten Paint,
// das gaebe ein sichtbares Umspringen. Ausserdem greift eine Media Query
// auch beim Drucken - der Hook nicht.
//
// Die Gruppierung folgt der Aufgabe, nicht der Technik: das Objekt ist das
// Zuhause der App, die sechs Rechner sind Werkzeuge daneben.
const GRUPPEN = [
  { titel: "Objekte", ids: ["saved"] },
  { titel: "Rechner", ids: ["haupt", "kredit", "miete", "sanier", "steuer6", "vfe"] },
];

export function Sidebar({ tabs, tab, onWechsel }) {
  return (
    <nav className="sidebar" aria-label="Hauptnavigation">
      {GRUPPEN.map((gruppe) => {
        const eintraege = gruppe.ids
          .map((id) => tabs.find((x) => x.id === id))
          .filter(Boolean);
        if (eintraege.length === 0) return null;
        return (
          <div key={gruppe.titel} className="sidebar-gruppe">
            <div className="sidebar-label">{gruppe.titel}</div>
            {eintraege.map((tb) => {
              const aktiv = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  className={`sidebar-item${aktiv ? " aktiv" : ""}`}
                  aria-current={aktiv ? "page" : undefined}
                  onClick={() => onWechsel(tb.id)}
                >
                  {/* Die Icons nehmen den Aktiv-Zustand bereits als Argument -
                      dieselbe Quelle wie in der Tableiste, kein zweiter Satz. */}
                  {tb.ic(aktiv)}
                  <span>{tb.l}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
