/**
 * Performance Smoke Test Suite — 8 tests for load-time benchmarks.
 *
 * Tests: page-load-2s, invoice-list-1s, customer-search-500ms,
 *        barcode-search-200ms, 50-customer-render, 100-product-search,
 *        sync-dashboard-load, report-generation
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN } from "../../fixtures/testData.js";
import { factory } from "../../fixtures/factory.js";

// Generate large datasets for render tests
const MANY_CUSTOMERS = Array.from({ length: 50 }, () => factory.customer());
const MANY_PRODUCTS  = Array.from({ length: 100 }, () => factory.product());

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:       CTX_ADMIN,
    customers: MANY_CUSTOMERS,
    products:  MANY_PRODUCTS,
  });
});

// ── T-PERF-01: App shell loads within 2 seconds ───────────────────────────────
test("T-PERF-01: app shell navigation loads within 2000ms", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(2000);
});

// ── T-PERF-02: Invoice list renders within 1 second ──────────────────────────
test("T-PERF-02: billing invoice list returns within 1000ms", async ({ page }) => {
  await page.goto("/");
  const start = Date.now();
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.billing.invoice.list("t-1", "s-1");
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(1000);
});

// ── T-PERF-03: Customer search within 500ms ───────────────────────────────────
test("T-PERF-03: customer search returns within 500ms", async ({ page }) => {
  await page.goto("/");
  const start = Date.now();
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.list("t-1", "s-1", { search: "Kumar" });
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(500);
});

// ── T-PERF-04: Barcode search within 200ms ───────────────────────────────────
test("T-PERF-04: product barcode lookup returns within 200ms", async ({ page }) => {
  await page.goto("/");
  const start = Date.now();
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.billing.products.search("t-1", "s-1", "ANY-BARCODE");
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(200);
});

// ── T-PERF-05: 50-customer list rendered correctly ───────────────────────────
test("T-PERF-05: 50 customers are all returned from the list", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.list("t-1", "s-1", { limit: 100 });
  }) as { items: unknown[]; total: number };
  expect(result.total).toBeGreaterThanOrEqual(50);
  expect(result.items.length).toBeGreaterThanOrEqual(50);
});

// ── T-PERF-06: 100-product list rendered correctly ───────────────────────────
test("T-PERF-06: 100 products are all returned from the list", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.list("t-1", "s-1", { limit: 200 });
  }) as { items: unknown[]; total: number };
  expect(result.total).toBeGreaterThanOrEqual(100);
  expect(result.items.length).toBeGreaterThanOrEqual(100);
});

// ── T-PERF-07: Sync dashboard load ───────────────────────────────────────────
test("T-PERF-07: sync.getStatus resolves within 500ms", async ({ page }) => {
  await page.goto("/");
  const start = Date.now();
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(500);
});

// ── T-PERF-08: Report generation within 1 second ────────────────────────────
test("T-PERF-08: reports.dashboard resolves within 1000ms", async ({ page }) => {
  await page.goto("/");
  const start = Date.now();
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.dashboard("t-1", "s-1");
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(1000);
});
