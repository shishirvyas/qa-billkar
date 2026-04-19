#!/usr/bin/env node
/**
 * check-results.mjs — Validates the Playwright JSON results and exits non-zero on failures.
 *
 * Usage:
 *   node scripts/check-results.mjs [path/to/results.json]
 *
 * Exits 0 if all tests passed, 1 if any failed or the file is missing.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT         = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_PATH = process.argv[2] ?? join(ROOT, "test-results", "results.json");

if (!existsSync(RESULTS_PATH)) {
  console.error(`✗ Results file not found: ${RESULTS_PATH}`);
  console.error("  Run the test suite first (npm test or npm run test:full).");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
} catch (err) {
  console.error(`✗ Failed to parse results file: ${err.message}`);
  process.exit(1);
}

// Playwright JSON reporter shape
const stats = data.stats ?? {};
const suites = data.suites ?? [];

const passed   = stats.expected   ?? 0;
const failed   = stats.unexpected ?? 0;
const flaky    = stats.flaky      ?? 0;
const skipped  = stats.skipped    ?? 0;
const total    = passed + failed + flaky + skipped;

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║              qa-billkar  Results Summary                    ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`  Total:   ${total}`);
console.log(`  Passed:  ${passed}`);
console.log(`  Failed:  ${failed}`);
console.log(`  Flaky:   ${flaky}`);
console.log(`  Skipped: ${skipped}`);

if (failed > 0) {
  console.log("\nFailed tests:");
  for (const suite of suites) {
    for (const spec of (suite.specs ?? [])) {
      for (const test of (spec.tests ?? [])) {
        const hasFailure = test.results?.some((r) => r.status === "failed" || r.status === "timedOut");
        if (hasFailure) {
          console.log(`  ✗ ${suite.title} › ${spec.title}`);
        }
      }
    }
  }
  console.log();
  process.exit(1);
}

console.log("\n  ✓ All tests passed!\n");
process.exit(0);
