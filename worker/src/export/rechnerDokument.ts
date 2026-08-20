// Rechner-Ergebnis als druckfertiges HTML (Pro-Funktion).
//
// Portiert aus src/components/export/ExportPDF.jsx: Kopfleiste, Druck-CSS und
// Fusszeile - also das Dokument - entstehen jetzt im Worker hinter
// requirePro. Ohne aktives Abo gibt es kein Dokument.
//
// Was der Client mitschickt, ist der bereits gerenderte Ergebnisbereich
// (`.res-pane` ohne Knoepfe, CSS-Variablen aufgeloest). Das ist die ehrliche
// Grenze dieser Loesung: der Ergebnisbereich steht ohnehin auf dem
// Bildschirm, und ein Browser druckt jede sichtbare Seite auch mit Strg+P.
// Serverseitig durchsetzbar ist deshalb die FUNKTION (Export als gestaltetes
// Dokument), nicht die Kenntnis der Zahlen.
//
// Ein vollstaendig serverseitig gerendertes Ergebnis (Worker rechnet aus den
// Eingaben neu und besitzt auch das Layout) waere die naechste Stufe - das
// sind sechs Ergebnis-Layouts inklusive Diagramme und gehoert in ein eigenes
// Vorhaben, nicht in diese Aenderung.
import { SCHRIFT_IMPORT, datumFuer, esc, logoUrl } from "./gemeinsam";

const MAX_INHALT_LEN = 400_000; // grosszuegig: Tilgungsplaene werden lang

export interface RechnerAnfrage {
  titel?: unknown;
  inhalt?: unknown;
  lang?: unknown;
}

// Der Inhalt kann nicht maskiert werden - er IST Markup. Stattdessen fliegt
// alles Ausfuehrbare raus: das Dokument landet in einem about:blank-Fenster,
// das die Herkunft der Seite erbt. Heute kann dort nichts Ausfuehrbares
// entstehen (der Ergebnisbereich ist von React gerendert), aber der Weg ueber
// eine HTTP-Route macht den Inhalt zu Eingabedaten - und Eingabedaten werden
// geprueft, nicht vertraut.
function entschaerfe(markup: string): string {
  return markup
    // Erst das ganze Element samt Inhalt - wuerden nur die Tags entfernt,
    // bliebe der Code als sichtbarer Text im Dokument stehen.
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    // Dann alles, was ohne schliessendes Gegenstueck stehen geblieben ist.
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, "")
    .replace(/<\s*\/?\s*(iframe|object|embed|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

export function baueRechnerDokument(anfrage: RechnerAnfrage, basisUrl: string): string {
  const lang = typeof anfrage.lang === "string" ? anfrage.lang : "de";
  const titel = typeof anfrage.titel === "string" ? anfrage.titel.slice(0, 120) : "";
  const roh = typeof anfrage.inhalt === "string" ? anfrage.inhalt.slice(0, MAX_INHALT_LEN) : "";
  const inhalt = entschaerfe(roh);
  const datum = datumFuer(lang);

  const wortmarke =
    '<div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:#1a1a2e;line-height:1">immo<span style="color:#e8650a">fuchs</span>.info</div>';

  return `<!DOCTYPE html><html lang="${esc(lang)}"><head><meta charset="utf-8"><title>Immofuchs - ${esc(titel)}</title>
<style>${SCHRIFT_IMPORT}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse;width:100%}svg{max-width:100%}
.hdr-print{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e8600a}
.hdr-print-meta{text-align:right}
@media print{body{padding:15px}*{overflow:visible!important}div,table,tr,svg{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}}</style>
</head><body>
<div class="hdr-print"><div><div style="display:flex;align-items:center;gap:12px"><img src="${esc(logoUrl(basisUrl))}" alt="" style="height:75px;width:75px;display:block;object-fit:contain">${wortmarke}</div></div><div class="hdr-print-meta"><div style="font-size:15px;font-weight:600;color:#1a1a2e">${esc(titel)}</div><div style="font-size:12px;color:#8a8a80;margin-top:3px">${esc(datum)}</div></div></div>
${inhalt}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e5dc;font-size:9px;color:#8a8a80;text-align:center">Erstellt mit Immofuchs · ${esc(datum)} · Keine Rechts- oder Steuerberatung</div>
</body></html>`;
}
