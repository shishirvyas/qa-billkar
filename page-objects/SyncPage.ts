import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class SyncPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Sync");
  }

  /** Assert the sync status indicator matches expected text. */
  async expectSyncStatus(status: "synced" | "syncing" | "pending" | "offline" | "error"): Promise<void> {
    const indicator = this.page
      .locator("[data-testid='sync-status'], [class*='sync-status'], [class*='sync-indicator']")
      .first();
    await expect(indicator).toBeVisible({ timeout: 5_000 });
    await expect(indicator).toContainText(new RegExp(status, "i"), { timeout: 5_000 });
  }

  /** Click "Flush Pending" / "Sync Now" button. */
  async flushPending(): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /flush|sync now|force sync|push pending/i })
      .first();
    await btn.click();
    await this.waitForLoad(10_000);
  }

  /** Simulate offline mode (bridge: sync.markOffline). */
  async markOffline(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-expect-error window extension
      window.biilkar?.sync?.markOffline?.();
    });
  }

  /** Simulate online mode (bridge: sync.markOnline). */
  async markOnline(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-expect-error window extension
      window.biilkar?.sync?.markOnline?.();
    });
  }

  /** Assert pending count badge shows given number. */
  async expectPendingCount(count: number): Promise<void> {
    const el = this.page
      .locator("[data-testid='pending-count'], [class*='pending-count'], .badge")
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
    const text = (await el.textContent()) ?? "";
    const actual = parseInt(text.replace(/\D/g, ""), 10);
    expect(actual).toBe(count);
  }

  /** Assert the sync dashboard health logs section exists. */
  async expectHealthLogs(): Promise<void> {
    const section = this.page
      .locator("[data-testid='health-logs'], [class*='health-log']")
      .or(this.page.getByText(/health log|sync log/i))
      .first();
    await expect(section).toBeVisible({ timeout: 5_000 });
  }

  /** Assert the sync dashboard stats panel is visible. */
  async expectDashboardStats(): Promise<void> {
    const stats = this.page
      .locator("[data-testid='sync-dashboard'], [class*='sync-dashboard'], [class*='sync-stats']")
      .first();
    await expect(stats).toBeVisible({ timeout: 5_000 });
  }
}
