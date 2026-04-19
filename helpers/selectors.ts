/**
 * Selector Fallback System — intelligent multi-tier element resolution.
 *
 * Priority chain (tries each in order, stops at first match):
 *   1. data-testid attribute  (most stable)
 *   2. ARIA role + name       (semantic)
 *   3. CSS class              (design-system)
 *   4. Text content           (last resort)
 *
 * Usage:
 *   const btn = await sel.find(page, "save-invoice-button");
 *   await btn.click();
 */
import type { Page, Locator } from "@playwright/test";

export interface SelectorDef {
  testId?:   string;
  role?:     string;
  name?:     string | RegExp;
  css?:      string;
  text?:     string | RegExp;
}

// ─── Known selector registry ──────────────────────────────────────────────────
// Fallback chains for all critical UI elements.
// If the app uses a different selector, update here — all tests benefit.
const REGISTRY: Record<string, SelectorDef[]> = {
  // ── App shell ────────────────────────────────────────────────────────────
  "app-shell":         [{ testId: "app-shell" }, { css: "nav" }, { css: "[class*='sidebar']" }],
  "nav-container":     [{ testId: "nav" }, { css: "nav" }, { css: "[class*='sidebar']" }],
  "sync-indicator":    [{ testId: "sync-status" }, { css: "[class*='sync']" }, { text: /synced|syncing|pending/i }],

  // ── Auth ─────────────────────────────────────────────────────────────────
  "login-form":        [{ testId: "login-form" }, { role: "form" }, { css: "form" }],
  "email-input":       [{ testId: "email" }, { role: "textbox", name: /email/i }, { css: "input[type='email']" }],
  "password-input":    [{ testId: "password" }, { role: "textbox", name: /password/i }, { css: "input[type='password']" }],
  "login-button":      [{ testId: "login-btn" }, { role: "button", name: /login|sign in/i }, { css: "button[type='submit']" }],
  "logout-button":     [{ testId: "logout-btn" }, { role: "button", name: /logout|sign out/i }, { css: "[class*='logout']" }],
  "user-menu":         [{ testId: "user-menu" }, { role: "button", name: /user|account|profile/i }, { css: "[class*='user-menu']" }],

  // ── Invoice ───────────────────────────────────────────────────────────────
  "new-invoice-btn":   [{ testId: "new-invoice" }, { role: "button", name: /new invoice|create invoice/i }, { css: "[class*='new-invoice']" }],
  "invoice-list":      [{ testId: "invoice-list" }, { css: "table" }, { role: "grid" }],
  "invoice-number":    [{ testId: "invoice-number" }, { css: "[class*='invoice-number']" }, { text: /INV-/i }],
  "finalize-btn":      [{ testId: "finalize-btn" }, { role: "button", name: /finalise|finalize/i }, { text: /finalise|finalize/i }],
  "void-btn":          [{ testId: "void-btn" }, { role: "button", name: /void|cancel/i }],
  "print-btn":         [{ testId: "print-btn" }, { role: "button", name: /print|pdf/i }],
  "add-line-btn":      [{ testId: "add-line" }, { role: "button", name: /add.*line|add.*item/i }],
  "grand-total":       [{ testId: "grand-total" }, { css: "[class*='grand-total']" }, { text: /grand total/i }],
  "payment-btn":       [{ testId: "payment-btn" }, { role: "button", name: /record payment|pay now/i }],
  "hold-bill-btn":     [{ testId: "hold-bill" }, { role: "button", name: /hold/i }],

  // ── Customer ─────────────────────────────────────────────────────────────
  "new-customer-btn":  [{ testId: "new-customer" }, { role: "button", name: /new customer|add customer/i }],
  "customer-list":     [{ testId: "customer-list" }, { css: "table" }],
  "customer-search":   [{ testId: "customer-search" }, { role: "searchbox" }, { css: "input[placeholder*='search' i]" }],
  "customer-name-input":[{ testId: "customer-name" }, { role: "textbox", name: /name/i }],
  "customer-phone-input":[{ testId: "customer-phone" }, { role: "textbox", name: /phone|mobile/i }],
  "customer-gstin-input":[{ testId: "customer-gstin" }, { role: "textbox", name: /gstin|gst/i }],
  "save-customer-btn": [{ testId: "save-customer" }, { role: "button", name: /save|create/i }],

  // ── Product ───────────────────────────────────────────────────────────────
  "new-product-btn":   [{ testId: "new-product" }, { role: "button", name: /new product|add product/i }],
  "product-list":      [{ testId: "product-list" }, { css: "table" }],
  "product-search":    [{ testId: "product-search" }, { role: "searchbox" }, { css: "input[placeholder*='search' i]" }],
  "product-name-input":[{ testId: "product-name" }, { role: "textbox", name: /name/i }],
  "product-sku-input": [{ testId: "product-sku" }, { role: "textbox", name: /sku/i }],
  "product-price-input":[{ testId: "sale-price" }, { role: "spinbutton", name: /sale price|price/i }],
  "save-product-btn":  [{ testId: "save-product" }, { role: "button", name: /save|create/i }],

  // ── Reports ───────────────────────────────────────────────────────────────
  "export-csv-btn":    [{ testId: "export-csv" }, { role: "button", name: /export.*csv|download/i }],
  "date-range":        [{ testId: "date-range" }, { css: "input[type='date']" }, { role: "textbox", name: /date/i }],
  "total-sales-kpi":   [{ testId: "total-sales" }, { css: "[class*='kpi']" }, { text: /total sales/i }],

  // ── Settings ─────────────────────────────────────────────────────────────
  "save-settings-btn": [{ testId: "save-settings" }, { role: "button", name: /save settings/i }],
  "feature-flag-toggle":[{ testId: "feature-flag-toggle" }, { role: "switch" }, { role: "checkbox" }],
};

// ─── Core resolver ────────────────────────────────────────────────────────────
export async function find(
  page: Page,
  key: string,
  timeoutMs = 500,
): Promise<Locator> {
  const chain = REGISTRY[key];
  if (!chain) {
    // Unknown key — try as a CSS selector directly
    return page.locator(key).first();
  }

  for (const def of chain) {
    let loc: Locator | null = null;

    if (def.testId) {
      loc = page.locator(`[data-testid='${def.testId}']`).first();
    } else if (def.role && def.name) {
      loc = page.getByRole(def.role as Parameters<Page["getByRole"]>[0], {
        name: def.name,
        exact: false,
      }).first();
    } else if (def.role) {
      loc = page.getByRole(def.role as Parameters<Page["getByRole"]>[0]).first();
    } else if (def.css) {
      loc = page.locator(def.css).first();
    } else if (def.text) {
      loc = page.getByText(def.text, { exact: false }).first();
    }

    if (loc && await loc.isVisible({ timeout: timeoutMs }).catch(() => false)) {
      return loc;
    }
  }

  // All fallbacks failed — return first chain entry for better error messages
  const first = chain[0];
  if (first.testId) return page.locator(`[data-testid='${first.testId}']`).first();
  if (first.css)    return page.locator(first.css).first();
  return page.locator(key).first();
}

// ─── Convenience click ────────────────────────────────────────────────────────
export async function click(page: Page, key: string): Promise<void> {
  const el = await find(page, key);
  await el.click();
}

// ─── Convenience fill ─────────────────────────────────────────────────────────
export async function fill(page: Page, key: string, value: string): Promise<void> {
  const el = await find(page, key);
  await el.fill(value);
}

// ─── Barrel ───────────────────────────────────────────────────────────────────
export const sel = { find, click, fill, REGISTRY };
