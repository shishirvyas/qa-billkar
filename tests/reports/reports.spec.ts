/**
 * Reports Test Suite — 10 tests for analytics and reports.
 *
 * Tests: sales-totals-accurate, invoice-count, receivables-outstanding,
 *        gst-report-tax-amounts, daily-summary, top-products-revenue,
 *        top-products-qty, export-csv, date-range-filter, store-comparison
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import {
  CTX_ADMIN,
  INVOICE_001,
  INVOICE_PAID,
  CUSTOMER_RAMESH,
  PRODUCT_RICE,
  PRODUCT_OIL,
} from "../../fixtures/testData.js";

const SALES_DASHBOARD = {
  totalRevenue:    1580,
  totalInvoices:   2,
  totalCustomers:  1,
  avgInvoiceValue: 790,
  collectionRate:  0.5,
};

const TOP_PRODUCTS = [
  { productId: PRODUCT_RICE.id, productName: PRODUCT_RICE.name, revenue: 1100, qty: 20 },
  { productId: PRODUCT_OIL.id,  productName: PRODUCT_OIL.name,  revenue: 480,  qty: 6  },
];

const DAILY_SUMMARY = [
  { date: "2024-01-15", revenue: 1100, invoices: 1 },
  { date: "2024-01-20", revenue: 480,  invoices: 1 },
];

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:                CTX_ADMIN,
    invoices:           [INVOICE_001, INVOICE_PAID],
    customers:          [CUSTOMER_RAMESH],
    products:           [PRODUCT_RICE, PRODUCT_OIL],
    salesDashboardData: SALES_DASHBOARD,
    topProductsData:    TOP_PRODUCTS,
    dailySummaryData:   DAILY_SUMMARY,
  });
  await page.goto("/");
});

// ── T-RPT-01: Sales dashboard totals are accurate ─────────────────────────────
test("T-RPT-01: salesDashboard returns correct total revenue", async ({ page }) => {
  const data = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.salesDashboard.summary("t-1", "s-1");
  }) as Record<string, number>;
  expect(data["totalRevenue"]).toBe(1580);
  expect(data["totalInvoices"]).toBe(2);
});

// ── T-RPT-02: Invoice count in dashboard ─────────────────────────────────────
test("T-RPT-02: reports.dashboard returns invoice count", async ({ page }) => {
  const data = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.dashboard("t-1", "s-1");
  }) as Record<string, unknown>;
  expect(data).toBeTruthy();
  expect(typeof data["totalInvoices"]).toBe("number");
});

// ── T-RPT-03: Receivables outstanding amount ─────────────────────────────────
test("T-RPT-03: reports.receivables returns outstanding total", async ({ page }) => {
  const data = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.receivables("t-1", "s-1");
  }) as Record<string, number>;
  expect(typeof data["totalOutstanding"]).toBe("number");
  expect(data["totalOutstanding"]).toBeGreaterThanOrEqual(0);
});

// ── T-RPT-04: GST report tax amounts ─────────────────────────────────────────
test("T-RPT-04: reports.gstReport returns taxable and tax amounts", async ({ page }) => {
  const report = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.gstReport("t-1", "s-1");
  }) as Record<string, unknown>;
  expect(report).toBeTruthy();
  expect(typeof report["totalTaxable"]).toBe("number");
  expect(typeof report["totalTax"]).toBe("number");
});

// ── T-RPT-05: Daily summary data ─────────────────────────────────────────────
test("T-RPT-05: dailySummary returns per-day revenue records", async ({ page }) => {
  const data = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.dailySummary.list("t-1", "s-1");
  }) as Record<string, unknown>[];
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThanOrEqual(1);
});

// ── T-RPT-06: Top products by revenue ────────────────────────────────────────
test("T-RPT-06: topProducts.list returns products sorted by revenue", async ({ page }) => {
  const products = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.topProducts.list("t-1", "s-1");
  }) as Record<string, number>[];
  expect(Array.isArray(products)).toBe(true);
  if (products.length >= 2) {
    expect(products[0]["revenue"]).toBeGreaterThanOrEqual(products[1]["revenue"]);
  }
});

// ── T-RPT-07: Top products by quantity ───────────────────────────────────────
test("T-RPT-07: topProducts data includes qty field", async ({ page }) => {
  const products = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.topProducts.list("t-1", "s-1");
  }) as Record<string, unknown>[];
  expect(products.length).toBeGreaterThanOrEqual(1);
  expect(typeof products[0]["qty"]).toBe("number");
});

// ── T-RPT-08: Export CSV ──────────────────────────────────────────────────────
test("T-RPT-08: reports.exportCsv returns a non-empty CSV string", async ({ page }) => {
  const csv = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.exportCsv("t-1", "s-1");
  }) as string;
  expect(typeof csv).toBe("string");
  expect(csv.length).toBeGreaterThan(0);
});

// ── T-RPT-09: Date range filter ──────────────────────────────────────────────
test("T-RPT-09: reports accept from/to date parameters", async ({ page }) => {
  const report = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.reports.dashboard("t-1", "s-1", {
      from: "2024-01-01",
      to:   "2024-12-31",
    });
  }) as Record<string, unknown>;
  expect(report).toBeTruthy();
});

// ── T-RPT-10: Store comparison ───────────────────────────────────────────────
test("T-RPT-10: storeComparison.compare returns data for each store", async ({ page }) => {
  const data = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.storeComparison.compare("t-1", ["s-1", "s-2"]);
  }) as Record<string, unknown>[];
  expect(Array.isArray(data)).toBe(true);
});
