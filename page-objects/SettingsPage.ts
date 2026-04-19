import { expect }   from "@playwright/test";
import type { Page } from "@playwright/test";
import { BasePage }  from "./BasePage.js";

export class SettingsPage extends BasePage {
  constructor(page: Page) { super(page); }

  async navigate(): Promise<void> {
    await super.navigate("Settings");
  }

  /** Navigate to the Feature Flags sub-section. */
  async gotoFeatureFlags(): Promise<void> {
    await this.page
      .getByRole("tab", { name: /feature flags|flags/i })
      .or(this.page.getByText(/feature flags/i))
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Toggle a feature flag on/off by its key or label. */
  async toggleFeatureFlag(keyOrLabel: string): Promise<void> {
    const toggle = this.page
      .locator("[data-testid='feature-flag-toggle'], [role='switch'], [role='checkbox']")
      .filter({ hasText: new RegExp(keyOrLabel, "i") })
      .or(
        this.page
          .locator("tr, [class*='flag-row']")
          .filter({ hasText: new RegExp(keyOrLabel, "i") })
          .locator("[role='switch'], [role='checkbox'], input[type='checkbox']"),
      )
      .first();
    await toggle.click();
    await this.waitForLoad();
  }

  /** Expect an entry in the Audit Log. */
  async expectAuditEntry(action: string | RegExp): Promise<void> {
    await this.page
      .getByRole("tab", { name: /audit/i })
      .or(this.page.getByText(/audit log/i))
      .first()
      .click();
    const row = this.page
      .locator("table tbody tr, [role='row']")
      .filter({ hasText: action })
      .first();
    await expect(row).toBeVisible({ timeout: 5_000 });
  }

  /** Navigate to subscription page. */
  async gotoSubscription(): Promise<void> {
    await this.page
      .getByText(/subscription|plan/i)
      .first()
      .click();
    await this.waitForLoad();
  }

  /** Assert subscription plan is visible. */
  async expectPlan(planName: string | RegExp): Promise<void> {
    const el = this.page
      .locator("[data-testid='subscription-plan'], [class*='plan']")
      .filter({ hasText: planName })
      .first();
    await expect(el).toBeVisible({ timeout: 5_000 });
  }

  /** Navigate to Admin Roles section and expect a role to be listed. */
  async expectRole(roleName: string): Promise<void> {
    const row = this.page.getByText(roleName, { exact: false }).first();
    await expect(row).toBeVisible({ timeout: 5_000 });
  }

  /** Click "Create Custom Role" button. */
  async createCustomRole(name: string, permissions: string[]): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: /create.*role|new role/i })
      .first();
    await btn.click();
    await this.fillInput("role name|name", name);
    // tick permission checkboxes
    for (const perm of permissions) {
      const cb = this.page
        .locator(`[data-perm="${perm}"], [value="${perm}"]`)
        .or(this.page.getByText(perm, { exact: false }).locator("xpath=../..").locator("input"))
        .first();
      const checked = await cb.isChecked().catch(() => false);
      if (!checked) await cb.check().catch(() => undefined);
    }
    await this.clickButton(/save|create/i);
    await this.waitForLoad();
  }
}
