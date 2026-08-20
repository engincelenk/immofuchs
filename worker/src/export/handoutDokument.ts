// Besichtigungs-Handout als druckfertiges HTML (Pro-Funktion).
//
// Portiert aus src/utils/finnHandoutPdf.js - dieselbe Vorlage, nur eine Ebene
// tiefer: der Browser baut das Dokument nicht mehr selbst, er bekommt es vom
// Worker. Layout unveraendert (Vorlage docs/Finn_Handout_Ingersheim.pdf,
// freigegeben), damit sich fuer Pro-Nutzer optisch nichts aendert.
//
// Analyse und Beschriftungen kommen aus dem Request (siehe gemeinsam.ts): die
// Analyse entsteht clientseitig aus dem Exposé (finnAnalyse.js), die Labels
// stehen in src/i18n/expose.js. Beides hier zu duplizieren hiesse, dieselbe
// Wahrheit an zwei Orten zu pflegen - die Grenze, die zaehlt, ist requirePro
// auf der Route, nicht die Herkunft der Wortmarken.
import { FARBE as C, SCHRIFT_IMPORT, datumFuer, esc, liste, logoUrl, text } from "./gemeinsam";

const MAX_FINDINGS = 10;
const MAX_PREISZEILEN = 20;
const MAX_BEKANNT = 40;
const MAX_CHECKLISTE = 60;

const LOCALES: Record<string, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  zh: "zh-CN",
  hi: "hi-IN",
};

interface Finding {
  text?: unknown;
  severity?: unknown;
  impactEur?: unknown;
  quellen?: unknown;
}

interface Preiszeile {
  label?: unknown;
  beworben?: unknown;
  real?: unknown;
  abweichend?: unknown;
}

interface Checkeintrag {
  id?: unknown;
  frage?: unknown;
  kategorie?: unknown;
  quelle?: unknown;
}

export interface HandoutAnfrage {
  analyse?: {
    adresse?: unknown;
    titel?: unknown;
    objekttyp?: unknown;
    verdictLabel?: unknown;
    verdictScore?: unknown;
    findings?: unknown;
    preistabelle?: unknown;
    bekannt?: unknown;
    checkliste?: unknown;
  };
  auswahl?: unknown;
  labels?: Record<string, unknown>;
  lang?: unknown;
}

function fuelle(vorlage: unknown, werte: Record<string, string>): string {
  return String(vorlage ?? "").replace(/\{(\w+)\}/g, (_treffer, name: string) =>
    name in werte ? werte[name] : "",
  );
}

