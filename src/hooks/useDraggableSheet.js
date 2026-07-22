import { useCallback, useRef, useState } from "react";

// Erlaubt freies Verschieben des Sheets per Ziehgriff - nur auf Desktop
// sinnvoll (angedockte Seitenleiste), auf Mobile bleibt es ein normales
// Bottom-Sheet ohne Drag (Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22).
// `pos===null` bedeutet "angedockt" (Default-CSS-Position greift).
export function useDraggableSheet(sheetRef) {
  const [pos, setPos] = useState(null);
  const dragState = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      if (window.innerWidth < 1024 || !sheetRef.current) return;
      const rect = sheetRef.current.getBoundingClientRect();
      dragState.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [sheetRef]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragState.current || !sheetRef.current) return;
      const { startX, startY, startLeft, startTop } = dragState.current;
      const w = sheetRef.current.offsetWidth;
      const h = sheetRef.current.offsetHeight;
      let left = startLeft + (e.clientX - startX);
      let top = startTop + (e.clientY - startY);
      left = Math.min(Math.max(left, 0), window.innerWidth - w);
      top = Math.min(Math.max(top, 0), window.innerHeight - h);
      setPos({ left, top });
    },
    [sheetRef]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return { pos, onPointerDown, onPointerMove, onPointerUp };
}
