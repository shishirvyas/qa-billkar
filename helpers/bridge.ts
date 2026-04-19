/**
 * Comprehensive window.biilkar bridge mock — covers ALL 40+ Billkar modules.
 *
 * Mirrors the exact Electron contextBridge contract from preload.ts so every
 * test runs against a real Vite browser render with fully stubbed IPC.
 *
 * Namespaces:
 *   auth, db, md, billing, returns, discounts, barcode, outstanding,
 *   dueToday, overdue, promises (ptp), callQueue, collectionsReports,
 *   collectionsHealth, inventory, purchases, stockTransfer, salesDashboard,
 *   storeComparison, topProducts, dailySummary, kpiAlerts, whatsapp, sms,
 *   email, templates, campaigns, commTimeline, queueDashboard, reminders,
 *   subscription, featureFlags, auditLog, supportConsole, adminRoles,
 *   opsAlertCenter, adminReporting, sync, print, apiFetch
 *
 * Usage:
 *   import { injectBridge } from "../helpers/bridge.js";
 *   test.beforeEach(async ({ page }) => {
 *     await injectBridge(page, { ctx: CTX_ADMIN, invoices: [INVOICE_001] });
 *   });
 */
import type { Page } from "@playwright/test";

export interface BridgeOpts {
  // ── Auth ────────────────────────────────────────────────────────────────
  ctx?:                  Record<string, unknown>;
  sessions?:             unknown[];

  // ── Master data ─────────────────────────────────────────────────────────
  customers?:            unknown[];
  products?:             unknown[];
  taxSlabs?:             unknown[];
  units?:                unknown[];
  paymentMethods?:       unknown[];
  categories?:           unknown[];

  // ── Billing ─────────────────────────────────────────────────────────────
  invoices?:             unknown[];
  drafts?:               unknown[];
  returns?:              unknown[];
  discountRules?:        unknown[];

  // ── Collections ─────────────────────────────────────────────────────────
  collections?:          unknown[];
  overdueInvoices?:      unknown[];
  ptpRecords?:           unknown[];
  callQueueItems?:       unknown[];
  collectionsHealth?:    Record<string, number>;

  // ── Inventory ───────────────────────────────────────────────────────────
  stockLedgerEntries?:   unknown[];
  purchaseOrders?:       unknown[];
  stockTransfers?:       unknown[];

  // ── Communications ──────────────────────────────────────────────────────
  templates?:            unknown[];
  campaigns?:            unknown[];
  commHistory?:          unknown[];
  emailQueue?:           unknown[];
  smsQueue?:             unknown[];
  waQueue?:              unknown[];

  // ── Analytics ───────────────────────────────────────────────────────────
  salesDashboardData?:   Record<string, unknown>;
  topProductsData?:      unknown[];
  dailySummaryData?:     unknown[];
  kpiAlertsData?:        unknown[];
  storeComparisonData?:  unknown[];

  // ── Administration ──────────────────────────────────────────────────────
  featureFlagsList?:     unknown[];
  auditLogEntries?:      unknown[];
  adminRolesList?:       unknown[];
  subscriptionData?:     Record<string, unknown>;
  opsAlerts?:            unknown[];

