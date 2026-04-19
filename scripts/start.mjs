#!/usr/bin/env node
/**
 * qa-billkar Auto-Start Agent
 * ────────────────────────────────────────────────────────────────────────────
 * One command to rule them all:
 *
 *   node scripts/start.mjs [options]
 *   npm start                        ← same as above, mode=smoke
 *   npm start -- --mode full         ← run all 125+ tests
 *   npm start -- --mode smoke        ← fast 3-suite sanity check (default)
 *   npm start -- --mode billing      ← single module
 *   npm start -- --mode headed       ← smoke, but with visible browser
 *   npm start -- --mode ai           ← AI orchestrator (git-diff driven)
 *   npm start -- --no-report         ← skip opening HTML report at the end
 *   npm start -- --no-app            ← skip starting the Vite dev server
 *
 * What it does automatically:
 *  1. Checks Node ≥ 18
 *  2. Copies .env.example → .env if .env is missing
 *  3. Runs npm install (skips if node_modules already fresh)
 *  4. Installs Playwright browsers if Chromium is missing
 *  5. (Unless --no-app) spawns the Vite dev server and waits up to 60 s
 *  6. Runs the selected test suite
 *  7. Shows a pass/fail summary in the terminal
 *  8. Opens the HTML report (unless --no-report)
 */

import {
  spawnSync, spawn, execSync,
} from "child_process";
import {
  existsSync, copyFileSync, readFileSync, mkdirSync, statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";

// ── Paths ─────────────────────────────────────────────────────────────────────
const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, "..");
const PARENT = join(ROOT, "..");          // c:\projects\BILLKAR-MAHADEV

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  cyan:   "\x1b[36m",
  blue:   "\x1b[34m",
  dim:    "\x1b[2m",
};
const log   = (msg)  => console.log(`${C.cyan}[QA-Agent]${C.reset} ${msg}`);
const ok    = (msg)  => console.log(`${C.green}[QA-Agent] ✔${C.reset} ${msg}`);
const warn  = (msg)  => console.log(`${C.yellow}[QA-Agent] ⚠${C.reset} ${msg}`);
const error = (msg)  => console.error(`${C.red}[QA-Agent] ✖${C.reset} ${msg}`);
const head  = (msg)  => console.log(`\n${C.bold}${C.blue}${"═".repeat(60)}${C.reset}\n${C.bold} ${msg}${C.reset}\n${C.blue}${"═".repeat(60)}${C.reset}`);

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const MODE       = getArg("--mode") ?? "smoke";
const OPEN_REPORT = !hasFlag("--no-report");
const START_APP  = !hasFlag("--no-app");
const BASE_URL   = process.env.QA_BASE_URL ?? "http://localhost:5173";

// ── Mode → playwright command map ─────────────────────────────────────────────
const MODES = {
  smoke:   ["playwright", "test", "tests/auth/", "tests/performance/", "tests/sync/"],
  full:    ["playwright", "test"],
  ai:      ["node", "agent/orchestrator.mjs"],
  headed:  ["playwright", "test", "tests/auth/", "tests/performance/", "tests/sync/", "--headed"],
  // single module shortcuts
  auth:         ["playwright", "test", "tests/auth/", "tests/auth.spec.ts"],
  billing:      ["playwright", "test", "tests/billing/", "tests/billing.spec.ts"],
  customers:    ["playwright", "test", "tests/customers/"],
  products:     ["playwright", "test", "tests/products/"],
  inventory:    ["playwright", "test", "tests/inventory/", "tests/inventory.spec.ts"],
  sync:         ["playwright", "test", "tests/sync/", "tests/sync.spec.ts"],
  reports:      ["playwright", "test", "tests/reports/", "tests/reports.spec.ts"],
  permissions:  ["playwright", "test", "tests/permissions/", "tests/permissions.spec.ts"],
  settings:     ["playwright", "test", "tests/settings/"],
  perf:         ["playwright", "test", "tests/performance/"],
};

// ── Step 1 — Node version check ───────────────────────────────────────────────
function checkNode() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) {
    error(`Node.js ≥ 18 required. Current: ${process.version}`);
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);
}

