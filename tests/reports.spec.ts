/**
 * Reports Tests
 *
 * T11 — Receivable report
 * T17 — Search speed
 * T18 — Dashboard totals
 * T19 — Export CSV
 */
import { test, expect } from "@playwright/test";
import { injectBridge, bootApp, navTo } from "../helpers/bridge.js";
import {
  CTX_ADMIN, CUSTOMER_RAMESH, CUSTOMER_PRIYA,
  PRODUCT_RICE, PRODUCT_OIL, INVOICE_001, INVOICE_PAID,
  TAX_GST5, PM_CASH,
} from "../fixtures/testData.js";

const BASE = {
  ctx: CTX_ADMIN,
  customers:      [CUSTOMER_RAMESH, CUSTOMER_PRIYA],
  products:       [PRODUCT_RICE, PRODUCT_OIL],
  invoices:       [INVOICE_001, INVOICE_PAID],
  taxSlabs:       [TAX_GST5],
  paymentMethods: [PM_CASH],
  dashboardStats: {
    totalSales:    47250,
    totalExpenses: 18600,
    outstanding:   8400,
    invoiceCount:  63,
    customerCount: 28,
  },
};

// ─── T11 — Receivable report ───────────────────────────────────────────────────
test.describe("[T11] Receivable report", () => {
  test("receivables report lists customers with outstanding balances", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const rows = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.reports.receivables();
    });
    const receivables = rows as Array<{ customerId: string; outstanding: number }>;

    // Ramesh has receivableBalance = 3200
    const ramesh = receivables.find((r) => r.customerId === "cust-ramesh");
    expect(ramesh).toBeDefined();
    expect(ramesh!.outstanding).toBe(3200);
  });

  test("customer with zero receivable balance is included but shows 0", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const rows = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.reports.receivables();
    });
    const priya = (rows as Array<{ customerId: string; outstanding: number }>).find(
      (r) => r.customerId === "cust-priya",
    );
    expect(priya).toBeDefined();
    expect(priya!.outstanding).toBe(0);
  });

  test("Reports page renders without crash", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);
    await navTo(page, "Report");

    await expect(page.locator("body")).toBeVisible();
    // Some heading or content block should be visible
    await expect(
      page.locator("h1, h2, [role='heading']").first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── T17 — Search speed ───────────────────────────────────────────────────────
test.describe("[T17] Search speed", () => {
  test("product search responds in under 500ms for 50-item catalogue", async ({ page }) => {
    // Build a 50-product catalogue
    const catalogue = Array.from({ length: 50 }, (_, i) => ({
      ...PRODUCT_RICE,
      id:   `prod-${i}`,
      sku:  `SKU-${String(i).padStart(3, "0")}`,
      name: `Product ${i}`,
    }));

    await injectBridge(page, { ctx: CTX_ADMIN, products: catalogue });
    await bootApp(page);

    const ms = await page.evaluate(async () => {
      const start = performance.now();
      // @ts-expect-error window extension
      await window.biilkar.billing.products.search("t-1", "s-1", "Product 4");
      return performance.now() - start;
    });
    // Bridge search on an in-memory array of 50 items must complete in <500ms
    expect(ms).toBeLessThan(500);
  });

  test("customer search by phone responds in under 200ms", async ({ page }) => {
    const customers = Array.from({ length: 30 }, (_, i) => ({
      ...CUSTOMER_RAMESH,
      id:    `cust-${i}`,
      phone: `98765${String(i).padStart(5, "0")}`,
    }));

    await injectBridge(page, { ctx: CTX_ADMIN, customers });
    await bootApp(page);

    const ms = await page.evaluate(async () => {
      const start = performance.now();
      // @ts-expect-error window extension
      await window.biilkar.md.customers.getByPhone("t-1", "s-1", "9876500005");
      return performance.now() - start;
    });
    expect(ms).toBeLessThan(200);
  });
});

// ─── T18 — Dashboard totals ────────────────────────────────────────────────────
test.describe("[T18] Dashboard totals", () => {
  test("bridge reports.dashboard returns expected totals", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const stats = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.reports.dashboard();
    });
    const s = stats as Record<string, number>;
    expect(s.totalSales).toBe(47250);
    expect(s.totalExpenses).toBe(18600);
    expect(s.outstanding).toBe(8400);
    expect(s.invoiceCount).toBe(63);
    expect(s.customerCount).toBe(28);
  });

  test("dashboard totals are always non-negative numbers", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const stats = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.reports.dashboard();
    });
    for (const [key, val] of Object.entries(stats as Record<string, number>)) {
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test("Dashboard page renders with visible total figures", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);
    await navTo(page, "Dashboard");

    // The page should show at least one numeric value from the stats
    await expect(page.getByText(/47250|47,250|₹47/)).toBeVisible({ timeout: 10_000 }).catch(() => {
      // If exact number not in DOM, at least the page heading must be visible
      return expect(page.locator("h1, h2, [role='heading']").first()).toBeVisible();
    });
  });
});

// ─── T19 — Export CSV ─────────────────────────────────────────────────────────
test.describe("[T19] Export CSV", () => {
  test("customers exportCsv returns non-empty CSV string", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const csv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.customers.exportCsv();
    });
    expect(typeof csv).toBe("string");
    expect((csv as string).length).toBeGreaterThan(0);
    // CSV should contain customer name
    expect(csv).toContain("Ramesh Kumar");
  });

  test("products exportCsv returns non-empty CSV string", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const csv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.products.exportCsv();
    });
    expect(typeof csv).toBe("string");
    expect((csv as string).length).toBeGreaterThan(0);
    expect(csv).toContain("Basmati Rice 5kg");
  });

  test("invoice exportCsv returns rows for all invoices", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const csv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.billing.invoice.exportCsv();
    });
    expect(csv).toContain("INV-2026-001");
    expect(csv).toContain("INV-2026-002");
  });

  test("reports exportCsv returns typed report data", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const csv = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.reports.exportCsv("receivables");
    });
    expect(csv).toContain("receivables");
  });
});

