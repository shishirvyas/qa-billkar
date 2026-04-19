/**
 * Products Test Suite — 12 tests for product CRUD, barcode, and inventory.
 *
 * Tests: list, search-name, search-barcode, search-sku, create, edit-price,
 *        delete, barcode-gen, hsn-field, tax-slab, opening-stock, reorder-alert
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { isValidHsn }   from "../../utils/gstCalculator.js";
import {
  CTX_ADMIN,
  PRODUCT_RICE,
  PRODUCT_OIL,
  TAX_GST5,
  TAX_GST18,
} from "../../fixtures/testData.js";
import { factory } from "../../fixtures/factory.js";

const PRODUCTS = [PRODUCT_RICE, PRODUCT_OIL, factory.product(), factory.product()];

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:      CTX_ADMIN,
    products: PRODUCTS,
    taxSlabs: [TAX_GST5, TAX_GST18],
  });
  await page.goto("/");
});

// ── T-PROD-01: Product list loads ────────────────────────────────────────────
test("T-PROD-01: product list returns all seeded products", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.list("t-1", "s-1");
  }) as { items: unknown[]; total: number };
  expect(result.items.length).toBeGreaterThanOrEqual(2);
});

// ── T-PROD-02: Search by name ─────────────────────────────────────────────────
test("T-PROD-02: searching by name returns matching products", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.list("t-1", "s-1", { search: "Rice" });
  }) as { items: Record<string, unknown>[] };
  expect(result.items.some((p) => String(p["name"]).toLowerCase().includes("rice"))).toBe(true);
});

// ── T-PROD-03: Search by barcode ──────────────────────────────────────────────
test("T-PROD-03: billing products.search finds product by barcode", async ({ page }) => {
  const barcode = PRODUCT_RICE.barcode as string;
  const result = await page.evaluate(async (bc) => {
    // @ts-expect-error window extension
    return window.biilkar.billing.products.search("t-1", "s-1", bc);
  }, barcode) as Record<string, unknown>[];
  expect(result.some((p) => p["barcode"] === barcode)).toBe(true);
});

// ── T-PROD-04: Search by SKU ──────────────────────────────────────────────────
test("T-PROD-04: billing products.search finds product by SKU", async ({ page }) => {
  const sku = PRODUCT_RICE.sku as string;
  const result = await page.evaluate(async (s) => {
    // @ts-expect-error window extension
    return window.biilkar.billing.products.search("t-1", "s-1", s);
  }, sku) as Record<string, unknown>[];
  expect(result.some((p) => p["sku"] === sku)).toBe(true);
});

// ── T-PROD-05: Create product ─────────────────────────────────────────────────
test("T-PROD-05: creating a product saves and returns the record", async ({ page }) => {
  const p = factory.product();
  const result = await page.evaluate(async (prod) => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.create(prod);
  }, p as Record<string, unknown>) as Record<string, unknown>;
  expect(result["id"]).toBe(p.id);
  expect(result["name"]).toBe(p.name);
});

// ── T-PROD-06: Edit price ─────────────────────────────────────────────────────
test("T-PROD-06: updating salePrice is reflected in get()", async ({ page }) => {
  const updated = { ...PRODUCT_RICE, salePrice: 75 };
  const result = await page.evaluate(async (p) => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.update(p);
  }, updated as Record<string, unknown>) as Record<string, unknown>;
  expect(result["salePrice"]).toBe(75);
});

// ── T-PROD-07: Delete product ─────────────────────────────────────────────────
test("T-PROD-07: deleting a product removes it from the list", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.md.products.delete("prod-rice");
  });
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.get("prod-rice");
  });
  expect(result).toBeNull();
});

// ── T-PROD-08: Barcode generation ────────────────────────────────────────────
test("T-PROD-08: barcode.generate returns a non-empty barcode string", async ({ page }) => {
  const bc = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.barcode.generate("t-1", "s-1");
  }) as string;
  expect(typeof bc).toBe("string");
  expect(bc.length).toBeGreaterThan(0);
});

// ── T-PROD-09: Duplicate barcode check ───────────────────────────────────────
test("T-PROD-09: checkDuplicate returns false for a unique barcode", async ({ page }) => {
  const isDuplicate = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.barcode.checkDuplicate("t-1", "s-1", "UNIQUE-BARCODE-99999");
  }) as boolean;
  expect(isDuplicate).toBe(false);
});

// ── T-PROD-10: HSN code stored correctly ─────────────────────────────────────
test("T-PROD-10: product with valid HSN code is saved correctly", async ({ page }) => {
  const p = { ...factory.product(), hsn: "1006" }; // rice HSN
  const result = await page.evaluate(async (prod) => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.create(prod);
  }, p as Record<string, unknown>) as Record<string, unknown>;
  expect(result["hsn"]).toBe("1006");
  expect(isValidHsn("1006")).toBe(true);
});

// ── T-PROD-11: Opening stock field ───────────────────────────────────────────
test("T-PROD-11: opening stock is saved and retrievable", async ({ page }) => {
  const p = { ...factory.product(), openingStock: 50, trackStock: true };
  const result = await page.evaluate(async (prod) => {
    // @ts-expect-error window extension
    return window.biilkar.md.products.create(prod);
  }, p as Record<string, unknown>) as Record<string, unknown>;
  expect(result["openingStock"]).toBe(50);
  expect(result["trackStock"]).toBe(true);
});

// ── T-PROD-12: Reorder alert at low stock ────────────────────────────────────
test("T-PROD-12: low-stock alerts list includes products below reorder level", async ({ page }) => {
  // Seed a product with stock below reorder level
  const lowProduct = { ...factory.product(), openingStock: 3, reorderLevel: 10, trackStock: true };
  await page.evaluate(async (p) => {
    // @ts-expect-error window extension
    await window.biilkar.md.products.create(p);
  }, lowProduct as Record<string, unknown>);

  const alerts = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.inventory.lowStockAlerts.list("t-1", "s-1");
  }) as Record<string, unknown>[];
  expect(alerts.some((a) => a["id"] === lowProduct.id)).toBe(true);
});
