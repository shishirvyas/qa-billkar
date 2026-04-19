/**
 * Data Factory — generates realistic test entities.
 *
 * All factories return plain objects matching domain interfaces.
 * Uses deterministic IDs (prefix + seq) for predictable test assertions.
 *
 * Usage:
 *   const product = factory.product({ name: "Rice 5kg", salePrice: 250 });
 *   const invoice = factory.invoice({ lines: [factory.invoiceLine(product)] });
 */
import type { SyncStatus, InvoiceStatus } from "@biilkar/domain";

// ─── Sequence counter ─────────────────────────────────────────────────────────
let seq = 1;
const next = (prefix: string) => `${prefix}-${String(seq++).padStart(4, "0")}`;

const NOW = () => new Date().toISOString();

const SYNC_DEFAULTS = {
  syncStatus:  "PENDING" as SyncStatus,
  syncedAt:    null,
  version:     1,
  createdAt:   NOW(),
  updatedAt:   NOW(),
  deletedAt:   null,
};

// ─── Factory helpers ──────────────────────────────────────────────────────────
function merge<T>(defaults: T, overrides: Partial<T>): T {
  return { ...defaults, ...overrides };
}

// ─── Customer factory ─────────────────────────────────────────────────────────
export interface CustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  receivableBalance?: number;
  creditLimit?: number;
  customerType?: "retail" | "wholesale" | "distributor";
  status?: "active" | "blocked";
}

export function customer(overrides: CustomerInput = {}) {
  const id = next("cust");
  return merge({
    ...SYNC_DEFAULTS,
    id,
    type:              "customer" as const,
    code:              `C${id}`,
    name:              `Test Customer ${id}`,
    phone:             `9${String(seq).padStart(9, "0")}`,
    email:             `${id}@test.com`,
    address:           "123, Test Street, Bengaluru",
    city:              "Bengaluru",
    state:             "Karnataka",
    pincode:           "560001",
    gstin:             "",
    customerType:      "retail" as const,
    status:            "active" as const,
    openingBalance:    0,
    creditLimit:       0,
    receivableBalance: 0,
    tenantId:          "t-1",
    tenantSlug:        "acme",
    storeId:           "s-1",
    deviceId:          "d-1",
    userId:            "u-admin",
  }, overrides);
}

// ─── Product factory ──────────────────────────────────────────────────────────
export interface ProductInput {
  name?: string;
  sku?: string;
  barcode?: string;
  salePrice?: number;
  purchasePrice?: number;
  mrp?: number;
  openingStock?: number;
  reorderLevel?: number;
  taxId?: string;
  hsn?: string;
  trackStock?: boolean;
  active?: boolean;
  categoryId?: string;
}

export function product(overrides: ProductInput = {}) {
  const id = next("prod");
  return merge({
    ...SYNC_DEFAULTS,
    id,
    type:           "product" as const,
    sku:            `SKU${id.toUpperCase()}`,
    name:           `Test Product ${id}`,
    barcode:        `890${String(seq).padStart(10, "0")}`,
    unitLabel:      "pcs",
    unitId:         "unit-pcs",
    unitPrice:      100,
    salePrice:      100,
    purchasePrice:  70,
    mrp:            120,
    discountAllowed:true,
    taxId:          "tax-gst-18",
    hsn:            "10063090",
    openingStock:   50,
    reorderLevel:   10,
    trackStock:     true,
    productType:    "goods" as const,
    active:         true,
    categoryId:     null,
    tenantId:       "t-1",
    tenantSlug:     "acme",
    storeId:        "s-1",
    deviceId:       "d-1",
    userId:         "u-admin",
  }, overrides);
}

// ─── Tax Slab factory ─────────────────────────────────────────────────────────
export function taxSlab(rate: 0 | 5 | 12 | 18 | 28 = 18) {
  const id = `tax-gst-${rate}`;
  return {
    ...SYNC_DEFAULTS,
    id,
    type:      "taxSlab" as const,
    name:      `GST ${rate}%`,
    rate,
    cgst:      rate / 2,
    sgst:      rate / 2,
    igst:      rate,
    mode:      "exclusive" as const,
    isDefault: rate === 18,
    active:    true,
    tenantId:  "t-1",
    storeId:   "s-1",
  };
}

