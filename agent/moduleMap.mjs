/**
 * Billkar Module Map — complete inventory of all 40+ application modules.
 *
 * Each module entry tracks:
 *   - id:          Unique module key (matches ModuleId in domain)
 *   - label:       Human-readable name
 *   - group:       Navigation group (mirrors App.tsx GROUP_LABELS)
 *   - phase:       Implementation phase (1–41)
 *   - priority:    Test priority: CRITICAL | HIGH | MEDIUM | LOW
 *   - permissions: Required permissions to access
 *   - features:    List of testable feature areas
 *   - specFile:    Corresponding spec file
 *   - riskScore:   Baseline risk (1–10); elevated for billing/financial modules
 */

export const MODULES = [
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: "dashboard", label: "Dashboard", group: "core", phase: 1,
    priority: "CRITICAL", permissions: ["dashboard:view"],
    features: ["overdue-summary", "watchlist", "sync-indicator", "nav-render", "theme-toggle"],
    specFile: "tests/modules/01-dashboard.spec.ts", riskScore: 6,
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  {
    id: "invoices", label: "Sales Invoice", group: "sales", phase: 3,
    priority: "CRITICAL", permissions: ["invoices:view", "invoices:create"],
    features: [
      "list-view", "filter-by-status", "filter-by-date", "filter-by-customer",
      "create-invoice", "line-items", "gst-exclusive", "gst-inclusive",
      "intrastate-cgst-sgst", "interstate-igst", "finalize", "void", "duplicate",
      "invoice-number-sequence", "pdf-print", "payment-record", "partial-payment",
      "full-payment", "hold-bill", "barcode-scan-line",
    ],
    specFile: "tests/modules/02-invoice.spec.ts", riskScore: 10,
  },
  {
    id: "returns", label: "Sales Returns", group: "sales", phase: 4,
    priority: "HIGH", permissions: ["returns:view", "returns:create"],
    features: [
      "return-from-invoice", "partial-return", "full-return",
      "stock-restore", "approve-return", "void-return", "return-number",
    ],
    specFile: "tests/modules/03-returns.spec.ts", riskScore: 8,
  },
  {
    id: "drafts", label: "Draft Manager", group: "sales", phase: 3,
    priority: "MEDIUM", permissions: ["invoices:create"],
    features: ["list-drafts", "restore-draft", "expire-draft", "tag-draft", "delete-draft"],
    specFile: "tests/modules/04-drafts.spec.ts", riskScore: 5,
  },
  {
    id: "barcode-labels", label: "Barcode Labels", group: "sales", phase: 6,
    priority: "MEDIUM", permissions: ["products:view"],
    features: ["generate-barcode", "duplicate-check", "print-labels"],
    specFile: "tests/modules/05-barcode.spec.ts", riskScore: 4,
  },

  // ── Catalog ───────────────────────────────────────────────────────────────
  {
    id: "customers", label: "Customers", group: "catalog", phase: 2,
    priority: "CRITICAL", permissions: ["customers:view"],
    features: [
      "list-customers", "search-by-name", "search-by-phone", "filter-by-type",
      "create-customer", "edit-customer", "delete-customer",
      "gstin-validation", "credit-limit", "receivable-balance",
      "customer-type-retail-wholesale-distributor", "export-csv", "import-csv",
    ],
    specFile: "tests/modules/06-customers.spec.ts", riskScore: 7,
  },
  {
    id: "products", label: "Products", group: "catalog", phase: 2,
    priority: "CRITICAL", permissions: ["products:view"],
    features: [
      "list-products", "search-by-name", "search-by-sku", "search-by-barcode",
      "create-product", "edit-product", "delete-product",
      "pricing-tiers-purchase-sale-mrp", "hsn-code", "tax-slab-assignment",
      "track-stock-flag", "opening-stock", "reorder-level",
      "barcode-generation", "category-assignment", "unit-assignment",
      "export-csv", "import-csv",
    ],
    specFile: "tests/modules/07-products.spec.ts", riskScore: 8,
  },
  {
    id: "categories", label: "Categories", group: "catalog", phase: 2,
    priority: "MEDIUM", permissions: ["products:view"],
    features: [
      "list-categories", "create-category", "parent-child-hierarchy",
      "product-counts", "delete-category",
    ],
    specFile: "tests/modules/08-masterdata.spec.ts", riskScore: 3,
  },
  {
    id: "tax", label: "Tax Slabs", group: "catalog", phase: 2,
    priority: "HIGH", permissions: ["settings:view"],
    features: [
      "gst-0", "gst-5", "gst-12", "gst-18", "gst-28",
      "cgst-sgst-split", "igst-interstate", "exclusive-inclusive-mode",
    ],
    specFile: "tests/modules/08-masterdata.spec.ts", riskScore: 9,
  },
  {
    id: "units", label: "Units", group: "catalog", phase: 2,
    priority: "LOW", permissions: ["settings:view"],
    features: ["list-units", "create-unit", "decimal-precision"],
    specFile: "tests/modules/08-masterdata.spec.ts", riskScore: 2,
  },
  {
    id: "payment-methods", label: "Payment Methods", group: "catalog", phase: 2,
    priority: "MEDIUM", permissions: ["settings:view"],
    features: ["list-payment-methods", "create-payment-method", "cash-upi-bank-card"],
    specFile: "tests/modules/08-masterdata.spec.ts", riskScore: 4,
  },

  // ── Collections ───────────────────────────────────────────────────────────
  {
    id: "outstanding", label: "Outstanding Dashboard", group: "collections", phase: 7,
    priority: "HIGH", permissions: ["collections:view"],
    features: [
      "outstanding-summary", "aging-buckets", "by-customer", "top-pending",
      "trend-chart", "export-csv",
    ],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 7,
  },
  {
    id: "due-today", label: "Due Today", group: "collections", phase: 8,
    priority: "HIGH", permissions: ["collections:view"],
    features: ["due-today-list", "filter-by-amount", "record-collection"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 7,
  },
  {
    id: "overdue", label: "Overdue Invoices", group: "collections", phase: 8,
    priority: "HIGH", permissions: ["collections:view"],
    features: ["overdue-buckets-1-7-8-30-31-90-90plus", "escalation-queue"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 8,
  },
  {
    id: "promises", label: "Promises to Pay", group: "collections", phase: 9,
    priority: "MEDIUM", permissions: ["collections:view"],
    features: ["ptp-list", "create-ptp", "ptp-kept-broken"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 5,
  },
  {
    id: "call-queue", label: "Call Queue", group: "collections", phase: 10,
    priority: "MEDIUM", permissions: ["collections:view"],
    features: ["call-queue-list", "assign-agent", "log-outcome"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 5,
  },
  {
    id: "collections-reports", label: "Collections Reports", group: "collections", phase: 11,
    priority: "HIGH", permissions: ["reports:view"],
    features: ["daily-collections", "by-payment-method", "by-agent", "export"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 6,
  },
  {
    id: "collections-health", label: "Collections Health", group: "collections", phase: 11,
    priority: "MEDIUM", permissions: ["reports:view"],
    features: ["health-kpis", "recovery-rate", "npa-count"],
    specFile: "tests/modules/09-collections.spec.ts", riskScore: 5,
  },

  // ── Communications ────────────────────────────────────────────────────────
  {
    id: "whatsapp", label: "WhatsApp Engine", group: "communications", phase: 22,
    priority: "MEDIUM", permissions: ["whatsapp:send"],
    features: ["wa-config", "send-invoice-wa", "opt-in-out"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 5,
  },
  {
    id: "sms", label: "SMS Engine", group: "communications", phase: 23,
    priority: "MEDIUM", permissions: ["sms:send"],
    features: ["sms-config", "send-reminder-sms", "sms-queue"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 5,
  },
  {
    id: "email-invoices", label: "Email Invoices", group: "communications", phase: 21,
    priority: "MEDIUM", permissions: ["invoices:email"],
    features: ["email-config", "send-invoice-email", "email-queue"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 5,
  },
  {
    id: "templates", label: "Templates", group: "communications", phase: 24,
    priority: "MEDIUM", permissions: ["templates:manage"],
    features: ["list-templates", "create-template", "variable-substitution"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 4,
  },
  {
    id: "campaigns", label: "Campaigns", group: "communications", phase: 25,
    priority: "MEDIUM", permissions: ["campaigns:send"],
    features: ["create-campaign", "schedule-campaign", "campaign-status"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 5,
  },
  {
    id: "timeline", label: "Comm Timeline", group: "communications", phase: 26,
    priority: "LOW", permissions: ["commtimeline:view"],
    features: ["comm-history", "per-customer-timeline"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 3,
  },
  {
    id: "queue-dashboard", label: "Queue Dashboard", group: "communications", phase: 27,
    priority: "LOW", permissions: ["queue:manage"],
    features: ["queue-health", "retry-failed"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 3,
  },
  {
    id: "reminders", label: "Reminder Settings", group: "communications", phase: 8,
    priority: "MEDIUM", permissions: ["settings:edit"],
    features: ["reminder-rules", "days-before-due", "message-template"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 4,
  },
  {
    id: "customer-timeline", label: "Customer Timeline", group: "communications", phase: 26,
    priority: "LOW", permissions: ["commtimeline:view"],
    features: ["per-customer-all-comms"],
    specFile: "tests/modules/10-communications.spec.ts", riskScore: 3,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    id: "stock-ledger", label: "Stock Ledger", group: "inventory", phase: 13,
    priority: "HIGH", permissions: ["inventory:view"],
    features: [
      "ledger-entries", "opening-stock", "stock-in-purchase", "stock-out-sale",
      "stock-adjust", "current-stock-level", "export",
    ],
    specFile: "tests/modules/11-inventory.spec.ts", riskScore: 8,
  },
  {
    id: "purchases", label: "Purchases", group: "inventory", phase: 14,
    priority: "HIGH", permissions: ["purchases:view", "purchases:create"],
    features: [
      "list-purchases", "create-purchase", "receive-stock",
      "purchase-total", "gst-input-credit",
    ],
    specFile: "tests/modules/11-inventory.spec.ts", riskScore: 7,
  },
  {
    id: "stock-transfers", label: "Stock Transfers", group: "inventory", phase: 15,
    priority: "MEDIUM", permissions: ["transfers:view"],
    features: ["initiate-transfer", "receive-transfer", "transfer-status"],
    specFile: "tests/modules/11-inventory.spec.ts", riskScore: 6,
  },
  {
    id: "inventory-alerts", label: "Low Stock Alerts", group: "inventory", phase: 13,
    priority: "HIGH", permissions: ["inventory:view"],
    features: ["low-stock-list", "below-reorder-level", "reorder-alert"],
    specFile: "tests/modules/11-inventory.spec.ts", riskScore: 7,
  },
  {
    id: "sync-dashboard", label: "Sync Dashboard", group: "inventory", phase: 13,
    priority: "MEDIUM", permissions: ["inventory:view"],
    features: ["sync-health", "pending-count", "failed-count", "last-sync"],
    specFile: "tests/modules/12-sync.spec.ts", riskScore: 7,
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    id: "sales-dashboard", label: "Sales Dashboard", group: "analytics", phase: 28,
    priority: "HIGH", permissions: ["reports:view"],
    features: [
      "total-sales", "invoice-count", "avg-order-value",
      "top-customer", "daily-trend", "payment-mode-split",
    ],
    specFile: "tests/modules/13-analytics.spec.ts", riskScore: 7,
  },
  {
    id: "store-comparison", label: "Store Comparison", group: "analytics", phase: 29,
    priority: "MEDIUM", permissions: ["reports:view", "admin:manage-stores"],
    features: ["multi-store-kpis", "store-ranking"],
    specFile: "tests/modules/13-analytics.spec.ts", riskScore: 5,
  },
  {
    id: "top-products", label: "Top Products", group: "analytics", phase: 30,
    priority: "MEDIUM", permissions: ["reports:view"],
    features: ["top-by-revenue", "top-by-qty", "date-range-filter"],
    specFile: "tests/modules/13-analytics.spec.ts", riskScore: 5,
  },
  {
    id: "daily-summary", label: "Daily Summary", group: "analytics", phase: 31,
    priority: "HIGH", permissions: ["reports:view"],
    features: ["daily-sales-total", "cash-upi-bank-split", "invoice-count-per-day"],
    specFile: "tests/modules/13-analytics.spec.ts", riskScore: 7,
  },
  {
    id: "kpi-alerts", label: "KPI Alerts", group: "analytics", phase: 32,
    priority: "MEDIUM", permissions: ["reports:view"],
    features: ["alert-threshold", "breach-notification", "alert-history"],
    specFile: "tests/modules/13-analytics.spec.ts", riskScore: 5,
  },

  // ── Administration ────────────────────────────────────────────────────────
  {
    id: "subscription", label: "Subscription", group: "administration", phase: 33,
    priority: "HIGH", permissions: ["admin:billing"],
    features: ["plan-info", "usage-stats", "billing-history"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 6,
  },
  {
    id: "feature-flags", label: "Feature Flags", group: "administration", phase: 34,
    priority: "MEDIUM", permissions: ["settings:edit"],
    features: ["list-flags", "toggle-flag", "flag-per-store"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 5,
  },
  {
    id: "audit-log", label: "Audit Log", group: "administration", phase: 39,
    priority: "HIGH", permissions: ["admin:view-audit-log"],
    features: ["audit-entries", "filter-by-user", "filter-by-action", "export"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 7,
  },
  {
    id: "support-console", label: "Support Console", group: "administration", phase: 39,
    priority: "MEDIUM", permissions: ["admin:manage-admin-roles"],
    features: ["tenant-search", "impersonate-view", "session-list"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 6,
  },
  {
    id: "admin-roles", label: "Admin Roles", group: "administration", phase: 39,
    priority: "HIGH", permissions: ["admin:manage-admin-roles"],
    features: [
      "list-roles", "create-role", "assign-permissions", "rbac-matrix",
      "super-admin-only", "role-inheritance",
    ],
    specFile: "tests/modules/15-permissions.spec.ts", riskScore: 9,
  },
  {
    id: "ops-alert-center", label: "Ops Alert Center", group: "administration", phase: 40,
    priority: "MEDIUM", permissions: ["admin:view-ops-alerts"],
    features: ["critical-alerts", "alert-severity", "ack-alert"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 6,
  },
  {
    id: "admin-reporting", label: "Admin Reporting", group: "administration", phase: 41,
    priority: "HIGH", permissions: ["admin:view-reports"],
    features: ["cross-tenant-reports", "platform-kpis", "export"],
    specFile: "tests/modules/14-admin.spec.ts", riskScore: 7,
  },
];

/** All unique spec files derived from the module map */
export const SPEC_FILES = [...new Set(MODULES.map((m) => m.specFile))].sort();

/** Modules by priority */
export const CRITICAL_MODULES = MODULES.filter((m) => m.priority === "CRITICAL");
export const HIGH_MODULES     = MODULES.filter((m) => m.priority === "HIGH");

/** Total feature count */
export const TOTAL_FEATURES = MODULES.reduce((sum, m) => sum + m.features.length, 0);

/** Module by id */
export function getModule(id) {
  return MODULES.find((m) => m.id === id) ?? null;
}

/** All features for a given permission scope */
export function featuresForPermissions(perms) {
  return MODULES
    .filter((m) => m.permissions.every((p) => perms.includes(p)))
    .flatMap((m) => m.features);
}
