/**
 * Settings Test Suite — 8 tests for feature flags, audit log, roles, subscription.
 *
 * Tests: feature-flags-list, toggle-flag, subscription-plan, audit-log-entries,
 *        filter-audit-by-user, filter-audit-by-action, admin-roles-list,
 *        create-custom-role
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN } from "../../fixtures/testData.js";

const AUDIT_ENTRIES = [
  { id: "al-001", action: "INVOICE_CREATED", userId: "u-admin", tenantId: "t-1", ts: new Date().toISOString() },
  { id: "al-002", action: "PRODUCT_UPDATED",  userId: "u-admin", tenantId: "t-1", ts: new Date().toISOString() },
  { id: "al-003", action: "USER_LOGIN",        userId: "u-cashier",tenantId:"t-1",ts: new Date().toISOString() },
];

const FEATURE_FLAGS = [
  { key: "offline_mode",       label: "Offline Mode",       enabled: true  },
  { key: "whatsapp_billing",   label: "WhatsApp Billing",   enabled: false },
  { key: "multi_store",        label: "Multi-Store",        enabled: true  },
  { key: "advanced_reports",   label: "Advanced Reports",   enabled: true  },
  { key: "inventory_module",   label: "Inventory Module",   enabled: true  },
  { key: "sms_notifications",  label: "SMS Notifications",  enabled: false },
  { key: "customer_ledger",    label: "Customer Ledger",    enabled: true  },
];

const ADMIN_ROLES = [
  { id: "role-001", name: "TENANT_ADMIN", permissions: ["*"] },
  { id: "role-002", name: "MANAGER",      permissions: ["invoices:*", "returns:approve", "discounts:override"] },
  { id: "role-003", name: "CASHIER",      permissions: ["invoices:create", "invoices:view"] },
  { id: "role-004", name: "VIEWER",       permissions: ["reports:view"] },
  { id: "role-005", name: "SUPPORT",      permissions: ["customers:view", "invoices:view"] },
];

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:             CTX_ADMIN,
    featureFlagsList:FEATURE_FLAGS,
    auditLogEntries: AUDIT_ENTRIES,
    adminRolesList:  ADMIN_ROLES,
    subscriptionData:{ plan: "PROFESSIONAL", storeLimit: 5, userLimit: 20, validUntil: "2025-12-31" },
  });
  await page.goto("/");
});

// ── T-SET-01: Feature flags list ─────────────────────────────────────────────
test("T-SET-01: featureFlags.list returns all seeded flags", async ({ page }) => {
  const flags = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.featureFlags.list("t-1");
  }) as { key: string; enabled: boolean }[];
  expect(flags.length).toBeGreaterThanOrEqual(7);
  const offlineFlag = flags.find((f) => f.key === "offline_mode");
  expect(offlineFlag).toBeDefined();
  expect(offlineFlag!.enabled).toBe(true);
});

// ── T-SET-02: Toggle feature flag ────────────────────────────────────────────
test("T-SET-02: toggling a feature flag flips its enabled state", async ({ page }) => {
  const before = await page.evaluate(async () => {
    // @ts-expect-error window extension
    const f = await window.biilkar.featureFlags.get("t-1", "whatsapp_billing");
    return f?.enabled;
  }) as boolean;
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.featureFlags.toggle("t-1", "whatsapp_billing");
  });
  const after = await page.evaluate(async () => {
    // @ts-expect-error window extension
    const f = await window.biilkar.featureFlags.get("t-1", "whatsapp_billing");
    return f?.enabled;
  }) as boolean;
  expect(after).toBe(!before);
});

// ── T-SET-03: Subscription plan ──────────────────────────────────────────────
test("T-SET-03: subscription returns PROFESSIONAL plan", async ({ page }) => {
  const sub = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.subscription.get("t-1");
  }) as Record<string, unknown>;
  expect(sub["plan"]).toBe("PROFESSIONAL");
  expect(sub["storeLimit"]).toBe(5);
});

// ── T-SET-04: Audit log entries ───────────────────────────────────────────────
test("T-SET-04: auditLog.list returns all seeded entries", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auditLog.list("t-1");
  }) as { items: unknown[]; total: number };
  expect(result.items.length).toBeGreaterThanOrEqual(3);
});

// ── T-SET-05: Filter audit log by user ───────────────────────────────────────
test("T-SET-05: auditLog.list filtered by userId returns matching entries", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auditLog.list("t-1", { userId: "u-cashier" });
  }) as { items: Record<string, unknown>[] };
  expect(result.items.every((e) => e["userId"] === "u-cashier")).toBe(true);
});

// ── T-SET-06: Filter audit log by action ─────────────────────────────────────
test("T-SET-06: auditLog.list filtered by action returns matching entries", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.auditLog.list("t-1", { action: "INVOICE_CREATED" });
  }) as { items: Record<string, unknown>[] };
  expect(result.items.length).toBeGreaterThanOrEqual(1);
  expect(result.items.every((e) => e["action"] === "INVOICE_CREATED")).toBe(true);
});

// ── T-SET-07: Admin roles list ────────────────────────────────────────────────
test("T-SET-07: adminRoles.list returns all system roles", async ({ page }) => {
  const roles = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.adminRoles.list("t-1");
  }) as { id: string; name: string }[];
  expect(roles.length).toBeGreaterThanOrEqual(5);
  const names = roles.map((r) => r.name);
  expect(names).toContain("TENANT_ADMIN");
  expect(names).toContain("CASHIER");
});

// ── T-SET-08: Create custom role ─────────────────────────────────────────────
test("T-SET-08: creating a custom role stores it with the given permissions", async ({ page }) => {
  const newRole = {
    id:          "role-custom-001",
    name:        "INVENTORY_MANAGER",
    permissions: ["inventory:view", "purchases:create", "stockTransfer:create"],
  };
  const result = await page.evaluate(async (r) => {
    // @ts-expect-error window extension
    return window.biilkar.adminRoles.create(r);
  }, newRole) as Record<string, unknown>;
  expect(result["name"]).toBe("INVENTORY_MANAGER");
  const perms = result["permissions"] as string[];
  expect(perms).toContain("inventory:view");
  expect(perms).toContain("purchases:create");
});
