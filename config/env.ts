/**
 * Environment configuration for qa-billkar.
 *
 * Reads .env / process.env and exports a strongly-typed config object.
 * Supports DEV / STAGING / PRODUCTION_READONLY environments.
 */
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Load .env from qa-billkar root
dotenvConfig({ path: resolve(__dirname, "../.env") });

export type Env = "dev" | "staging" | "production";

export interface QAConfig {
  env:           Env;
  baseURL:       string;
  backendURL:    string;
  tenantId:      string;
  tenantSlug:    string;
  storeId:       string;
  adminEmail:    string;
  adminPassword: string;
  ciMode:        boolean;
  headless:      boolean;
  slowMo:        number;
  timeout:       number;
  retries:       number;
  videoOnFail:   boolean;
  screenshotDir: string;
  reportDir:     string;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[QA Config] Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  return v !== undefined ? Number(v) : fallback;
}

const envName = (optional("QA_ENV", "dev") as Env);

export const ENV: QAConfig = {
  env:           envName,
  baseURL:       optional("QA_BASE_URL",       "http://localhost:5173"),
  backendURL:    optional("QA_BACKEND_URL",    "http://localhost:4000"),
  tenantId:      optional("QA_TENANT_ID",      "t-1"),
  tenantSlug:    optional("QA_TENANT_SLUG",    "acme"),
  storeId:       optional("QA_STORE_ID",       "s-1"),
  adminEmail:    optional("QA_ADMIN_EMAIL",    "admin@acme.com"),
  adminPassword: optional("QA_ADMIN_PASSWORD", "Test@1234"),
  ciMode:        bool("CI",                   false),
  headless:      bool("QA_HEADLESS",          true),
  slowMo:        num("QA_SLOW_MO",            0),
  timeout:       num("QA_TIMEOUT",            30_000),
  retries:       num("QA_RETRIES",            envName === "dev" ? 1 : 2),
  videoOnFail:   bool("QA_VIDEO_ON_FAIL",     true),
  screenshotDir: optional("QA_SCREENSHOT_DIR", "reports/screenshots"),
  reportDir:     optional("QA_REPORT_DIR",     "reports"),
};

/** Returns true when running on a real backend (staging/prod) */
export const isLiveBackend = envName !== "dev";

/** Returns true when running against Electron app directly */
export const isElectron = bool("QA_ELECTRON", false);
