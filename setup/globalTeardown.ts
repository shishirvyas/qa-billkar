/**
 * Global teardown — runs once after all test workers finish.
 *
 * Stamps the run-end time so the dashboard reporter can compute duration.
 */
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const META_FILE = path.join(ROOT, "reports/run-meta.json");

async function globalTeardown(): Promise<void> {
  if (fs.existsSync(META_FILE)) {
    const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
    meta.finishedAt   = new Date().toISOString();
    const start       = new Date(meta.startedAt).getTime();
    meta.durationMs   = Date.now() - start;
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  }
  console.log("[QA] Global teardown complete.");
}

export default globalTeardown;
