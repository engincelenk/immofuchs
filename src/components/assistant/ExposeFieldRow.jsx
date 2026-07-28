// Eine Zeile der Ergebnis-Karte: Status-Icon + Label + Wert (+ Konflikt-Toggle).
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 8, Punkt 6.
//
// Accessibility: das Status-Icon traegt immer einen Text (aria-label + title),
// der Zustand haengt also nicht an Farbe oder Symbol allein.

import { fuelle } from "../../i18n/expose.js";

const ICONS = {
  sicher: "✅",
  unsicher: "⚠️",
  pruefen: "🔶",
  nicht_gefunden: "⬜",
};

const STATUS_TEXT = {
  sicher: "statusSicher",
  unsicher: "statusUnsicher",
  pruefen: "statusPruefen",
  nicht_gefunden: "statusNichtGefunden",
};

export function ExposeFieldRow({ zeile, t, ausgewaehlt, onToggle }) {
  const statusText = t[STATUS_TEXT[zeile.status]];
  const anzeigeId = `if-exp-feld-${zeile.key}`;

  return (
    <div className={`if-exp-row${zeile.gefunden ? "" : " leer"}`}>
      <span className="if-exp-icon" role="img" aria-label={statusText} title={statusText}>
        {ICONS[zeile.status]}
      </span>
      <div className="if-exp-feld">
        <div className="if-exp-label" id={anzeigeId}>
          {zeile.label}
        </div>
        <div className="if-exp-wert">{zeile.anzeige}</div>
        {zeile.konflikt && (
          <div className="if-exp-konflikt">{fuelle(t.aktuell, { wert: zeile.bestehend })}</div>
        )}
        {zeile.warnung && <div className="if-exp-warnung">⚠️ {zeile.warnung}</div>}
        {(zeile.status === "pruefen" || zeile.status === "unsicher") && !zeile.warnung && (
          <div className="if-exp-hinweis">{statusText}</div>
        )}
      </div>
      {zeile.uebernehmbar ? (
        <label className="if-exp-toggle">
          <input
            type="checkbox"
            checked={ausgewaehlt}
            onChange={() => onToggle(zeile.key)}
            aria-labelledby={anzeigeId}
          />
        </label>
      ) : (
        zeile.gefunden && <span className="if-exp-nurinfo">{t.nurInfo}</span>
      )}
    </div>
  );
}
