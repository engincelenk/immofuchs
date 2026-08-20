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
// 600px Breite verkleinert abgelegt (Original 2172x724 / 465 KB waere fuer
// eine 20px hohe Darstellung unverhaeltnismaessig schwer).
//
// `size` ist deshalb jetzt die HOEHE, die Breite ergibt sich aus dem
// 3:1-Seitenverhaeltnis - vorher war es die Kantenlaenge eines Quadrats.
// Aufrufer, die das Bild neben einen eigenen Schriftzug gesetzt haben, zeigen
// diesen nicht mehr zusaetzlich an (er steckt jetzt im Bild).
//
// Nicht betroffen und bewusst weiterhin quadratisch: die PWA-Icons
// (icon-192/512.png, manifest.json - Homescreen/Push), die Favicons und das
// E-Mail-Logo. Das sind App-Symbole bzw. eigene Formate, keine UI-Marke.
export function BrandIcon({ size = 24, style }) {
  return (
    <img
      src="/logo-wordmark.png"
      alt="ImmoFuchs"
      style={{ height: size, width: "auto", objectFit: "contain", flexShrink: 0, ...style }}
    />
  );
}
