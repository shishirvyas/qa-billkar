#!/usr/bin/env node
/**
 * run-full.mjs — Runs the complete QA suite.
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

console.log("▶  qa-billkar full run (all suites)\n");

const result = spawnSync(
  "npx",
  [
    "playwright", "test",
    "--reporter=html,json,junit",
    "tests/**/*.spec.ts",
  ],
  { cwd: ROOT, stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
