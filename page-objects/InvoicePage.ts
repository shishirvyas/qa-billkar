import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class InvoicePage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Invoices");
  }

  /** Click the New Invoice button. */
  async openNewInvoice(): Promise<void> {
    const btn = this.page
      .locator("[data-testid='new-invoice'], button")
      .filter({ hasText: /new invoice|create invoice/i })
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Add a line item by searching for a product and entering qty. */
  async addLineItem(productName: string, qty = 1, price?: number): Promise<void> {
    // Search for product
    const search = this.page
      .locator("[data-testid='product-search'], input[placeholder*='search' i], input[placeholder*='product' i]")
      .first();
    await search.fill(productName);
    // Wait for autocomplete dropdown
    const option = this.page.getByText(productName, { exact: false }).first();
    await expect(option).toBeVisible({ timeout: 4_000 });
    await option.click();

    // Set quantity
    const qtyInput = this.page
      .locator("[data-testid='line-qty'], input[type='number']")
      .last();
    await qtyInput.fill(String(qty));

    if (price !== undefined) {
      const priceInput = this.page
        .locator("[data-testid='line-price'], input[type='number']")
        .last();
      await priceInput.fill(String(price));
    }
  }

  /** Set a bill-level discount (percentage). */
  async setBillDiscount(pct: number): Promise<void> {
    const discInput = this.page
      .locator("[data-testid='bill-discount'], input[placeholder*='discount' i]")
      .first();
    await discInput.fill(String(pct));
  }

  /** Click Finalise/Finalize invoice. */
  async finalize(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /finalise|finalize/i, exact: false })
      .first();
    await btn.click();
    await this.waitForLoad(10_000);
  }

  /** Click the Void button on an open invoice. */
  async void(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /void|cancel invoice/i, exact: false })
      .first();
    await btn.click();
    // Confirm dialog if present
    const confirm = this.page.getByRole("button", { name: /confirm|yes/i }).first();
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click();
    }
    await this.waitForLoad(6_000);
  }

  /** Add a payment to an invoice. */
  async addPayment(amount: number, method: string): Promise<void> {
    const payBtn = this.page
      .getByRole("button", { name: /record payment|add payment|pay/i, exact: false })
      .first();
    await payBtn.click();

    const amtInput = this.page
      .locator("[data-testid='payment-amount'], input[type='number']")
      .first();
    await amtInput.fill(String(amount));

    const methodSel = this.page
      .locator("[data-testid='payment-method'], select, [role='combobox']")
      .first();
    const hasMethod = await methodSel.isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasMethod) {
      await methodSel.selectOption(method).catch(() =>
        methodSel.fill(method).catch(() => undefined));
    }

    const saveBtn = this.page
      .getByRole("button", { name: /save|record|confirm/i })
      .first();
    await saveBtn.click();
    await this.waitForLoad();
  }

  /** Duplicate the current invoice. */
  async duplicate(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /duplicate|copy/i, exact: false })
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Click Hold Draft to save invoice as draft. */
  async holdAsDraft(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /hold|save draft|draft/i, exact: false })
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Click Print/PDF button. */
  async print(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /print|pdf/i, exact: false })
      .first();
    await btn.click();
  }

  /** Assert the grand total display equals expected amount (tolerance ±0.02). */
  async expectGrandTotal(expected: number): Promise<void> {
    const el = this.page
      .locator("[data-testid='grand-total'], .grand-total, [class*='grand-total']")
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
    const text = await el.textContent() ?? "";
    const actual = parseFloat(text.replace(/[^0-9.]/g, ""));
    expect(
      Math.abs(actual - expected),
      `Grand total: expected ₹${expected}, got ₹${actual}`,
    ).toBeLessThanOrEqual(0.02);
  }

  /** Assert a status badge shows the given status. */
  async expectStatus(status: string): Promise<void> {
    const badge = this.page
      .locator("[data-testid='status-badge'], .status-badge, .badge")
      .filter({ hasText: new RegExp(status, "i") })
      .first();
    await expect(badge).toBeVisible({ timeout: 5_000 });
  }

  /** Get the invoice number text. */
  async invoiceNumber(): Promise<string> {
    const el = this.page
      .locator("[data-testid='invoice-number'], [class*='invoice-number']")
      .first();
    return ((await el.textContent()) ?? "").trim();
  }
}
