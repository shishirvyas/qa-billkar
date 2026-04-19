/**
 * Billing calculation utilities for QA tests.
 *
 * These mirror the exact arithmetic the app performs so test assertions
 * can validate UI-rendered totals against expected values computed here.
 */

export interface LineItem {
  price:    number;
  quantity: number;
  taxRate:  number;   // percentage, e.g. 18 for 18% exclusive GST
  discount?: number; // percentage, e.g. 10 for 10% off gross
}

export interface InvoiceTotals {
  subtotal:      number;  // sum of gross line amounts (before discount)
  totalDiscount: number;  // sum of all line discounts
  taxableAmount: number;  // subtotal - totalDiscount
  totalTax:      number;  // sum of per-line tax (exclusive)
  grandTotal:    number;  // taxableAmount + totalTax
}

/** Gross amount for a single line AFTER discount, BEFORE tax. */
export function calculateLineTotal(item: LineItem): number {
  const gross    = item.price * item.quantity;
  const discount = gross * ((item.discount ?? 0) / 100);
  return round2(gross - discount);
}

/** Full invoice totals across all line items (exclusive GST). */
export function calculateInvoiceTotals(items: LineItem[]): InvoiceTotals {
  let subtotal      = 0;
  let totalDiscount = 0;
  let totalTax      = 0;

  for (const item of items) {
    const gross    = item.price * item.quantity;
    const discount = gross * ((item.discount ?? 0) / 100);
    const taxable  = gross - discount;
    const tax      = taxable * (item.taxRate / 100);

    subtotal      += gross;
    totalDiscount += discount;
    totalTax      += tax;
  }

  const taxableAmount = subtotal - totalDiscount;
  const grandTotal    = taxableAmount + totalTax;

  return {
    subtotal:      round2(subtotal),
    totalDiscount: round2(totalDiscount),
    taxableAmount: round2(taxableAmount),
    totalTax:      round2(totalTax),
    grandTotal:    round2(grandTotal),
  };
}

/** Apply a flat percentage discount to a given amount. */
export function applyPercentageDiscount(amount: number, pct: number): number {
  return round2(amount - amount * (pct / 100));
}

/** Round to 2 decimal places (standard currency rounding). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Split total GST into CGST + SGST for intra-state transactions. */
export function splitGst(totalTax: number): { cgst: number; sgst: number } {
  const half = round2(totalTax / 2);
  return { cgst: half, sgst: half };
}
