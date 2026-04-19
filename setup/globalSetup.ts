/**
 * Global setup — runs once before all test workers.
 *
 * Responsibilities:
 *  1. Ensure the reports/ directory tree exists.
 *  2. Stamp a run-start timestamp used by the dashboard reporter.
 *  3. (Optional) seed a test database when QA_SEED_DB=true.
 */
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");

async function globalSetup(): Promise<void> {
  // ── 1. Ensure report dirs exist ───────────────────────────────────────────
  const dirs = [
    "reports/playwright-html",
    "reports/screenshots",
    "reports/dashboard",
    "setup/auth-states",
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }

  // ── 2. Write run metadata ─────────────────────────────────────────────────
  const meta = {
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    ci: !!process.env.CI,
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:5173",
  };
  fs.writeFileSync(
    path.join(ROOT, "reports/run-meta.json"),
    JSON.stringify(meta, null, 2),
  );

  console.log("[QA] Global setup complete. Run started at", meta.startedAt);
}

export default globalSetup;
