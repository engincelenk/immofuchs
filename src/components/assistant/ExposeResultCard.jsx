// Phase 3 des Expose-Uploads: die Ergebnis-Checkliste im Chatverlauf.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 8, Punkte 6/7.
//
// Kernregel: kein stilles Ueberschreiben. Felder, die im Rechner schon einen
// abweichenden Wert haben, sind standardmaessig NICHT angehakt - der alte Wert
// bleibt stehen, bis der Nutzer aktiv uebernimmt.

import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { ExposeFieldRow } from "./ExposeFieldRow.jsx";
import {
  baueZeilen,
  uebernehmeZeilen,
  zaehleZeilen,
  enthaeltKaltmiete,
  GRUPPEN,
} from "../../utils/exposeMapping.js";
import { fuelle } from "../../i18n/expose.js";
import { PLZ_DB } from "../../data/plzData.js";
import {
  ladeRegionalpreise,
  regionalAmpelText,
  regionalPreis,
} from "../../utils/regionalpreis.js";
import { ladePlzKreis } from "../../utils/plzKreis.js";

const GRUPPEN_LABEL = {
  objekt: "gruppeObjekt",
  ausstattung: "gruppeAusstattung",
  energie: "gruppeEnergie",
  kosten: "gruppeKosten",
  kontext: "gruppeKontext",
};

export function ExposeResultCard({ ergebnis, d, set, t, erledigt, anzahl, onUebernommen }) {
  const { mietQuelleRef } = useApp() || {};
  const zeilen = useMemo(() => baueZeilen(ergebnis, d, t), [ergebnis, d, t]);

  // Echtzeit-Plausibilitätscheck (2026-09-10, C.10 - staerkster Wow-Effekt
  // laut Analyse): der extrahierte Kaufpreis/m² wird SOFORT gegen den
  // regionalen Richtwert gespiegelt, bevor der Nutzer ueberhaupt etwas
  // uebernommen hat. PLZ -> Bundesland ueber PLZ_DB (dasselbe Nachschlagen
  // wie in PLZSearch.jsx/uebernehmeZeilen), Ort direkt aus dem Expose.
  const [regGeladen, setRegGeladen] = useState(false);
  useEffect(() => {
    Promise.all([ladeRegionalpreise(), ladePlzKreis()])
      .then(() => setRegGeladen(true))
      .catch(() => {});
  }, []);
  const regionalCheck = useMemo(() => {
    if (!regGeladen) return null;
    const kaufpreisQm =
      +ergebnis?.kaufpreis_pro_qm ||
      (+ergebnis?.kaufpreis > 0 && +ergebnis?.wohnflaeche > 0
        ? +ergebnis.kaufpreis / +ergebnis.wohnflaeche
        : 0);
    if (!(kaufpreisQm > 0)) return null;
    const bl = ergebnis?.plz ? PLZ_DB.byPlz[String(ergebnis.plz)]?.bl : null;
    if (!bl) return null;
    const ref = regionalPreis(bl, ergebnis?.ort, ergebnis?.plz);
    if (!ref || !(ref.kaufWohnung > 0)) return null;
    return regionalAmpelText(kaufpreisQm, ref.kaufWohnung, t);
  }, [regGeladen, ergebnis, t]);

  const [auswahl, setAuswahl] = useState(
    () => new Set(zeilen.filter((z) => z.uebernehmbar && !z.konflikt).map((z) => z.key)),
  );

  const zahlen = useMemo(() => zaehleZeilen(zeilen), [zeilen]);

  // "Alles markieren" (Nutzertest 2026-07-28): hakt auch die Konflikt-Felder an,
  // die die Vorauswahl bewusst auslaesst - sonst muss der Nutzer sie einzeln
  // antippen. Der Konflikt-Hinweis ("aktuell: ...") bleibt dabei sichtbar, es
  // aendert sich nur das Haekchen. Als Toggle, damit man genauso schnell wieder
  // auf null kommt.
  const uebernehmbareKeys = useMemo(
    () => zeilen.filter((z) => z.uebernehmbar).map((z) => z.key),
    [zeilen],
  );
  const alleMarkiert =
    uebernehmbareKeys.length > 0 && uebernehmbareKeys.every((k) => auswahl.has(k));

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

  const toggleAlle = () =>
    setAuswahl(alleMarkiert ? new Set() : new Set(uebernehmbareKeys));

  const uebernehmen = () => {
    // Kaltmiete und Wohnflaeche sind im Renditerechner ueber zwei Effekte
    // gekoppelt; ohne Vorgabe rechnet er die gerade uebernommene Kaltmiete
    // sofort wieder aus dem alten €/m²-Wert um. Kommt die Kaltmiete aus dem
    // Expose, ist sie die Vorgabe - mieteQm wird daraus abgeleitet, nicht
    // umgekehrt. Nur setzen, wenn die Kaltmiete wirklich Teil der Uebernahme
    // ist: sonst soll die Kaltmiete weiter aus €/m² × neuer Flaeche folgen.
    if (mietQuelleRef && enthaeltKaltmiete(zeilen, auswahl)) mietQuelleRef.current = "kalt";

    const n = uebernehmeZeilen(zeilen, auswahl, set, ergebnis);
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

      {regionalCheck && (
        <div
          style={{
            fontSize: 11,
            padding: "6px 10px",
            background: `var(--${regionalCheck.stufe}-bg)`,
            borderRadius: 6,
            marginBottom: 10,
            color: `var(--${regionalCheck.stufe}-tx)`,
          }}
        >
          {t.kaufpreis}: {regionalCheck.text}
        </div>
      )}

      {uebernehmbareKeys.length > 0 && (
        <button
          type="button"
          className="if-exp-selectall"
          onClick={toggleAlle}
          aria-pressed={alleMarkiert}
        >
          {alleMarkiert ? t.auswahlAufheben : t.allesMarkieren}
        </button>
      )}

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
