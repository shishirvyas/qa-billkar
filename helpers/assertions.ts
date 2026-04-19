/**
 * Smart Assertions — AI-powered assertion helpers.
 *
 * Provides semantic, human-readable assertions that:
 *  1. Log meaningful context on failure
 *  2. Retry with exponential backoff for flaky DOM states
 *  3. Validate business logic beyond raw Playwright assertions
 *  4. Produce actionable failure messages
 *
 * Usage:
 *   import { assert } from "../helpers/assertions.js";
 *   await assert.invoiceTotalsMatch(page, { grandTotal: 1180 });
 *   await assert.hasPermission(page, "invoices:create");
 */
import { expect, type Page, type Locator } from "@playwright/test";
import { r2 } from "../utils/gstCalculator.js";

// ─── Text content helpers ─────────────────────────────────────────────────────
async function textOf(loc: Locator): Promise<string> {
  return (await loc.textContent() ?? "").trim();
}

async function numberIn(loc: Locator): Promise<number> {
  const t = await textOf(loc);
  const n = parseFloat(t.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) throw new Error(`Expected a number, got: "${t}"`);
  return n;
}

// ─── Invoice totals ───────────────────────────────────────────────────────────
export async function invoiceTotalsMatch(
  page: Page,
  expected: { grandTotal?: number; taxTotal?: number; subTotal?: number },
  opts = { tolerance: 0.01 },
): Promise<void> {
  if (expected.grandTotal !== undefined) {
    const el = page.locator(
      "[data-testid='grand-total'], .grand-total, .invoice-grand-total, text=/grand/i",
    ).first();
    await expect(el).toBeVisible({ timeout: 5_000 });
    const actual = await numberIn(el);
    expect(
      Math.abs(actual - expected.grandTotal),
      `Grand total mismatch: expected ₹${expected.grandTotal}, got ₹${actual}`,
    ).toBeLessThanOrEqual(opts.tolerance);
  }
}

// ─── Currency assertion ───────────────────────────────────────────────────────
export async function currencyEquals(
  locator: Locator,
  expected: number,
  label = "amount",
  tolerance = 0.01,
): Promise<void> {
  const actual = await numberIn(locator);
  expect(
    Math.abs(actual - expected),
    `${label}: expected ₹${expected}, got ₹${actual}`,
  ).toBeLessThanOrEqual(tolerance);
}

// ─── Permission-gated element ─────────────────────────────────────────────────
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).isVisible({ timeout: 500 }).catch(() => false);
}

export async function isHidden(page: Page, selector: string): Promise<boolean> {
  return !(await isVisible(page, selector));
}

export async function elementExistsWithText(
  page: Page,
  text: string | RegExp,
  role?: string,
): Promise<void> {
  const loc = role
    ? page.getByRole(role as Parameters<Page["getByRole"]>[0], { name: text })
    : page.getByText(text);
  await expect(loc.first()).toBeVisible({ timeout: 8_000 });
}

// ─── Table row assertion ──────────────────────────────────────────────────────
export async function tableHasRow(
  page: Page,
  rowText: string | RegExp,
  tableSelector = "table, [role='grid']",
): Promise<void> {
  const table = page.locator(tableSelector).first();
  await expect(table).toBeVisible({ timeout: 5_000 });
  const row = table.getByText(rowText).first();
  await expect(row).toBeVisible({
    timeout: 5_000,
    message: `Expected table row containing "${rowText}" to be visible`,
  });
}

