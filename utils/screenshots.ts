import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../reports/screenshots');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Captures a full-page screenshot and saves it to the reports/screenshots folder.
 * Returns the absolute path of the saved file.
 */
export async function captureScreenshot(page: Page, name: string): Promise<string> {
  ensureDir(SCREENSHOTS_DIR);
  const sanitized = name.replace(/[^a-z0-9_-]/gi, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${sanitized}_${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * Captures a screenshot of a specific element.
 * Returns the absolute path of the saved file.
 */
export async function captureElement(page: Page, selector: string, name: string): Promise<string> {
  ensureDir(SCREENSHOTS_DIR);
  const sanitized = name.replace(/[^a-z0-9_-]/gi, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${sanitized}_${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  const element = page.locator(selector);
  await element.screenshot({ path: filepath });
  return filepath;
}

/**
 * Captures a screenshot on test failure with a consistent naming scheme.
 */
export async function captureOnFailure(page: Page, testTitle: string): Promise<string> {
  return captureScreenshot(page, `FAIL_${testTitle}`);
}
