import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/apiBase.js";

// Eigener, schlanker Fetch fuer die Dashboard-Ansichten (Start/ObjektListe,
// Spec 4.17/5.3) - bewusst getrennt von useSavedObjects() in Merkliste.jsx,
// das aus Kompatibilitaetsgruenden auf die aeltere {id,name,date,tab,data}-
// Form abbildet und dabei score/scoreLabel/source verwirft. Hier bleiben die
// Rohfelder aus dem Worker (objects.ts serialize()) erhalten.
export function useProObjects() {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/objects");
      if (!res.ok) return;
      const { objects: list } = await res.json();
      setObjects(list);
    } catch (e) {
      console.error("[dashboard] Objekte laden fehlgeschlagen:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { objects, loading, refresh };
}
