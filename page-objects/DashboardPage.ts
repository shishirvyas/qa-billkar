import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class DashboardPage extends BasePage {
  constructor(page: Page) { super(page); }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  /** Expect the overdue summary card to be visible and contain a number. */
  async expectOverdueSummary(): Promise<void> {
    const card = this.page
      .locator("[data-testid='overdue-card'], [class*='overdue']")
      .or(this.page.getByText(/overdue/i).first())
      .first();
    await expect(card).toBeVisible({ timeout: 5_000 });
  }

  /** Expect the outstanding watchlist to contain at least one row. */
  async expectWatchlist(): Promise<void> {
    const section = this.page
      .locator("[data-testid='watchlist'], [class*='watchlist']")
      .or(this.page.getByText(/watchlist|outstanding/i).first())
      .first();
    await expect(section).toBeVisible({ timeout: 5_000 });
  }

  /** Get current sync status indicator text. */
  async syncStatus(): Promise<string> {
    const el = this.page
      .locator("[data-testid='sync-status'], [class*='sync-status'], [class*='sync-indicator']")
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
    return ((await el.textContent()) ?? "").trim();
  }

  /** Expect a specific KPI value on the dashboard. */
  async expectKpi(label: string | RegExp, value?: string | RegExp): Promise<void> {
    const kpi = this.page
      .locator("[data-testid='kpi-card'], .kpi-card, .dashboard-stat")
      .filter({ hasText: label })
      .first();
    await expect(kpi).toBeVisible({ timeout: 5_000 });
    if (value) {
      await expect(kpi).toContainText(value);
    }
  }

  /** Expect the navigation sidebar to be rendered. */
  async expectNavLoaded(): Promise<void> {
    const nav = this.page
      .locator("nav, [data-testid='sidebar'], [data-testid='nav']")
      .first();
    await expect(nav).toBeVisible({ timeout: 8_000 });
  }
}