// ── Step 2 — .env bootstrap ───────────────────────────────────────────────────
function ensureEnv() {
  const envPath     = join(ROOT, ".env");
  const examplePath = join(ROOT, ".env.example");
  if (!existsSync(envPath)) {
    if (existsSync(examplePath)) {
      copyFileSync(examplePath, envPath);
      warn(".env not found — copied from .env.example. Review credentials in .env before running against real data.");
    } else {
      warn(".env not found and no .env.example either. Continuing with defaults.");
    }
  } else {
    ok(".env present");
  }
}

// ── Step 3 — npm install ──────────────────────────────────────────────────────
function installDeps() {
  const nmPath = join(ROOT, "node_modules", ".package-lock.json");
  const pkgPath = join(ROOT, "package.json");
  // Skip install if node_modules is newer than package.json
  if (existsSync(nmPath)) {
    const nmMtime  = statMtime(nmPath);
    const pkgMtime = statMtime(pkgPath);
    if (nmMtime >= pkgMtime) {
      ok("Dependencies up to date (skipping npm install)");
      return;
    }
  }
  log("Installing dependencies...");
  const r = spawnSync("npm", ["install"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) { error("npm install failed"); process.exit(1); }
  ok("Dependencies installed");
}

function statMtime(p) {
  try { return statSync(p).mtimeMs; } catch { return 0; }
}

// ── Step 3b — Playwright browsers ────────────────────────────────────────────
function ensureBrowsers() {
  // Quick check: if chromium executable exists, skip install
  const chromiumGlob = join(ROOT, "node_modules", ".cache", "ms-playwright");
  if (existsSync(chromiumGlob)) {
    ok("Playwright browsers found");
    return;
  }
  log("Installing Playwright browsers (Chromium only)...");
  const r = spawnSync("npx", ["playwright", "install", "chromium", "--with-deps"], {
    cwd: ROOT, stdio: "inherit", shell: true,
  });
  if (r.status !== 0) {
    warn("Browser install had warnings — continuing anyway.");
  } else {
    ok("Playwright browsers ready");
  }
}

// ── Step 4 — Wait for app ─────────────────────────────────────────────────────
function waitForUrl(url, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const parsed = new URL(url);
    const attempt = () => {
      const req = http.get({
        hostname: parsed.hostname,
        port:     parsed.port || 80,
        path:     parsed.pathname,
        timeout:  2000,
      }, (res) => {
        resolve(res.statusCode);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 1500);
      });
      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 1500);
      });
    };
    attempt();
  });
}

async function maybeStartApp() {
  if (!START_APP) {
    log("--no-app flag set — skipping app startup");
    return null;
  }

  // Check if already running
  try {
    await waitForUrl(BASE_URL, 3_000);
    ok(`App already running at ${BASE_URL}`);
    return null;
  } catch {
    // Need to start it
  }

  log(`Starting Billkar app (${BASE_URL})...`);

  // The Vite dev server lives in biilkar/apps/desktop
  const desktopPath = join(PARENT, "biilkar");
  const devCmd  = process.platform === "win32"
    ? "npm run dev:web --workspace=@biilkar/desktop"
    : "npm run dev:web --workspace=@biilkar/desktop";

  const appProc = spawn("npm", ["run", "dev:web", "--workspace=@biilkar/desktop"], {
    cwd:   desktopPath,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: false,
  });

  appProc.stdout.on("data", (d) => {
    const line = d.toString().trim();
    if (line) process.stdout.write(`${C.dim}  [app] ${line}${C.reset}\n`);
  });
  appProc.stderr.on("data", (d) => {
    const line = d.toString().trim();
    // Only show meaningful lines (not noise)
    if (line && !line.includes("ExperimentalWarning")) {
      process.stdout.write(`${C.dim}  [app] ${line}${C.reset}\n`);
    }
  });

  log(`Waiting for app to be ready at ${BASE_URL} (up to 60 s)...`);
  try {
    await waitForUrl(BASE_URL, 60_000);
    ok(`App is ready at ${BASE_URL}`);
  } catch (e) {
    error(`App did not start: ${e.message}`);
    error("Make sure you are inside the BILLKAR-MAHADEV workspace and the desktop app is configured.");
    error("You can also run the app manually and re-run: npm start -- --no-app");
    appProc.kill();
    process.exit(1);
  }

  return appProc;
}

