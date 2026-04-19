import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export interface ProductData {
  name:          string;
  sku?:          string;
  barcode?:      string;
  salePrice:     number;
  costPrice?:    number;
  taxSlabId?:    string;
  unitId?:       string;
  hsn?:          string;
  trackStock?:   boolean;
  openingStock?: number;
  reorderLevel?: number;
  categoryId?:   string;
}

export class ProductPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Products");
  }

  /** Open the New Product form. */
  async openNewProductForm(): Promise<void> {
    const btn = this.page
      .locator("[data-testid='new-product']")
      .or(this.page.getByRole("button", { name: /new product|add product/i }))
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Fill and submit the product form. */
  async createProduct(data: ProductData): Promise<void> {
    await this.openNewProductForm();

    await this.fillInput("name",       data.name);
    await this.fillInput("sale price|price", String(data.salePrice));
    if (data.sku)          await this.fillInput("sku",          data.sku);
    if (data.barcode)      await this.fillInput("barcode",      data.barcode);
    if (data.hsn)          await this.fillInput("hsn",          data.hsn);
    if (data.openingStock !== undefined)
      await this.fillInput("opening stock|stock", String(data.openingStock));
    if (data.reorderLevel !== undefined)
      await this.fillInput("reorder|reorder level", String(data.reorderLevel));
    if (data.taxSlabId)
      await this.selectOption("tax|tax slab", data.taxSlabId);
    if (data.unitId)
      await this.selectOption("unit", data.unitId);

    await this.clickButton(/save|create/i);
    await this.waitForLoad();
  }

  /** Search products by name, barcode, or SKU. */
  async search(query: string): Promise<void> {
    const search = this.page
      .locator("[data-testid='product-search'], input[placeholder*='search' i]")
      .first();
    await search.fill(query);
    await this.page.waitForTimeout(400);
  }

  /** Search by barcode specifically. */
  async searchByBarcode(barcode: string): Promise<void> {
    await this.search(barcode);
  }

  /** Click the Generate Barcode button for a product. */
  async generateBarcode(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /generate barcode|gen barcode/i })
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Assert the stock level displays a given quantity. */
  async expectStockLevel(qty: number): Promise<void> {
    const el = this.page
      .locator("[data-testid='stock-level'], [class*='stock']")
      .filter({ hasText: String(qty) })
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
  }

  /** Assert a low-stock / reorder alert is shown. */
  async expectReorderAlert(): Promise<void> {
    const alert = this.page
      .locator("[data-testid='reorder-alert'], .low-stock-badge, [class*='reorder']")
      .first();
    await expect(alert).toBeVisible({ timeout: 5_000 });
  }

  /** Assert product list is not empty. */
  async expectListNotEmpty(): Promise<void> {
    const rows = this.page.locator("table tbody tr, [role='row']");
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
  }
}
