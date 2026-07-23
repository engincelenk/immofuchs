import { useApp } from "../../context/AppContext.jsx";

export function ExportPDF({ title }) {
  const { t } = useApp();
  const doExport = async () => {
    const rp = document.querySelector(".res-pane");
    if (!rp) return;
    // iOS Safari: window.open() muss synchron im User-Gesture-Kontext aufgerufen werden
    // → sofort öffnen, bevor irgendein await den Kontext bricht
    const w = window.open("", "_blank");
    // Alle Sektionen aufklappen bevor wir den DOM klonen (Content ist sonst nicht im DOM)
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
    const now = new Date().toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Fetch logo as base64 for self-contained PDF
    const wordmark =
      '<div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:#1a1a2e;line-height:1">immo<span style="color:#e8650a">fuchs</span>.info</div>';
    let logoHtml = `<div style="display:flex;align-items:center;gap:10px">${wordmark}</div>`;
    try {
      const resp = await fetch("/logo.png");
      if (resp.ok) {
        const blob = await resp.blob();
        const b64 = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = (e) => res(e.target.result);
          fr.readAsDataURL(blob);
        });
        logoHtml = `<div style="display:flex;align-items:center;gap:12px"><img src="${b64}" style="height:75px;width:75px;display:block;object-fit:contain">${wordmark}</div>`;
      }
    } catch {}
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Immofuchs - ${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse;width:100%}svg{max-width:100%}
.hdr-print{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e8600a}
.hdr-print-meta{text-align:right}
@media print{body{padding:15px}*{overflow:visible!important}div,table,tr,svg{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}}</style>
</head><body>
<div class="hdr-print"><div>${logoHtml}</div><div class="hdr-print-meta"><div style="font-size:15px;font-weight:600;color:#1a1a2e">${title}</div><div style="font-size:12px;color:#8a8a80;margin-top:3px">${now}</div></div></div>
${h}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e5dc;font-size:9px;color:#8a8a80;text-align:center">Erstellt mit Immofuchs · ${now} · Keine Rechts- oder Steuerberatung</div>
</body></html>`;
    // Druckdialog → "Als PDF speichern"
    const printDoc = doc.replace(
      "</body>",
      "<script>setTimeout(()=>window.print(),600)</script></body>",
    );
    if (w) {
      w.document.open();
      w.document.write(printDoc);
      w.document.close();
    } else {
      // Fallback falls Popup doch geblockt (sehr selten nach synchronem open)
      const blob = new Blob([printDoc], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ImmoFuchs_" + title.replace(/\s+/g, "_") + ".html";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };
  return (
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
      {t.pdfExport}
    </button>
  );
}
