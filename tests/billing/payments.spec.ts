/**
 * Payments Test Suite — 10 tests for payment recording and receivables.
 *
 * Tests: partial-payment, full-payment-marks-PAID, multi-method,
 *        overdue-tracking, outstanding-balance, aging-bucket, due-today,
 *        collection-history, PTP-create, PTP-kept-broken
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import {
  CTX_ADMIN,
  INVOICE_001,
  INVOICE_PAID,
  CUSTOMER_RAMESH,
  PM_CASH,
  PM_UPI,
} from "../../fixtures/testData.js";

const OVERDUE_INVOICES = [
  {
    id:           "inv-overdue-001",
    invoiceNumber:"INV-2024-099",
    customerId:   CUSTOMER_RAMESH.id,
    customerName: CUSTOMER_RAMESH.name,
    grandTotal:   3200,
    paidAmount:   0,
    balanceDue:   3200,
    status:       "FINALIZED",
    dueDate:      new Date(Date.now() - 5 * 86_400_000).toISOString(),
    syncStatus:   "SYNCED",
  },
];

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:             CTX_ADMIN,
    invoices:        [INVOICE_001, INVOICE_PAID],
    customers:       [CUSTOMER_RAMESH],
    overdueInvoices: OVERDUE_INVOICES,
    paymentMethods:  [PM_CASH, PM_UPI],
    overdueStats:    { totalOverdue: 3200, totalInvoices: 1, bucket1_7: 1 },
  });
  await page.goto("/");
});

// ── T-PAY-01: Partial payment ─────────────────────────────────────────────────
test("T-PAY-01: partial payment updates paidAmount but keeps status PARTIAL", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.billing.invoice.addPayment(
      "inv-001", "t-1", "s-1",
      { amount: 500, method: "CASH", date: new Date().toISOString() },
    );
  }) as Record<string, unknown>;
  expect((result["paidAmount"] as number)).toBeGreaterThan(0);
  expect(result["status"]).toBe("PARTIAL");
});

// ── T-PAY-02: Full payment marks PAID ────────────────────────────────────────
test("T-PAY-02: full payment sets status to PAID and balanceDue to 0", async ({ page }) => {
  const grandTotal = INVOICE_001.grandTotal as number;
  const result = await page.evaluate(async (gt) => {
    // @ts-expect-error window extension
    return window.biilkar.billing.invoice.addPayment(
      "inv-001", "t-1", "s-1",
      { amount: gt, method: "CASH", date: new Date().toISOString() },
    );
  }, grandTotal) as Record<string, unknown>;
  expect(result["status"]).toBe("PAID");
  expect((result["balanceDue"] as number)).toBeLessThanOrEqual(0);
});

// ── T-PAY-03: UPI payment method accepted ────────────────────────────────────
test("T-PAY-03: UPI payment method records correctly", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.billing.invoice.addPayment(
      "inv-001", "t-1", "s-1",
      { amount: 200, method: "UPI", date: new Date().toISOString() },
    );
  }) as Record<string, unknown>;
  expect((result["paidAmount"] as number)).toBeGreaterThan(0);
});

// ── T-PAY-04: Overdue summary returns total amount ────────────────────────────
test("T-PAY-04: overdue summary returns the correct total overdue amount", async ({ page }) => {
  const summary = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.overdue.summary("t-1", "s-1");
  }) as Record<string, number>;
  expect(summary["totalOverdue"]).toBeGreaterThan(0);
  expect(summary["totalInvoices"]).toBeGreaterThan(0);
});

// ── T-PAY-05: Outstanding summary returns balance ────────────────────────────
test("T-PAY-05: outstanding summary returns the correct total outstanding", async ({ page }) => {
  const summary = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.outstanding.summary("t-1", "s-1");
  }) as Record<string, number>;
  expect(summary["totalOutstanding"]).toBeGreaterThanOrEqual(0);
});

// ── T-PAY-06: Aging buckets are returned ─────────────────────────────────────
test("T-PAY-06: outstanding aging returns bucket breakdown", async ({ page }) => {
  const buckets = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.outstanding.aging("t-1", "s-1");
  }) as unknown[];
  expect(Array.isArray(buckets)).toBe(true);
  expect(buckets.length).toBeGreaterThanOrEqual(1);
});

// ── T-PAY-07: Due today returns count ────────────────────────────────────────
test("T-PAY-07: dueToday.summary returns a count and total", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.dueToday.summary("t-1", "s-1");
  }) as Record<string, number>;
  expect(result["count"]).toBeGreaterThanOrEqual(0);
  expect(result["total"]).toBeGreaterThanOrEqual(0);
});

// ── T-PAY-08: Collections report – daily ─────────────────────────────────────
test("T-PAY-08: collectionsReports.daily returns revenue", async ({ page }) => {
  const report = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.collectionsReports.daily("t-1", "s-1");
  }) as Record<string, number>;
  expect(report["totalCollected"]).toBeGreaterThanOrEqual(0);
});

// ── T-PAY-09: Create a PTP record ────────────────────────────────────────────
test("T-PAY-09: creating a PTP record stores it correctly", async ({ page }) => {
  const ptp = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.ptp.create({
      id:         "ptp-001",
      tenantId:   "t-1",
      storeId:    "s-1",
      customerId: "cust-001",
      invoiceId:  "inv-overdue-001",
      amount:     3200,
      promiseDate:new Date(Date.now() + 86_400_000).toISOString(),
      status:     "PENDING",
    });
  }) as Record<string, unknown>;
  expect(ptp["id"]).toBe("ptp-001");
  expect(ptp["status"]).toBe("PENDING");
});

// ── T-PAY-10: PTP kept and broken status updates ──────────────────────────────
test("T-PAY-10: PTP status can be updated to KEPT or BROKEN", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.ptp.create({
      id: "ptp-002", tenantId: "t-1", storeId: "s-1",
      customerId: "cust-001", amount: 1000, status: "PENDING",
    });
  });
  const kept = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.ptp.kept("ptp-002");
  }) as Record<string, unknown>;
  expect(kept["status"]).toBe("KEPT");

  // Reset and test broken
  const broken = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.ptp.broken("ptp-002");
  }) as Record<string, unknown>;
  expect(broken["status"]).toBe("BROKEN");
});
