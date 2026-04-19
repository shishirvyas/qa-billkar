/**
 * BasePage — abstract base class for all Billkar page objects.
 *
 * Provides common operations used across every page:
 *  - Navigation via sidebar buttons
 *  - Wait for content to load
 *  - Heading text retrieval
 *  - Screenshot capture
 */
import type { Page } from "@playwright/test";
import { expect }    from "@playwright/test";

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a module by clicking its sidebar button. */
  async navigate(label: string): Promise<void> {
    const btn = this.page
      .getByRole("button", { name: new RegExp(label, "i"), exact: false })
      .first();
    const hasBtn = await btn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasBtn) {
      await btn.click();
    } else {
      await this.page
        .locator(`[data-testid="nav-${label.toLowerCase().replace(/\s+/g, "-")}"]`)
        .first()
        .click();
    }
    await this.waitForLoad();
  }

  /** Wait for the main content area to be ready. */
  async waitForLoad(timeout = 8_000): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded", { timeout });
    await this.page
      .locator(".loading-spinner, [data-loading='true']")
      .first()
      .waitFor({ state: "hidden", timeout })
      .catch(() => undefined);
  }

  /** Get the visible page heading text. */
  async heading(): Promise<string> {
    const h = this.page
      .locator("h1, h2, [data-testid='page-title']")
      .first();
    return ((await h.textContent()) ?? "").trim();
  }

  /** Take a named screenshot. */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `reports/screenshots/${name}.png`, fullPage: false });
  }

  /** Click a button by role + name. */
  async clickButton(name: string | RegExp): Promise<void> {
    await this.page.getByRole("button", { name, exact: false }).first().click();
  }

  /** Fill an input by label (or placeholder). */
  async fillInput(labelOrPlaceholder: string, value: string): Promise<void> {
    const inp = this.page
      .getByLabel(new RegExp(labelOrPlaceholder, "i"))
      .or(this.page.getByPlaceholder(new RegExp(labelOrPlaceholder, "i")))
      .first();
    await inp.fill(value);
  }

  /** Select an option in a <select> by its visible label. */
  async selectOption(labelOrTestId: string, value: string): Promise<void> {
    const sel = this.page
      .getByLabel(new RegExp(labelOrTestId, "i"))
      .or(this.page.locator(`[data-testid="${labelOrTestId}"]`))
      .first();
    await sel.selectOption(value);
  }

  /** Expect a success toast to appear. */
  async expectSuccess(text?: string | RegExp): Promise<void> {
    const sel = ".toast-success, [data-testid='toast-success'], [role='status']";
    const el  = text
      ? this.page.locator(sel).filter({ hasText: text }).first()
      : this.page.locator(sel).first();
    await expect(el).toBeVisible({ timeout: 6_000 });
  }

  /** Expect an error toast or alert to appear. */
  async expectError(text?: string | RegExp): Promise<void> {
    const sel = ".toast-error, [data-testid='toast-error'], [role='alert']";
    const el  = text
      ? this.page.locator(sel).filter({ hasText: text }).first()
      : this.page.locator(sel).first();
    await expect(el).toBeVisible({ timeout: 6_000 });
  }
}
