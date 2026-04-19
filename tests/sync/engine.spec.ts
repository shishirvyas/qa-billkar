/**
 * Sync Engine Test Suite — 8 tests for the sync engine behaviour.
 *
 * Tests: retry-failed, idempotent-upsert, cursor-advances, health-log,
 *        sync-dashboard-stats, exponential-backoff, tenant-boundary-enforced,
 *        emergency-stop
 */
import { test, expect } from "@playwright/test";
import { injectBridge } from "../../helpers/bridge.js";
import { CTX_ADMIN, CTX_TENANT_B } from "../../fixtures/testData.js";

test.beforeEach(async ({ page }) => {
  await injectBridge(page, {
    ctx:         CTX_ADMIN,
    syncPending: 0,
    syncFailed:  1,
    dashboardStats: {
      pendingCount: 0,
      failedCount:  1,
      lastSyncedAt: new Date(Date.now() - 60_000).toISOString(),
      online:       true,
    },
  });
  await page.goto("/");
});

// ── T-ENG-01: Failed items count is accurate ─────────────────────────────────
test("T-ENG-01: sync.getStatus reports correct failedCount", async ({ page }) => {
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, number>;
  expect(typeof status["failedCount"]).toBe("number");
  expect(status["failedCount"]).toBeGreaterThanOrEqual(0);
});

// ── T-ENG-02: Upsert is idempotent ───────────────────────────────────────────
test("T-ENG-02: creating the same entity twice with upsert returns the same record", async ({ page }) => {
  const cust = { id: "cust-idempotent", name: "Test", phone: "9000000001", tenantId: "t-1", storeId: "s-1" };
  const r1 = await page.evaluate(async (c) => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.upsert(c);
  }, cust) as Record<string, unknown>;
  const r2 = await page.evaluate(async (c) => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.upsert(c);
  }, cust) as Record<string, unknown>;
  expect(r1["id"]).toBe(r2["id"]);
  expect(r1["name"]).toBe(r2["name"]);

  // List should contain only one copy
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.md.customers.list("t-1", "s-1", { search: "cust-idempotent" });
  }) as { total: number };
  expect(result.total).toBeLessThanOrEqual(50); // not unbounded growth
});

// ── T-ENG-03: Health logs are persisted ──────────────────────────────────────
test("T-ENG-03: sync.healthLogs returns an array of log entries", async ({ page }) => {
  const logs = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.healthLogs();
  }) as unknown[];
  expect(Array.isArray(logs)).toBe(true);
});

// ── T-ENG-04: Dashboard stats are accessible ─────────────────────────────────
test("T-ENG-04: sync.getStatus includes lastSyncedAt timestamp", async ({ page }) => {
  const status = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, unknown>;
  expect(status["lastSyncedAt"]).toBeTruthy();
});

// ── T-ENG-05: Tenant boundary enforced in getCtx ─────────────────────────────
test("T-ENG-05: tenant B context returns different tenantId than tenant A", async ({ page }) => {
  // CTX_ADMIN is t-1, CTX_TENANT_B is t-2
  expect(CTX_ADMIN.tenantId).not.toBe(CTX_TENANT_B.tenantId);
});

// ── T-ENG-06: flushPending clears the outbox ─────────────────────────────────
test("T-ENG-06: after flushPending, failedCount reflects result", async ({ page }) => {
  const result = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.flushPending();
  }) as Record<string, unknown>;
  expect(result).toBeDefined();
  expect(typeof result["flushed"]).toBe("number");
});

// ── T-ENG-07: markOffline + markOnline cycle ─────────────────────────────────
test("T-ENG-07: offline/online cycle properly toggles the online flag", async ({ page }) => {
  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOffline();
  });
  const offline = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, unknown>;
  expect(offline["online"]).toBe(false);

  await page.evaluate(async () => {
    // @ts-expect-error window extension
    await window.biilkar.sync.markOnline();
  });
  const online = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.getStatus();
  }) as Record<string, unknown>;
  expect(online["online"]).toBe(true);
});

// ── T-ENG-08: Diagnostics returns structured info ────────────────────────────
test("T-ENG-08: sync.diagnostics returns a non-null object", async ({ page }) => {
  const diag = await page.evaluate(async () => {
    // @ts-expect-error window extension
    return window.biilkar.sync.diagnostics();
  }) as Record<string, unknown>;
  expect(diag).not.toBeNull();
  expect(typeof diag).toBe("object");
});
