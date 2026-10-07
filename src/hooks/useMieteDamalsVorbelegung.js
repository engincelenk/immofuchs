import { useEffect, useRef } from "react";

// "Miete damals" (letzteErhMiete) folgt der Kaltmiete, solange der Nutzer sie nicht selbst
// gesetzt hat: leer, "0" oder noch genau der zuletzt automatisch gesetzte Wert. Ohne Erhoehung in
// der Historie ist die Miete damals gleich der heutigen. Leerstand ("nein") hat keine Miete damals.
// Genutzt vom Renditerechner und vom Mieterhoehungsrechner (dasselbe Feld in d).
export function useMieteDamalsVorbelegung(d, set) {
  const autoRef = useRef(null);
  useEffect(() => {
    if (d.immLeer === "nein") return;
    const km = +d.kaltmiete > 0 ? String(d.kaltmiete) : null;
    if (!km) return;
    const aktuell = String(d.letzteErhMiete ?? "");
    if (aktuell === "" || aktuell === "0" || aktuell === autoRef.current) {
      autoRef.current = km;
      if (aktuell !== km) set("letzteErhMiete", km);
    }
  }, [d.kaltmiete, d.immLeer, d.letzteErhMiete]); // eslint-disable-line react-hooks/exhaustive-deps
}
