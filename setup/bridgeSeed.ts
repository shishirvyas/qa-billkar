/**
 * Role contexts for auth setup.
 * Imported by setup/auth.setup.ts to save per-role browser storage states.
 */
export const ROLE_CONTEXTS: Record<string, Record<string, unknown>> = {
  admin: {
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
  },

  manager: {
    userId:     "u-manager",
    tenantId:   "t-1",
    tenantSlug: "acme",
    storeId:    "s-1",
    deviceId:   "d-3",
    role:       "MANAGER",
    permissions: [
      "dashboard:view",
      "customers:view", "customers:create", "customers:edit",
      "products:view",  "products:create",  "products:edit",
      "invoices:view",  "invoices:create",  "invoices:edit",
      "invoices:void",
      "returns:view",   "returns:create",   "returns:approve",
      "discounts:apply",
      "collections:view","collections:record",
      "reports:view",   "reports:export",
      "settings:view",
      "inventory:view",
    ],
  },

  cashier: {
    userId:     "u-cashier",
    tenantId:   "t-1",
    tenantSlug: "acme",
    storeId:    "s-1",
    deviceId:   "d-2",
    role:       "CASHIER",
    permissions: [
      "dashboard:view",
      "customers:view",
      "products:view",
      "invoices:view",  "invoices:create",
      "collections:view", "collections:record",
    ],
  },
};

/**
 * Returns a serialisable init-script string that installs window.biilkar
 * with auth.getCtx() returning the given ctx object.
 * Used by auth.setup.ts via page.addInitScript(buildBridgeMock(ctx)).
 */
export function buildBridgeMock(ctx: Record<string, unknown>): (ctx: Record<string, unknown>) => void {
  return (c: Record<string, unknown>) => {
    // @ts-expect-error window extension
    window.biilkar = {
      auth: {
        getCtx:  async () => c,
        login:   async () => c,
        logout:  async () => undefined,
        refresh: async () => c,
      },
      md: {
        customers:  { list: async () => ({ items: [], total: 0 }) },
        products:   { list: async () => ({ items: [], total: 0 }) },
        categories: { list: async () => [] },
        tax:        { list: async () => [] },
        units:      { list: async () => [] },
        payments:   { list: async () => [] },
      },
      billing: {
        invoice: { list: async () => ({ items: [], total: 0 }) },
      },
      sync: {
        getStatus: async () => ({ pending: 0, failed: 0, online: true, lastSync: null }),
      },
    };
  };
}
