import { useEffect, useState } from "react";

// Ab 1024px sitzt der Assistent als kleines, nicht-modales Fenster unten
// rechts (Allianz-Vorbild) - dort gibt es weder Overlay noch Scroll-Sperre,
// die Seite bleibt bedienbar. Darunter bleibt es ein klassisches, modales
// Bottom-Sheet. Ersetzt die Breiten-Abfragen des entfernten useFloatingSheet.
const QUERY = "(min-width:1024px)";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setIsDesktop(mq.matches);
    // Zusaetzlich auf "resize": in emulierten Viewports (DevTools/Preview)
    // kippt `matches` zwar, das change-Event bleibt aber aus - dann haengt
    // der Zustand fest (2026-07-22 im Preview reproduziert).
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    sync();
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return isDesktop;
}
