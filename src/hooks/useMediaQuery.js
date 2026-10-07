import { useEffect, useState } from "react";

// Allgemeine Media-Query-Abfrage. Herausgeloest aus useIsDesktop, das dieselbe
// Mechanik nur mit einer fest verdrahteten Abfrage enthielt - inzwischen
// braucht auch die Bereichswahl im Kontobereich (MyAccount.jsx) eine eigene
// Schwelle.
//
// Zusaetzlich auf "resize" hoeren: in emulierten Viewports (DevTools/Preview)
// kippt `matches` zwar, das change-Event bleibt aber aus - dann haengt der
// Zustand fest (2026-07-22 im Preview reproduziert).
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [query]);

  return matches;
}
