import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { PLZ_DB, isK15 } from "../../data/plzData.js";
import { BL_N } from "../../data.js";
import { F, Row } from "./atoms.jsx";

export function PLZSearch({ showKapp = true } = {}) {
  const { d, set, t } = useApp();
  const [ac, setAC] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef();
  const onP = (v) => {
    set("plz", v);
    if (/^\d{5}$/.test(v)) {
      const f = PLZ_DB.byPlz[v];
      if (f) {
        set("ort", f.ort);
        set("bundesland", f.bl);
      }
    }
  };
  const onO = (v) => {
    set("ort", v);
    if (v.length >= 2) {
      const l = v.toLowerCase();
      const m = PLZ_DB.allOrts.filter((o) => o.startsWith(l)).slice(0, 6);
      setAC(m.map((o) => PLZ_DB.byOrt[o][0]));
      setShow(m.length > 0);
    } else setShow(false);
  };
  const sel = (it) => {
    set("ort", it.ort);
    set("plz", it.plz);
    set("bundesland", it.bl);
    setShow(false);
  };
  useEffect(() => {
    const c = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("click", c);
    return () => document.removeEventListener("click", c);
  }, []);
  const kp = isK15(d.ort) ? 15 : 20;
  return (
    <>
      <Row>
        <F
          label={t.plz}
          value={d.plz}
          onChange={onP}
          type="text"
          hint={PLZ_DB.byPlz[d.plz]?.ort || ""}
        />
        <div ref={ref} style={{ position: "relative" }}>
          <F label={t.ort} value={d.ort} onChange={onO} type="text" />
          {show && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--cc)",
                border: "1px solid var(--cb)",
                borderRadius: 8,
                zIndex: 50,
                boxShadow: "0 4px 12px rgba(0,0,0,.1)",
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              {ac.map((it, i) => (
                <div
                  key={i}
                  onClick={() => sel(it)}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--cb)",
                  }}
                >
                  {it.ort}{" "}
                  <span style={{ color: "var(--ch)", fontSize: 11 }}>
                    {it.plz}·{BL_N[it.bl]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Row>
      {showKapp && d.ort && (
        <div
          style={{
            fontSize: 11,
            padding: "6px 10px",
            background: kp === 15 ? "#FFF0F0" : "#E8F8EE",
            borderRadius: 6,
            marginBottom: 10,
            color: kp === 15 ? "#9a2020" : "#1a7a3a",
          }}
        >
          {t.kapp}: {kp}% — {kp === 15 ? t.ang : t.std} ({d.ort})
        </div>
      )}
    </>
  );
}
