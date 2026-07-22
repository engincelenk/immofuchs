import { useCallback, useRef, useState } from "react";

// Erlaubt freies Verschieben (Titelleiste) UND Groessenaendern (Eck-Griff,
// Breite+Hoehe) des Sheets per Maus - nur auf Desktop sinnvoll (angedockte
// Seitenleiste), auf Mobile bleibt es ein normales Bottom-Sheet ohne beides
// (Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22). `rect===null` bedeutet
// "angedockt" (Default-CSS-Position/-Groesse greift). Sobald verschoben
// oder resized wird, "friert" der aktuelle Rect ein (per getBoundingClientRect
// beim ersten Pointerdown) und wird ab dann explizit ueber `left/top/width/
// height` gesteuert, statt ueber die CSS-Docking-Regeln.
const MIN_WIDTH = 300;
const MIN_HEIGHT = 320;

export function useFloatingSheet(sheetRef) {
  const [rect, setRect] = useState(null);
  const dragState = useRef(null);
  const resizeState = useRef(null);

  const currentRect = useCallback(() => {
    if (rect) return rect;
    const r = sheetRef.current.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, [rect, sheetRef]);

  const onDragPointerDown = useCallback(
    (e) => {
      if (window.innerWidth < 1024 || !sheetRef.current) return;
      const start = currentRect();
      dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: start.left, startTop: start.top, width: start.width, height: start.height };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [sheetRef, currentRect]
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
      const start = currentRect();
      resizeState.current = { startX: e.clientX, startY: e.clientY, left: start.left, top: start.top, startWidth: start.width, startHeight: start.height };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [sheetRef, currentRect]
  );

  const onResizePointerMove = useCallback((e) => {
    if (!resizeState.current) return;
    const { startX, startY, left, top, startWidth, startHeight } = resizeState.current;
    let width = startWidth + (e.clientX - startX);
    let height = startHeight + (e.clientY - startY);
    width = Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - left);
    height = Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - top);
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
