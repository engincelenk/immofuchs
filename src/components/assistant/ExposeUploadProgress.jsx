// Phase 1 (uploading) und Phase 2 (extracting) des Expose-Uploads.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 8, Punkte 4/5.
//
// Bewusst zwei unterschiedliche Anzeigen:
// - Phase 1 hat einen echten, zaehlbaren Fortschritt (ein Bild = ein Schritt).
// - Phase 2 ist ein einziger, nicht streamender Modell-Call. Der rotierende
//   Text ist ein reiner Beschaeftigungs-Indikator und behauptet deshalb NICHT,
//   einzelne Felder seien schon gefunden.

import { fuelle } from "../../i18n/expose.js";
import { KiLadeeffekt } from "../dashboard/AiEngine.jsx";

// Nutzte bis 2026-09-25 einen eigenen, 1:1 nachgebauten KI-Sterne/Schimmer-
// Effekt (Nutzer-Vorgabe 2026-09-09), weil AiEngine.jsx ihn damals nicht
// exportierte. Jetzt derselbe Effekt wie ueberall sonst (KiLadeeffekt),
// eigene Phasentexte "Ich lese das Exposé — {Schritt}" per `phasen`-Prop,
// `loop` weil die Extraktionsdauer (Vision-Modell, mehrere Bilder) im
// Gegensatz zu den anderen Aufrufern nicht ungefaehr feststeht.
//
// Bewusst nur fuer "extracting", nicht fuer "uploading": Phase 1 hat einen
// echten, zaehlbaren Fortschritt (ein Bild = ein Schritt) - ein Schimmer-
// Platzhalter, der eine unbekannte Dauer suggeriert, waere dort eine
// Verschlechterung gegenueber dem bereits vorhandenen Prozentbalken.

export function ExposeUploadProgress({ phase, fortschritt, t }) {
  const schritte = t.phaseExtractSchritte ?? [];

  const text =
    phase === "uploading"
      ? fuelle(t.phaseUpload, { n: fortschritt.fertig, m: fortschritt.gesamt })
      : t.phaseExtract;

  const anteil =
    phase === "uploading" && fortschritt.gesamt > 0
      ? Math.round((fortschritt.fertig / fortschritt.gesamt) * 100)
      : null;

  if (phase === "extracting") {
    return (
      <div className="if-exp-progress">
        <KiLadeeffekt
          ariaLabel={t.phaseExtract}
          phasen={schritte.length > 0 ? schritte.map((s) => `${t.phaseExtract} — ${s}`) : [t.phaseExtract]}
          intervalMs={2200}
          loop
        />
      </div>
    );
  }

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