// ─── Invoice Line factory ─────────────────────────────────────────────────────
export interface InvoiceLineInput {
  productId?: string;
  productName?: string;
  qty?: number;
  price?: number;
  taxRate?: number;
  taxId?: string;
  discountPct?: number;
  discountAmt?: number;
  hsn?: string;
}

export function invoiceLine(overrides: InvoiceLineInput = {}) {
  const lineId = next("line");
  const qty    = overrides.qty   ?? 2;
  const price  = overrides.price ?? 500;
  const taxPct = overrides.taxRate ?? 18;
  const discPct = overrides.discountPct ?? 0;
  const gross   = qty * price;
  const discAmt = Math.round(gross * discPct / 100 * 100) / 100;
  const taxable = gross - discAmt;
  const cgst    = Math.round(taxable * (taxPct / 2) / 100 * 100) / 100;
  const sgst    = cgst;
  const taxAmt  = cgst + sgst;
  const total   = taxable + taxAmt;

  return merge({
    id:          lineId,
    productId:   next("prod"),
    productName: `Product ${lineId}`,
    sku:         `SKU-${lineId}`,
    barcode:     `890${lineId}`,
    qty,
    price,
    mrp:         price * 1.1,
    unitLabel:   "pcs",
    taxId:       overrides.taxId ?? "tax-gst-18",
    taxRate:     taxPct,
    taxMode:     "exclusive" as const,
    cgstRate:    taxPct / 2,
    sgstRate:    taxPct / 2,
    igstRate:    taxPct,
    supplyType:  "intrastate" as const,
    discountPct: discPct,
    discountAmt: discAmt,
    discountType:"percent" as const,
    taxableAmt:  taxable,
    cgstAmt:     cgst,
    sgstAmt:     sgst,
    igstAmt:     0,
    taxAmt,
    total,
    hsn:         overrides.hsn ?? "10063090",
    serialNumbers: [],
    notes:       "",
  }, overrides);
}

// ─── Invoice factory ──────────────────────────────────────────────────────────
export interface InvoiceInput {
  status?: InvoiceStatus;
  customerId?: string;
  customerName?: string;
  lines?: ReturnType<typeof invoiceLine>[];
  paidAmount?: number;
  balanceDue?: number;
  grandTotal?: number;
  notes?: string;
  syncStatus?: SyncStatus;
}

export function invoice(overrides: InvoiceInput = {}) {
  const id      = next("inv");
  const lines   = overrides.lines ?? [invoiceLine()];
  const sub     = lines.reduce((s, l) => s + l.taxableAmt, 0);
  const taxAmt  = lines.reduce((s, l) => s + l.taxAmt, 0);
  const grand   = overrides.grandTotal ?? Math.round((sub + taxAmt) * 100) / 100;
  const paid    = overrides.paidAmount ?? 0;
  const status  = overrides.status ?? (paid >= grand ? "PAID" : paid > 0 ? "PARTIAL" : "FINALIZED");

  return merge({
    ...SYNC_DEFAULTS,
    id,
    type:            "invoice" as const,
    invoiceNumber:   `INV-${String(seq).padStart(5, "0")}`,
    invoiceDate:     NOW().slice(0, 10),
    dueDate:         null,
    customerId:      overrides.customerId ?? "cust-0001",
    customerName:    overrides.customerName ?? "Test Customer",
    customerGstin:   null,
    storeId:         "s-1",
    tenantId:        "t-1",
    tenantSlug:      "acme",
    deviceId:        "d-1",
    userId:          "u-admin",
    series:          "INV",
    status,
    supplyType:      "intrastate" as const,
    taxMode:         "exclusive" as const,
    lines,
    subTotal:        Math.round(sub * 100) / 100,
    lineDiscTotal:   0,
    billDiscType:    null,
    billDiscValue:   0,
    billDiscAmt:     0,
    cgstTotal:       Math.round(lines.reduce((s, l) => s + l.cgstAmt, 0) * 100) / 100,
    sgstTotal:       Math.round(lines.reduce((s, l) => s + l.sgstAmt, 0) * 100) / 100,
    igstTotal:       0,
    taxTotal:        Math.round(taxAmt * 100) / 100,
    grandTotal:      grand,
    paidAmount:      paid,
    balanceDue:      Math.round((grand - paid) * 100) / 100,
    payments:        paid > 0 ? [{ id: next("pay"), method: "CASH", amount: paid, paidAt: NOW(), notes: "" }] : [],
    notes:           overrides.notes ?? "",
  }, overrides);
}

