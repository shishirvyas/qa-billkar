import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export interface PurchaseData {
  supplierId?:  string;
  supplierName?: string;
  lines: { productId: string; productName: string; qty: number; costPrice: number }[];
}

export interface TransferData {
  fromStoreId: string;
  toStoreId:   string;
  lines: { productId: string; qty: number }[];
}

export class InventoryPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Inventory");
  }

  /** Open the Stock Ledger view. */
  async openStockLedger(): Promise<void> {
    await this.page
      .getByText(/stock ledger|ledger/i)
      .or(this.page.getByRole("tab", { name: /ledger/i }))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Open the Purchases view. */
  async openPurchases(): Promise<void> {
    await this.page
      .getByText(/purchases?/i)
      .or(this.page.getByRole("tab", { name: /purchase/i }))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Open the Stock Transfer view. */
  async openTransfers(): Promise<void> {
    await this.page
      .getByText(/stock transfer|transfer/i)
      .or(this.page.getByRole("tab", { name: /transfer/i }))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Create a purchase order. */
  async createPurchase(data: PurchaseData): Promise<void> {
    await this.openPurchases();
    const btn = this.page
      .getByRole("button", { name: /new purchase|add purchase|create/i })
      .first();
    await btn.click();
    // Add lines
    for (const line of data.lines) {
      const search = this.page.locator("input[placeholder*='product' i]").last();
      await search.fill(line.productName);
      const opt = this.page.getByText(line.productName, { exact: false }).first();
      await opt.click();
      const qtyInput = this.page.locator("input[type='number']").last();
      await qtyInput.fill(String(line.qty));
    }
    await this.clickButton(/save|create/i);
    await this.waitForLoad();
  }

  /** Initiate a stock transfer between stores. */
  async initiateTransfer(data: TransferData): Promise<void> {
    await this.openTransfers();
    const btn = this.page
      .getByRole("button", { name: /new transfer|initiate/i })
      .first();
    await btn.click();
    for (const line of data.lines) {
      const search = this.page.locator("input[placeholder*='product' i]").last();
      await search.fill(line.productId);
      const qtyInput = this.page.locator("input[type='number']").last();
      await qtyInput.fill(String(line.qty));
    }
    await this.clickButton(/save|send|create/i);
    await this.waitForLoad();
  }

  /** Assert a stock level is displayed for a product. */
  async expectStockLevel(productName: string, qty: number): Promise<void> {
    const row = this.page
      .locator("table tbody tr, [role='row']")
      .filter({ hasText: productName })
      .first();
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(row).toContainText(String(qty));
  }

  /** Assert a low-stock alert row is present. */
  async expectLowStockAlert(productName: string): Promise<void> {
    const row = this.page
      .locator("[data-testid='low-stock-row'], .low-stock-row, tr")
      .filter({ hasText: productName })
      .first();
    await expect(row).toBeVisible({ timeout: 5_000 });
  }
}
