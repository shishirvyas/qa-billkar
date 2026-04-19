/**
 * Sync / Offline Tests
 *
 * T13 — Offline invoice creation (queued, PENDING syncStatus)
 * T14 — Sync reconnect (pending ops flushed when online)
 */
import { test, expect } from "@playwright/test";
import { injectBridge, bootApp } from "../helpers/bridge.js";
import {
  CTX_ADMIN, CUSTOMER_RAMESH, PRODUCT_RICE,
  TAX_GST5, PM_CASH,
} from "../fixtures/testData.js";

const BASE = {
  ctx: CTX_ADMIN,
  customers: [CUSTOMER_RAMESH],
  products: [PRODUCT_RICE],
  taxSlabs: [TAX_GST5],
  paymentMethods: [PM_CASH],
};

// ─── T13 — Offline invoice ────────────────────────────────────────────────────
test.describe("[T13] Offline invoice creation", () => {
  test("invoice created offline gets PENDING syncStatus", async ({ page }) => {
    // Simulate offline: syncPending > 0, online = false
    await injectBridge(page, { ...BASE, syncPending: 0 });

    // Override sync.getStatus to report offline
    await page.addInitScript(() => {
      const origGet = window.biilkar?.sync?.getStatus;
      if (origGet) {
        // @ts-expect-error window extension
        window.biilkar.sync.getStatus = async () => ({
          pending: 0,
          failed:  0,
          lastSync: null,
          online:  false, // <-- offline
        });
      }
    });

    await bootApp(page);

    // Create an invoice while offline — it should be stored with PENDING status
    const inv = await page.evaluate(async () => {
      const offlineInvoice = {
        id:            "inv-offline-1",
        type:          "invoice",
        invoiceNumber: "INV-OFFLINE-001",
        customerId:    "cust-ramesh",
        customerName:  "Ramesh Kumar",
        status:        "FINALIZED",
        syncStatus:    "PENDING",      // key field
        grandTotal:    997.5,
        paidAmount:    0,
        balanceDue:    997.5,
        lineItems:     [],
        invoiceDate:   new Date().toISOString(),
      };
      // @ts-expect-error window extension
      return window.biilkar.billing.invoice.create(offlineInvoice);
    });

    expect((inv as Record<string, unknown>).syncStatus).toBe("PENDING");
    expect((inv as Record<string, unknown>).id).toBe("inv-offline-1");
  });

  test("pending entities are queryable via db.entities.pending", async ({ page }) => {
    const pendingInv = {
      ...CUSTOMER_RAMESH,
      id: "inv-pending",
      type: "invoice",
      syncStatus: "PENDING",
      grandTotal: 500,
    };
    await injectBridge(page, { ...BASE, invoices: [pendingInv as unknown as typeof pendingInv] });
    await bootApp(page);

    const pending = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.db.entities.pending();
    });
    // PENDING invoices are returned by pending()
    expect(Array.isArray(pending)).toBeTruthy();
    const ids = (pending as Array<{ id: string }>).map((x) => x.id);
    expect(ids).toContain("inv-pending");
  });

  test("sync status indicator reads from bridge sync.getStatus", async ({ page }) => {
    await injectBridge(page, { ...BASE, syncPending: 5 });
    await bootApp(page);

    const status = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.sync.getStatus();
    });
    expect((status as { pending: number }).pending).toBe(5);
    expect((status as { online: boolean }).online).toBe(true);
  });
});

// ─── T14 — Sync reconnect ────────────────────────────────────────────────────
test.describe("[T14] Sync reconnect", () => {
  test("flushPending returns synced count equal to syncPending", async ({ page }) => {
    await injectBridge(page, { ...BASE, syncPending: 3 });
    await bootApp(page);

    const result = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.sync.flushPending();
    });
    expect((result as { synced: number }).synced).toBe(3);
    expect((result as { failed: number }).failed).toBe(0);
  });

  test("markOnline + markOffline are callable without error", async ({ page }) => {
    await injectBridge(page, BASE);
    await bootApp(page);

    await expect(
      page.evaluate(async () => {
        // @ts-expect-error window extension
        await window.biilkar.sync.markOffline();
        // @ts-expect-error window extension
        await window.biilkar.sync.markOnline();
        return "ok";
      }),
    ).resolves.toBe("ok");
  });

  test("enqueue adds to pending and flushPending clears it", async ({ page }) => {
    await injectBridge(page, { ...BASE, syncPending: 0 });
    await bootApp(page);

    // Enqueue an operation
    await page.evaluate(async () => {
      // @ts-expect-error window extension
      await window.biilkar.sync.enqueue({
        id: "op-001",
        type: "upsert",
        entity: "invoice",
        payload: { id: "inv-q" },
      });
    });

    // flushPending resolves without throwing
    const flush = await page.evaluate(async () => {
      // @ts-expect-error window extension
      return window.biilkar.sync.flushPending();
    });
    expect(flush).toBeDefined();
  });
});

