import { useState } from "react";
import { useProObjects } from "../../hooks/useProObjects.js";
import { Start } from "./Start.jsx";
import { ObjektListe } from "./ObjektListe.jsx";
import { ObjektDetail } from "./ObjektDetail.jsx";

// Duenne Tab-Wrapper (Spec 4.17, 5.3) - je Tab ein eigener useProObjects()-
// Aufruf, weil immer nur einer der beiden gleichzeitig gemountet ist (kein
// gemeinsamer State noetig, kein unnoetiger Fetch fuer Free-Nutzer, da die
// Komponenten nur erreichbar sind, wenn der Pro-Tab ueberhaupt existiert).
export function DashboardStartTab({ onGoToRechner }) {
  const { objects } = useProObjects();
  const [selected, setSelected] = useState(null);
  if (selected) return <ObjektDetail objekt={selected} onBack={() => setSelected(null)} />;
  return <Start objects={objects} onOpen={setSelected} onGoToRechner={onGoToRechner} />;
}

export function DashboardObjekteTab() {
  const { objects } = useProObjects();
  const [selected, setSelected] = useState(null);
  if (selected) return <ObjektDetail objekt={selected} onBack={() => setSelected(null)} />;
  return <ObjektListe objects={objects} onOpen={setSelected} />;
}
