import { useEffect, useState } from "react";
import { ladeRegionaldaten } from "./regionalpreis.js";

// Laedt die Regionaldaten fuer Bundesland + PLZ eines Objekts und liefert
// true, sobald genau diese Kombination geladen ist - danach sind
// regionalPreis()/kreisFuerPlz() synchron nutzbar. Wechselt das Bundesland
// oder die PLZ, faellt der Wert bis zum Nachladen auf false zurueck, damit
// Aufrufer nicht mit dem Stand des vorigen Orts rechnen.
export function useRegionaldaten(bundesland, plz) {
  const schluessel = `${bundesland || ""}|${plz || ""}`;
  const [geladen, setGeladen] = useState(null);
  useEffect(() => {
    let lebt = true;
    ladeRegionaldaten(bundesland, plz)
      .then(() => {
        if (lebt) setGeladen(schluessel);
      })
      .catch(() => {});
    return () => {
      lebt = false;
    };
  }, [bundesland, plz, schluessel]);
  return geladen === schluessel;
}
