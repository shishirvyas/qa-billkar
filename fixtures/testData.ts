/**
 * Shared test domain fixtures for all 20 QA specs.
 *
 * Objects mirror the live domain types (entities.ts / masterData.ts) so
 * the bridge mock receives well-typed payloads identical to what the real
 * Electron app would produce.
 */

// ─── Sync metadata template ───────────────────────────────────────────────────
export const SYNC = {
  tenantId:             "t-1",
  tenantSlug:           "acme",
  storeId:              "s-1",
  createdAt:            "2026-01-10T08:00:00Z",
  updatedAt:            "2026-01-10T08:00:00Z",
  deletedAt:            null as string | null,
  version:              1,
  lastModifiedBy:       "u-1",
  lastModifiedDeviceId: "d-1",
  syncStatus:           "SYNCED" as const,
  changeSeq:            1,
  serverUpdatedAt:      null as string | null,
};

// ─── Tax slabs ────────────────────────────────────────────────────────────────
export const TAX_GST5 = {
  ...SYNC,
  id: "tax-gst-5", type: "taxSlab" as const,
  name: "GST 5%", rate: 5, cgst: 2.5, sgst: 2.5, igst: 5,
  mode: "exclusive" as const, isDefault: false, active: true,
};

export const TAX_GST18 = {
  ...SYNC,
  id: "tax-gst-18", type: "taxSlab" as const,
  name: "GST 18%", rate: 18, cgst: 9, sgst: 9, igst: 18,
  mode: "exclusive" as const, isDefault: false, active: true,
};

// ─── Units ────────────────────────────────────────────────────────────────────
export const UNIT_KG = {
  ...SYNC,
  id: "unit-kg", type: "unit" as const,
  name: "Kilogram", shortCode: "kg", decimalPrecision: 3, active: true,
};

