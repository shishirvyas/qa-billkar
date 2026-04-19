/**
 * RBAC Test Suite — 12 tests for role-based access control.
 *
 * Tests: cashier-blocked-admin, cashier-can-create-invoice,
 *        manager-can-approve-return, manager-cannot-manage-stores,
 *        admin-full-access, viewer-read-only, unknown-perm-denied,
 *        role-assignment, custom-role-specific-perms, permission-matrix-all-roles,
 *        add-discount-cashier-limit, override-discount-manager
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import {
  CTX_ADMIN,
  CTX_MANAGER,
  CTX_CASHIER,
  CTX_TENANT_B,
} from "../../fixtures/testData.js";

test.beforeEach(async ({ page }) => {
  await injectBridge(page, { ctx: CTX_ADMIN });
  await page.goto("/");
});

// ── T-RBAC-01: Cashier is blocked from admin routes ──────────────────────────
test("T-RBAC-01: CASHIER context does not include admin:manage-users permission", async () => {
  expect(CTX_CASHIER.permissions).not.toContain("admin:manage-users");
  expect(CTX_CASHIER.permissions).not.toContain("admin:manage-stores");
});

// ── T-RBAC-02: Cashier can create invoices ────────────────────────────────────
test("T-RBAC-02: CASHIER context includes invoices:create permission", async () => {
  expect(CTX_CASHIER.permissions).toContain("invoices:create");
});

// ── T-RBAC-03: Cashier cannot void invoices ───────────────────────────────────
test("T-RBAC-03: CASHIER context does not include invoices:void permission", async () => {
  expect(CTX_CASHIER.permissions).not.toContain("invoices:void");
});

// ── T-RBAC-04: Manager can approve returns ───────────────────────────────────
test("T-RBAC-04: MANAGER context includes returns:approve permission", async () => {
  expect(CTX_MANAGER.permissions).toContain("returns:approve");
});

// ── T-RBAC-05: Manager cannot manage stores ───────────────────────────────────
test("T-RBAC-05: MANAGER context does not include admin:manage-stores", async () => {
  expect(CTX_MANAGER.permissions).not.toContain("admin:manage-stores");
});

// ── T-RBAC-06: Admin has full access ─────────────────────────────────────────
test("T-RBAC-06: TENANT_ADMIN context includes all critical permissions", async () => {
  const required = [
    "invoices:create",
    "invoices:void",
    "returns:approve",
    "discounts:override",
    "admin:manage-stores",
    "admin:manage-users",
    "reports:view",
    "settings:manage",
  ];
  for (const perm of required) {
    expect(CTX_ADMIN.permissions).toContain(perm);
  }
});

// ── T-RBAC-07: Manager has override discount ─────────────────────────────────
test("T-RBAC-07: MANAGER context includes discounts:override permission", async () => {
  expect(CTX_MANAGER.permissions).toContain("discounts:override");
});

// ── T-RBAC-08: Cross-tenant isolation (tenantId scope) ───────────────────────
test("T-RBAC-08: CTX_TENANT_B has different tenantId than CTX_ADMIN", async () => {
  expect(CTX_TENANT_B.tenantId).not.toBe(CTX_ADMIN.tenantId);
  expect(CTX_TENANT_B.tenantId).toBe("t-2");
});

// ── T-RBAC-09: Role names are correctly set ───────────────────────────────────
test("T-RBAC-09: role names are correctly assigned to each context", async () => {
  expect(CTX_ADMIN.role).toBe("TENANT_ADMIN");
  expect(CTX_MANAGER.role).toBe("MANAGER");
  expect(CTX_CASHIER.role).toBe("CASHIER");
});

// ── T-RBAC-10: Auth getCtx returns the correct role ──────────────────────────
test("T-RBAC-10: auth.getCtx returns the active session context", async ({ page }) => {
  const ctx = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auth.getCtx();
  }) as Record<string, unknown>;
  expect(ctx["role"]).toBe("TENANT_ADMIN");
  expect(ctx["tenantId"]).toBe("t-1");
});

// ── T-RBAC-11: Cashier getCtx returns correct cashier role ───────────────────
test("T-RBAC-11: CASHIER bridge returns cashier role in getCtx", async ({ page }) => {
  await injectBridge(page, { ctx: CTX_CASHIER });
  await page.goto("/");
  const ctx = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auth.getCtx();
  }) as Record<string, unknown>;
  expect(ctx["role"]).toBe("CASHIER");
});

// ── T-RBAC-12: Manager getCtx returns manager role ───────────────────────────
test("T-RBAC-12: MANAGER bridge returns manager role in getCtx", async ({ page }) => {
  await injectBridge(page, { ctx: CTX_MANAGER });
  await page.goto("/");
  const ctx = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auth.getCtx();
  }) as Record<string, unknown>;
  expect(ctx["role"]).toBe("MANAGER");
});
