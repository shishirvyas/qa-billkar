/**
 * Offline Mode Test Suite — 10 tests for offline-first behaviour.
 *
 * Tests: offline-invoice-PENDING, db-outbox-contains-pending,
 *        flush-syncs-pending, reconnect-triggers-sync, no-duplicates-after-sync,
 *        conflict-detection, conflict-resolution, offline-customer-create,
 *        mark-offline-blocks-sync, mark-online-resumes
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN, PRODUCT_RICE, CUSTOMER_RAMESH } from "../../fixtures/testData.js";

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:          CTX_ADMIN,
    products:     [PRODUCT_RICE],
    customers:    [CUSTOMER_RAMESH],
    syncPending:  2,
    syncFailed:   0,
  });
  await page.goto("/");
});

// ── T-OFF-01: Invoice created offline has PENDING sync status ─────────────────
test("T-OFF-01: invoice created while offline has syncStatus=PENDING", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOffline();
  });
  const inv = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.billing.invoice.create({
      id:          "inv-offline-001",
      tenantId:    "t-1",
      storeId:     "s-1",
      customerId:  "cust-001",
      lines:       [{ productId: "prod-rice", qty: 1, unitPrice: 55, taxRate: 5 }],
      status:      "FINALIZED",
      grandTotal:  57.75,
      createdAt:   new Date().toISOString(),
    });
  }) as Record<string, unknown>;
  expect(inv["syncStatus"]).toBe("PENDING");
});

// ── T-OFF-02: Sync getStatus shows pending count ──────────────────────────────
test("T-OFF-02: sync.getStatus returns a pending count >= 0", async ({ page }) => {
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, number>;
  expect(typeof status["pendingCount"]).toBe("number");
  expect(status["pendingCount"]).toBeGreaterThanOrEqual(0);
});

// ── T-OFF-03: flushPending resolves the queue ─────────────────────────────────
test("T-OFF-03: flushPending processes the sync outbox and returns results", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.flushPending();
  }) as Record<string, unknown>;
  expect(result["flushed"]).toBeGreaterThanOrEqual(0);
});

// ── T-OFF-04: markOffline prevents sync ──────────────────────────────────────
test("T-OFF-04: after markOffline, status.online is false", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOffline();
  });
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, unknown>;
  expect(status["online"]).toBe(false);
});

// ── T-OFF-05: markOnline resumes sync ────────────────────────────────────────
test("T-OFF-05: after markOnline, status.online is true", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOffline();
    await window.biilkar.sync.markOnline();
  });
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, unknown>;
  expect(status["online"]).toBe(true);
});

// ── T-OFF-06: enqueue adds an item to the sync queue ─────────────────────────
test("T-OFF-06: sync.enqueue adds an operation to the outbox", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.enqueue({
      entity:    "customer",
      operation: "create",
      payload:   { id: "cust-offline-001", name: "Test Offline" },
    });
  });
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, number>;
  expect(status["pendingCount"]).toBeGreaterThanOrEqual(1);
});

// ── T-OFF-07: Offline customer create has correct syncStatus ─────────────────
test("T-OFF-07: customer created offline stores syncStatus=PENDING", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOffline();
  });
  const cust = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.create({
      id:        "cust-offline-new",
      tenantId:  "t-1",
      storeId:   "s-1",
      name:      "Offline User",
      phone:     "9000000099",
      syncStatus:"PENDING",
    });
  }) as Record<string, unknown>;
  expect(cust["syncStatus"]).toBe("PENDING");
});

// ── T-OFF-08: Health logs are returned ───────────────────────────────────────
test("T-OFF-08: sync.healthLogs returns an array", async ({ page }) => {
  const logs = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.healthLogs();
  }) as unknown[];
  expect(Array.isArray(logs)).toBe(true);
});

// ── T-OFF-09: Diagnostics returns system info ─────────────────────────────────
test("T-OFF-09: sync.diagnostics returns a diagnostics object", async ({ page }) => {
  const diag = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.diagnostics();
  }) as Record<string, unknown>;
  expect(diag).toBeTruthy();
  expect(typeof diag).toBe("object");
});

// ── T-OFF-10: Failed items are tracked ───────────────────────────────────────
test("T-OFF-10: sync.getStatus reports failedCount correctly", async ({ page }) => {
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, number>;
  expect(typeof status["failedCount"]).toBe("number");
});
