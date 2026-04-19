import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class ReportsPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Reports");
  }

  /** Open the Sales Dashboard sub-page. */
  async openSalesDashboard(): Promise<void> {
    await this.page
      .getByText(/sales dashboard/i)
      .or(this.page.getByRole("tab", { name: /sales/i }))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Click Export CSV button. */
  async exportCsv(section?: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /export.*csv|download/i })
      .first();
    await btn.click();
  }

  /** Set a date range filter. */
  async setDateRange(from: string, to: string): Promise<void> {
    const inputs = this.page.locator("input[type='date']");
    const fromInput = inputs.first();
    const toInput   = inputs.last();
    await fromInput.fill(from);
    await toInput.fill(to);
    const applyBtn = this.page
      .getByRole("button", { name: /apply|filter|search/i })
      .first();
    if (await applyBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await applyBtn.click();
    }
    await this.waitForLoad();
  }

  /** Assert a dashboard KPI card shows the expected value. */
  async expectDashboardTotal(key: string | RegExp, value: string | RegExp): Promise<void> {
    const card = this.page
      .locator("[data-testid='kpi-card'], .kpi-card, .stat-card, .dashboard-stat")
      .filter({ hasText: key })
      .first();
    await expect(card).toBeVisible({ timeout: 5_000 });
    if (value) {
      await expect(card).toContainText(value);
    }
  }

  /** Assert a table row is present in any visible table. */
  async expectTableRow(text: string | RegExp): Promise<void> {
    const row = this.page
      .locator("table tbody tr, [role='row']")
      .filter({ hasText: text })
      .first();
    await expect(row).toBeVisible({ timeout: 5_000 });
  }

  /** Open GST Report section. */
  async openGstReport(): Promise<void> {
    await this.page
      .getByText(/gst report|tax report/i)
      .or(this.page.getByRole("tab", { name: /gst|tax/i }))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Open Store Comparison section. */
  async openStoreComparison(): Promise<void> {
    await this.page
      .getByText(/store comparison|compare store/i)
      .or(this.page.getByRole("tab", { name: /comparison/i }))
      .first()
      .click();
    await this.waitForLoad();
  }
}