// ── Step 5 — Run tests ────────────────────────────────────────────────────────
function runTests() {
  const cmdArgs = MODES[MODE];
  if (!cmdArgs) {
    error(`Unknown mode: "${MODE}". Valid modes: ${Object.keys(MODES).join(", ")}`);
    process.exit(1);
  }

  log(`Running tests in mode: ${C.bold}${MODE}${C.reset}`);
  log(`Command: ${cmdArgs.join(" ")}`);

  const [bin, ...rest] = cmdArgs;
  const isNpx = bin === "playwright";

  const r = spawnSync(
    isNpx ? "npx" : "node",
    isNpx ? ["playwright", ...rest] : rest,
    {
      cwd:   ROOT,
      stdio: "inherit",
      shell: true,
      env:   { ...process.env, FORCE_COLOR: "1" },
    },
  );

  return r.status ?? 1;
}

// ── Step 6 — Open report ──────────────────────────────────────────────────────
function openReport() {
  if (!OPEN_REPORT) return;
  const reportDir = join(ROOT, "reports", "playwright-html");
  if (!existsSync(reportDir)) return;
  log("Opening HTML report...");
  spawnSync("npx", ["playwright", "show-report", reportDir], {
    cwd: ROOT, stdio: "inherit", shell: true,
  });
}

// ── Step 7 — Summary banner ───────────────────────────────────────────────────
function printSummary(exitCode) {
  const resultsPath = join(ROOT, "test-results", "results.json");
  if (!existsSync(resultsPath)) {
    if (exitCode === 0) ok("All tests passed!");
    else error("Tests failed. Check the HTML report.");
    return;
  }

  try {
    const results = JSON.parse(readFileSync(resultsPath, "utf8"));
    const stats   = results.stats ?? {};
    const passed  = stats.expected  ?? 0;
    const failed  = stats.unexpected ?? 0;
    const skipped = stats.skipped    ?? 0;
    const total   = passed + failed + skipped;

    console.log(`\n${C.bold}━━━━ QA Results ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    console.log(`  Total   : ${C.bold}${total}${C.reset}`);
    console.log(`  ${C.green}Passed  : ${passed}${C.reset}`);
    if (failed > 0)  console.log(`  ${C.red}Failed  : ${failed}${C.reset}`);
    if (skipped > 0) console.log(`  ${C.yellow}Skipped : ${skipped}${C.reset}`);
    console.log(`${"━".repeat(48)}`);
    if (failed === 0) {
      console.log(`\n  ${C.green}${C.bold}✔ ALL TESTS PASSED${C.reset}\n`);
    } else {
      console.log(`\n  ${C.red}${C.bold}✖ ${failed} TEST(S) FAILED${C.reset}\n`);
    }
  } catch {
    if (exitCode === 0) ok("All tests passed!");
    else error("Tests failed. Check the HTML report.");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  head("Billkar QA Auto-Start Agent");
  log(`Mode: ${C.bold}${MODE}${C.reset}  |  Target: ${BASE_URL}`);
  console.log();

  // Ensure required dirs exist
  mkdirSync(join(ROOT, "test-results"), { recursive: true });
  mkdirSync(join(ROOT, "reports"),      { recursive: true });

  checkNode();
  ensureEnv();
  installDeps();
  ensureBrowsers();

  const appProc = await maybeStartApp();

  head(`Running: ${MODE.toUpperCase()} suite`);
  const exitCode = runTests();

  // Cleanup spawned app process
  if (appProc) {
    log("Stopping app process...");
    try { appProc.kill("SIGTERM"); } catch {}
  }

  printSummary(exitCode);

  if (OPEN_REPORT && exitCode !== 0) {
    openReport();
  } else if (OPEN_REPORT) {
    openReport();
  }

  process.exit(exitCode);
}

main().catch((e) => {
  error(e.message);
  process.exit(1);
});
