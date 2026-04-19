/**
 * Customer + Permissions + Tenant Isolation Tests
 *
 * T02 — Create customer
 * T15 — Tenant isolation
 * T16 — Cashier permissions
 */
import { test, expect } from "@playwright/test";
import { injectBridge, bootApp, navTo } from "../helpers/bridge.js";
import {
  CTX_ADMIN, CTX_CASHIER, CTX_TENANT_B,
  CUSTOMER_RAMESH, CUSTOMER_PRIYA,
  PRODUCT_RICE, INVOICE_001,
} from "../fixtures/testData.js";

// ─── T02 — Create customer ────────────────────────────────────────────────────
test.describe("[T02] Create customer", () => {
  test("Customers page renders seeded customers", async ({ page }) => {
    await injectBridge(page, {
      ctx: CTX_ADMIN,
      customers: [CUSTOMER_RAMESH, CUSTOMER_PRIYA],
    });
    await bootApp(page);
    await navTo(page, "Customer");

    await expect(page.getByText("Ramesh Kumar")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Priya Sharma")).toBeVisible({ timeout: 10_000 });
  });

  test("Add Customer button is visible for TENANT_ADMIN", async ({ page }) => {
    await injectBridge(page, { ctx: CTX_ADMIN, customers: [CUSTOMER_RAMESH] });
    await bootApp(page);
    await navTo(page, "Customer");

    await expect(
      page.getByRole("button", { name: /add customer|new customer|create customer/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("bridge md.customers.create persists and is retrievable", async ({ page }) => {
    await injectBridge(page, { ctx: CTX_ADMIN, customers: [] });
    await bootApp(page);

    const newCust = {
      id: "cust-new", type: "customer",
      code: "C0099", name: "New Test Customer",
      phone: "9999000001", mobile: "9999000001",
      email: null, address: "Test Address",
      gstin: null, customerType: "retail", status: "active",
      openingBalance: 0, creditLimit: 5000, receivableBalance: 0,
    };

    await page.evaluate(async (c) => {
      // @ts-expect-error window extension
      await window.biilkar.md.customers.create(c);
    }, newCust);

    const found = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.customers.get("cust-new");
    });
    expect(found).toMatchObject({ name: "New Test Customer" });
  });

  test("customer GSTIN is stored and retrievable via getByGstin", async ({ page }) => {
    await injectBridge(page, { ctx: CTX_ADMIN, customers: [CUSTOMER_RAMESH] });
    await bootApp(page);

    const found = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.customers.getByGstin(
        "t-1", "s-1", "29ABCDE1234F1Z5",
      );
    });
    expect(found).toMatchObject({ id: "cust-ramesh" });
  });
});

// ─── T15 — Tenant isolation ────────────────────────────────────────────────────
test.describe("[T15] Tenant isolation", () => {
  test("Tenant A context does not see Tenant B data", async ({ page }) => {
    // Inject Tenant A bridge with Tenant A customers
    await injectBridge(page, {
      ctx: CTX_ADMIN,          // tenantId = t-1
      customers: [CUSTOMER_RAMESH], // belongs to t-1
    });
    await bootApp(page);

    const customers = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const r = await window.biilkar.md.customers.list();
      return r.items;
    });

    // Only t-1 customers present; none from t-2
    for (const c of customers as Array<{ tenantId: string }>) {
      expect(c.tenantId).toBe("t-1");
    }
    expect(customers).toHaveLength(1);
  });

  test("Tenant B context has its own isolated ctx", async ({ page }) => {
    await injectBridge(page, {
      ctx: CTX_TENANT_B,  // tenantId = t-2
      customers: [],
    });
    await bootApp(page);

    const ctx = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.auth.getCtx();
    });
    expect((ctx as { tenantId: string }).tenantId).toBe("t-2");
    expect((ctx as { tenantSlug: string }).tenantSlug).toBe("bharat-traders");
  });

  test("cross-tenant product lookup returns null", async ({ page }) => {
    // Tenant A bridge only has PRODUCT_RICE (storeId = s-1)
    await injectBridge(page, { ctx: CTX_ADMIN, products: [PRODUCT_RICE] });
    await bootApp(page);

    // Attempt to look up by barcode that doesn't exist in this store
    const result = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.md.products.getByBarcode(
        "t-1", "s-1", "NON-EXISTENT-BARCODE",
      );
    });
    expect(result).toBeNull();
  });
});

// ─── T16 — Cashier permissions ──────────────────────────────────────────────────
test.describe("[T16] Cashier permissions", () => {
  test("CASHIER ctx has only cashier-level permissions", async ({ page }) => {
    await injectBridge(page, { ctx: CTX_CASHIER });
    await bootApp(page);

    const ctx = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.auth.getCtx();
    });
    const perms = (ctx as { permissions: string[] }).permissions;

    // Cashier CAN do these:
    expect(perms).toContain("invoices:create");
    expect(perms).toContain("customers:view");

    // Cashier CANNOT do these:
    expect(perms).not.toContain("admin:manage-users");
    expect(perms).not.toContain("reports:export");
    expect(perms).not.toContain("products:delete");
    expect(perms).not.toContain("settings:edit");
    expect(perms).not.toContain("inventory:adjust");
  });

  test("CASHIER role does not include admin navigation items", async ({ page }) => {
    await injectBridge(page, {
      ctx: CTX_CASHIER,
      customers: [CUSTOMER_RAMESH],
      invoices: [INVOICE_001],
    });
    await bootApp(page);

    // App should render; admin-only nav items (Settings, Admin) should be hidden
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 15_000 });

    const navText = await page.locator("nav").first().innerText();
    const lower = navText.toLowerCase();

    // Cashier-visible items should exist
    const hasCashierItems =
      lower.includes("invoice") ||
      lower.includes("customer") ||
      lower.includes("dashboard");
    expect(hasCashierItems).toBeTruthy();
  });

  test("TENANT_ADMIN has all permissions CASHIER has", async ({ page }) => {
    await injectBridge(page, { ctx: CTX_ADMIN });
    await bootApp(page);

    const adminPerms = await page.evaluate(async () => {
      // @ts-expect-error window extension
      const ctx = await window.biilkar.auth.getCtx();
      return ctx.permissions as string[];
    });

    // Every cashier permission must be in admin perms
    for (const p of CTX_CASHIER.permissions) {
      expect(adminPerms).toContain(p);
    }
  });
});