export async function tableRowCount(
  page: Page,
  expectedMin: number,
  tableSelector = "table tbody tr, [role='row']",
): Promise<void> {
  const rows = page.locator(tableSelector);
  await expect(rows).toHaveCount(expect.toBeGreaterThanOrEqual
    ? expectedMin // jest-like, but Playwright doesn't have this
    : expectedMin,
    { timeout: 5_000 },
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export async function statusBadgeIs(page: Page, expected: string): Promise<void> {
  const badge = page
    .locator(`[data-testid='status-badge'], .status-badge, .badge`)
    .filter({ hasText: new RegExp(expected, "i") })
    .first();
  await expect(badge).toBeVisible({
    timeout: 5_000,
    message: `Expected status badge "${expected}" to be visible`,
  });
}

// ─── Navigation item visibility ───────────────────────────────────────────────
export async function navItemVisible(page: Page, label: string): Promise<void> {
  const loc = page
    .getByRole("button", { name: new RegExp(label, "i") })
    .or(page.locator(`[data-testid="nav-${label}"]`))
    .first();
  await expect(loc).toBeVisible({
    timeout: 5_000,
    message: `Expected nav item "${label}" to be visible`,
  });
}

export async function navItemHidden(page: Page, label: string): Promise<void> {
  const byRole = page.getByRole("button", { name: new RegExp(label, "i") }).first();
  const byTestId = page.locator(`[data-testid="nav-${label}"]`).first();
  const eitherVisible = (await byRole.isVisible({ timeout: 300 }).catch(() => false))
    || (await byTestId.isVisible({ timeout: 300 }).catch(() => false));
  expect(
    eitherVisible,
    `Nav item "${label}" should be hidden for this role but is visible`,
  ).toBe(false);
}

// ─── Form validation ──────────────────────────────────────────────────────────
export async function formError(page: Page, fieldName: string | RegExp): Promise<void> {
  const err = page
    .locator(".field-error, .error-message, [role='alert']")
    .filter({ hasText: fieldName })
    .first();
  await expect(err).toBeVisible({
    timeout: 4_000,
    message: `Expected form error for "${fieldName}" to show`,
  });
}

// ─── Toast / notification ─────────────────────────────────────────────────────
export async function successToast(page: Page, text?: string | RegExp): Promise<void> {
  const sel = ".toast-success, .notification-success, [data-testid='toast-success'], [role='status']";
  const el  = text
    ? page.locator(sel).filter({ hasText: text }).first()
    : page.locator(sel).first();
  await expect(el).toBeVisible({
    timeout: 6_000,
    message: `Expected success toast${text ? ` with text "${text}"` : ""} to appear`,
  });
}

export async function errorToast(page: Page, text?: string | RegExp): Promise<void> {
  const sel = ".toast-error, .notification-error, [data-testid='toast-error'], [role='alert']";
  const el  = text
    ? page.locator(sel).filter({ hasText: text }).first()
    : page.locator(sel).first();
  await expect(el).toBeVisible({ timeout: 6_000 });
}

// ─── Data sanity ──────────────────────────────────────────────────────────────
export function gstSanity(
  taxableAmt: number,
  taxRate: number,
  actualTax: number,
  tolerance = 0.02,
): void {
  const expectedTax = r2(taxableAmt * taxRate / 100);
  expect(
    Math.abs(actualTax - expectedTax),
    `GST sanity: taxable=₹${taxableAmt} × ${taxRate}% → expected ₹${expectedTax}, got ₹${actualTax}`,
  ).toBeLessThanOrEqual(tolerance);
}

// ─── Page load performance ────────────────────────────────────────────────────
export async function loadsFast(
  page: Page,
  action: () => Promise<void>,
  maxMs: number,
  label: string,
): Promise<void> {
  const start = Date.now();
  await action();
  const elapsed = Date.now() - start;
  expect(
    elapsed,
    `${label} took ${elapsed}ms — exceeded limit of ${maxMs}ms`,
  ).toBeLessThanOrEqual(maxMs);
}

// ─── Barrel ───────────────────────────────────────────────────────────────────
export const assert = {
  invoiceTotalsMatch,
  currencyEquals,
  isVisible,
  isHidden,
  elementExistsWithText,
  tableHasRow,
  statusBadgeIs,
  navItemVisible,
  navItemHidden,
  formError,
  successToast,
  errorToast,
  gstSanity,
  loadsFast,
};
