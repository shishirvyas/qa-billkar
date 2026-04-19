import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export interface CustomerData {
  name:         string;
  phone?:       string;
  email?:       string;
  gstin?:       string;
  creditLimit?: number;
  type?:        string;
}

export class CustomerPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Customers");
  }

  /** Open the New Customer form. */
  async openNewCustomerForm(): Promise<void> {
    const btn = this.page
      .locator("[data-testid='new-customer']")
      .or(this.page.getByRole("button", { name: /new customer|add customer/i }))
      .first();
    await btn.click();
    await this.waitForLoad();
  }

  /** Fill and submit a new customer form. */
  async createCustomer(data: CustomerData): Promise<void> {
    await this.openNewCustomerForm();

    await this.fillInput("name", data.name);
    if (data.phone)  await this.fillInput("phone|mobile", data.phone);
    if (data.email)  await this.fillInput("email",        data.email);
    if (data.gstin)  await this.fillInput("gstin|gst",    data.gstin);
    if (data.creditLimit !== undefined)
      await this.fillInput("credit limit", String(data.creditLimit));

    await this.clickButton(/save|create/i);
    await this.waitForLoad();
  }

  /** Search customers by name or phone. */
  async searchCustomer(query: string): Promise<void> {
    const search = this.page
      .locator("[data-testid='customer-search'], input[placeholder*='search' i]")
      .first();
    await search.fill(query);
    await this.page.waitForTimeout(400);
  }

  /** Edit a customer row (opens detail/edit form). */
  async editCustomer(nameOrId: string): Promise<void> {
    const row = this.page.getByText(nameOrId, { exact: false }).first();
    await row.click();
    await this.waitForLoad();
  }

  /** Delete a customer (clicks delete icon/button on a row). */
  async deleteCustomer(name: string): Promise<void> {
    const row = this.page.getByText(name, { exact: false }).first();
    await row.hover();
    const del = this.page
      .getByRole("button", { name: /delete|remove/i })
      .first();
    await del.click();
    const confirm = this.page.getByRole("button", { name: /confirm|yes/i }).first();
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click();
    }
    await this.waitForLoad();
  }

  /** Assert a receivable balance is shown for the current customer. */
  async expectReceivableBalance(expected: number): Promise<void> {
    const el = this.page
      .locator("[data-testid='receivable-balance'], [class*='receivable']")
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
    const text = (await el.textContent()) ?? "";
    const actual = parseFloat(text.replace(/[^0-9.]/g, ""));
    expect(
      Math.abs(actual - expected),
      `Receivable balance: expected ₹${expected}, got ₹${actual}`,
    ).toBeLessThanOrEqual(1);
  }

  /** Assert a GSTIN validation error appears. */
  async expectGstinError(): Promise<void> {
    await this.expectError(/invalid gstin|gstin/i);
  }

  /** Assert a duplicate phone error appears. */
  async expectDuplicatePhoneError(): Promise<void> {
    await this.expectError(/duplicate|already exists|phone/i);
  }

  /** Assert customer list table has at least one row. */
  async expectListNotEmpty(): Promise<void> {
    const rows = this.page.locator("table tbody tr, [role='row']");
    await expect(rows.first()).toBeVisible({ timeout: 5_000 });
  }
}
