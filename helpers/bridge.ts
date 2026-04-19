/**
 * Full window.biilkar bridge mock for qa-billkar tests.
 *
 * Mirrors the bridge contract from the Electron preload/contextBridge exactly
 * so tests run against a real browser rendering of the Vite dev server.
 * Every namespace the app reads is stubbed here.
 *
 * Usage:
 *   import { injectBridge } from "../helpers/bridge.js";
 *   test.beforeEach(async ({ page }) => {
 *     await injectBridge(page, { ctx: CTX_ADMIN, invoices: [INVOICE_001] });
 *   });
 */
import type { Page } from "@playwright/test";

export interface BridgeOpts {
  ctx?:            Record<string, unknown>;
  customers?:      unknown[];
  products?:       unknown[];
  taxSlabs?:       unknown[];
  units?:          unknown[];
  paymentMethods?: unknown[];
  categories?:     unknown[];
  invoices?:       unknown[];
  returns?:        unknown[];
  collections?:    unknown[];
  syncPending?:    number;
  dashboardStats?: Record<string, number>;
}

const DEFAULT_CTX = {
  userId:     "u-admin",
  tenantId:   "t-1",
  tenantSlug: "acme",
  storeId:    "s-1",
  deviceId:   "d-1",
  role:       "TENANT_ADMIN",
  permissions: [
    "dashboard:view",
    "customers:view", "customers:create", "customers:edit",
    "customers:delete", "customers:export",
    "products:view",   "products:create",  "products:edit",
    "products:delete", "products:export",
    "invoices:view",   "invoices:create",  "invoices:edit",
    "invoices:delete", "invoices:void",    "invoices:export",
    "returns:view",    "returns:create",   "returns:approve",
    "discounts:apply", "discounts:override",
    "collections:view","collections:record",
    "reports:view",    "reports:export",
    "settings:view",   "settings:edit",
    "admin:manage-stores", "admin:manage-users",
    "inventory:view",  "inventory:adjust", "inventory:export",
  ],
};

const DEFAULT_STATS = {
  totalSales:    47250,
  totalExpenses: 18600,
  outstanding:   8400,
  invoiceCount:  63,
  customerCount: 28,
};

