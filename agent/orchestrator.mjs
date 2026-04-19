#!/usr/bin/env node
/**
 * QA Orchestrator — AI-driven test selection agent.
 *
 * Usage:
 *   node agent/orchestrator.mjs [--module <name>] [--full] [--smoke] [--dry-run]
 *
 * When --module is given, only tests for that module run.
 * When --full is given, all tests run.
 * When --smoke is given, auth + performance + sync tests run.
 * When neither is given, tests are selected based on git-changed files.
 */

import { spawnSync } from "child_process";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

// ── Load module registry ─────────────────────────────────────────────────────
const MODULE_MAP_PATH = join(__dir, "moduleMap.mjs");
let moduleMap = {};
if (existsSync(MODULE_MAP_PATH)) {
  const raw = readFileSync(MODULE_MAP_PATH, "utf8");
  // Extract the exported default object via a quick regex parse
  const match = raw.match(/export\s+default\s+(\{[\s\S]+?\})\s*;?\s*$/m);
  if (match) {
    try {
      // Safely evaluate the module map literal
      moduleMap = Function(`"use strict"; return (${match[1]});`)();
    } catch {
      moduleMap = {};
    }
  }
}

// ── Determine which test suites to run ───────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun  = args.includes("--dry-run");
const isFull    = args.includes("--full");
const isSmoke   = args.includes("--smoke");
const moduleIdx = args.indexOf("--module");
const targetModule = moduleIdx !== -1 ? args[moduleIdx + 1] : null;

/** Mapping from module name → test file glob */
const MODULE_TEST_PATHS = {
  auth:        "tests/auth/**",
  billing:     "tests/billing/**",
  customers:   "tests/customers/**",
  products:    "tests/products/**",
  inventory:   "tests/inventory/**",
  sync:        "tests/sync/**",
  reports:     "tests/reports/**",
  permissions: "tests/permissions/**",
  settings:    "tests/settings/**",
  performance: "tests/performance/**",
};

const SMOKE_PATHS   = ["tests/auth/**", "tests/performance/**", "tests/sync/**"];
const ALL_TEST_GLOB = "tests/**/*.spec.ts";

// ── Git-based smart selection ─────────────────────────────────────────────────
function getChangedModules() {
  const result = spawnSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], {
    cwd:      join(ROOT, ".."),
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  const changed = (result.stdout || "").split("\n").filter(Boolean);

  const modules = new Set();
  for (const file of changed) {
    if (file.includes("billing") || file.includes("invoice"))   modules.add("billing");
    if (file.includes("customer"))                              modules.add("customers");
    if (file.includes("product"))                               modules.add("products");
    if (file.includes("inventory") || file.includes("stock"))   modules.add("inventory");
    if (file.includes("auth") || file.includes("session"))      modules.add("auth");
    if (file.includes("sync"))                                  modules.add("sync");
    if (file.includes("report"))                                modules.add("reports");
    if (file.includes("permission") || file.includes("role"))   modules.add("permissions");
    if (file.includes("setting") || file.includes("flag"))      modules.add("settings");
  }
  return modules.size > 0 ? [...modules] : null;
}

// ── Build final test spec list ────────────────────────────────────────────────
let testPaths;
let planReason;

if (isFull) {
  testPaths  = [ALL_TEST_GLOB];
  planReason = "full suite (--full)";
} else if (isSmoke) {
  testPaths  = SMOKE_PATHS;
  planReason = "smoke suite (--smoke)";
} else if (targetModule) {
  const path = MODULE_TEST_PATHS[targetModule];
  if (!path) {
    console.error(`Unknown module: "${targetModule}". Available: ${Object.keys(MODULE_TEST_PATHS).join(", ")}`);
    process.exit(1);
  }
  testPaths  = [path];
  planReason = `single module (--module ${targetModule})`;
} else {
  const changedModules = getChangedModules();
  if (changedModules) {
    testPaths  = changedModules.map((m) => MODULE_TEST_PATHS[m]).filter(Boolean);
    planReason = `AI-selected based on git diff: ${changedModules.join(", ")}`;
  } else {
    testPaths  = SMOKE_PATHS;
    planReason = "smoke suite (no git diff or no relevant changes)";
  }
}

// ── Print plan ────────────────────────────────────────────────────────────────
const plan = {
  reason:    planReason,
  testPaths,
  timestamp: new Date().toISOString(),
  dryRun:    isDryRun,
};

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║              qa-billkar  AI Orchestrator                    ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\nPlan: ${planReason}`);
console.log("Suites:");
testPaths.forEach((p) => console.log(`  • ${p}`));
console.log();

// Save plan to file for CI visibility
writeFileSync(join(ROOT, "test-results", "orchestrator-plan.json").replace(/\\/g, "/"),
  JSON.stringify(plan, null, 2), { flag: "w" });

if (isDryRun) {
  console.log("[dry-run] Exiting without running tests.");
  process.exit(0);
}

// ── Execute Playwright ────────────────────────────────────────────────────────
const pwArgs = [
  "playwright", "test",
  "--reporter=html,json",
  ...testPaths,
];

console.log(`Running: npx ${pwArgs.join(" ")}\n`);

const result = spawnSync("npx", pwArgs, {
  cwd:   ROOT,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
