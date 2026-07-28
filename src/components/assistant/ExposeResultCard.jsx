// Phase 3 des Expose-Uploads: die Ergebnis-Checkliste im Chatverlauf.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 8, Punkte 6/7.
//
// Kernregel: kein stilles Ueberschreiben. Felder, die im Rechner schon einen
// abweichenden Wert haben, sind standardmaessig NICHT angehakt - der alte Wert
// bleibt stehen, bis der Nutzer aktiv uebernimmt.

import { useMemo, useState } from "react";
import { ExposeFieldRow } from "./ExposeFieldRow.jsx";
import { baueZeilen, uebernehmeZeilen, zaehleZeilen, GRUPPEN } from "../../utils/exposeMapping.js";
import { fuelle } from "../../i18n/expose.js";

const GRUPPEN_LABEL = {
  objekt: "gruppeObjekt",
  ausstattung: "gruppeAusstattung",
  energie: "gruppeEnergie",
  kosten: "gruppeKosten",
  kontext: "gruppeKontext",
};

export function ExposeResultCard({ ergebnis, d, set, t, erledigt, anzahl, onUebernommen }) {
  const zeilen = useMemo(() => baueZeilen(ergebnis, d, t), [ergebnis, d, t]);

  const [auswahl, setAuswahl] = useState(
    () => new Set(zeilen.filter((z) => z.uebernehmbar && !z.konflikt).map((z) => z.key)),
  );

  const zahlen = useMemo(() => zaehleZeilen(zeilen), [zeilen]);

  if (erledigt) {
    return (
      <div className="if-exp-chip" role="status">
        📎 {fuelle(t.uebernommen, { n: anzahl })}
      </div>
    );
  }

  const toggle = (key) =>
    setAuswahl((alt) => {
      const neu = new Set(alt);
      if (neu.has(key)) neu.delete(key);
      else neu.add(key);
      return neu;
    });

  const uebernehmen = () => {
    const n = uebernehmeZeilen(zeilen, auswahl, set);
    onUebernommen(n);
  };

  return (
    <div className="if-exp-card" aria-live="polite">
      <div className="if-exp-card-head">
        {fuelle(t.resultTitel, {
          gefunden: zahlen.gefunden,
          gesamt: zahlen.gesamt,
          pruefen: zahlen.zuPruefen,
        })}
      </div>

      {GRUPPEN.map((gruppe) => {
        const gruppenZeilen = zeilen.filter((z) => z.gruppe === gruppe);
        if (gruppenZeilen.length === 0) return null;
        return (
          <div key={gruppe} className="if-exp-gruppe">
            <div className="if-exp-gruppe-titel">{t[GRUPPEN_LABEL[gruppe]]}</div>
            {gruppenZeilen.map((zeile) => (
              <ExposeFieldRow
                key={zeile.key}
                zeile={zeile}
                t={t}
                ausgewaehlt={auswahl.has(zeile.key)}
                onToggle={toggle}
              />
            ))}
          </div>
        );
      })}

      <button type="button" className="if-exp-apply" onClick={uebernehmen}>
        {t.uebernehmen}
      </button>
    </div>
  );
}
