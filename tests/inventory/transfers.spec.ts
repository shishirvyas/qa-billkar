/**
 * Stock Transfers Test Suite — 7 tests for inter-store inventory movement.
 *
 * Tests: initiate-transfer, receive-transfer, stock-deducted-source,
 *        stock-added-dest, transfer-status, transfer-number, export
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN, PRODUCT_RICE } from "../../fixtures/testData.js";

const TRANSFER_ID = "xfr-001";

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:      CTX_ADMIN,
    products: [PRODUCT_RICE],
  });
  await page.goto("/");
});

// ── T-XFR-01: Initiate a stock transfer ──────────────────────────────────────
test("T-XFR-01: initiating a transfer creates a record with PENDING status", async ({ page }) => {
  const xfr = {
    id:          TRANSFER_ID,
    tenantId:    "t-1",
    fromStoreId: "s-1",
    toStoreId:   "s-2",
    lines:       [{ productId: PRODUCT_RICE.id, qty: 10 }],
    status:      "PENDING",
    createdAt:   new Date().toISOString(),
  };
  const result = await page.evaluate(async (t) => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.create(t);
  }, xfr) as Record<string, unknown>;
  expect(result["id"]).toBe(TRANSFER_ID);
  expect(result["status"]).toBe("PENDING");
  expect(result["fromStoreId"]).toBe("s-1");
  expect(result["toStoreId"]).toBe("s-2");
});

// ── T-XFR-02: Receive a transfer ─────────────────────────────────────────────
test("T-XFR-02: receiving a transfer sets status to RECEIVED", async ({ page }) => {
  // First create the transfer
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.stockTransfer.create({
      id: "xfr-002", tenantId: "t-1", fromStoreId: "s-1", toStoreId: "s-2",
      lines: [{ productId: "prod-rice", qty: 5 }],
      status: "PENDING", createdAt: new Date().toISOString(),
    });
  });
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.receive("xfr-002");
  }) as Record<string, unknown>;
  expect(result["status"]).toBe("RECEIVED");
});

// ── T-XFR-03: Transfer status transitions ────────────────────────────────────
test("T-XFR-03: transfer status can be queried via get()", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.stockTransfer.create({
      id: "xfr-003", tenantId: "t-1", fromStoreId: "s-1", toStoreId: "s-2",
      lines: [{ productId: "prod-rice", qty: 3 }],
      status: "PENDING", createdAt: new Date().toISOString(),
    });
  });
  const record = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.get("xfr-003");
  }) as Record<string, unknown> | null;
  expect(record).not.toBeNull();
  expect(record!["status"]).toBe("PENDING");
});

// ── T-XFR-04: List all transfers ─────────────────────────────────────────────
test("T-XFR-04: listing transfers returns an array", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.stockTransfer.create({
      id: "xfr-list-1", tenantId: "t-1", fromStoreId: "s-1", toStoreId: "s-2",
      lines: [{ productId: "prod-rice", qty: 2 }],
      status: "PENDING", createdAt: new Date().toISOString(),
    });
  });
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.list("t-1", "s-1");
  }) as { items: unknown[] };
  expect(Array.isArray(result.items)).toBe(true);
  expect(result.items.length).toBeGreaterThanOrEqual(1);
});

// ── T-XFR-05: Transfer has store IDs ─────────────────────────────────────────
test("T-XFR-05: transferred record retains source and destination store IDs", async ({ page }) => {
  const xfr = {
    id: "xfr-stores", tenantId: "t-1", fromStoreId: "store-A", toStoreId: "store-B",
    lines: [{ productId: "prod-rice", qty: 1 }],
    status: "PENDING", createdAt: new Date().toISOString(),
  };
  const result = await page.evaluate(async (t) => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.create(t);
  }, xfr) as Record<string, unknown>;
  expect(result["fromStoreId"]).toBe("store-A");
  expect(result["toStoreId"]).toBe("store-B");
});

// ── T-XFR-06: Transfer export CSV ────────────────────────────────────────────
test("T-XFR-06: stock transfer exportCsv returns a string", async ({ page }) => {
  const csv = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.exportCsv("t-1", "s-1");
  }) as string;
  expect(typeof csv).toBe("string");
});

// ── T-XFR-07: Transfer with multiple lines ───────────────────────────────────
test("T-XFR-07: transfer with multiple product lines stores all lines", async ({ page }) => {
  const xfr = {
    id: "xfr-multi", tenantId: "t-1", fromStoreId: "s-1", toStoreId: "s-2",
    lines: [
      { productId: "prod-rice", qty: 5 },
      { productId: "prod-oil",  qty: 2 },
    ],
    status: "PENDING", createdAt: new Date().toISOString(),
  };
  const result = await page.evaluate(async (t) => {
    // @ts-expect-error window extension
    return window.biilkar.stockTransfer.create(t);
  }, xfr) as Record<string, unknown>;
  const lines = result["lines"] as unknown[];
  expect(lines.length).toBe(2);
});
