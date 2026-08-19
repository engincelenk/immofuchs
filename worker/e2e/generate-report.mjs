#!/usr/bin/env node
// Fuehrt die API-E2E-Suite aus und rendert automatisch einen HTML-Report
// (worker/e2e/last-report.html, nicht committet - siehe .gitignore). Nutzt
// bewusst nur den in Vitest eingebauten JSON-Reporter statt eines
// zusaetzlichen UI-Pakets (@vitest/ui) - eine Abhaengigkeit weniger fuer
// dieses kleine QA-Skript.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const jsonPath = join(mkdtempSync(join(tmpdir(), "e2e-report-")), "results.json");

const run = spawnSync(
  "npx",
  ["vitest", "run", "--config", "vitest.e2e.config.ts", "--reporter=verbose", "--reporter=json", `--outputFile.json=${jsonPath}`],
  { stdio: "inherit", shell: true },
);

let report;
try {
  report = JSON.parse(readFileSync(jsonPath, "utf-8"));
} catch (err) {
  console.error("\nKonnte Testergebnis nicht lesen:", err instanceof Error ? err.message : err);
  process.exit(run.status ?? 1);
}

const files = report.testResults ?? [];
const summary = { passed: 0, failed: 0, skipped: 0 };
for (const file of files) {
  for (const a of file.assertionResults ?? []) {
    if (a.status === "passed") summary.passed++;
    else if (a.status === "failed") summary.failed++;
    else summary.skipped++;
  }
}
const total = summary.passed + summary.failed + summary.skipped;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function pill(status) {
  const map = { passed: ["ok", "bestanden"], failed: ["fail", "fehlgeschlagen"], pending: ["skip", "übersprungen"], skipped: ["skip", "übersprungen"], todo: ["skip", "übersprungen"] };
  const [cls, label] = map[status] ?? ["skip", status];
  return `<span class="pill ${cls}">${label}</span>`;
}

const groupsHtml = files
  .map((file) => {
    const rows = (file.assertionResults ?? [])
      .map((a) => {
        const note =
          a.status === "failed" && a.failureMessages?.length
            ? esc(a.failureMessages[0].split("\n")[0]).slice(0, 140)
            : `${a.duration ?? 0}ms`;
        return `<tr><td class="status">${pill(a.status)}</td><td class="name">${esc(a.title)}</td><td class="note">${note}</td></tr>`;
      })
      .join("\n");
    return `<div class="group">
      <div class="group-head"><span class="file mono">${esc(basename(file.name))}</span></div>
      <div class="table-scroll"><table>${rows}</table></div>
    </div>`;
  })
  .join("\n");