// ─── Payment methods ──────────────────────────────────────────────────────────
export const PM_CASH = {
  ...SYNC,
  id: "pm-cash", type: "paymentMethod" as const,
  name: "Cash", isDefault: true, active: true,
};
export const PM_UPI = {
  ...SYNC,
  id: "pm-upi", type: "paymentMethod" as const,
  name: "UPI", isDefault: false, active: true,
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const PRODUCT_RICE = {
  ...SYNC,
  id: "prod-rice", type: "product" as const,
  sku: "SKU-RICE-001", name: "Basmati Rice 5kg",
  barcode: "EAN1234567890", description: null as string | null,
  unitLabel: "Bag", unitPrice: 500, salePrice: 490, mrp: 550,
  purchasePrice: 400, active: true, trackStock: true,
  productType: "goods" as const, discountAllowed: true,
  categoryId: "cat-grocery", brand: null as string | null,
  hsn: "1006", unitId: "unit-kg", taxId: "tax-gst-5",
  openingStock: 100, reorderLevel: 10,
};

export const PRODUCT_OIL = {
  ...SYNC,
  id: "prod-oil", type: "product" as const,
  sku: "SKU-OIL-001", name: "Sunflower Oil 1L",
  barcode: "EAN0987654321", description: null as string | null,
  unitLabel: "Bottle", unitPrice: 150, salePrice: 145, mrp: 160,
  purchasePrice: 120, active: true, trackStock: true,
  productType: "goods" as const, discountAllowed: true,
  categoryId: "cat-grocery", brand: null as string | null,
  hsn: "1512", unitId: "unit-kg", taxId: "tax-gst-5",
  openingStock: 8, reorderLevel: 10, // below reorder → low-stock alert
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const CUSTOMER_RAMESH = {
  ...SYNC,
  id: "cust-ramesh", type: "customer" as const,
  code: "C0001", name: "Ramesh Kumar",
  phone: "9876543210", mobile: "9876543210",
  email: "ramesh@example.com", address: "12 MG Road, Bengaluru",
  gstin: "29ABCDE1234F1Z5", city: "Bengaluru", state: "KA",
  pincode: "560001", notes: null as string | null,
  customerType: "retail" as const, status: "active" as const,
  openingBalance: 0, creditLimit: 10000, receivableBalance: 3200,
};

export const CUSTOMER_PRIYA = {
  ...SYNC,
  id: "cust-priya", type: "customer" as const,
  code: "C0002", name: "Priya Sharma",
  phone: "9123456780", mobile: "9123456780",
  email: null as string | null, address: "45 Park St, Kolkata",
  gstin: null as string | null, city: "Kolkata", state: "WB",
  pincode: "700016", notes: null as string | null,
  customerType: "retail" as const, status: "active" as const,
  openingBalance: 0, creditLimit: 5000, receivableBalance: 0,
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const INVOICE_001 = {
  ...SYNC,
  id: "inv-001", type: "invoice" as const,
  invoiceNumber: "INV-2026-001",
  customerId: CUSTOMER_RAMESH.id,
  customerName: CUSTOMER_RAMESH.name,
  status: "FINALIZED" as const,
  invoiceDate: "2026-01-15T10:00:00Z",
  dueDate: "2026-02-15T10:00:00Z",
  subtotal: 1000,
  totalDiscount: 50,
  taxableAmount: 950,
  totalTax: 47.5,     // 5% of 950
  grandTotal: 997.5,
  paidAmount: 500,
  balanceDue: 497.5,
  notes: null as string | null,
  lineItems: [
    {
      id: "li-001",
      productId: PRODUCT_RICE.id,
      productName: PRODUCT_RICE.name,
      sku: PRODUCT_RICE.sku,
      quantity: 2,
      unitPrice: 500,
      discount: 5,       // 5%
      taxRate: 5,
      taxableAmount: 950,
      taxAmount: 47.5,
      lineTotal: 997.5,
    },
  ],
};

export const INVOICE_PAID = {
  ...INVOICE_001,
  id: "inv-002",
  invoiceNumber: "INV-2026-002",
  status: "PAID" as const,
  paidAmount: 997.5,
  balanceDue: 0,
};

// ─── Role contexts ────────────────────────────────────────────────────────────
export const CTX_ADMIN = {
  userId:     "u-admin",
  tenantId:   "t-1",
  tenantSlug: "acme",
  storeId:    "s-1",
  deviceId:   "d-1",
  role:       "TENANT_ADMIN",
  permissions: [
    "dashboard:view",
    "customers:view",   "customers:create", "customers:edit",
    "customers:delete", "customers:export",
    "products:view",    "products:create",  "products:edit",
    "products:delete",  "products:export",
    "invoices:view",    "invoices:create",  "invoices:edit",
    "invoices:delete",  "invoices:void",    "invoices:export",
    "returns:view",     "returns:create",   "returns:approve",
    "discounts:apply",  "discounts:override",
    "collections:view", "collections:record",
    "reports:view",     "reports:export",
    "settings:view",    "settings:edit",
    "admin:manage-stores", "admin:manage-users",
    "inventory:view",   "inventory:adjust", "inventory:export",
  ],
};

export const CTX_CASHIER = {
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
};

export const CTX_MANAGER = {
  userId:     "u-manager",
  tenantId:   "t-1",
  tenantSlug: "acme",
  storeId:    "s-1",
  deviceId:   "d-3",
  role:       "MANAGER",
  permissions: [
    "dashboard:view",
    "customers:view",   "customers:create", "customers:edit",   "customers:export",
    "products:view",    "products:create",  "products:edit",    "products:export",
    "invoices:view",    "invoices:create",  "invoices:edit",    "invoices:void",    "invoices:export",
    "returns:view",     "returns:create",   "returns:approve",
    "discounts:apply",  "discounts:override",
    "collections:view", "collections:record",
    "reports:view",     "reports:export",
    "settings:view",
    "inventory:view",   "inventory:export",
  ],
};

export const CTX_TENANT_B = {
  ...CTX_ADMIN,
  userId:     "u-admin-b",
  tenantId:   "t-2",
  tenantSlug: "bharat-traders",
  storeId:    "s-2",
};