export async function injectBridge(page: Page, opts: BridgeOpts = {}): Promise<void> {
  const data = {
    ctx:            opts.ctx            ?? DEFAULT_CTX,
    customers:      opts.customers      ?? [],
    products:       opts.products       ?? [],
    taxSlabs:       opts.taxSlabs       ?? [],
    units:          opts.units          ?? [],
    paymentMethods: opts.paymentMethods ?? [],
    categories:     opts.categories     ?? [],
    invoices:       opts.invoices       ?? [],
    returns:        opts.returns        ?? [],
    collections:    opts.collections    ?? [],
    syncPending:    opts.syncPending    ?? 0,
    dashboardStats: opts.dashboardStats ?? DEFAULT_STATS,
  };

  await page.addInitScript((d) => {
    // ── helpers ──────────────────────────────────────────────────────────────
    type Rec = Record<string, unknown>;

    function listStore<T extends Rec>(initial: T[]) {
      const store: T[] = [...initial];
      return {
        list:      async () => ({ items: [...store], total: store.length }),
        get:       async (id: string) => store.find((x) => x["id"] === id) ?? null,
        create:    async (p: T) => { store.push(p); return p; },
        upsert:    async (p: T) => {
          const i = store.findIndex((x) => x["id"] === p["id"]);
          if (i >= 0) store[i] = p; else store.push(p); return p;
        },
        update:    async (p: T) => {
          const i = store.findIndex((x) => x["id"] === p["id"]);
          if (i >= 0) store[i] = p; return p;
        },
        delete:    async (id: string) => { const i = store.findIndex((x) => x["id"] === id); if (i >= 0) store.splice(i, 1); },
        finalize:  async (id: string) => { const item = store.find((x) => x["id"] === id); if (item) item["status"] = "FINALIZED"; return item; },
        void:      async (id: string) => { const item = store.find((x) => x["id"] === id); if (item) item["status"] = "VOID"; return item; },
        exportCsv: async () => store.map((r) => Object.values(r).join(",")).join("\n"),
        getByPhone:   async (_t: string, _s: string, phone: string) => store.find((x) => x["phone"] === phone) ?? null,
        getByGstin:   async (_t: string, _s: string, gstin: string) => store.find((x) => x["gstin"] === gstin) ?? null,
        getByBarcode: async (_t: string, _s: string, bc: string)    => store.find((x) => x["barcode"] === bc) ?? null,
        getBySku:     async (_t: string, _s: string, sku: string)   => store.find((x) => x["sku"] === sku) ?? null,
      };
    }

    function simpleStore<T extends Rec>(initial: T[]) {
      const store: T[] = [...initial];
      return {
        list:   async () => [...store],
        create: async (p: T) => { store.push(p); return p; },
        upsert: async (p: T) => p,
        delete: async () => undefined,
      };
    }

    const invoiceStore = listStore(d.invoices as Rec[]);
    const returnStore  = listStore(d.returns  as Rec[]);
    const collStore    = listStore(d.collections as Rec[]);
    const productStore = listStore(d.products as Rec[]);
    const customerStore = listStore(d.customers as Rec[]);

    // ── window.biilkar ────────────────────────────────────────────────────────
    // @ts-expect-error window extension
    window.biilkar = {
      // ── Auth ──────────────────────────────────────────────────────────────
      auth: {
        getCtx:  async () => d.ctx,
        login:   async () => d.ctx,
        logout:  async () => undefined,
        refresh: async () => d.ctx,
      },

      // ── Master data ───────────────────────────────────────────────────────
      md: {
        customers: customerStore,
        products:  productStore,
        categories: {
          ...simpleStore(d.categories as Rec[]),
          tree:          async () => (d.categories as Rec[]).map((c) => ({ ...c, children: [] })),
          productCounts: async () => ({}),
        },
        tax:      simpleStore(d.taxSlabs       as Rec[]),
        units:    simpleStore(d.units          as Rec[]),
        payments: simpleStore(d.paymentMethods as Rec[]),
        seed:     async () => ({ seeded: 10 }),
      },

      // ── Billing ───────────────────────────────────────────────────────────
      billing: {
        invoice: {
          ...invoiceStore,
          exportCsv: async () => (d.invoices as Rec[]).map((r) => Object.values(r).join(",")).join("\n"),
        },
        returns: returnStore,
        collections: {
          ...collStore,
          recordPayment: async (p: Rec) => {
            collStore.create(p as Rec);
            // Update invoice paidAmount
            const inv = (d.invoices as Rec[]).find((x) => x["id"] === p["invoiceId"]);
            if (inv) {
              inv["paidAmount"]  = ((inv["paidAmount"]  as number) ?? 0) + (p["amount"] as number);
              inv["balanceDue"]  = ((inv["balanceDue"]  as number) ?? 0) - (p["amount"] as number);
              if ((inv["balanceDue"] as number) <= 0) inv["status"] = "PAID";
            }
            return p;
          },
        },
        products: {
          search: async (_t: string, _s: string, q: string) =>
            (d.products as Rec[]).filter((p) =>
              !q || String(p["name"]).toLowerCase().includes(q.toLowerCase()),
            ),
        },
      },

      // ── Reports ───────────────────────────────────────────────────────────
      reports: {
        dashboard: async () => d.dashboardStats,
        receivables: async () =>
          (d.customers as Rec[]).map((c) => ({
            customerId:   c["id"],
            customerName: c["name"],
            outstanding:  c["receivableBalance"] ?? 0,
          })),
        exportCsv: async (type: string) => `type,value\n${type},test-export-data`,
      },

      // ── Sync ──────────────────────────────────────────────────────────────
      sync: {
        getStatus:    async () => ({
          pending:  d.syncPending,
          failed:   0,
          lastSync: new Date(Date.now() - 60_000).toISOString(),
          online:   true,
        }),
        enqueue:      async (op: unknown) => op,
        flushPending: async () => ({ synced: d.syncPending as number, failed: 0 }),
        markOffline:  async () => undefined,
        markOnline:   async () => undefined,
      },

      // ── Barcode ───────────────────────────────────────────────────────────
      barcode: {
        generate:       async () => `EAN${Date.now()}`,
        checkDuplicate: async () => false,
      },

      // ── DB (sync engine) ─────────────────────────────────────────────────
      db: {
        entities: {
          list:       async () => [],
          upsert:     async () => undefined,
          upsertMany: async () => undefined,
          pending:    async () => (d.invoices as Rec[]).filter((x) => x["syncStatus"] === "PENDING"),
        },
      },

      // ── Print / PDF ───────────────────────────────────────────────────────
      print: {
        invoice: async (id: string) => ({ printed: true, invoiceId: id }),
      },
    };
  }, data);
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
export async function navTo(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(label, "i"), exact: false }).first().click();
  await page.waitForTimeout(300);
}

export async function bootApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("nav, [data-testid='app-shell']", { timeout: 15_000 });
}
