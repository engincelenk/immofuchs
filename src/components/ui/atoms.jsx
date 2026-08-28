import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Tip } from "./Tip.jsx";

export function Dot({ color }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        marginLeft: 5,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
      title={color === "#22c55e" ? "Gut" : color === "#f59e0b" ? "Mittelmäßig" : "Kritisch"}
    />
  );
}

export function F({
  label,
  unit,
  value,
  onChange,
  type = "number",
  readOnly,
  hint,
  tip,
  placeholder,
  children,
}) {
  const isNum = type === "number";
  const toDisp = (v) => (isNum && !readOnly && v != null ? String(v).replace(".", ",") : (v ?? ""));
  const [localVal, setLocalVal] = useState(() => toDisp(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocalVal(toDisp(value));
  }, [value]);
  const hFocus = () => {
    focused.current = true;
  };
  const hChange = (e) => {
    const v = e.target.value;
    setLocalVal(v);
    onChange?.(isNum && !readOnly ? v.replace(",", ".") : v);
  };
  const hBlur = () => {
    focused.current = false;
    if (isNum && !readOnly && localVal.trim() === "") {
      setLocalVal("0");
      onChange?.("0");
    } else {
      onChange?.(isNum && !readOnly ? localVal.replace(",", ".") : localVal);
    }
  };
  const dispVal = readOnly ? toDisp(value) : localVal;
  return (
    <div className="if-field" style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            fontSize: 15,
            color: "var(--cl)",
            fontWeight: 500,
            marginBottom: 5,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {label}
          {tip && <Tip text={tip} label={label} />}
        </label>
        {hint && <span style={{ fontSize: 12, color: "var(--ch)" }}>{hint}</span>}
      </div>
      {children || (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: readOnly ? "var(--cro)" : "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            overflow: "hidden",
            minHeight: 46,
          }}
        >
          <input
            type={isNum ? "text" : type}
            inputMode={isNum ? "decimal" : undefined}
            value={dispVal}
            onChange={readOnly ? undefined : hChange}
            onFocus={readOnly ? undefined : hFocus}
            onBlur={readOnly ? undefined : hBlur}
            readOnly={readOnly}
            placeholder={placeholder || ""}
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              padding: "12px 14px",
              fontSize: 18,
              background: "transparent",
              color: readOnly ? "var(--ch)" : "var(--ct)",
              fontFamily: "inherit",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          {unit && (
            <span
              style={{
                padding: "0 12px 0 0",
                fontSize: 14,
                color: "var(--ch)",
                whiteSpace: "nowrap",
              }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
// tip wird nur durchgereicht: das umschliessende F rendert den Tip-Button
// bereits neben dem Label. Ohne diesen Prop koennten Dropdown-Felder
// konstruktionsbedingt keine Erklaerung bekommen - bei KfW-Programm oder
// Abschreibungsart ist die aber genau so noetig wie bei einem Zahlenfeld.
export function Sel({ label, value, onChange, options, tip }) {
  return (
    <F label={label} tip={tip}>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== String(value)) onChange(v);
        }}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: 18,
          border: "1px solid var(--cb)",
          borderRadius: 10,
          background: "var(--ci)",
          color: "var(--ct)",
          fontFamily: "inherit",
          minHeight: 46,
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </F>
  );
}
export function Row({ children }) {
  return <div className="if-row">{children}</div>;
}

// Live-Regler fuer den Ergebnis-Bereich: auf Mobile/Tablet-Hochformat blendet
// der VT-Umschalter Eingabe und Ergebnis nacheinander ein, dort muesste man
// sonst fuer jede Zins-/Tilgungsaenderung zurueck zur Eingabe wechseln. Das
// LiveSliderPanel duppliziert nur die ausgewaehlten Szenario-Felder als
// Slider direkt im Ergebnis - dieselben set()-Handler wie im Eingabefeld,
// also synchron. Auf echtem Desktop-Split (beide Spalten permanent
// sichtbar) blendet die .res-live-sliders-Regel in App.jsx das Panel aus,
// da es dort redundant waere.
export function LiveSliderPanel({ title, children }) {
  return (
    <div
      className="res-live-sliders"
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ch)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 10,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function LiveSlider({ label, unit, value, onChange, min, max, step, tip }) {
  const num = value === "" || value == null || Number.isNaN(+value) ? 0 : +value;
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "var(--cl)",
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {label}
          {tip && <Tip text={tip} label={label} />}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ca)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {String(num).replace(".", ",")}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 32,
          accentColor: "var(--ca)",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
// An/Aus-Schalter fuer Formular-Optionen ausserhalb einfacher Zahlenfelder
// (z.B. "Nebenkosten mitfinanzieren"). Kompakte Variante des Toggle-Musters
// aus Sanier.jsx (dort inline, hier wiederverwendbar fuer Renditerechner UND
// Kreditrechner - dieselbe Option an zwei Stellen).
export function Toggle({ checked, onChange, label, sub, tip }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        background: checked ? "var(--ok-bg)" : "var(--ci)",
        border: `1px solid ${checked ? "#22c55e" : "var(--cb)"}`,
        borderRadius: 8,
        padding: "8px 10px",
        cursor: "pointer",
        marginBottom: 14,
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 34,
          height: 20,
          borderRadius: 10,
          background: checked ? "#22c55e" : "var(--cb)",
          position: "relative",
          flexShrink: 0,
          transition: "background .2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: "#fff",
            transition: "left .2s",
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: checked ? "var(--ok-tx)" : "var(--ct)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {label}
            {tip && <Tip text={tip} />}
          </span>
        </div>
        {sub && <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );
}
export function Sec({ title, icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "24px 0 14px",
        paddingBottom: 8,
        borderBottom: "1px solid var(--cb)",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ct)" }}>{title}</span>
    </div>
  );
}
export function KPI({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: accent ? "var(--ca-bg)" : "var(--cc)",
        borderRadius: 12,
        padding: "14px",
        border: `1px solid ${accent ? "var(--ca-bd)" : "var(--cb)"}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: accent ? "var(--ca)" : "var(--ch)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: accent ? "var(--ca)" : "var(--ct)",
          marginTop: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Ins({ emoji, text, type = "info" }) {
  const bg = { info: "var(--info-bg)", good: "var(--ok-bg)", warn: "var(--warn-bg)", bad: "var(--bad-bg)" }[type];
  const tc = { info: "var(--info-tx)", good: "var(--ok-tx)", warn: "var(--warn-tx)", bad: "var(--bad-tx)" }[type];
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "10px 12px",
        background: bg,
        borderRadius: 8,
        marginBottom: 6,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>{emoji}</span>
      <span style={{ fontSize: 12, color: tc, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

export function AmpelKPI({ label, value, status, statusLabel, tip, color }) {
  const bg =
    color === "green"
      ? "rgba(34,197,94,.08)"
      : color === "yellow"
        ? "rgba(245,158,11,.08)"
        : "rgba(239,68,68,.08)";
  const borderTop = color === "green" ? "#22c55e" : color === "yellow" ? "#f59e0b" : "#ef4444";
  const badgeBg =
    color === "green"
      ? "rgba(34,197,94,.15)"
      : color === "yellow"
        ? "rgba(245,158,11,.15)"
        : "rgba(239,68,68,.15)";
  const textCol =
    color === "green" ? "var(--ok-tx)" : color === "yellow" ? "var(--warn-tx)" : "var(--bad-tx)";
  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        border: `0.5px solid ${borderTop}33`,
        borderTop: `5px solid ${borderTop}`,
        padding: "10px 10px",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ch)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            lineHeight: 1.3,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          style={{
            background: badgeBg,
            color: textCol,
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 20,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div
        style={{
          fontSize: "clamp(18px,5.5vw,24px)",
          fontWeight: 700,
          color: textCol,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
          margin: "4px 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {status && (
        <div
          style={{
            fontSize: 10,
            color: textCol,
            fontWeight: 600,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </div>
      )}
      {tip && <div style={{ fontSize: 9, color: "var(--ch)", lineHeight: 1.5 }}>{tip}</div>}
    </div>
  );
}

// ═══ NEUTRAL-KPI CARD ═══
export function NeutralKPI({ label, value, sub }) {
  return (
    <div
      style={{
        background: "var(--cc)",
        borderRadius: 12,
        border: "0.5px solid var(--cb)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ch)",
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ct)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
          margin: "4px 0",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function VT({ view, setView }) {
  const { t } = useApp();
  return (
    <div className="mob-toggle">
      {["input", "result"].map((v) => (
        <button
          key={v}
          className={view === v ? "act" : ""}
          onClick={() => {
            setView(v);
            setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
          }}
        >
          {v === "input" ? t.eingabe : t.ergebnis}
        </button>
      ))}
    </div>
  );
}
