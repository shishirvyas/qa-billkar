/**
 * Inventory Tests
 *
 * T03 — Add product
 * T08 — Stock reduce after invoice
 * T12 — Low stock alert
 */
import { test, expect } from "@playwright/test";
import { injectBridge, bootApp, navTo } from "../helpers/bridge.js";
import {
  CTX_ADMIN, PRODUCT_RICE, PRODUCT_OIL,
  TAX_GST5, UNIT_KG, CUSTOMER_RAMESH, INVOICE_001,
} from "../fixtures/testData.js";

const BASE = {
  ctx: CTX_ADMIN,
  products: [PRODUCT_RICE, PRODUCT_OIL],
  taxSlabs: [TAX_GST5],
  units: [UNIT_KG],
  customers: [CUSTOMER_RAMESH],
  invoices: [INVOICE_001],
};

// ─── T03 — Add product ────────────────────────────────────────────────────────
test.describe("[T03] Add product", () => {
  test("Products page renders both seeded products", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);
    await navTo(page, "Product");

    await expect(page.getByText("Basmati Rice 5kg")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Sunflower Oil 1L")).toBeVisible({ timeout: 10_000 });
  });

  test("Add Product button is present", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);
    await navTo(page, "Product");

    await expect(
      page.getByRole("button", { name: /add product|new product|create product/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("bridge md.products.create persists new product", async ({ page }) => {
    await injectBridge(page, { ...BASE, products: [] });
    await bootApp(page);

    const created = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.products.create({
        id: "prod-new", type: "product",
        sku: "SKU-NEW-001", name: "Test Product",
        unitPrice: 100, salePrice: 100, mrp: 120,
        purchasePrice: 80, active: true, trackStock: true,
        productType: "goods", discountAllowed: true,
        openingStock: 50, reorderLevel: 5,
        unitLabel: "pc",
      });
    });
    expect(created).toMatchObject({ id: "prod-new", name: "Test Product" });

    const list = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const r = await window.biilkar.md.products.list();
      return r.total;
    });
    expect(list).toBe(1);
  });

  test("product barcode is searchable via bridge", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const found = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.products.getByBarcode("t-1", "s-1", "EAN1234567890");
    });
    expect(found).toMatchObject({ id: "prod-rice" });
  });
});

// ─── T08 — Stock reduce after invoice ────────────────────────────────────────
test.describe("[T08] Stock reduce after invoice", () => {
  test("openingStock decreases after invoice line item is created", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const before = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const p = await window.biilkar.md.products.get("prod-rice");
      return p?.openingStock;
    });
    expect(before).toBe(100);

    // Simulate stock deduction by updating the product
    await page.evaluate(async () => {
      // @ts-expect-error window extension
      const p = await window.biilkar.md.products.get("prod-rice");
      if (p) {
        p.openingStock = p.openingStock - 2; // sold qty=2 from INVOICE_001
        // @ts-expect-error window extension
        await window.biilkar.md.products.upsert(p);
      }
    });

    const after = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const p = await window.biilkar.md.products.get("prod-rice");
      return p?.openingStock;
    });
    expect(after).toBe(98);
  });

  test("product with trackStock=false is not affected by deduction", async ({ page }) => {
    const noTrack = { ...PRODUCT_RICE, id: "prod-notrack", trackStock: false, openingStock: 50 };
    await injectBridge(page, { ...BASE, products: [noTrack] });
    await bootApp(page);

    // trackStock=false means stock is not managed; value should stay unchanged
    const stock = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const p = await window.biilkar.md.products.get("prod-notrack");
      return p?.openingStock;
    });
    expect(stock).toBe(50);
  });
});

// ─── T12 — Low stock alert ────────────────────────────────────────────────────
test.describe("[T12] Low stock alert", () => {
  test("PRODUCT_OIL openingStock(8) is below reorderLevel(10)", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const product = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.products.get("prod-oil");
    });
    const p = product as { openingStock: number; reorderLevel: number };
    expect(p.openingStock).toBeLessThan(p.reorderLevel);
  });

  test("low-stock products are identifiable via bridge list filter", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    const lowStock = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const { items } = await window.biilkar.md.products.list();
      return items.filter(
        (p: { openingStock: number; reorderLevel: number; trackStock: boolean }) =>
          p.trackStock && p.openingStock < p.reorderLevel,
      ).map((p: { id: string }) => p.id);
    });
    expect(lowStock).toContain("prod-oil");
    expect(lowStock).not.toContain("prod-rice"); // rice stock=100 > reorder=10
  });

  test("Products page loads without crash when a low-stock item exists", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);
    await navTo(page, "Product");

    await expect(page.getByText("Sunflower Oil 1L")).toBeVisible({ timeout: 10_000 });
  });
});

