import { defineConfig, devices } from "@playwright/test";

/**
 * Billkar Autonomous QA — Playwright Configuration
 *
 * Targets the Vite dev-server (web renderer) at http://localhost:5173.
 * In CI the server is expected to be pre-started; locally it is auto-started.
 *
 * Auth states are stored per-role in setup/auth-states/ so each spec
 * can reuse a pre-logged-in context without repeating login flows.
 *
 * Run modes:
 *   npm test                  – headless, all specs
 *   npm run test:headed       – headed (visual)
 *   npm run test:billing      – single module
 *   npm run test:nightly      – full run + HTML dashboard
 *   npm run test:ci           – CI mode (GitHub annotations + JSON output)
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",

  // Fail fast in CI; retry flaky tests up to 2×
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  // Per-test timeout (ms)
  timeout: 40_000,
  // Assertion timeout
  expect: { timeout: 8_000 },

  // ── Reporters ─────────────────────────────────────────────────────────────
  reporter: [
    process.env.CI ? ["github"] : ["list"],
    ["html",  { outputFolder: "reports/playwright-html", open: "never" }],
    ["json",  { outputFile:   "reports/results.json" }],
    ["junit", { outputFile:   "reports/results.xml" }],
  ],

  // ── Global browser defaults ────────────────────────────────────────────────
  use: {
    baseURL:           process.env.QA_BASE_URL ?? "http://localhost:5173",
    screenshot:        "only-on-failure",
    video:             "retain-on-failure",
    trace:             "on-first-retry",
    actionTimeout:     12_000,
    navigationTimeout: 25_000,
    // All screenshots land in reports/screenshots/
    screenshotPath:    "reports/screenshots",
  },

  // ── Projects (roles) ──────────────────────────────────────────────────────
  projects: [
    // 1. Auth setup — runs first, saves browser storage per role
    {
      name:    "setup:auth",
      testDir: "./setup",
      testMatch: "auth.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // 2. Feature tests — each depends on auth setup
    {
      name:         "chromium:admin",
      use:          { ...devices["Desktop Chrome"], storageState: "setup/auth-states/admin.json" },
      dependencies: ["setup:auth"],
    },
    {
      name:         "chromium:manager",
      use:          { ...devices["Desktop Chrome"], storageState: "setup/auth-states/manager.json" },
      dependencies: ["setup:auth"],
      testMatch:    "**/permissions.spec.ts",
    },
    {
      name:         "chromium:cashier",
      use:          { ...devices["Desktop Chrome"], storageState: "setup/auth-states/cashier.json" },
      dependencies: ["setup:auth"],
      testMatch:    "**/permissions.spec.ts",
    },
  ],

  // ── Web server ────────────────────────────────────────────────────────────
  webServer: process.env.CI
    ? undefined
    : {
        command:             "cd ../biilkar && npm run dev:web --workspace=@biilkar/desktop",
        url:                 "http://localhost:5173",
        reuseExistingServer: true,
        timeout:             90_000,
        stdout:              "pipe",
        stderr:              "pipe",
      },

  // ── Global setup / teardown ───────────────────────────────────────────────
  globalSetup:    "./setup/globalSetup.ts",
  globalTeardown: "./setup/globalTeardown.ts",
});
