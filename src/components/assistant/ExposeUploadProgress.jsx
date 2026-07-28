// Phase 1 (uploading) und Phase 2 (extracting) des Expose-Uploads.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 8, Punkte 4/5.
//
// Bewusst zwei unterschiedliche Anzeigen:
// - Phase 1 hat einen echten, zaehlbaren Fortschritt (ein Bild = ein Schritt).
// - Phase 2 ist ein einziger, nicht streamender Modell-Call. Der rotierende
//   Text ist ein reiner Beschaeftigungs-Indikator und behauptet deshalb NICHT,
//   einzelne Felder seien schon gefunden.

import { useEffect, useState } from "react";
import { fuelle } from "../../i18n/expose.js";

export function ExposeUploadProgress({ phase, fortschritt, t }) {
  const [schritt, setSchritt] = useState(0);
  const schritte = t.phaseExtractSchritte ?? [];

  useEffect(() => {
    if (phase !== "extracting" || schritte.length === 0) return;
    const id = setInterval(() => setSchritt((s) => (s + 1) % schritte.length), 2200);
    return () => clearInterval(id);
  }, [phase, schritte.length]);

  const text =
    phase === "uploading"
      ? fuelle(t.phaseUpload, { n: fortschritt.fertig, m: fortschritt.gesamt })
      : `${t.phaseExtract} — ${schritte[schritt] ?? ""}`;

  const anteil =
    phase === "uploading" && fortschritt.gesamt > 0
      ? Math.round((fortschritt.fertig / fortschritt.gesamt) * 100)
      : null;

  return (
    <div className="if-exp-progress" role="status">
      <div className="if-exp-progress-text">
        <span className="if-exp-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {text}
      </div>
      {anteil !== null && (
        <div
          className="if-exp-bar"
          role="progressbar"
          aria-valuenow={fortschritt.fertig}
          aria-valuemin={0}
          aria-valuemax={fortschritt.gesamt}
          aria-label={text}
        >
          <div className="if-exp-bar-fill" style={{ width: `${anteil}%` }} />
        </div>
      )}
    </div>
  );
}
