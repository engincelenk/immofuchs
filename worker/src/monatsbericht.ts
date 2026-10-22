// Monatsbericht per Mail (seit 2026-10-22). Der Monatsjob (.github/workflows/monthly-update.yml,
// scripts/monatsbericht.py) schickt am Ende einen JSON-Bericht an POST /api/v1/internal/monthly-report
// (routes/internalReport.ts); hier wird er geprueft und in eine Mail verwandelt.
//
// Alles, was von aussen kommt, wird als Text behandelt: Laengen und Anzahlen sind begrenzt, jede
// Ausgabe in der Mail wird HTML-escaped.

export interface Monatsbericht {
  /** z.B. "November 2026" */
  monat: string;
  /** false, wenn das Aktualisierungsskript fehlgeschlagen ist */
  laufOk: boolean;
  fehler?: string;
  /** geaenderte Werte, eine Zeile je Aenderung */
  aenderungen: string[];
  quellen: { name: string; ok: boolean; hinweis?: string }[];
  deploy: { ausgeloest: boolean; umgebungen: string[] };
  /** Handpflege-Aufgaben, die noch von Hand zu erledigen sind */
  aufgaben: { titel: string; quelle?: string; datei?: string; claude?: string }[];
  /** Link auf den GitHub-Lauf */
  laufUrl?: string;
}

const MAX_KURZ = 300;
const MAX_LANG = 1500;
const MAX_ZEILEN = 40;

function text(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function liste(v: unknown): unknown[] {
  return Array.isArray(v) ? v.slice(0, MAX_ZEILEN) : [];
}

/** Prueft und begrenzt einen eingehenden Bericht. null = unbrauchbar. */
export function pruefeBericht(roh: unknown): Monatsbericht | null {
  if (!roh || typeof roh !== "object") return null;
  const r = roh as Record<string, unknown>;
  const monat = text(r.monat, 40);
  if (!monat || typeof r.laufOk !== "boolean") return null;

  const aenderungen = liste(r.aenderungen)
    .map((z) => text(z, MAX_KURZ))
    .filter((z): z is string => !!z);

  const quellen = liste(r.quellen).flatMap((q) => {
    if (!q || typeof q !== "object") return [];
    const o = q as Record<string, unknown>;
    const name = text(o.name, 80);
    if (!name || typeof o.ok !== "boolean") return [];
    return [{ name, ok: o.ok, hinweis: text(o.hinweis, MAX_KURZ) }];
  });

  const aufgaben = liste(r.aufgaben).flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const o = a as Record<string, unknown>;
    const titel = text(o.titel, MAX_KURZ);
    if (!titel) return [];
    return [
      {
        titel,
        quelle: text(o.quelle, MAX_KURZ),
        datei: text(o.datei, MAX_KURZ),
        claude: text(o.claude, MAX_LANG),
      },
    ];
  });

  const d = (r.deploy && typeof r.deploy === "object" ? r.deploy : {}) as Record<string, unknown>;
  const umgebungen = liste(d.umgebungen)
    .map((u) => text(u, 40))
    .filter((u): u is string => !!u);

  const url = text(r.laufUrl, 300);
  return {
    monat,
    laufOk: r.laufOk,
    fehler: text(r.fehler, MAX_LANG),
    aenderungen,
    quellen,
    deploy: { ausgeloest: d.ausgeloest === true, umgebungen },
    aufgaben,
    // nur echte https-Links in die Mail uebernehmen
    laufUrl: url && /^https:\/\//.test(url) ? url : undefined,
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Betreff und HTML-Koerper der Mail. */
export function baueMonatsbericht(b: Monatsbericht): { betreff: string; html: string } {
  const quellenProbleme = b.quellen.filter((q) => !q.ok).length;
  const achtung = !b.laufOk || quellenProbleme > 0;
  const betreff =
    `${achtung ? "ACHTUNG: " : ""}ImmoFuchs Monatsbericht ${b.monat}: ` +
    `${b.aenderungen.length} Änderung(en), ${b.aufgaben.length} Aufgabe(n) für dich`;

  const teile: string[] = [];
  teile.push(`<p><strong>Monatsbericht ${esc(b.monat)}</strong></p>`);
  teile.push(
    b.laufOk
      ? "<p>Der Monatsjob ist durchgelaufen.</p>"
      : `<p><strong>Der Monatsjob ist fehlgeschlagen.</strong>${b.fehler ? ` ${esc(b.fehler)}` : ""}</p>`,
  );

  teile.push("<p><strong>Was aktualisiert wurde</strong></p>");
  teile.push(
    b.aenderungen.length
      ? `<ul>${b.aenderungen.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
      : "<p>Keine Änderungen an den Werten (Stand war schon aktuell, oder eine Quelle fehlte).</p>",
  );

  if (b.quellen.length) {
    teile.push("<p><strong>Datenquellen</strong></p>");
    teile.push(
      `<ul>${b.quellen
        .map((q) => `<li>${q.ok ? "OK" : "<strong>FEHLT</strong>"}: ${esc(q.name)}${q.hinweis ? ` (${esc(q.hinweis)})` : ""}</li>`)
        .join("")}</ul>`,
    );
  }

  teile.push(
    b.deploy.ausgeloest
      ? `<p><strong>Deploy:</strong> ausgelöst für ${b.deploy.umgebungen.map(esc).join(", ") || "die Umgebungen"}.</p>`
      : "<p><strong>Deploy:</strong> nicht nötig (keine Datenänderung) oder nicht ausgelöst.</p>",
  );

  teile.push("<p><strong>Was du noch von Hand machen musst</strong></p>");
  if (b.aufgaben.length) {
    teile.push(
      b.aufgaben
        .map(
          (a) =>
            `<p><strong>${esc(a.titel)}</strong>` +
            (a.quelle ? `<br>Quelle: ${esc(a.quelle)}` : "") +
            (a.datei ? `<br>Datei: ${esc(a.datei)}` : "") +
            (a.claude ? `<br>Satz für Claude:<br><em>${esc(a.claude)}</em>` : "") +
            "</p>",
        )
        .join(""),
    );
    teile.push("<p>Zu jedem Thema gibt es auch ein GitHub-Issue (Label datenpflege), das du nach der Erledigung schließt.</p>");
  } else {
    teile.push("<p>Diesen Monat ist nichts von Hand fällig.</p>");
  }

  if (b.laufUrl) teile.push(`<p><a href="${esc(b.laufUrl)}">Lauf in GitHub ansehen</a></p>`);
  return { betreff, html: teile.join("") };
}