  // ── Sync & dashboard ─────────────────────────────────────────────────────
  syncPending?:          number;
  syncFailed?:           number;
  dashboardStats?:       Record<string, number>;
  overdueStats?:         Record<string, number>;
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

const DEFAULT_SALES_DASHBOARD = {
  today:        { revenue: 4800, invoices: 8, avgTicket: 600 },
  thisMonth:    { revenue: 47250, invoices: 63 },
  growth:       { mom: 12.4, yoy: 31.2 },
};

const DEFAULT_FEATURE_FLAGS = [
  { key: "discount-engine",   label: "Discount Engine",   enabled: true  },
  { key: "whatsapp-engine",   label: "WhatsApp Engine",   enabled: false },
  { key: "sms-engine",        label: "SMS Engine",        enabled: false },
  { key: "email-invoicing",   label: "Email Invoicing",   enabled: true  },
  { key: "barcode-scanner",   label: "Barcode Scanner",   enabled: true  },
  { key: "stock-tracking",    label: "Stock Tracking",    enabled: true  },
  { key: "offline-mode",      label: "Offline Mode",      enabled: true  },
];

const DEFAULT_ADMIN_ROLES = [
  { id: "role-tenant-admin", name: "TENANT_ADMIN", isSystem: true,  permissions: ["*"] },
  { id: "role-manager",      name: "MANAGER",      isSystem: true,  permissions: ["invoices:*", "returns:*", "customers:*", "products:*", "reports:view"] },
  { id: "role-cashier",      name: "CASHIER",      isSystem: true,  permissions: ["invoices:create", "invoices:view", "customers:view", "products:view"] },
  { id: "role-viewer",       name: "VIEWER",       isSystem: true,  permissions: ["dashboard:view", "reports:view"] },
  { id: "role-accountant",   name: "ACCOUNTANT",   isSystem: true,  permissions: ["reports:*", "invoices:view", "collections:*"] },
];

const DEFAULT_SUBSCRIPTION = {
  plan:         "PROFESSIONAL",
  status:       "ACTIVE",
  invoiceLimit: 1000,
  storeLimit:   5,
  expiresAt:    new Date(Date.now() + 30 * 86_400_000).toISOString(),
};

export async function injectBridge(page: Page, opts: BridgeOpts = {}): Promise<void> {
  const data = {
    ctx:                 opts.ctx                ?? DEFAULT_CTX,
    sessions:            opts.sessions           ?? [],
    customers:           opts.customers          ?? [],
    products:            opts.products           ?? [],
    taxSlabs:            opts.taxSlabs           ?? [],
    units:               opts.units              ?? [],
    paymentMethods:      opts.paymentMethods     ?? [],
    categories:          opts.categories         ?? [],
    invoices:            opts.invoices           ?? [],
    drafts:              opts.drafts             ?? [],
    returns:             opts.returns            ?? [],
    discountRules:       opts.discountRules      ?? [],
    collections:         opts.collections        ?? [],
    overdueInvoices:     opts.overdueInvoices    ?? [],
    ptpRecords:          opts.ptpRecords         ?? [],
    callQueueItems:      opts.callQueueItems     ?? [],
    collectionsHealth:   opts.collectionsHealth  ?? { recoveryRate: 72, npaCount: 3, avgDaysToCollect: 18 },
    stockLedgerEntries:  opts.stockLedgerEntries ?? [],
    purchaseOrders:      opts.purchaseOrders     ?? [],
    stockTransfers:      opts.stockTransfers     ?? [],
    templates:           opts.templates          ?? [],
    campaigns:           opts.campaigns          ?? [],
    commHistory:         opts.commHistory        ?? [],
    emailQueue:          opts.emailQueue         ?? [],
    smsQueue:            opts.smsQueue           ?? [],
    waQueue:             opts.waQueue            ?? [],
    salesDashboardData:  opts.salesDashboardData ?? DEFAULT_SALES_DASHBOARD,
    topProductsData:     opts.topProductsData    ?? [],
    dailySummaryData:    opts.dailySummaryData   ?? [],
    kpiAlertsData:       opts.kpiAlertsData      ?? [],
    storeComparisonData: opts.storeComparisonData ?? [],
    featureFlagsList:    opts.featureFlagsList   ?? DEFAULT_FEATURE_FLAGS,
    auditLogEntries:     opts.auditLogEntries    ?? [],
    adminRolesList:      opts.adminRolesList     ?? DEFAULT_ADMIN_ROLES,
    subscriptionData:    opts.subscriptionData   ?? DEFAULT_SUBSCRIPTION,
    opsAlerts:           opts.opsAlerts          ?? [],
    syncPending:         opts.syncPending        ?? 0,
    syncFailed:          opts.syncFailed         ?? 0,
    dashboardStats:      opts.dashboardStats     ?? DEFAULT_STATS,
    overdueStats:        opts.overdueStats       ?? { totalOverdue: 8400, totalInvoices: 5, bucket1_7: 2 },
  };

  await page.addInitScript((d) => {
    // ── helpers ──────────────────────────────────────────────────────────────
    type Rec = Record<string, unknown>;

    function listStore<T extends Rec>(initial: T[]) {
      const store: T[] = [...initial];
      return {
        list:      async (_tid?: string, _sid?: string, opts?: Rec) => {
          let items = [...store];
          // Support search opt
          const s = opts?.["search"] as string | undefined;
          if (s) {
            const lower = s.toLowerCase();
            items = items.filter((x) =>
              Object.values(x).some((v) => String(v).toLowerCase().includes(lower)),
            );
          }
          const page  = (opts?.["page"]  as number | undefined) ?? 1;
          const limit = (opts?.["limit"] as number | undefined) ?? 50;
          const start = (page - 1) * limit;
          return { items: items.slice(start, start + limit), total: items.length };
        },
        get:        async (id: string) => store.find((x) => x["id"] === id) ?? null,
        getByPhone: async (_t: string, _s: string, phone: string) => store.find((x) => x["phone"] === phone) ?? null,
        getByGstin: async (_t: string, _s: string, gstin: string) => store.find((x) => x["gstin"] === gstin) ?? null,
        getByBarcode:async (_t: string, _s: string, bc: string)   => store.find((x) => x["barcode"] === bc) ?? null,
        getBySku:    async (_t: string, _s: string, sku: string)  => store.find((x) => x["sku"] === sku) ?? null,
        create:     async (p: T) => { store.push(p); return p; },
        upsert:     async (p: T) => {
          const i = store.findIndex((x) => x["id"] === p["id"]);
          if (i >= 0) store[i] = p; else store.push(p); return p;
        },
        update:     async (p: T) => {
          const i = store.findIndex((x) => x["id"] === p["id"]);
          if (i >= 0) store[i] = p; return p;
        },
        delete:     async (id: string) => { const i = store.findIndex((x) => x["id"] === id); if (i >= 0) store.splice(i, 1); },
        finalize:   async (id: string) => { const item = store.find((x) => x["id"] === id); if (item) item["status"] = "FINALIZED"; return item; },
        void:       async (id: string) => { const item = store.find((x) => x["id"] === id); if (item) item["status"] = "VOID"; return item; },
        exportCsv:  async () => store.map((r) => Object.values(r).join(",")).join("\n"),
        importCsv:  async () => ({ created: 0, skipped: 0 }),
        nextNumber: async (_t: string, _s: string, series: string) => `${series}-00001`,
      };
    }

    function simpleStore<T extends Rec>(initial: T[]) {
      const store: T[] = [...initial];
      return {
        list:   async () => [...store],
        get:    async (id: string) => store.find((x) => x["id"] === id) ?? null,
        create: async (p: T) => { store.push(p); return p; },
        upsert: async (p: T) => { const i = store.findIndex((x) => x["id"] === p["id"]); if (i >= 0) store[i] = p; else store.push(p); return p; },
        update: async (p: T) => { const i = store.findIndex((x) => x["id"] === p["id"]); if (i >= 0) store[i] = p; return p; },
        delete: async () => undefined,
      };
    }

    const invoiceStore    = listStore(d.invoices           as Rec[]);
    const draftStore      = listStore(d.drafts             as Rec[]);
    const returnStore     = listStore(d.returns            as Rec[]);
    const collStore       = listStore(d.collections        as Rec[]);
    const productStore    = listStore(d.products           as Rec[]);
    const customerStore   = listStore(d.customers          as Rec[]);
    const discountStore   = listStore(d.discountRules      as Rec[]);
    const overdueStore    = listStore(d.overdueInvoices    as Rec[]);
    const ptpStore        = listStore(d.ptpRecords         as Rec[]);
    const callQStore      = listStore(d.callQueueItems     as Rec[]);
    const poStore         = listStore(d.purchaseOrders     as Rec[]);
    const xfrStore        = listStore(d.stockTransfers     as Rec[]);
    const templateStore   = simpleStore(d.templates        as Rec[]);
    const campaignStore   = simpleStore(d.campaigns        as Rec[]);
    const auditStore      = simpleStore(d.auditLogEntries  as Rec[]);
    const roleStore       = simpleStore(d.adminRolesList   as Rec[]);
    const flagStore       = simpleStore(d.featureFlagsList as Rec[]);

    // ── window.biilkar ────────────────────────────────────────────────────────
    // @ts-expect-error window extension
    window.biilkar = {
      version: "0.1.0",

      // ── apiFetch mock ──────────────────────────────────────────────────────
      apiFetch: async (_method: string, path: string) => {
        return { ok: true, status: 200, body: { path } };
      },

      // ── Auth ──────────────────────────────────────────────────────────────
      auth: {
        getCtx:   async () => d.ctx,
        tenantCtx:async () => d.ctx,
        login:    async () => d.ctx,
        logout:   async () => undefined,
        refresh:  async () => d.ctx,
        sessions: {
          list:         async () => d.sessions,
          revoke:       async (_id: string) => undefined,
          revokeOthers: async () => undefined,
        },
      },

      // ── DB ─────────────────────────────────────────────────────────────
      db: {
        bootstrap: {
          save: async () => undefined,
          load: async () => null,
        },
        entities: {
          list:       async (_type: string) => [],
          upsert:     async () => undefined,
          upsertMany: async () => undefined,
          pending:    async () => (d.invoices as Rec[]).filter((x) => x["syncStatus"] === "PENDING"),
        },
        sync: {
          getCursor: async () => null,
          setCursor: async () => undefined,
        },
      },

      // ── Master data ───────────────────────────────────────────────────────
      md: {
        customers:  customerStore,
        products:   productStore,
        categories: {
          ...simpleStore(d.categories as Rec[]),
          list:          async () => d.categories,
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
        products: {
          search: async (_t: string, _s: string, q: string) =>
            (d.products as Rec[]).filter((p) =>
              !q || String(p["name"]).toLowerCase().includes(q.toLowerCase())
              || String(p["barcode"] ?? "").includes(q)
              || String(p["sku"] ?? "").toLowerCase().includes(q.toLowerCase()),
            ),
        },
        invoice: {
          ...invoiceStore,
          nextNumber: async (_t: string, _s: string, series: string) => `${series}-00001`,
          finalize:   async (id: string) => {
            const item = (d.invoices as Rec[]).find((x) => x["id"] === id);
            if (item) item["status"] = "FINALIZED";
            return item;
          },
          void:       async (id: string) => {
            const item = (d.invoices as Rec[]).find((x) => x["id"] === id);
            if (item) item["status"] = "VOID";
            return item;
          },
          addPayment: async (id: string, _t: string, _s: string, payment: Rec) => {
            const inv = (d.invoices as Rec[]).find((x) => x["id"] === id);
            if (inv) {
              const paid    = ((inv["paidAmount"] as number) ?? 0) + (payment["amount"] as number);
              const balance = ((inv["grandTotal"] as number) ?? 0) - paid;
              inv["paidAmount"] = paid;
              inv["balanceDue"] = Math.max(0, balance);
              if (balance <= 0) inv["status"] = "PAID";
              else if (paid > 0) inv["status"] = "PARTIAL";
            }
            return inv;
          },
          duplicate:  async (_id: string) => ({ id: `dup-${Date.now()}`, status: "DRAFT" }),
          exportCsv:  async () => (d.invoices as Rec[]).map((r) => Object.values(r).join(",")).join("\n"),
        },
        draft: {
          ...draftStore,
          touch:  async () => undefined,
          tag:    async () => undefined,
          note:   async () => undefined,
          expire: async () => 0,
        },
      },

      // ── Returns ───────────────────────────────────────────────────────────
      returns: {
        ...returnStore,
        nextNumber:      async (_t: string, _s: string, series: string) => `${series}-00001`,
        byInvoice:       async (invoiceId: string) =>
          (d.returns as Rec[]).filter((r) => r["invoiceId"] === invoiceId),
        returnedQtyMap:  async () => ({}),
        approve:         async (id: string) => {
          const item = (d.returns as Rec[]).find((x) => x["id"] === id);
          if (item) item["status"] = "APPROVED";
          return item;
        },
        process:         async (id: string) => {
          const item = (d.returns as Rec[]).find((x) => x["id"] === id);
          if (item) item["status"] = "PROCESSED";
          return item;
        },
      },

      // ── Discounts ─────────────────────────────────────────────────────────
      discounts: {
        ...discountStore,
        getByCode:      async (_t: string, _s: string, code: string) =>
          (d.discountRules as Rec[]).find((r) => r["code"] === code) ?? null,
        validateCode:   async (_code: string, _t: string, _s: string, orderAmt: number) => ({
          valid:   true,
          discType: "percent",
          value:   10,
          discAmt: orderAmt * 0.1,
        }),
        incrementUsage: async (id: string) => {
          const item = (d.discountRules as Rec[]).find((x) => x["id"] === id);
          if (item) item["usedCount"] = ((item["usedCount"] as number) ?? 0) + 1;
          return item;
        },
      },

      // ── Barcode ───────────────────────────────────────────────────────────
      barcode: {
        generate:       async () => `EAN${Date.now()}`,
        checkDuplicate: async () => false,
        printLabels:    async () => undefined,
      },

      // ── Outstanding / Receivables ─────────────────────────────────────────
      outstanding: {
        summary:    async () => ({
          totalOutstanding: d.dashboardStats["outstanding"] ?? 12500,
          totalInvoices:    d.dashboardStats["invoiceCount"] ?? 8,
          bucket1_7:        3,
        }),
        aging:      async () => [
          { bucket: "1-7 days",  count: 3, amount: 4200 },
          { bucket: "8-30 days", count: 2, amount: 5100 },
          { bucket: "31-90 days",count: 1, amount: 1800 },
          { bucket: "90+ days",  count: 1, amount: 1400 },
        ],
        byCustomer: async (_t: string, _s: string, _search: string, page: number, limit: number) => {
          const items = (d.customers as Rec[])
            .filter((c) => (c["receivableBalance"] as number ?? 0) > 0)
            .map((c) => ({
              customerId:   c["id"],
              customerName: c["name"],
              outstanding:  c["receivableBalance"] ?? 0,
              lastInvoice:  new Date().toISOString(),
            }));
          const start = ((page ?? 1) - 1) * (limit ?? 20);
          return { items: items.slice(start, start + (limit ?? 20)), total: items.length };
        },
        byStore:    async () => [],
        topPending: async (_t: string, _s: string, n: number) =>
          (d.customers as Rec[])
            .filter((c) => (c["receivableBalance"] as number ?? 0) > 0)
            .slice(0, n),
        trends:     async () => [],
        invoices:   async () => ({ items: (d.overdueInvoices as Rec[]), total: (d.overdueInvoices as Rec[]).length }),
        exportCsv:  async () => "customerId,name,outstanding\n",
      },

      // ── Due Today ─────────────────────────────────────────────────────────
      dueToday: {
        summary:   async () => ({ count: (d.overdueInvoices as Rec[]).length, total: 4500 }),
        customers: async () => ({
          items: (d.overdueInvoices as Rec[]).slice(0, 10),
          total: (d.overdueInvoices as Rec[]).length,
        }),
        record:    async () => undefined,
      },

      // ── Overdue ───────────────────────────────────────────────────────────
      overdue: {
        summary:        async () => d.overdueStats ?? { totalOverdue: 8400, totalInvoices: 5, bucket1_7: 2 },
        escalationQueue:async (_t: string, _s: string, n: number) =>
          (d.overdueInvoices as Rec[]).slice(0, n).map((inv) => ({
            customerId:   inv["customerId"],
            customerName: inv["customerName"] ?? "Unknown",
            totalOverdue: inv["balanceDue"],
            aging:        "15 days",
          })),
        buckets:        async () => ({
          "1-7":   2,
          "8-30":  2,
          "31-90": 1,
          "90+":   0,
        }),
        byCustomer:     async () => ({
          items: (d.overdueInvoices as Rec[]),
          total: (d.overdueInvoices as Rec[]).length,
        }),
        exportCsv:      async () => "customerId,overdue\n",
      },

      // ── Promises to Pay (PTP) ─────────────────────────────────────────────
      ptp: {
        ...ptpStore,
        kept:    async (id: string) => {
          const item = (d.ptpRecords as Rec[]).find((x) => x["id"] === id);
          if (item) item["status"] = "KEPT";
          return item;
        },
        broken:  async (id: string) => {
          const item = (d.ptpRecords as Rec[]).find((x) => x["id"] === id);
          if (item) item["status"] = "BROKEN";
          return item;
        },
      },

      // ── Call Queue ────────────────────────────────────────────────────────
      callQueue: {
        ...callQStore,
        log:    async () => undefined,
        assign: async () => undefined,
      },

      // ── Collections Reports ───────────────────────────────────────────────
      collectionsReports: {
        daily:           async () => ({ totalCollected: 28500, invoiceCount: 12 }),
        byPaymentMethod: async () => [
          { method: "CASH", amount: 15000, count: 6 },
          { method: "UPI",  amount: 10000, count: 4 },
          { method: "BANK", amount: 3500,  count: 2 },
        ],
        byAgent:         async () => [],
        exportCsv:       async () => "date,method,amount\n",
      },

      // ── Collections Health ────────────────────────────────────────────────
      collectionsHealth: {
        kpis: async () => d.collectionsHealth,
        trend: async () => [],
      },

      // ── Inventory ─────────────────────────────────────────────────────────
      inventory: {
        stockLedger: {
          entries:      async (_t: string, _s: string, productId: string) =>
            (d.stockLedgerEntries as Rec[]).filter((e) => !productId || e["productId"] === productId),
          currentStock: async (_t: string, _s: string, productId: string) => {
            const product = (d.products as Rec[]).find((p) => p["id"] === productId);
            return (product?.["openingStock"] as number) ?? 0;
          },
          adjust:       async (entry: Rec) => entry,
          exportCsv:    async () => "date,product,qty\n",
        },
        lowStockAlerts: {
          list:       async () =>
            (d.products as Rec[]).filter(
              (p) => (p["trackStock"] as boolean) &&
                     (p["openingStock"] as number ?? 0) <= (p["reorderLevel"] as number ?? 10),
            ),
          count:      async () =>
            (d.products as Rec[]).filter(
              (p) => (p["trackStock"] as boolean) &&
                     (p["openingStock"] as number ?? 0) <= (p["reorderLevel"] as number ?? 10),
            ).length,
        },
        syncDashboard: {
          health:    async () => ({ pending: d.syncPending, failed: d.syncFailed, lastSync: new Date(Date.now() - 60000).toISOString(), online: true }),
          healthLogs: async () => [],
          summary:   async () => ({ pending: d.syncPending, failed: d.syncFailed }),
        },
      },

      // ── Purchases ─────────────────────────────────────────────────────────
      purchases: {
        ...poStore,
        receive: async (id: string) => {
          const item = (d.purchaseOrders as Rec[]).find((x) => x["id"] === id);
          if (item) {
            item["status"] = "RECEIVED";
            item["receivedDate"] = new Date().toISOString();
          }
          return item;
        },
      },

      // ── Stock Transfer ────────────────────────────────────────────────────
      stockTransfer: {
        ...xfrStore,
        receive: async (id: string) => {
          const item = (d.stockTransfers as Rec[]).find((x) => x["id"] === id);
          if (item) item["status"] = "RECEIVED";
          return item;
        },
      },

      // ── Sales Dashboard ───────────────────────────────────────────────────
      salesDashboard: {
        summary:         async () => d.salesDashboardData,
        trend:           async () => d.dailySummaryData ?? [],
        byPaymentMethod: async () => [
          { method: "CASH", amount: 28000, count: 20 },
          { method: "UPI",  amount: 14000, count: 12 },
        ],
      },

      // ── Store Comparison ──────────────────────────────────────────────────
      storeComparison: {
        summary: async () => d.storeComparisonData ?? [],
        ranking: async () => [],
      },

      // ── Top Products ──────────────────────────────────────────────────────
      topProducts: {
        byRevenue: async (_t: string, _s: string, n: number) =>
          (d.topProductsData as Rec[]).slice(0, n),
        byQty:     async (_t: string, _s: string, n: number) =>
          (d.topProductsData as Rec[]).slice(0, n),
      },

      // ── Daily Summary ─────────────────────────────────────────────────────
      dailySummary: {
        get:  async () => d.salesDashboardData,
        list: async () => d.dailySummaryData ?? [],
      },

      // ── KPI Alerts ────────────────────────────────────────────────────────
      kpiAlerts: {
        list:    async () => d.kpiAlertsData ?? [],
        create:  async (a: Rec) => a,
        update:  async (a: Rec) => a,
        delete:  async () => undefined,
        trigger: async () => undefined,
      },

      // ── WhatsApp ──────────────────────────────────────────────────────────
      whatsapp: {
        config:      async () => ({ enabled: false, phoneNumber: "", apiKey: "" }),
        saveConfig:  async () => undefined,
        send:        async () => ({ queued: true, msgId: `wa-${Date.now()}` }),
        queue:       async () => ({ items: d.waQueue, total: (d.waQueue as Rec[]).length }),
        optIn:       async () => undefined,
        optOut:      async () => undefined,
        consent:     async () => ({ optIn: true }),
      },

      // ── SMS ───────────────────────────────────────────────────────────────
      sms: {
        config:     async () => ({ enabled: false, provider: "twilio", from: "" }),
        saveConfig: async () => undefined,
        send:       async () => ({ queued: true, msgId: `sms-${Date.now()}` }),
        queue:      async () => ({ items: d.smsQueue, total: (d.smsQueue as Rec[]).length }),
        consent:    async () => ({ optIn: true }),
      },

      // ── Email ─────────────────────────────────────────────────────────────
      email: {
        config:     async () => ({ enabled: false, host: "", port: 465, user: "" }),
        saveConfig: async () => undefined,
        send:       async () => ({ queued: true, msgId: `email-${Date.now()}` }),
        queue:      async () => ({ items: d.emailQueue, total: (d.emailQueue as Rec[]).length }),
      },

      // ── Templates ─────────────────────────────────────────────────────────
      templates: templateStore,

      // ── Campaigns ────────────────────────────────────────────────────────
      campaigns: {
        ...campaignStore,
        schedule: async (id: string, date: string) => {
          const c = (d.campaigns as Rec[]).find((x) => x["id"] === id);
          if (c) { c["scheduledAt"] = date; c["status"] = "SCHEDULED"; }
          return c;
        },
        send: async (id: string) => {
          const c = (d.campaigns as Rec[]).find((x) => x["id"] === id);
          if (c) c["status"] = "SENT";
          return c;
        },
      },

      // ── Comm Timeline ─────────────────────────────────────────────────────
      commTimeline: {
        list:          async () => ({ items: d.commHistory, total: (d.commHistory as Rec[]).length }),
        byCustomer:    async (cid: string) =>
          ({ items: (d.commHistory as Rec[]).filter((e) => e["customerId"] === cid), total: 0 }),
      },

      // ── Queue Dashboard ───────────────────────────────────────────────────
      queueDashboard: {
        health:  async () => ({
          email: { pending: (d.emailQueue as Rec[]).length, failed: 0 },
          sms:   { pending: (d.smsQueue   as Rec[]).length, failed: 0 },
          wa:    { pending: (d.waQueue    as Rec[]).length, failed: 0 },
        }),
        retry:   async () => undefined,
      },

      // ── Reminders ─────────────────────────────────────────────────────────
      reminders: {
        getSettings: async () => ({ enabled: true, daysBefore: 3, template: "reminder-default" }),
        saveSettings:async () => undefined,
      },

      // ── Reports ───────────────────────────────────────────────────────────
      reports: {
        dashboard:   async () => d.dashboardStats,
        receivables: async () =>
          (d.customers as Rec[]).map((c) => ({
            customerId:   c["id"],
            customerName: c["name"],
            outstanding:  c["receivableBalance"] ?? 0,
          })),
        gstReport:  async () => ({
          totalTaxable: d.dashboardStats["totalSales"] ?? 0,
          cgstTotal:    (d.dashboardStats["totalSales"] ?? 0) * 0.09,
          sgstTotal:    (d.dashboardStats["totalSales"] ?? 0) * 0.09,
          igstTotal:    0,
          taxTotal:     (d.dashboardStats["totalSales"] ?? 0) * 0.18,
        }),
        exportCsv:  async (type: string) => `type,value\n${type},test-data`,
      },

      // ── Subscription ─────────────────────────────────────────────────────
      subscription: {
        get:    async () => d.subscriptionData,
        usage:  async () => ({ invoices: 245, customers: 89, products: 312 }),
        history:async () => [],
      },

      // ── Feature Flags ─────────────────────────────────────────────────────
      featureFlags: {
        list:   async () => d.featureFlagsList,
        get:    async (key: string) =>
          (d.featureFlagsList as Rec[]).find((f) => f["key"] === key) ?? null,
        toggle: async (key: string, enabled: boolean) => {
          const f = (d.featureFlagsList as Rec[]).find((x) => x["key"] === key);
          if (f) f["enabled"] = enabled;
          return f;
        },
      },

      // ── Audit Log ─────────────────────────────────────────────────────────
      auditLog: {
        list:   async (_t: string, opts?: Rec) => ({
          items: d.auditLogEntries,
          total: (d.auditLogEntries as Rec[]).length,
        }),
        export: async () => "timestamp,user,action,entity\n",
      },

      // ── Support Console ───────────────────────────────────────────────────
      supportConsole: {
        searchTenant: async () => [],
        getSession:   async () => d.sessions?.[0] ?? null,
        listSessions: async () => d.sessions ?? [],
        forceLogout:  async () => undefined,
      },

      // ── Admin Roles ───────────────────────────────────────────────────────
      adminRoles: {
        list:           async () => d.adminRolesList,
        get:            async (id: string) =>
          (d.adminRolesList as Rec[]).find((r) => r["id"] === id) ?? null,
        create:         async (r: Rec) => { (d.adminRolesList as Rec[]).push(r); return r; },
        update:         async (r: Rec) => r,
        delete:         async () => undefined,
        assignPermissions: async () => undefined,
      },

      // ── Ops Alert Center ──────────────────────────────────────────────────
      opsAlerts: {
        list:   async () => ({ items: d.opsAlerts, total: (d.opsAlerts as Rec[]).length }),
        ack:    async (id: string) => {
          const a = (d.opsAlerts as Rec[]).find((x) => x["id"] === id);
          if (a) a["acked"] = true;
          return a;
        },
        create: async (a: Rec) => a,
      },

      // ── Admin Reporting ───────────────────────────────────────────────────
      adminReporting: {
        platformKpis:  async () => ({
          totalTenants: 12,
          activeTenants: 10,
          totalInvoices: 8432,
          mrr: 42000,
        }),
        tenantReport:  async () => ({ invoices: 245, revenue: 186000 }),
        exportCsv:     async () => "tenant,invoices,revenue\n",
      },

      // ── Sync ──────────────────────────────────────────────────────────────
      sync: {
        getStatus:    async () => ({
          pending:  d.syncPending,
          failed:   d.syncFailed,
          lastSync: new Date(Date.now() - 60_000).toISOString(),
          online:   true,
        }),
        enqueue:      async (op: unknown) => op,
        flushPending: async () => ({ synced: d.syncPending as number, failed: 0 }),
        markOffline:  async () => undefined,
        markOnline:   async () => undefined,
        healthLogs:   async () => [],
        diagnostics:  async () => ({ pending: d.syncPending, failed: d.syncFailed }),
      },

      // ── Print / PDF ───────────────────────────────────────────────────────
      print: {
        invoice: async (id: string) => ({ printed: true, invoiceId: id }),
        labels:  async () => undefined,
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
