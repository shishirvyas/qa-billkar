#!/usr/bin/env node
/**
 * Billkar QA — HTML Dashboard Generator
 *
 * Reads reports/results.json (Playwright JSON reporter output) and
 * reports/run-meta.json (written by globalSetup/Teardown) then produces
 * reports/dashboard/index.html — a self-contained HTML file with:
 *   - Pass / Fail / Flaky / Skipped summary cards
 *   - Per-suite breakdown table
 *   - Failed test details with file links
 *   - Run duration and CI badge
 *
 * Run:
 *   node reporter/generateDashboard.mjs
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const RESULTS   = path.join(ROOT, "reports/results.json");
const META      = path.join(ROOT, "reports/run-meta.json");
const OUT_DIR   = path.join(ROOT, "reports/dashboard");
const OUT_FILE  = path.join(OUT_DIR, "index.html");

// ── Read inputs ───────────────────────────────────────────────────────────────
if (!fs.existsSync(RESULTS)) {
  console.error("[Dashboard] reports/results.json not found. Run `npm test` first.");
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(RESULTS, "utf-8"));
const meta    = fs.existsSync(META)
  ? JSON.parse(fs.readFileSync(META, "utf-8"))
  : {};

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Parse Playwright JSON ─────────────────────────────────────────────────────
const suites  = results.suites ?? [];
const stats   = results.stats  ?? {};

let totalPassed  = stats.expected  ?? 0;
let totalFailed  = stats.unexpected ?? 0;
let totalFlaky   = stats.flaky     ?? 0;
let totalSkipped = stats.skipped   ?? 0;
const totalTests = totalPassed + totalFailed + totalFlaky + totalSkipped;

const passRate = totalTests > 0
  ? ((totalPassed / totalTests) * 100).toFixed(1)
  : "0.0";

// ── Flatten all specs ─────────────────────────────────────────────────────────
function flattenSuite(suite, results = []) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      for (const test of (spec.tests ?? [])) {
        results.push({
          suite:    suite.title ?? "",
          title:    spec.title ?? "",
          status:   test.status ?? "unknown",
          duration: (test.results ?? []).reduce((s, r) => s + (r.duration ?? 0), 0),
          file:     suite.file ?? "",
          error:    (test.results ?? []).find(r => r.error)?.error?.message ?? null,
        });
      }
    }
  }
  for (const child of (suite.suites ?? [])) {
    flattenSuite(child, results);
  }
  return results;
}

const allTests = suites.flatMap(s => flattenSuite(s));

// Group by file/suite
const byFile = {};
for (const t of allTests) {
  const key = t.file || t.suite || "unknown";
  if (!byFile[key]) byFile[key] = { passed: 0, failed: 0, flaky: 0, tests: [] };
  if (t.status === "expected")    byFile[key].passed++;
  else if (t.status === "flaky")  byFile[key].flaky++;
  else                            byFile[key].failed++;
  byFile[key].tests.push(t);
}

const failures = allTests.filter(t => t.status !== "expected" && t.status !== "skipped");

// ── Duration ──────────────────────────────────────────────────────────────────
function fmtMs(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDuration(meta) {
  if (!meta.durationMs) return "—";
  const s = Math.round(meta.durationMs / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const statusColour = {
  expected:   "#22c55e",
  unexpected: "#ef4444",
  flaky:      "#f59e0b",
  skipped:    "#94a3b8",
};

// ── Build HTML ────────────────────────────────────────────────────────────────
const failureRows = failures.map(t => `
  <tr class="fail-row">
    <td>${escHtml(t.file)}</td>
    <td>${escHtml(t.title)}</td>
    <td><span class="badge" style="background:${statusColour[t.status] ?? "#888"}">${t.status}</span></td>
    <td>${fmtMs(t.duration)}</td>
    <td class="error-msg">${escHtml(t.error ?? "")}</td>
  </tr>`).join("");

const suiteRows = Object.entries(byFile).map(([file, data]) => {
  const total = data.passed + data.failed + data.flaky;
  const pct   = total > 0 ? ((data.passed / total) * 100).toFixed(0) : "0";
  return `
  <tr>
    <td>${escHtml(file)}</td>
    <td>${total}</td>
    <td style="color:#22c55e;font-weight:600">${data.passed}</td>
    <td style="color:#ef4444;font-weight:600">${data.failed}</td>
    <td style="color:#f59e0b;font-weight:600">${data.flaky}</td>
    <td>
      <div class="progress-wrap">
        <div class="progress-bar" style="width:${pct}%;background:${Number(pct)===100?"#22c55e":Number(pct)>70?"#f59e0b":"#ef4444"}"></div>
      </div>
      ${pct}%
    </td>
  </tr>`;
}).join("");

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const overallColour = Number(passRate) === 100
  ? "#22c55e"
  : Number(passRate) >= 80
  ? "#f59e0b"
  : "#ef4444";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Billkar QA Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  header { background: #1e293b; padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid #334155; }
  header h1 { font-size: 1.4rem; font-weight: 700; }
  header .meta { font-size: 0.8rem; color: #94a3b8; margin-left: auto; text-align: right; }
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #1e293b; border-radius: 10px; padding: 1.25rem 1.5rem; border: 1px solid #334155; }
  .card .label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
  .card .value { font-size: 2rem; font-weight: 700; margin-top: .25rem; }
  .card .sub   { font-size: 0.75rem; color: #64748b; margin-top: .25rem; }
  section { margin-bottom: 2.5rem; }
  section h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 10px; overflow: hidden; }
  th { background: #0f172a; padding: .6rem 1rem; text-align: left; font-size: .75rem; color: #64748b; text-transform: uppercase; }
  td { padding: .6rem 1rem; font-size: .85rem; border-bottom: 1px solid #334155; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #263045; }
  .badge { display: inline-block; padding: .2em .55em; border-radius: 4px; font-size: .7rem; font-weight: 700; color: #fff; }
  .progress-wrap { display: inline-block; width: 80px; height: 6px; background: #334155; border-radius: 3px; vertical-align: middle; margin-right: .4rem; overflow: hidden; }
  .progress-bar  { height: 100%; border-radius: 3px; }
  .error-msg { font-family: monospace; font-size: .75rem; color: #fca5a5; max-width: 400px; word-break: break-word; }
  .fail-row td { background: #1f1215; }
  .rate { font-size: 3rem; font-weight: 800; }
  .ci-badge { display: inline-block; padding: .25rem .6rem; border-radius: 6px; font-size: .75rem; font-weight: 700; margin-left: 1rem; }
</style>
</head>
<body>
<header>
  <div>
    <h1>⚡ Billkar QA Dashboard</h1>
  </div>
  <div class="meta">
    <div>Started: ${meta.startedAt ?? "—"}</div>
    <div>Duration: ${fmtDuration(meta)}</div>
    <div>Node: ${meta.nodeVersion ?? "—"} &nbsp;|&nbsp; CI: ${meta.ci ? "Yes" : "No"}</div>
  </div>
</header>

<div class="container">
  <div class="cards">
    <div class="card">
      <div class="label">Pass rate</div>
      <div class="rate" style="color:${overallColour}">${passRate}%</div>
      <div class="sub">${totalTests} total tests</div>
    </div>
    <div class="card">
      <div class="label">Passed</div>
      <div class="value" style="color:#22c55e">${totalPassed}</div>
    </div>
    <div class="card">
      <div class="label">Failed</div>
      <div class="value" style="color:#ef4444">${totalFailed}</div>
    </div>
    <div class="card">
      <div class="label">Flaky</div>
      <div class="value" style="color:#f59e0b">${totalFlaky}</div>
    </div>
    <div class="card">
      <div class="label">Skipped</div>
      <div class="value" style="color:#94a3b8">${totalSkipped}</div>
    </div>
    <div class="card">
      <div class="label">Duration</div>
      <div class="value" style="font-size:1.5rem">${fmtDuration(meta)}</div>
    </div>
  </div>

  <section>
    <h2>Suite breakdown</h2>
    <table>
      <thead><tr><th>File</th><th>Total</th><th>Pass</th><th>Fail</th><th>Flaky</th><th>Rate</th></tr></thead>
      <tbody>${suiteRows || "<tr><td colspan='6' style='color:#64748b;text-align:center'>No data</td></tr>"}</tbody>
    </table>
  </section>

  ${failures.length > 0 ? `
  <section>
    <h2>Failures &amp; flaky tests (${failures.length})</h2>
    <table>
      <thead><tr><th>File</th><th>Test</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
      <tbody>${failureRows}</tbody>
    </table>
  </section>` : `
  <section>
    <h2 style="color:#22c55e">✓ All tests passed</h2>
  </section>`}
</div>
</body>
</html>`;

fs.writeFileSync(OUT_FILE, html, "utf-8");
console.log(`[Dashboard] Generated → ${OUT_FILE}`);