// Betrag im Format der Vorlage ("1.234 €"). Der Client schickt die Zahl, nicht
// den fertigen String - so bleibt die Formatierung im Dokument einheitlich.
function betrag(wert: unknown, lang: string): string | null {
  const zahl = Number(wert);
  if (!Number.isFinite(zahl)) return null;
  const formatiert = new Intl.NumberFormat(LOCALES[lang] || "de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(zahl));
  return `${formatiert} €`;
}

function sektion(titel: unknown): string {
  return `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${C.akzentDunkel};border-bottom:1px solid ${C.linie};padding-bottom:4px;margin:0 0 8px">${esc(titel)}</div>`;
}

function findingZeile(f: Finding, labels: Record<string, unknown>, lang: string): string {
  const schwere = typeof f.severity === "string" ? f.severity : "info";
  const impact = betrag(f.impactEur, lang);
  const marke =
    impact !== null
      ? `−${impact}`
      : String(labels[`schwere${schwere.charAt(0).toUpperCase()}${schwere.slice(1)}`] ?? "");
  const farbe = schwere === "critical" ? C.akzentDunkel : schwere === "warning" ? C.warn : C.leise;
  const quellenListe = liste<unknown>(f.quellen, 8).map((q) => text(q, 60));
  const quellen =
    quellenListe.length > 0
      ? `<div style="font-size:9px;color:${C.leise};margin-top:2px">${esc(
          fuelle(labels.quellen, { quellen: [...new Set(quellenListe)].join(" · ") }),
        )}</div>`
      : "";
  return `<tr>
    <td style="width:88px;vertical-align:top;padding:6px 10px 6px 0;font-size:11px;font-weight:700;color:${farbe}">${esc(marke)}</td>
    <td style="vertical-align:top;padding:6px 0;font-size:11.5px;line-height:1.5">${esc(text(f.text, 400))}${quellen}</td>
  </tr>`;
}

// Kaestchen zum Abhaken: das Handout wird ausgedruckt und beim Termin mit dem
// Stift bearbeitet - deshalb ein leeres Quadrat, kein Haken.
function frageZeile(c: Checkeintrag): string {
  const kategorie = c.kategorie
    ? `<div style="font-size:9px;color:${C.leise};margin-top:1px">${esc(text(c.kategorie, 80))}</div>`
    : "";
  return `<div style="display:flex;gap:7px;padding:5px 0;page-break-inside:avoid">
    <span style="flex:none;width:11px;height:11px;border:1.4px solid ${C.leise};border-radius:2px;margin-top:2px"></span>
    <span style="flex:1;font-size:11px;line-height:1.45">${esc(text(c.frage, 300))}${kategorie}</span>
  </div>`;
}

function preisTabelle(zeilen: Preiszeile[], labels: Record<string, unknown>): string {
  if (zeilen.length === 0) return "";
  const html = zeilen
    .map((z) => {
      const farbe = z.abweichend ? C.akzentDunkel : C.text;
      return `<tr>
      <td style="padding:5px 0;border-top:1px solid ${C.linie};font-size:11.5px">${esc(text(z.label, 80))}</td>
      <td style="padding:5px 0 5px 12px;border-top:1px solid ${C.linie};font-size:11.5px;text-align:right;color:${C.leise}">${esc(text(z.beworben, 40) || "—")}</td>
      <td style="padding:5px 0 5px 12px;border-top:1px solid ${C.linie};font-size:11.5px;text-align:right;font-weight:700;color:${farbe}">${esc(text(z.real, 40))}</td>
    </tr>`;
    })
    .join("");
  return `${sektion(labels.preis)}
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
    <thead><tr>
      <th></th>
      <th style="text-align:right;padding:0 0 4px 12px;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:${C.leise}">${esc(labels.beworben)}</th>
      <th style="text-align:right;padding:0 0 4px 12px;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:${C.leise}">${esc(labels.real)}</th>
    </tr></thead>
    <tbody>${html}</tbody>
  </table>`;
}

export function baueHandoutDokument(anfrage: HandoutAnfrage, basisUrl: string): string {
  const a = anfrage.analyse ?? {};
  const labels = anfrage.labels ?? {};
  const lang = typeof anfrage.lang === "string" ? anfrage.lang : "de";
  const gewaehlteIds = new Set(liste<unknown>(anfrage.auswahl, MAX_CHECKLISTE).map(String));

  const findings = liste<Finding>(a.findings, MAX_FINDINGS);
  const checkliste = liste<Checkeintrag>(a.checkliste, MAX_CHECKLISTE).filter((c) =>
    gewaehlteIds.has(String(c.id)),
  );
  const zuKlaeren = checkliste.filter((c) => c.quelle !== "vor_ort");
  const vorOrt = checkliste.filter((c) => c.quelle === "vor_ort");
  const bekannt = liste<{ text?: unknown }>(a.bekannt, MAX_BEKANNT);

  const spalte = (titel: unknown, inhalt: string) =>
    inhalt ? `<div style="flex:1;min-width:0">${sektion(titel)}${inhalt}</div>` : "";

  const bekanntHtml = bekannt
    .map(
      (b) =>
        `<div style="font-size:11px;line-height:1.5;padding:3px 0 3px 13px;position:relative;page-break-inside:avoid">
        <span style="position:absolute;left:0;top:2px;font-size:9px;color:${C.akzent}">✓</span>${esc(text(b.text, 300))}
      </div>`,
    )
    .join("");
  const offenHtml = zuKlaeren.map(frageZeile).join("");

  const adresse = text(a.adresse, 160);
  const titel = text(a.titel, 200);
  const score = Number(a.verdictScore);
  const findingsHtml =
    findings.length > 0
      ? `${sektion(labels.findings)}<table style="width:100%;border-collapse:collapse;margin-bottom:18px">${findings
          .map((f) => findingZeile(f, labels, lang))
          .join("")}</table>`
      : `${sektion(labels.findings)}<div style="font-size:11.5px;line-height:1.5;margin-bottom:18px">${esc(labels.leer)}</div>`;
  const verdictHtml = Number.isFinite(score)
    ? `<div style="font-size:11px;color:${C.akzentDunkel};font-weight:700;margin-top:2px">${esc(
        fuelle(labels.pdfVerdict, { score: score.toFixed(1).replace(".", ",") }),
      )}</div>`
    : "";
  const vorOrtHtml =
    vorOrt.length > 0
      ? `${sektion(labels.vorOrt)}<div style="columns:2;column-gap:26px;margin-bottom:18px">${vorOrt
          .map(frageZeile)
          .join("")}</div>`
      : "";

  return `<!DOCTYPE html><html lang="${esc(lang)}"><head><meta charset="utf-8">
<title>${esc(labels.titel)} — ${esc(adresse || titel)}</title>
<style>${SCHRIFT_IMPORT}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#fff;color:${C.text};padding:28px;max-width:820px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{body{padding:14px}div,table,tr{break-inside:avoid;page-break-inside:avoid}}
</style></head><body>

<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid ${C.akzent};padding-bottom:12px;margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:11px">
    <img src="${esc(logoUrl(basisUrl))}" alt="" style="height:52px;width:auto;display:block">
    <div>
      <div style="font-size:24px;font-weight:700;letter-spacing:-.4px;line-height:1">immo<span style="color:${C.akzent}">fuchs</span>.info</div>
      <div style="font-size:11px;color:${C.leise};margin-top:4px">${esc(a.objekttyp === "Haus" ? "Haus" : "Eigentumswohnung")} · Kauf</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:14px;font-weight:700">${esc(labels.titel)}</div>
    <div style="font-size:11px;color:${C.leise};margin-top:2px">${esc(text(a.verdictLabel, 60))}</div>
    ${verdictHtml}
  </div>
</div>

<div style="margin-bottom:6px;font-size:15px;font-weight:700">${esc(adresse || "—")}</div>
<div style="margin-bottom:14px;font-size:11.5px;color:${C.leise}">${esc(titel)}</div>

<div style="background:${C.zart};border-radius:6px;padding:7px 10px;font-size:10px;line-height:1.45;color:${C.text};margin-bottom:16px">${esc(labels.automatisiert)}</div>

${findingsHtml}

${preisTabelle(liste<Preiszeile>(a.preistabelle, MAX_PREISZEILEN), labels)}

<div style="display:flex;gap:26px;margin-bottom:18px;align-items:flex-start">
  ${spalte(labels.bekannt, bekanntHtml)}
  ${spalte(labels.offen, offenHtml)}
</div>

${vorOrtHtml}

<div style="margin-top:24px;padding-top:10px;border-top:1px solid ${C.linie};display:flex;justify-content:space-between;font-size:9px;color:${C.leise}">
  <span>${esc(labels.pdfFooter)}</span>
  <span>${esc(datumFuer(lang))} · ${esc(labels.pdfDisclaimer)}</span>
</div>
</body></html>`;
}
