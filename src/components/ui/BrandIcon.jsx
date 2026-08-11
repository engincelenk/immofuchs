// Ersetzt das 🦊-Emoji als Platzhalter-Icon (Nutzer-Vorgabe 2026-08-11:
// "wo es geht nicht mehr Icon Fuchs sondern Logo") durch das echte
// App-Icon-Bild an Stellen, wo es allein als Marke steht - NICHT dort, wo
// mehrere themenfremde Emoji als zusammengehoeriges Icon-Set auftreten
// (z.B. Zeitleisten mit 📧/⏰), da ein einzelnes Foto-Icon dort inkonsistent
// neben den uebrigen Emoji wirken wuerde.
export function BrandIcon({ size = 24, style }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      style={{ width: size, height: size, objectFit: "contain", borderRadius: size / 5, flexShrink: 0, ...style }}
    />
  );
}
