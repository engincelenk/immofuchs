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

// KI-Sterne/Schimmer-Ladeeffekt (Nutzer-Vorgabe 2026-09-09: "auch hier Expose
// auswerten mit Effekt versehen, wie bei Objekt KI-Services") - 1:1 im Design
// an RechnerAiKarte.jsx/Laeuft() angelehnt (dort wiederum an AiEngine.jsx).
// Nicht von dort importiert, da beide Vorbilder ihr CSS nicht exportieren -
// eigener Klassenname (expu-*) verhindert eine Kollision.
//
// Bewusst nur fuer "extracting", nicht fuer "uploading": Phase 1 hat einen
// echten, zaehlbaren Fortschritt (ein Bild = ein Schritt) - ein Schimmer-
// Platzhalter, der eine unbekannte Dauer suggeriert, waere dort eine
// Verschlechterung gegenueber dem bereits vorhandenen Prozentbalken. Phase 2
// ist wie bei der KI-Karte ein einzelner, nicht streamender Modell-Aufruf
// ohne zaehlbaren Fortschritt - genau der Fall, fuer den der Effekt gedacht ist.
const EXPU_LADEEFFEKT_CSS = `
@keyframes expu-stern-glitzern{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes expu-balken-schimmer{0%{background-position:160% 0}100%{background-position:-60% 0}}
.expu-stern{display:inline-block;animation:expu-stern-glitzern 1.6s ease-in-out infinite}
.expu-balken{background-color:var(--cro);background-image:linear-gradient(90deg,var(--cro) 0%,var(--cro) 35%,var(--ca) 50%,var(--cro) 65%,var(--cro) 100%);
  background-size:300% 100%;animation:expu-balken-schimmer 1.8s linear infinite}
@media(prefers-reduced-motion: reduce){
  .expu-stern{animation:none;opacity:.9}
  .expu-balken{animation:none;background-image:none}
}
`;

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

  if (phase === "extracting") {
    return (
      <div className="if-exp-progress" role="status" aria-busy="true">
        <style>{EXPU_LADEEFFEKT_CSS}</style>
        <div
          className="if-exp-progress-text"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          {[0, 180, 360].map((verzoegerung, i) => (
            <span
              key={verzoegerung}
              className="expu-stern"
              aria-hidden="true"
              style={{
                color: "var(--ca)",
                fontSize: i === 1 ? 15 : 10,
                animationDelay: `${verzoegerung}ms`,
              }}
            >
              ✦
            </span>
          ))}
          {text}
        </div>
        {[100, 78, 46].map((breite) => (
          <div
            key={breite}
            className="expu-balken"
            style={{ height: 10, width: `${breite}%`, borderRadius: 4, marginTop: 8 }}
          />
        ))}
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
