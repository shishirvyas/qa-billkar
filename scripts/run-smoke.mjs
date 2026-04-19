#!/usr/bin/env node
/**
 * run-smoke.mjs — Runs the smoke test suite (auth + performance + sync).
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SMOKE_SUITES = [
  "tests/auth/**/*.spec.ts",
  "tests/performance/**/*.spec.ts",
  "tests/sync/**/*.spec.ts",
];

console.log("▶  qa-billkar smoke run");
console.log(`   Suites: ${SMOKE_SUITES.join(", ")}\n`);

const result = spawnSync(
  "npx",
  ["playwright", "test", "--reporter=html,json", ...SMOKE_SUITES],
  { cwd: ROOT, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
