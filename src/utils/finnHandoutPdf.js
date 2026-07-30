// PDF-Export des Besichtigungs-Handouts.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 8 (Etappe E3).
// Layout-Vorlage: docs/Finn_Handout_Ingersheim.pdf (Layout freigegeben, die
// Zahlen darin sind handgerundet und NICHT massgeblich - siehe Spec 6.1).
//
// Clientseitig ueber ein Druckfenster, wie ExportPDF.jsx: kein Server, kein
// Chromium, kein Endpunkt, der abgesichert werden muesste. Eine Datenquelle
// fuer Panel und PDF (dieselbe `analyse` plus dieselbe `auswahl`), damit beide
// nie unterschiedliche Zahlen zeigen.

import { fmt, fmtE } from "./helpers.js";
import { fuelle } from "../i18n/expose.js";

// Die Token-Werte aus CLAUDE.md ausgeschrieben: im neuen Fenster gibt es die
// CSS-Variablen der App nicht.
const C = {
  akzent: "#e8600a",
  akzentDunkel: "#c44d00",
  text: "#1a1a1a",
  leise: "#8a8a80",
  linie: "#e5e5dc",
  zart: "#f0f0ea",
  warn: "#8a6a20",
};

// Findings und Fragen enthalten Text aus dem Expose des Anbieters. Der geht
// hier ungeprueft in ein document.write - ohne Maskierung wuerde ein "<" im
// Expose das Dokument zerlegen.
function esc(wert) {
  return String(wert ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findingZeile(f, h) {
  const marke =
    f.impactEur !== null && f.impactEur !== undefined
      ? "−" + fmtE(Math.round(f.impactEur))
      : h["schwere" + f.severity.charAt(0).toUpperCase() + f.severity.slice(1)];
  const farbe = f.severity === "critical" ? C.akzentDunkel : f.severity === "warning" ? C.warn : C.leise;
  const quellen =
    f.quellen.length > 0
      ? `<div style="font-size:9px;color:${C.leise};margin-top:2px">${esc(
          fuelle(h.quellen, { quellen: [...new Set(f.quellen)].join(" · ") }),
        )}</div>`
      : "";
  return `<tr>
    <td style="width:88px;vertical-align:top;padding:6px 10px 6px 0;font-size:11px;font-weight:700;color:${farbe}">${esc(marke)}</td>
    <td style="vertical-align:top;padding:6px 0;font-size:11.5px;line-height:1.5">${esc(f.text)}${quellen}</td>
  </tr>`;
}

function liste(eintraege, renderer) {
  return eintraege.map(renderer).join("");
}

function preisTabelle(analyse, h) {
  if (analyse.preistabelle.length === 0) return "";
  const zeilen = liste(analyse.preistabelle, (z) => {
    const farbe = z.abweichend ? C.akzentDunkel : C.text;
    return `<tr>
      <td style="padding:5px 0;border-top:1px solid ${C.linie};font-size:11.5px">${esc(z.label)}</td>
      <td style="padding:5px 0 5px 12px;border-top:1px solid ${C.linie};font-size:11.5px;text-align:right;color:${C.leise}">${esc(z.beworben ?? "—")}</td>
      <td style="padding:5px 0 5px 12px;border-top:1px solid ${C.linie};font-size:11.5px;text-align:right;font-weight:700;color:${farbe}">${esc(z.real)}</td>
    </tr>`;
  });
  return `${sektion(h.preis)}
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
    <thead><tr>
      <th></th>
      <th style="text-align:right;padding:0 0 4px 12px;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:${C.leise}">${esc(h.beworben)}</th>
      <th style="text-align:right;padding:0 0 4px 12px;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:${C.leise}">${esc(h.real)}</th>
    </tr></thead>
    <tbody>${zeilen}</tbody>
  </table>`;
}

function sektion(titel) {
  return `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${C.akzentDunkel};border-bottom:1px solid ${C.linie};padding-bottom:4px;margin:0 0 8px">${esc(titel)}</div>`;
}

// Kaestchen zum Abhaken: das Handout wird ausgedruckt und beim Termin mit dem
// Stift bearbeitet - deshalb ein leeres Quadrat, kein Haken.
function frageZeile(c) {
  const kategorie = c.kategorie
    ? `<div style="font-size:9px;color:${C.leise};margin-top:1px">${esc(c.kategorie)}</div>`
    : "";
  return `<div style="display:flex;gap:7px;padding:5px 0;page-break-inside:avoid">
    <span style="flex:none;width:11px;height:11px;border:1.4px solid ${C.leise};border-radius:2px;margin-top:2px"></span>
    <span style="flex:1;font-size:11px;line-height:1.45">${esc(c.frage)}${kategorie}</span>
  </div>`;
}

// Das Logo wird als data:-URI eingebettet, nicht als /logo-transparent.png
// verlinkt: das Druckfenster entsteht ueber document.write und hat keine
// Basis-URL, an der ein relativer Pfad aufloesen wuerde. Ausserdem soll die
// gespeicherte HTML-Datei fuer sich allein funktionieren.
//
// Freigestellte Fassung (transparenter Hintergrund, erzeugt von
// scripts/logo-freistellen.py): das Original public/logo.png ist vollflaechig
// deckend weiss und hinterlaesst auf der Kopfleiste einen sichtbaren Kasten.
async function ladeLogo() {
  try {
    const resp = await fetch("/logo-transparent.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = (e) => res(e.target.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function erzeugeHandoutPdf(analyse, auswahl, t) {
  const h = t.handout;
  // Synchron im Klick-Kontext oeffnen, VOR jedem await: iOS Safari blockt das
  // Fenster, sobald ein await dazwischenliegt (gleicher Grund wie in
  // ExportPDF.jsx). Alles Asynchrone passiert danach.
  const w = window.open("", "_blank");
  const logo = await ladeLogo();

  const gewaehlt = analyse.checkliste.filter((c) => auswahl.has(c.id));
  const zuKlaeren = gewaehlt.filter((c) => c.quelle !== "vor_ort");
  const vorOrt = gewaehlt.filter((c) => c.quelle === "vor_ort");
  const datum = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const spalte = (titel, inhalt) =>
    inhalt ? `<div style="flex:1;min-width:0">${sektion(titel)}${inhalt}</div>` : "";

  const bekanntHtml = liste(
    analyse.bekannt,
    (b) =>
      `<div style="font-size:11px;line-height:1.5;padding:3px 0 3px 13px;position:relative;page-break-inside:avoid">
        <span style="position:absolute;left:0;top:2px;font-size:9px;color:${C.akzent}">✓</span>${esc(b.text)}
      </div>`,
  );
  const offenHtml = liste(zuKlaeren, frageZeile);

  const doc = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>${esc(h.titel)} — ${esc(analyse.adresse || analyse.titel)}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#fff;color:${C.text};padding:28px;max-width:820px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{body{padding:14px}div,table,tr{break-inside:avoid;page-break-inside:avoid}}
</style></head><body>

<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid ${C.akzent};padding-bottom:12px;margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:11px">
    ${logo ? `<img src="${logo}" alt="" style="height:52px;width:auto;display:block">` : ""}
    <div>
      <div style="font-size:24px;font-weight:700;letter-spacing:-.4px;line-height:1">immo<span style="color:${C.akzent}">fuchs</span>.info</div>
      <div style="font-size:11px;color:${C.leise};margin-top:4px">${esc(analyse.objekttyp === "Haus" ? "Haus" : "Eigentumswohnung")} · Kauf</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:14px;font-weight:700">${esc(h.titel)}</div>
    <div style="font-size:11px;color:${C.leise};margin-top:2px">${esc(analyse.verdictLabel)}</div>
    <div style="font-size:11px;color:${C.akzentDunkel};font-weight:700;margin-top:2px">${esc(fuelle(h.pdfVerdict, { score: fmt(analyse.verdictScore, 1) }))}</div>
  </div>
</div>

<div style="margin-bottom:6px;font-size:15px;font-weight:700">${esc(analyse.adresse || "—")}</div>
<div style="margin-bottom:14px;font-size:11.5px;color:${C.leise}">${esc(analyse.titel)}</div>

<div style="background:${C.zart};border-radius:6px;padding:7px 10px;font-size:10px;line-height:1.45;color:${C.text};margin-bottom:16px">${esc(h.automatisiert)}</div>

${
  analyse.findings.length > 0
    ? `${sektion(h.findings)}<table style="width:100%;border-collapse:collapse;margin-bottom:18px">${liste(analyse.findings, (f) => findingZeile(f, h))}</table>`
    : `${sektion(h.findings)}<div style="font-size:11.5px;line-height:1.5;margin-bottom:18px">${esc(h.leer)}</div>`
}

${preisTabelle(analyse, h)}

<div style="display:flex;gap:26px;margin-bottom:18px;align-items:flex-start">
  ${spalte(h.bekannt, bekanntHtml)}
  ${spalte(h.offen, offenHtml)}
</div>

${vorOrt.length > 0 ? `${sektion(h.vorOrt)}<div style="columns:2;column-gap:26px;margin-bottom:18px">${liste(vorOrt, frageZeile)}</div>` : ""}

<div style="margin-top:24px;padding-top:10px;border-top:1px solid ${C.linie};display:flex;justify-content:space-between;font-size:9px;color:${C.leise}">
  <span>${esc(h.pdfFooter)}</span>
  <span>${esc(datum)} · ${esc(h.pdfDisclaimer)}</span>
</div>
</body></html>`;

  const printDoc = doc.replace(
    "</body>",
    "<script>setTimeout(()=>window.print(),600)</script></body>",
  );
  if (w) {
    w.document.open();
    w.document.write(printDoc);
    w.document.close();
    return;
  }
  // Fallback, falls das Popup doch geblockt wurde (selten nach synchronem open).
  const blob = new Blob([printDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Finn_Handout.html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
