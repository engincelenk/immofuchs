import { useApp } from "../../../context/AppContext.jsx";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  labelStyle,
  labelValueRowStyle,
  sectionIntroStyle,
  sectionTitleStyle,
  valueStyle,
} from "../accountStyles.js";

// Bereich 5: gespeicherte Berechnungen. Bewusst NUR Einstieg und Kennzahl,
// keine eingebettete Merkliste - deren "Laden"-Knopf schreibt die Eingaben in
// den Rechner und wechselt den Tab, was hinter dem geoeffneten Vollbild-Konto
// unsichtbar bliebe. Der Knopf hier schliesst deshalb erst das Konto und
// wechselt dann zur Merkliste, wo alle Aktionen (laden, vergleichen,
// loeschen) unveraendert zur Verfuegung stehen.
export function GespeicherteSection({ t, onClose }) {
  const { savedList, setTabExt, isProSavedObjects, savedObjectsFreeLimit } = useApp();
  const count = savedList?.length || 0;

  function handleOpenMerkliste() {
    onClose();
    setTabExt("saved");
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navGespeichert}</h2>
      <p style={sectionIntroStyle}>{t.gespeichertBody}</p>

      <div style={blockCardStyle}>
        <div style={labelValueRowStyle}>
          <span style={labelStyle}>{t.gespeichertCountLabel}</span>
          <span style={valueStyle}>
            {count === 1
              ? t.gespeichertCountOne
              : t.gespeichertCount.replace("{n}", String(count))}
          </span>
        </div>
        {!isProSavedObjects && (
          <p style={{ ...blockHintStyle, marginTop: 8 }}>
            {t.gespeichertFreeHint.replace("{limit}", String(savedObjectsFreeLimit))}
          </p>
        )}
        <button onClick={handleOpenMerkliste} style={actionBtnStyle}>
          {t.gespeichertCta} →
        </button>
      </div>
    </div>
  );
}
