import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class PermissionsPage extends BasePage {
  constructor(page: Page) { super(page); }

  /** Assert a module/page is accessible to the current role. */
  async expectCanAccess(moduleLabel: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: new RegExp(moduleLabel, "i") })
      .first();
    // Should be visible in nav
    await expect(btn).toBeVisible({ timeout: 5_000,
      message: `Role should have access to "${moduleLabel}" but nav item is missing` });
  }

  /** Assert a module/page is NOT accessible (hidden from nav). */
  async expectCannotAccess(moduleLabel: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: new RegExp(moduleLabel, "i") })
      .first();
    const isVis = await btn.isVisible({ timeout: 300 }).catch(() => false);
    expect(
      isVis,
      `Role should NOT have access to "${moduleLabel}" but nav item is visible`,
    ).toBe(false);
  }

  /** Assert a permission-denied or forbidden error is shown. */
  async expectPermissionDenied(): Promise<void> {
    const alert = this.page
      .locator("[data-testid='permission-denied'], [role='alert'], .error-page")
      .filter({ hasText: /permission|forbidden|not allowed|access denied|403/i })
      .first();
    await expect(alert).toBeVisible({ timeout: 5_000 });
  }

  /** Assert a "Create" button exists (role has create permission for a module). */
  async expectCreateButton(label?: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: new RegExp(label ?? "create|new|add", "i") })
      .first();
    await expect(btn).toBeVisible({ timeout: 5_000 });
  }

  /** Assert NO "Create" button is shown (role lacks create permission). */
  async expectNoCreateButton(label?: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: new RegExp(label ?? "create|new|add", "i") })
      .first();
    const isVis = await btn.isVisible({ timeout: 300 }).catch(() => false);
    expect(isVis, "Create button should not be visible for this role").toBe(false);
  }

  /** Navigate to a module and confirm the user arrives without errors. */
  async visitModule(moduleLabel: string): Promise<void> {
    await super.navigate(moduleLabel);
    // No error page
    const errorPage = this.page
      .locator("[data-testid='permission-denied'], .error-page")
      .first();
    const hasError = await errorPage.isVisible({ timeout: 500 }).catch(() => false);
    expect(hasError, `Unexpected permission error on "${moduleLabel}"`).toBe(false);
  }
}
