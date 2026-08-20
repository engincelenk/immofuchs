import { lazy, Suspense, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { oeffneDruckdokument } from "../../utils/druckdokument.js";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";

const CheckoutWizard = lazy(() =>
  import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
);

// PDF-Export ist seit der Preispolitik 2026-08-20 eine Pro-Funktion.
//
// Aufgeteilt: der Ergebnisbereich wird weiterhin hier eingesammelt (er steht
// nur im DOM dieser Seite), das DOKUMENT baut der Worker hinter requirePro
// (worker/src/export/rechnerDokument.ts). Ohne Abo gibt es kein Dokument,
// nicht nur keinen Knopf - der Knopf fuehrt dann in den Kauf-Assistenten.
export function ExportPDF({ title, rechner }) {
  const { t, lang } = useApp();
  const account = useAccountCtx();
  const [zeigeUpgrade, setZeigeUpgrade] = useState(false);
  const [fehler, setFehler] = useState(null);
  const at = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const istPro = Boolean(account?.isPro);

  // Sammelt den Ergebnisbereich ein: Sektionen aufklappen, Bedienelemente
  // entfernen, CSS-Variablen aufloesen (im Druckfenster gibt es sie nicht).
  const sammleInhalt = async () => {
    const rp = document.querySelector(".res-pane");
    if (!rp) return null;
    const expandBtn = rp.querySelector("[data-pdf-expand]");
    if (expandBtn && expandBtn.textContent.includes("⊕")) {
      expandBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }
    // Alle "Wie kommt das Ergebnis zustande?" Toggles aufklappen (eigener lokaler State)
    const detailBtns = rp.querySelectorAll("[data-pdf-detail]");
    detailBtns.forEach((b) => {
      if (!b.textContent.includes("▲")) b.click();
    });
    if (detailBtns.length > 0) await new Promise((r) => setTimeout(r, 200));
    const clone = rp.cloneNode(true);
    clone.querySelectorAll("button,.no-print").forEach((e) => e.remove());
    const vars = {
      "var(--cc)": "#fff",
      "var(--ct)": "#1a1a1a",
      "var(--cl)": "#3d3d3a",
      "var(--ch)": "#8a8a80",
      "var(--cb)": "#e5e5dc",
      "var(--ci)": "#fafaf7",
      "var(--cro)": "#f0f0ea",
      "var(--ca)": "#e8600a",
      "var(--ca-dk)": "#c44d00",
      "var(--ca-bg)": "#fff1e8",
      "var(--ca-bd)": "#f5cba9",
      "var(--bg)": "#f5f5f0",
    };
    let h = clone.innerHTML;
    Object.entries(vars).forEach(([k, v]) => {
      h = h.split(k).join(v);
    });
    return h;
  };

  const doExport = async () => {
    if (!istPro) {
      setZeigeUpgrade(true);
      return;
    }
    setFehler(null);
    const inhalt = await sammleInhalt();
    if (!inhalt) return;
    const ergebnis = await oeffneDruckdokument(
      "/export/rechner",
      { titel: title, inhalt, lang, rechner },
      `ImmoFuchs_${title}`,
    );
    if (!ergebnis.ok) {
      // 401/402 heisst: der Client dachte, es reicht - tut es nicht. Statt
      // einer Fehlermeldung der Weg, der weiterhilft.
      if (
        ergebnis.fehler === "pro_noetig" ||
        ergebnis.fehler === "login_noetig" ||
        ergebnis.fehler === "kontingent"
      ) {
        setZeigeUpgrade(true);
        return;
      }
      setFehler(at.pdfFehler);
    }
  };

  return (
    <>
      <button
        className="no-print"
        onClick={doExport}
        style={{
          width: "100%",
          padding: "12px",
          border: "1px solid var(--cb)",
          borderRadius: 10,
          background: "var(--ci)",
          color: "var(--ct)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 12,
          marginBottom: 4,
          fontFamily: "inherit",
        }}
      >
        {istPro ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ) : (
          <span aria-hidden="true">👑</span>
        )}
        {t.pdfExport}
      </button>
      {fehler && (
        <div className="no-print" style={{ fontSize: 11.5, color: "var(--ca-dk)", marginBottom: 4 }}>
          {fehler}
        </div>
      )}
      {zeigeUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setZeigeUpgrade(false)} />
        </Suspense>
      )}
    </>
  );
}
