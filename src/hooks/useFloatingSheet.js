import { useCallback, useRef, useState } from "react";

// Erlaubt freies Verschieben (Titelleiste) UND Groessenaendern (Eck-Griff,
// Breite+Hoehe) des Sheets per Maus - nur auf Desktop sinnvoll (angedockte
// Seitenleiste), auf Mobile bleibt es ein normales Bottom-Sheet ohne beides
// (Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22). `rect===null` bedeutet
// "angedockt" (Default-CSS-Position/-Groesse greift).
const MIN_WIDTH = 300;
const MIN_HEIGHT = 320;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 600;

export function useFloatingSheet(sheetRef) {
  const [rect, setRect] = useState(null);
  const dragState = useRef(null);
  const resizeState = useRef(null);
  // Merkt sich die zuletzt bekannte "echte" (nicht verkleinerte) Groesse.
  // Beim Verkleinern wird NIE die dann winzige Live-Hoehe als neue Referenz
  // uebernommen - sonst "vergisst" das Fenster beim Wiederherstellen seine
  // echte Groesse (Bug-Report 2026-07-22: Verkleinern -> Vergroessern sieht
  // zerschossen aus, breiter Schlagschatten unter der winzigen Box wirkt
  // wie ein langer Strich).
  const lastExpandedSize = useRef({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  // Startpunkt zum Verschieben: Position wird live von der aktuellen
  // Darstellung uebernommen (auch waehrend verkleinert - das bewegt die Box
  // ja nicht). Groesse dagegen NIE aus dem angedockten Vollhoehe-Zustand
  // oder dem verkleinerten Zustand, sondern immer aus der gemerkten "echten"
  // Groesse - das gibt sofort echten Bewegungsspielraum in beide Richtungen,
  // ohne den Umweg ueber "erst verkleinern" (Bug-Report 2026-07-22, Punkte 1+2).
  const seedForDrag = useCallback(() => {
    if (rect) return rect;
    const r = sheetRef.current.getBoundingClientRect();
    return { left: r.left, top: r.top, width: lastExpandedSize.current.width, height: lastExpandedSize.current.height };
  }, [rect, sheetRef]);

  // Startpunkt zum Groessenaendern: der Griff ist nur sichtbar, wenn nicht
  // verkleinert (siehe AssistantSheet.jsx/LandingMascot.jsx) - die Live-
  // Messung ist hier deshalb immer vertrauenswuerdig.
  const seedForResize = useCallback(() => {
    if (rect) return rect;
    const r = sheetRef.current.getBoundingClientRect();
    const seeded = { left: r.left, top: r.top, width: r.width, height: r.height };
    lastExpandedSize.current = { width: seeded.width, height: seeded.height };
    return seeded;
  }, [rect, sheetRef]);

  const onDragPointerDown = useCallback(
    (e) => {
      if (window.innerWidth < 1024 || !sheetRef.current) return;
      const start = seedForDrag();
      dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: start.left, startTop: start.top, width: start.width, height: start.height };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [sheetRef, seedForDrag]
  );

  const onDragPointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const { startX, startY, startLeft, startTop, width, height } = dragState.current;
    let left = startLeft + (e.clientX - startX);
    let top = startTop + (e.clientY - startY);
    left = Math.min(Math.max(left, 0), window.innerWidth - width);
    top = Math.min(Math.max(top, 0), window.innerHeight - height);
    setRect({ left, top, width, height });
  }, []);

  const onDragPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const onResizePointerDown = useCallback(
    (e) => {
      if (window.innerWidth < 1024 || !sheetRef.current) return;
      e.stopPropagation();
      const start = seedForResize();
      resizeState.current = { startX: e.clientX, startY: e.clientY, left: start.left, top: start.top, startWidth: start.width, startHeight: start.height };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [sheetRef, seedForResize]
  );

  const onResizePointerMove = useCallback((e) => {
    if (!resizeState.current) return;
    const { startX, startY, left, top, startWidth, startHeight } = resizeState.current;
    let width = startWidth + (e.clientX - startX);
    let height = startHeight + (e.clientY - startY);
    width = Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - left);
    height = Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - top);
    lastExpandedSize.current = { width, height };
    setRect({ left, top, width, height });
  }, []);

  const onResizePointerUp = useCallback(() => {
    resizeState.current = null;
  }, []);

  // Beim Schliessen aufrufen - sonst bleibt die "floating"-Klasse haengen
  // und ihre transform:none-Regel verhindert die Schliess-Animation
  // dauerhaft (Bug-Report 2026-07-22).
  const resetRect = useCallback(() => setRect(null), []);

  return {
    rect,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
    resetRect,
  };
}