const now = new Date().toLocaleString("de-DE");

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8" /><title>Billing-E2E-Report</title>
<style>
  :root { --ink:#1a2330; --ink-soft:#3a4150; --muted:#6b6a63; --paper:#f6f4ef; --paper-raised:#fff; --line:#e4e0d6; --accent:#e8600a; --ok:#1e7a46; --ok-bg:#e7f3ea; --fail:#c22b1e; --fail-bg:#fbeae8; --skip:#9a6b00; --skip-bg:#f6eddb; --shadow:0 1px 2px rgba(26,35,48,.06),0 8px 24px -12px rgba(26,35,48,.18); }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#edeae2; --ink-soft:#cbc6ba; --muted:#9d998d; --paper:#161a21; --paper-raised:#1d222b; --line:#2b313c; --accent:#f0792c; --ok:#3fc27f; --ok-bg:#14261d; --fail:#ff7566; --fail-bg:#2c1613; --skip:#f2b33d; --skip-bg:#2a2110; --shadow:0 1px 2px rgba(0,0,0,.3),0 12px 28px -14px rgba(0,0,0,.6); }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:-apple-system,"Segoe UI","DM Sans",Roboto,Helvetica,Arial,sans-serif; line-height:1.5; padding:clamp(20px,4vw,56px); }
  .sheet { max-width:880px; margin:0 auto; }
  .mono { font-family:ui-monospace,"SF Mono","Cascadia Code","Roboto Mono",Menlo,Consolas,monospace; font-variant-numeric:tabular-nums; }
  header { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:12px 24px; padding-bottom:20px; border-bottom:3px solid var(--accent); margin-bottom:28px; }
  .kicker { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:700; margin:0 0 6px; }
  h1 { font-size:clamp(1.4rem,3vw,1.9rem); margin:0; letter-spacing:-.01em; }
  .meta { text-align:right; color:var(--muted); font-size:.85rem; }
  .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:28px; }
  .stat { background:var(--paper-raised); border:1px solid var(--line); border-radius:10px; padding:16px 18px; box-shadow:var(--shadow); }
  .stat .n { font-size:2rem; font-weight:700; font-family:ui-monospace,monospace; line-height:1; display:block; }
  .stat .l { font-size:.78rem; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-top:6px; display:block; }
  .stat.ok .n { color:var(--ok); } .stat.fail .n { color:var(--fail); } .stat.skip .n { color:var(--skip); }
  .group { background:var(--paper-raised); border:1px solid var(--line); border-radius:10px; box-shadow:var(--shadow); overflow:hidden; margin-bottom:14px; }
  .group-head { padding:12px 16px; background:var(--paper); border-bottom:1px solid var(--line); font-size:.85rem; font-weight:600; }
  .table-scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; min-width:480px; }
  tr + tr td { border-top:1px solid var(--line); }
  td { padding:10px 16px; font-size:.86rem; vertical-align:top; }
  td.note { color:var(--muted); font-size:.8rem; font-family:ui-monospace,monospace; }
  td.status { width:110px; white-space:nowrap; }
  .pill { display:inline-flex; font-size:.7rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; padding:3px 9px; border-radius:999px; }
  .pill.ok { background:var(--ok-bg); color:var(--ok); }
  .pill.fail { background:var(--fail-bg); color:var(--fail); }
  .pill.skip { background:var(--skip-bg); color:var(--skip); }
  footer { margin-top:32px; padding-top:16px; border-top:1px solid var(--line); color:var(--muted); font-size:.78rem; }
</style></head>
<body><div class="sheet">
  <header>
    <div><p class="kicker">ImmoFuchs · Billing-QA</p><h1>End-to-End-Testreport</h1></div>
    <div class="meta">${esc(now)}</div>
  </header>
  <div class="summary">
    <div class="stat ok"><span class="n">${summary.passed}</span><span class="l">Bestanden</span></div>
    <div class="stat fail"><span class="n">${summary.failed}</span><span class="l">Fehlgeschlagen</span></div>
    <div class="stat skip"><span class="n">${summary.skipped}</span><span class="l">Übersprungen</span></div>
    <div class="stat"><span class="n">${total}</span><span class="l">Testfälle gesamt</span></div>
  </div>
  ${groupsHtml}
  <footer>Automatisch generiert von <span class="mono">npm run test:e2e:report</span></footer>
</div></body></html>`;

const outPath = join(process.cwd(), "e2e", "last-report.html");
writeFileSync(outPath, html, "utf-8");
console.log(`\nReport geschrieben: ${outPath}`);

// Zusaetzlich zu last-report.html (wird bei jedem Lauf ueberschrieben) wird
// jeder Lauf mit Datum/Uhrzeit im Dateinamen archiviert - Nutzer-Wunsch
// 2026-08-19: Verlauf ueber mehrere Laeufe sichtbar halten statt nur den
// letzten Stand zu haben. Ordner wird bewusst NICHT committet (siehe
// .gitignore), damit keine QA-Ergebnisse ins Repo wandern.
const reportsDir = join(process.cwd(), "e2e", "reports");
mkdirSync(reportsDir, { recursive: true });
const stampParts = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp =
  `${stampParts.getFullYear()}-${pad(stampParts.getMonth() + 1)}-${pad(stampParts.getDate())}` +
  `_${pad(stampParts.getHours())}-${pad(stampParts.getMinutes())}-${pad(stampParts.getSeconds())}`;
const archivedPath = join(reportsDir, `report-${stamp}.html`);
writeFileSync(archivedPath, html, "utf-8");
console.log(`Archiviert: ${archivedPath}`);

process.exit(run.status ?? 0);
