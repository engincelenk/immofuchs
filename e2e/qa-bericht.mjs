// Fasst einen QA-Lauf zu einem Markdown-Bericht zusammen:
//   e2e/reports/qa-<stamp>/BERICHT.md
// Quellen: ergebnis.json (Playwright), unit-frontend.json und unit-worker.json
// (Vitest). Aufruf: node e2e/qa-bericht.mjs <stamp>
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stamp = process.argv[2];
if (!stamp) {
  console.error("Aufruf: node e2e/qa-bericht.mjs <stamp>");
  process.exit(2);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), "reports", `qa-${stamp}`);
const lese = (f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf-8")) : null);
const ohneFarbe = (s) => String(s ?? "").replace(/\x1b\[[0-9;]*m/g, "");

const zeilen = [];
const zusammen = [];

// ── Unit-Tests ──────────────────────────────────────────────────────────────
for (const [name, datei] of [
  ["Unit-Tests Frontend", "unit-frontend.json"],
  ["Unit-Tests Worker", "unit-worker.json"],
]) {
  const j = lese(datei);
  if (!j) {
    zusammen.push(`| ${name} | – | – | nicht gelaufen |`);
    continue;
  }
  zusammen.push(`| ${name} | ${j.numPassedTests} | ${j.numFailedTests} | ${j.numPendingTests ?? 0} uebersprungen |`);
  const rot = [];
  for (const f of j.testResults ?? []) {
    for (const a of f.assertionResults ?? []) {
      if (a.status === "failed") {
        rot.push(`- **${f.name.replace(/.*ImmofuchsPRO[\\/]/, "")}** › ${a.fullName}\n  \`${ohneFarbe(a.failureMessages?.[0]).split("\n")[0].slice(0, 250)}\``);
      }
    }
    if (f.status === "failed" && !(f.assertionResults ?? []).some((a) => a.status === "failed")) {
      rot.push(`- **${f.name.replace(/.*ImmofuchsPRO[\\/]/, "")}** (Datei laedt nicht): \`${ohneFarbe(f.message).split("\n")[0].slice(0, 250)}\``);
    }
  }
  if (rot.length) zeilen.push(`## ${name}: ${rot.length} rot\n`, ...rot, "");
}

// ── Playwright (QA) ─────────────────────────────────────────────────────────
const pw = lese("ergebnis.json");
const fehler = [];
const wackelig = [];
const hinweise = [];
let ok = 0,
  rot = 0,
  skip = 0;
function lauf(suite, pfad) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const letzte = t.results?.[t.results.length - 1];
      const titel = [...pfad, spec.title].filter(Boolean).join(" › ");
      const ann = (t.annotations ?? []).filter((a) => !["skip"].includes(a.type));
      for (const a of ann) if (/standby|csp|messwerte|backup/.test(a.type)) hinweise.push(`- ${titel} — *${a.type}*: ${a.description}`);
      if (t.status === "skipped") {
        skip++;
        continue;
      }
      if (t.status === "flaky") wackelig.push(`- ${titel}`);
      if (letzte?.status === "passed") {
        ok++;
        continue;
      }
      rot++;
      const msgs = (letzte?.errors ?? []).map((e) => ohneFarbe(e.message).split("\n").filter(Boolean).slice(0, 8).join("\n    "));
      fehler.push(`- **${titel}** (\`${spec.file}:${spec.line}\`)\n    ${msgs.join("\n    ---\n    ").slice(0, 1500)}`);
    }
  }
  for (const s of suite.suites ?? []) lauf(s, [...pfad, s.title.endsWith(".ts") ? "" : s.title]);
}
if (pw) for (const s of pw.suites ?? []) lauf(s, [s.title]);
zusammen.push(pw ? `| QA-Browser/API (qa.immofuchs.info) | ${ok} | ${rot} | ${skip} uebersprungen, ${wackelig.length} wackelig |` : "| QA-Browser/API | – | – | nicht gelaufen |");

const startfehler = (pw?.errors ?? []).map((e) => `- ${ohneFarbe(e.message).split("\n")[0]} (\`${e.location?.file?.replace(/.*[\\/]/, "") ?? "?"}:${e.location?.line ?? "?"}\`)`);
if (startfehler.length) zeilen.push("## QA-Suite konnte nicht (vollstaendig) starten\n", ...startfehler, "");
if (fehler.length) zeilen.push(`## QA-Suite: ${fehler.length} rot\n`, ...fehler, "");
if (wackelig.length) zeilen.push("## Wackelige Tests (erst im 2. Versuch gruen)\n", ...wackelig, "");
if (hinweise.length) zeilen.push("## Hinweise / Messwerte\n", ...[...new Set(hinweise)], "");

const md = [
  `# QA-Testbericht ${stamp}`,
  "",
  "Ziel: https://qa.immofuchs.info (Zwilling von prod, nur lesend, Standby-Schutz geprueft).",
  "",
  "| Teil | gruen | rot | Sonstiges |",
  "|---|---|---|---|",
  ...zusammen,
  "",
  "Details je Test: `html/index.html` in diesem Ordner (`npx playwright show-report e2e/reports/qa-" + stamp + "/html`).",
  "",
  ...zeilen,
].join("\n");
writeFileSync(join(dir, "BERICHT.md"), md, "utf-8");
console.log(md.split("\n").slice(0, 12).join("\n"));
console.log(`\nBericht: ${join(dir, "BERICHT.md")}`);
