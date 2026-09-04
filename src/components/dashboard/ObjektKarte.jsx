// Objektkarte (Phase E) - Objekte als Punkte auf einer Deutschlandkarte.
//
// Der Umriss kommt ohne Kartenkacheln aus: die rund 10.800 Postleitzahlen des
// GeoNames-Datensatzes decken Deutschland flaechendeckend ab, als schwache
// graue Punkte gezeichnet ergeben sie eine erkennbare Silhouette. Damit
// entfaellt der Tile-Server samt seiner Requests, Nutzungsbedingungen und
// Ladezeiten - und die Karte funktioniert offline.
//
// Gezeichnet wird auf Canvas, nicht als SVG: 10.800 DOM-Knoten waeren
// spuerbar langsam, auf Canvas ist es ein Frame.
import { useEffect, useRef, useState } from "react";
import { koordinateFuer, ladePlzGeo, projiziere } from "../../utils/plzGeo.js";

function farbeFuer(scoreLabel) {
  if (scoreLabel === "gut") return "#2F6B4F";
  if (scoreLabel === "grenzwertig") return "#C2410C";
  if (scoreLabel === "kritisch") return "#B3402A";
  return "#8A8A80";
}

export function ObjektKarte({ objekte, onOeffnen }) {
  const canvasRef = useRef(null);
  const [geo, setGeo] = useState(null);
  const [groesse, setGroesse] = useState({ b: 0, h: 0 });
  const punkteRef = useRef([]);
  const [aktiv, setAktiv] = useState(null);

  useEffect(() => {
    let lebt = true;
    ladePlzGeo().then((m) => {
      if (lebt) setGeo(m);
    });
    return () => {
      lebt = false;
    };
  }, []);

  // Breite vom Container, Hoehe im festen Verhaeltnis - Deutschland ist
  // deutlich hoeher als breit.
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const messen = () => {
      const b = el.clientWidth;
      setGroesse({ b, h: Math.round(Math.min(420, Math.max(240, b * 1.25))) });
    };
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geo || !groesse.b) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = groesse.b * dpr;
    canvas.height = groesse.h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, groesse.b, groesse.h);

    // Silhouette aus allen Postleitzahlen. Die Punkte tragen die Textfarbe
    // mit stark reduzierter Deckkraft statt der Rahmenfarbe: --cb ist im
    // Dunkelmodus so nah am Hintergrund, dass die Silhouette dort verschwand.
    // Ueber globalAlpha bleibt das in beiden Themes ausgewogen.
    const stil = getComputedStyle(canvas);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = stil.getPropertyValue("--ch")?.trim() || "#8A8A80";
    for (const { lat, lon } of geo.values()) {
      const { x, y } = projiziere(lat, lon, groesse.b, groesse.h);
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.restore();

    // Objekte darueber
    const punkte = [];
    for (const o of objekte) {
      const daten = o.inputData || o.data || {};
      const k = koordinateFuer(daten.plz, geo);
      if (!k) continue;
      const { x, y } = projiziere(k.lat, k.lon, groesse.b, groesse.h);
      punkte.push({ x, y, objekt: o });
    }
    punkteRef.current = punkte;

    for (const p of punkte) {
      const farbe = farbeFuer(p.objekt.scoreLabel);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = `${farbe}33`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = farbe;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = stil.getPropertyValue("--cc")?.trim() || "#FFFFFF";
      ctx.stroke();
    }
  }, [geo, groesse, objekte]);

  function klick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let naechster = null;
    let beste = 18; // Trefferradius, grosszuegig fuer Fingerkuppen
    for (const p of punkteRef.current) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < beste) {
        beste = d;
        naechster = p;
      }
    }
    if (naechster) setAktiv(naechster.objekt);
  }

  const ohneKoordinaten = objekte.filter((o) => {
    const daten = o.inputData || o.data || {};
    return !geo || !koordinateFuer(daten.plz, geo);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 12,
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={klick}
          style={{
            width: "100%",
            height: groesse.h || 300,
            display: "block",
            cursor: "pointer",
          }}
        />
        {!geo && (
          <div
            style={{
              position: "absolute",
              inset: 12,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              color: "var(--ch)",
            }}
          >
            Karte wird geladen …
          </div>
        )}
      </div>

      {aktiv && (
        <button
          type="button"
          onClick={() => onOeffnen(aktiv)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            textAlign: "left",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1.5px solid var(--ca)",
            background: "var(--cc)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              flexShrink: 0,
              background: farbeFuer(aktiv.scoreLabel),
            }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{aktiv.name}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ch)" }}>
              {[
                (aktiv.inputData || aktiv.data || {}).plz,
                (aktiv.inputData || aktiv.data || {}).ort,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
          </span>
          <span style={{ color: "var(--ca)", fontWeight: 700, fontSize: 13 }}>öffnen →</span>
        </button>
      )}

      {geo && ohneKoordinaten.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5 }}>
          {ohneKoordinaten.length === 1 ? "Ein Objekt hat" : `${ohneKoordinaten.length} Objekte haben`}{" "}
          keine bekannte Postleitzahl und erscheinen nicht auf der Karte.
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "var(--ch)", lineHeight: 1.5 }}>
        Kartengrundlage: Postleitzahlen von{" "}
        <a
          href="https://www.geonames.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--ca)" }}
        >
          GeoNames
        </a>{" "}
        (CC BY). Die Daten liegen lokal in der App — beim Anzeigen der Karte wird
        nichts an Kartendienste übertragen.
      </div>
    </div>
  );
}
