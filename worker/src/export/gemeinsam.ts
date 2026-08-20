// Bausteine, die sich Handout- und Rechner-Dokument teilen.
//
// Beide Dokumente entstehen seit der Preispolitik 2026-08-20 im Worker statt
// im Browser (Schritt 3): Handout und PDF-Erzeugung sind Pro-Funktionen, und
// eine Sperre, die nur im Frontend steht, ist keine Sperre. Die Vorlage liegt
// deshalb hier hinter requirePro - ohne aktives Abo gibt es kein Dokument,
// nicht nur keinen sichtbaren Knopf.
//
// Was der Client mitschickt, sind Daten und Beschriftungen (Analyse bzw.
// Ergebnisbereich, i18n-Labels): beides hat er ohnehin auf dem Bildschirm,
// beides wird hier maskiert. Der Server besitzt die Vorlage und die
// Berechtigung - das ist die Grenze, auf die es ankommt.

// Die Design-Tokens aus CLAUDE.md ausgeschrieben: das Druckfenster kennt die
// CSS-Variablen der App nicht.
export const FARBE = {
  akzent: "#e8600a",
  akzentDunkel: "#c44d00",
  text: "#1a1a1a",
  leise: "#8a8a80",
  linie: "#e5e5dc",
  zart: "#f0f0ea",
  warn: "#8a6a20",
} as const;

// Alles, was aus dem Request kommt, geht durch esc() - im Handout stehen
// Freitexte aus dem Exposé des Anbieters, im Rechner-Dokument der
// Ergebnisbereich. Ohne Maskierung wuerde ein "<" das Dokument zerlegen.
export function esc(wert: unknown): string {
  return String(wert ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Der Kopf jedes Dokuments. Das Logo wird absolut verlinkt statt als
// data:-URI eingebettet: das Druckfenster entsteht per document.write und hat
// keine Basis-URL, an der ein relativer Pfad aufloesen wuerde - eine absolute
// URL loest dieselbe Aufgabe, ohne dass der Worker die Datei erst laden und
// base64-kodieren muss. Die Schriftart kommt ohnehin schon aus dem Netz.
export function logoUrl(basis: string): string {
  return `${basis.replace(/\/$/, "")}/logo-transparent.png`;
}

export const SCHRIFT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');";

// Datum in der Sprache des Nutzers. Intl steht in Workers zur Verfuegung.
export function datumFuer(lang: string): string {
  const locale =
    { de: "de-DE", en: "en-GB", tr: "tr-TR", zh: "zh-CN", hi: "hi-IN" }[lang] || "de-DE";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Der Client oeffnet das Druckfenster synchron im Klick-Kontext (iOS Safari
// blockt es sonst) und schreibt die Antwort hinein. Der Druckdialog startet
// verzoegert, damit Logo und Schrift vorher geladen sind.
export function mitDruckauftrag(dokument: string): string {
  return dokument.replace("</body>", "<script>setTimeout(()=>window.print(),600)</script></body>");
}

// Laengenbegrenzung fuer eingehende Freitexte - dieselbe Haltung wie in
// exposeOutput.ts: lieber abgeschnitten als ein Dokument, das den Speicher
// des Druckfensters sprengt.
export function text(wert: unknown, maxLen = 400): string {
  const s = typeof wert === "string" ? wert : wert === null || wert === undefined ? "" : String(wert);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function liste<T>(werte: unknown, maxAnzahl: number): T[] {
  return Array.isArray(werte) ? (werte.slice(0, maxAnzahl) as T[]) : [];
}
