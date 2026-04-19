/**
 * Auth setup — saves browser storage state per role so that feature specs
 * can reuse pre-authenticated contexts without repeating login flows.
 *
 * Each "login" here injects the bridge mock with the appropriate role
 * context, then saves the storage state (localStorage + cookies).
 *
 * Saved states:
 *   setup/auth-states/admin.json
 *   setup/auth-states/manager.json
 *   setup/auth-states/cashier.json
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { injectBridge } from "../helpers/bridge.js";
import { ROLE_CONTEXTS } from "./bridgeSeed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const [role, ctx] of Object.entries(ROLE_CONTEXTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const statePath = path.resolve(
      __dirname,
      `auth-states/${role}.json`,
    );

    // Inject the bridge mock with the specific role context
    await injectBridge(page, { ctx });

    await page.goto("/");
    // Wait for the app shell to render (sidebar or main nav)
    await expect(
      page.locator('[data-testid="app-shell"], [data-testid="sidebar"], nav').first(),
    ).toBeVisible({ timeout: 15_000 });

    // Persist the authenticated storage state
    await page.context().storageState({ path: statePath });
  });
}
