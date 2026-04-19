/**
 * Base Playwright test fixture.
 *
 * Provides:
 *   - page:         Playwright Page pre-loaded with bridge mock
 *   - bridge:       BridgeOpts builder with sensible defaults
 *   - admin:        Page with TENANT_ADMIN context
 *   - manager:      Page with MANAGER context
 *   - cashier:      Page with CASHIER context
 *   - navigate:     Smart navigation helper
 *
 * Usage:
 *   import { test, expect } from "../../fixtures/base.js";
 *
 *   test("my test", async ({ admin, navigate }) => {
 *     await navigate(admin, "invoices");
 *     await expect(admin.getByRole("heading")).toBeVisible();
 *   });
 */
import { test as base, expect, type Page } from "@playwright/test";
import {
  injectBridge,
  bootApp,
  type BridgeOpts,
} from "../helpers/bridge.js";
import {
  CTX_ADMIN,
  CTX_MANAGER,
  CTX_CASHIER,
} from "../fixtures/testData.js";

// ─── Fixture types ────────────────────────────────────────────────────────────
export interface BillkarFixtures {
  /** A page with TENANT_ADMIN context injected and app booted */
  admin: Page;
  /** A page with MANAGER context injected and app booted */
  manager: Page;
  /** A page with CASHIER context injected and app booted */
  cashier: Page;
  /** Navigate to a module by label */
  navigate: (page: Page, label: string) => Promise<void>;
  /** Inject bridge opts and boot */
  withBridge: (page: Page, opts: BridgeOpts) => Promise<void>;
}

// ─── Base test fixture ────────────────────────────────────────────────────────
export const test = base.extend<BillkarFixtures>({
  admin: async ({ page }, use) => {
    await injectBridge(page, { ctx: CTX_ADMIN as Record<string, unknown> });
    await bootApp(page);
    await use(page);
  },

  manager: async ({ page }, use) => {
    await injectBridge(page, {
      ctx: CTX_MANAGER as Record<string, unknown>,
    });
    await bootApp(page);
    await use(page);
  },

  cashier: async ({ page }, use) => {
    await injectBridge(page, {
      ctx: CTX_CASHIER as Record<string, unknown>,
    });
    await bootApp(page);
    await use(page);
  },

  navigate: async ({}, use) => {
    await use(async (page: Page, label: string) => {
      // Try data-testid first, fall back to role-based nav
      const dataTestId = page.locator(`[data-testid="nav-${label}"]`).first();
      const byRole     = page.getByRole("button", {
        name: new RegExp(label, "i"),
        exact: false,
      }).first();

      if (await dataTestId.isVisible({ timeout: 500 }).catch(() => false)) {
        await dataTestId.click();
      } else {
        await byRole.click();
      }
      await page.waitForTimeout(300);
    });
  },

  withBridge: async ({}, use) => {
    await use(async (page: Page, opts: BridgeOpts) => {
      await injectBridge(page, opts);
      await bootApp(page);
    });
  },
});

export { expect };

// Re-export for convenience
export type { BridgeOpts };
