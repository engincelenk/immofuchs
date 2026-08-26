import { useTheme } from "../../context/ThemeContext.jsx";

// Ersetzt das 🦊-Emoji als Platzhalter-Icon (Nutzer-Vorgabe 2026-08-11:
// "wo es geht nicht mehr Icon Fuchs sondern Logo") durch das echte
// Marken-Bild an Stellen, wo es allein als Marke steht - NICHT dort, wo
// mehrere themenfremde Emoji als zusammengehoeriges Icon-Set auftreten
// (z.B. Zeitleisten mit 📧/⏰), da ein einzelnes Foto-Icon dort inkonsistent
// neben den uebrigen Emoji wirken wuerde.
//
// Zeigt seit 2026-08-20 den Schriftzug (/logo-wordmark.png) statt des
// quadratischen App-Icons (/icon-192.png) - Nutzer-Vorgabe: app-weit nur EIN
// Logo-File. Quelle ist docs/images/immofuchs-png-transparent.png, hier auf
// den sichtbaren Inhalt zugeschnitten und auf 600x152 verkleinert abgelegt
// (Original 2172x724 / 465 KB waere fuer eine 30px hohe Darstellung
// unverhaeltnismaessig schwer). Der Zuschnitt war noetig, weil das Original
// rundum transparenten Rand hat - allein oben/unten 26% der Hoehe, wodurch
// das Logo bei gleicher CSS-Hoehe deutlich kleiner wirkte als die frueher
// hier stehende Kombination aus Icon + HTML-Schriftzug (Nutzer-Meldung).
//
// `size` ist deshalb jetzt die HOEHE, die Breite ergibt sich aus dem
// 3,95:1-Seitenverhaeltnis - vorher war es die Kantenlaenge eines Quadrats.
// Aufrufer, die das Bild neben einen eigenen Schriftzug gesetzt haben, zeigen
// diesen nicht mehr zusaetzlich an (er steckt jetzt im Bild).
//
// Bewusst OHNE Marken-Bild seit 2026-08-20: der Trial-Badge in PricingStep
// (war 14px) und der "Kostenlos anmelden"-Knopf in CalculatorTrialGate (war
// 18px). Ein Schriftzug waere dort 55x14 bzw. 71x18 gross - unlesbar, und im
// Knopf laese er sich als "immofuchs.info Kostenlos anmelden".
//
// Nicht betroffen und bewusst weiterhin quadratisch: die PWA-Icons
// (icon-192/512.png, manifest.json - Homescreen/Push), die Favicons und das
// E-Mail-Logo. Das sind App-Symbole bzw. eigene Formate, keine UI-Marke.
//
// logo-wordmark-dark.png (2026-08-26): im Dark Mode war "immo" und ".info"
// (Marineblau) auf dunklem Hintergrund praktisch unlesbar - dieselbe Grafik
// mit den beiden Textteilen in Weiss statt Marineblau, sonst identisch
// (Quelle docs/images/immofuchs-png-dark-mode.png, zugeschnitten/verkleinert
// nach demselben Verfahren wie das helle Original, siehe Kommentar oben).
export function BrandIcon({ size = 24, style }) {
  const { resolvedTheme } = useTheme();
  return (
    <img
      src={resolvedTheme === "dark" ? "/logo-wordmark-dark.png" : "/logo-wordmark.png"}
      alt="ImmoFuchs"
      style={{ height: size, width: "auto", objectFit: "contain", flexShrink: 0, ...style }}
    />
  );
}
