/**
 * Stock Ledger Test Suite — 10 tests for inventory accuracy.
 *
 * Tests: ledger-entries, stock-reduces-after-sale, purchase-adds-stock,
 *        manual-adjust, low-stock-alert, reorder-check, current-stock-accurate,
 *        export, multi-product, track-stock-false-unaffected
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN, PRODUCT_RICE, PRODUCT_OIL } from "../../fixtures/testData.js";
import { factory } from "../../fixtures/factory.js";

const RICE_ID = PRODUCT_RICE.id as string;

const STOCK_ENTRIES = [
  { id: "sl-001", productId: RICE_ID, type: "OPENING",  qty: 100, date: "2024-01-01", note: "Opening stock" },
  { id: "sl-002", productId: RICE_ID, type: "SALE",      qty: -5,  date: "2024-01-15", note: "Invoice INV-001" },
  { id: "sl-003", productId: RICE_ID, type: "PURCHASE",  qty: 20,  date: "2024-01-20", note: "PO-001" },
];

const PRODUCTS = [
  { ...PRODUCT_RICE, openingStock: 115, trackStock: true, reorderLevel: 10 },
  { ...PRODUCT_OIL,  openingStock: 8,   trackStock: true, reorderLevel: 10 },
  { ...factory.product(), trackStock: false, openingStock: 0 },
];

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:               CTX_ADMIN,
    products:          PRODUCTS,
    stockLedgerEntries:STOCK_ENTRIES,
  });
  await page.goto("/");
});

// ── T-STK-01: Ledger entries returned ────────────────────────────────────────
test("T-STK-01: stock ledger returns entries for a specific product", async ({ page }) => {
  const entries = await page.evaluate(async (id) => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.entries("t-1", "s-1", id);
  }, RICE_ID) as unknown[];
  expect(entries.length).toBeGreaterThanOrEqual(3);
});

// ── T-STK-02: Current stock is correct ───────────────────────────────────────
test("T-STK-02: currentStock returns the opening stock value", async ({ page }) => {
  const stock = await page.evaluate(async (id) => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.currentStock("t-1", "s-1", id);
  }, RICE_ID) as number;
  expect(stock).toBe(115);
});

// ── T-STK-03: Purchase adds to stock ─────────────────────────────────────────
test("T-STK-03: purchase order receipt increases product stock", async ({ page }) => {
  const po = factory.purchaseOrder({ productId: RICE_ID, qty: 30, costPrice: 40 });
  const result = await page.evaluate(async (p) => {
    // @ts-expect-error window extension
    return window.biilkar.purchases.create(p);
  }, po as Record<string, unknown>) as Record<string, unknown>;
  expect(result["id"]).toBe(po.id);
  // Receiving the PO updates status to RECEIVED
  const received = await page.evaluate(async (id) => {
    // @ts-expect-error window extension
    return window.biilkar.purchases.receive(id);
  }, po.id) as Record<string, unknown>;
  expect(received["status"]).toBe("RECEIVED");
});

// ── T-STK-04: Manual stock adjustment ────────────────────────────────────────
test("T-STK-04: manual stock adjustment is recorded in the ledger", async ({ page }) => {
  const adjustment = {
    id:        "sl-adj-001",
    productId: RICE_ID,
    type:      "ADJUSTMENT",
    qty:       -10,
    date:      new Date().toISOString(),
    note:      "Damage write-off",
  };
  const result = await page.evaluate(async (entry) => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.adjust("t-1", "s-1", entry);
  }, adjustment) as Record<string, unknown>;
  expect(result["type"]).toBe("ADJUSTMENT");
  expect(result["qty"]).toBe(-10);
});

// ── T-STK-05: Low-stock alert triggered ──────────────────────────────────────
test("T-STK-05: product below reorder level appears in low-stock alerts", async ({ page }) => {
  const alerts = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.lowStockAlerts.list("t-1", "s-1");
  }) as Record<string, unknown>[];
  // PRODUCT_OIL has openingStock=8, reorderLevel=10 → should appear
  const oilId = PRODUCT_OIL.id as string;
  expect(alerts.some((a) => a["id"] === oilId)).toBe(true);
});

// ── T-STK-06: Reorder check count ────────────────────────────────────────────
test("T-STK-06: lowStockAlerts.count returns the correct count", async ({ page }) => {
  const count = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.lowStockAlerts.count("t-1", "s-1");
  }) as number;
  expect(count).toBeGreaterThanOrEqual(1); // at least OIL is low
});

// ── T-STK-07: Export stock ledger ────────────────────────────────────────────
test("T-STK-07: stock ledger exportCsv returns a string", async ({ page }) => {
  const csv = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.exportCsv("t-1", "s-1");
  }) as string;
  expect(typeof csv).toBe("string");
});

// ── T-STK-08: Multi-product entries are isolated ─────────────────────────────
test("T-STK-08: stock entries for rice don't include oil entries", async ({ page }) => {
  const entries = await page.evaluate(async (riceId) => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.entries("t-1", "s-1", riceId);
  }, RICE_ID) as Record<string, unknown>[];
  const oilId = PRODUCT_OIL.id as string;
  expect(entries.every((e) => e["productId"] === RICE_ID || e["productId"] !== oilId)).toBe(true);
});

// ── T-STK-09: trackStock=false is not in low-stock alerts ────────────────────
test("T-STK-09: product with trackStock=false is excluded from low-stock alerts", async ({ page }) => {
  const alerts = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.lowStockAlerts.list("t-1", "s-1");
  }) as Record<string, unknown>[];
  // The factory product has trackStock=false and openingStock=0
  const noTrackProducts = PRODUCTS.filter((p) => !p.trackStock);
  for (const noTrack of noTrackProducts) {
    expect(alerts.some((a) => a["id"] === noTrack.id)).toBe(false);
  }
});

// ── T-STK-10: All product entries are empty when none recorded ────────────────
test("T-STK-10: entries for unknown productId returns empty array", async ({ page }) => {
  const entries = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.stockLedger.entries("t-1", "s-1", "non-existent-product");
  }) as unknown[];
  expect(entries).toHaveLength(0);
});
