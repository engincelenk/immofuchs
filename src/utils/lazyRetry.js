import { lazy } from "react";

// Chunk-Hash-Mismatch nach einem Deploy waehrend eine alte Seite noch offen
// ist (Befund G5.1-Trace, 24.08.2026): der lazy()-Import eines Chunks
// schlaegt dann mit net::ERR_FAILED fehl, weil der Server die alte,
// gehashte Datei nicht mehr ausliefert. Ohne Behandlung bleibt die Seite in
// einem toten Zustand haengen (React wirft, nichts faengt es ab). Ein
// einmaliger Reload zieht die aktuelle index.html samt gueltigen
// Chunk-Referenzen - sessionStorage verhindert eine Reload-Schleife, falls
// der Fehler einen anderen Grund hat (z. B. Netzwerkausfall).
export function lazyWithReload(importer, chunkName) {
  return lazy(() =>
    importer().catch((err) => {
      const key = `chunk-reload:${chunkName}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Reload laeuft bereits - diese Promise muss nie mehr aufloesen.
        return new Promise(() => {});
      }
      throw err;
    }),
  );
}