// ─── Purchase Order factory ───────────────────────────────────────────────────
export function purchaseOrder(overrides: Partial<{
  supplierId: string;
  supplierName: string;
  lines: unknown[];
  grandTotal: number;
  status: string;
}> = {}) {
  const id = next("po");
  return {
    ...SYNC_DEFAULTS,
    id,
    type:         "purchase" as const,
    poNumber:     `PO-${id}`,
    supplierId:   overrides.supplierId ?? "sup-0001",
    supplierName: overrides.supplierName ?? "Test Supplier",
    orderDate:    NOW().slice(0, 10),
    receivedDate: null,
    status:       overrides.status ?? "PENDING",
    lines:        overrides.lines ?? [],
    grandTotal:   overrides.grandTotal ?? 5000,
    storeId:      "s-1",
    tenantId:     "t-1",
    tenantSlug:   "acme",
  };
}

// ─── Stock Transfer factory ───────────────────────────────────────────────────
export function stockTransfer(overrides: Partial<{
  fromStoreId: string;
  toStoreId: string;
  lines: unknown[];
  status: string;
}> = {}) {
  const id = next("xfr");
  return {
    ...SYNC_DEFAULTS,
    id,
    type:        "stockTransfer" as const,
    transferNo:  `XFR-${id}`,
    fromStoreId: overrides.fromStoreId ?? "s-1",
    toStoreId:   overrides.toStoreId   ?? "s-2",
    transferDate: NOW().slice(0, 10),
    status:      overrides.status ?? "INITIATED",
    lines:       overrides.lines  ?? [],
    notes:       "",
    tenantId:    "t-1",
    tenantSlug:  "acme",
  };
}

// ─── Discount Rule factory ────────────────────────────────────────────────────
export function discountRule(overrides: Partial<{
  code: string;
  name: string;
  type: "percent" | "flat";
  value: number;
  minOrderAmt: number;
  maxUses: number;
  active: boolean;
}> = {}) {
  const id = next("disc");
  return {
    ...SYNC_DEFAULTS,
    id,
    type:        "discountRule" as const,
    code:        overrides.code        ?? `DISC${id.toUpperCase()}`,
    name:        overrides.name        ?? `Discount ${id}`,
    discType:    overrides.type        ?? "percent",
    value:       overrides.value       ?? 10,
    minOrderAmt: overrides.minOrderAmt ?? 0,
    maxUses:     overrides.maxUses     ?? 100,
    usedCount:   0,
    active:      overrides.active      ?? true,
    tenantId:    "t-1",
    storeId:     "s-1",
  };
}

// ─── Audit Log factory ────────────────────────────────────────────────────────
export function auditEntry(overrides: Partial<{
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
}> = {}) {
  const id = next("aud");
  return {
    id,
    tenantId:    "t-1",
    userId:      overrides.userId     ?? "u-admin",
    userName:    "Admin User",
    action:      overrides.action     ?? "create",
    entityType:  overrides.entityType ?? "invoice",
    entityId:    overrides.entityId   ?? next("inv"),
    before:      null,
    after:       {},
    ip:          "127.0.0.1",
    userAgent:   "Electron/32.0.0",
    occurredAt:  NOW(),
  };
}

// ─── Named export object ──────────────────────────────────────────────────────
export const factory = {
  customer,
  product,
  taxSlab,
  invoiceLine,
  invoice,
  purchaseOrder,
  stockTransfer,
  discountRule,
  auditEntry,
};
