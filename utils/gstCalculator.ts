/**
 * GST Calculator — authoritative GST math for Billkar QA.
 *
 * Mirrors the exact logic in:
 *   biilkar/apps/desktop/src/renderer/components/billing/types.ts
 *   biilkar/apps/desktop/src/renderer/lib/discountEngine.ts
 *
 * Tests import this to compute expected values independently and
 * compare against UI-rendered totals.
 */

export type TaxMode    = "exclusive" | "inclusive";
export type SupplyType = "intrastate" | "interstate";
export type DiscountType = "percent" | "flat";

export interface TaxRates {
  rate:  number;
  cgst:  number;
  sgst:  number;
  igst:  number;
}

export interface LineInput {
  price:        number;
  qty:          number;
  taxRate:      number;
  discountPct?: number;
  discountFlat?: number;
  taxMode:      TaxMode;
  supplyType:   SupplyType;
}

export interface LineResult {
  grossAmt:    number;  // price × qty
  discountAmt: number;  // line discount
  taxableAmt:  number;  // grossAmt − discountAmt
  cgstAmt:     number;
  sgstAmt:     number;
  igstAmt:     number;
  taxAmt:      number;  // total GST
  total:       number;  // taxableAmt + taxAmt
}

export interface InvoiceTotals {
  subTotal:      number;
  lineDiscTotal: number;
  cgstTotal:     number;
  sgstTotal:     number;
  igstTotal:     number;
  taxTotal:      number;
  grandTotal:    number;
}

// ─── Rounding ─────────────────────────────────────────────────────────────────
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Single line calculation ──────────────────────────────────────────────────
export function calcLine(input: LineInput): LineResult {
  const { price, qty, taxRate, discountPct = 0, discountFlat = 0, taxMode, supplyType } = input;
  const gross       = r2(price * qty);
  const discByPct   = r2(gross * (discountPct / 100));
  const discountAmt = r2(discByPct + discountFlat);
  const afterDisc   = r2(gross - discountAmt);

  let taxableAmt: number;
  let taxAmt:     number;

  if (taxMode === "exclusive") {
    taxableAmt = afterDisc;
    taxAmt     = r2(taxableAmt * (taxRate / 100));
  } else {
    // Inclusive: back-calculate taxable amount
    taxableAmt = r2(afterDisc / (1 + taxRate / 100));
    taxAmt     = r2(afterDisc - taxableAmt);
  }

  const cgstAmt = supplyType === "intrastate" ? r2(taxAmt / 2) : 0;
  const sgstAmt = supplyType === "intrastate" ? r2(taxAmt / 2) : 0;
  // Handle odd-pence rounding for intrastate
  const igstAmt = supplyType === "interstate"  ? taxAmt : 0;

  const total = r2(taxableAmt + taxAmt);

  return { grossAmt: gross, discountAmt, taxableAmt, cgstAmt, sgstAmt, igstAmt, taxAmt, total };
}

// ─── Invoice totals ───────────────────────────────────────────────────────────
export function calcInvoice(lines: LineInput[]): InvoiceTotals {
  const computed = lines.map(calcLine);

  const subTotal      = r2(computed.reduce((s, l) => s + l.taxableAmt, 0));
  const lineDiscTotal = r2(computed.reduce((s, l) => s + l.discountAmt, 0));
  const cgstTotal     = r2(computed.reduce((s, l) => s + l.cgstAmt, 0));
  const sgstTotal     = r2(computed.reduce((s, l) => s + l.sgstAmt, 0));
  const igstTotal     = r2(computed.reduce((s, l) => s + l.igstAmt, 0));
  const taxTotal      = r2(computed.reduce((s, l) => s + l.taxAmt, 0));
  const grandTotal    = r2(subTotal + taxTotal);

  return { subTotal, lineDiscTotal, cgstTotal, sgstTotal, igstTotal, taxTotal, grandTotal };
}

// ─── Discount engine ──────────────────────────────────────────────────────────
export function applyBillDiscount(
  grandTotal: number,
  discType: DiscountType,
  discValue: number,
  timing: "BEFORE_TAX" | "AFTER_TAX" = "AFTER_TAX",
  taxRate = 0,
): number {
  if (timing === "AFTER_TAX") {
    const discAmt = discType === "percent"
      ? r2(grandTotal * discValue / 100)
      : Math.min(discValue, grandTotal);
    return r2(grandTotal - discAmt);
  }
  // BEFORE_TAX: reduce taxable base first
  const taxable  = r2(grandTotal / (1 + taxRate / 100));
  const discAmt  = discType === "percent"
    ? r2(taxable * discValue / 100)
    : Math.min(discValue, taxable);
  const newBase  = r2(taxable - discAmt);
  return r2(newBase * (1 + taxRate / 100));
}

// ─── Validation helpers ───────────────────────────────────────────────────────
export function isValidGstin(gstin: string): boolean {
  // Format: 2-digit state code + 10 char PAN + 1 entity number + Z + checksum
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}

export function isValidHsn(hsn: string): boolean {
  // HSN: 4 or 6 or 8 digits
  return /^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/.test(hsn);
}

export function gstRateForHsn(hsn: string): number {
  // Simplified GST rate map used in tests
  const rates: Record<string, number> = {
    "10063090": 5,   // Rice
    "15071000": 5,   // Soybean oil
    "84713010": 18,  // Computers
    "61099000": 12,  // T-shirts
    "85171200": 18,  // Smartphones
  };
  return rates[hsn] ?? 18;
}

// ─── Tax breakdown formatter ──────────────────────────────────────────────────
export function formatGstBreakdown(totals: InvoiceTotals, supplyType: SupplyType): string {
  if (supplyType === "intrastate") {
    return `CGST: ₹${totals.cgstTotal} + SGST: ₹${totals.sgstTotal} = ₹${totals.taxTotal}`;
  }
  return `IGST: ₹${totals.igstTotal}`;
}
